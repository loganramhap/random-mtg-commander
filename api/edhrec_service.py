#!/usr/bin/env python3
"""
EDHREC API Service using pyedhrec wrapper
Provides endpoints for fetching commander recommendations and deck suggestions
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import pyedhrec
import requests
import re
import asyncio
import time
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import uvicorn
import json
import os
from functools import lru_cache

app = FastAPI(title="MTG Commander Picker - EDHREC Service", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting for Scryfall API (50-100ms between requests)
class ScryfallRateLimiter:
    def __init__(self, min_delay=0.05, max_delay=0.1):
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.last_request = 0
        
    async def wait(self):
        """Ensure we don't exceed Scryfall's rate limits"""
        current_time = time.time()
        time_since_last = current_time - self.last_request
        
        if time_since_last < self.min_delay:
            delay = self.min_delay - time_since_last
            await asyncio.sleep(delay)
        
        self.last_request = time.time()

# Global rate limiter instance
scryfall_limiter = ScryfallRateLimiter()

# Simple in-memory cache with TTL
class SimpleCache:
    def __init__(self, default_ttl=3600):  # 1 hour default
        self.cache = {}
        self.default_ttl = default_ttl
    
    def get(self, key):
        if key in self.cache:
            value, expiry = self.cache[key]
            if datetime.now() < expiry:
                return value
            else:
                del self.cache[key]
        return None
    
    def set(self, key, value, ttl=None):
        if ttl is None:
            ttl = self.default_ttl
        expiry = datetime.now() + timedelta(seconds=ttl)
        self.cache[key] = (value, expiry)
    
    def clear(self):
        self.cache.clear()

# Cache instances
commander_cache = SimpleCache(ttl=7200)  # 2 hours for commander data
recommendations_cache = SimpleCache(ttl=3600)  # 1 hour for recommendations
search_cache = SimpleCache(ttl=1800)  # 30 minutes for searches

def normalize_commander_name(name: str) -> str:
    """Normalize commander name for EDHREC lookup"""
    # Remove special characters and convert to lowercase
    normalized = re.sub(r'[^\w\s]', '', name.lower())
    # Replace spaces with hyphens
    normalized = re.sub(r'\s+', '-', normalized.strip())
    return normalized

async def make_scryfall_request(url: str, params: dict = None) -> dict:
    """Make a rate-limited request to Scryfall API"""
    await scryfall_limiter.wait()
    
    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Scryfall API error: {str(e)}")

@app.get("/")
async def root():
    return {
        "message": "MTG Commander Picker - EDHREC Service", 
        "status": "running",
        "cache_stats": {
            "commanders_cached": len(commander_cache.cache),
            "recommendations_cached": len(recommendations_cache.cache),
            "searches_cached": len(search_cache.cache)
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "pyedhrec": "available",
            "scryfall_limiter": "active",
            "cache": "active"
        }
    }

@app.post("/cache/clear")
async def clear_cache():
    """Clear all caches (useful for development)"""
    commander_cache.clear()
    recommendations_cache.clear()
    search_cache.clear()
    return {"message": "All caches cleared"}

@app.get("/commander/{commander_name}")
async def get_commander_data(commander_name: str):
    """Get EDHREC data for a specific commander"""
    cache_key = f"commander:{commander_name.lower()}"
    cached_result = commander_cache.get(cache_key)
    
    if cached_result:
        return cached_result
    
    try:
        # Normalize the commander name
        normalized_name = normalize_commander_name(commander_name)
        
        # Try to get commander data from EDHREC
        commander_data = pyedhrec.get_commander(normalized_name)
        
        if not commander_data:
            raise HTTPException(status_code=404, detail=f"Commander '{commander_name}' not found on EDHREC")
        
        result = {
            "commander": commander_name,
            "normalized_name": normalized_name,
            "data": commander_data,
            "status": "success",
            "cached_at": datetime.now().isoformat()
        }
        
        commander_cache.set(cache_key, result)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching commander data: {str(e)}")

@app.get("/commander/{commander_name}/recommendations")
async def get_commander_recommendations(commander_name: str, limit: int = 50):
    """Get card recommendations for a specific commander"""
    cache_key = f"recommendations:{commander_name.lower()}:{limit}"
    cached_result = recommendations_cache.get(cache_key)
    
    if cached_result:
        return cached_result
    
    try:
        normalized_name = normalize_commander_name(commander_name)
        
        # Get commander recommendations
        recommendations = pyedhrec.get_commander_recs(normalized_name, limit=limit)
        
        if not recommendations:
            # Return empty recommendations instead of error for better UX
            result = {
                "commander": commander_name,
                "recommendations": {},
                "total_cards": 0,
                "status": "no_data",
                "cached_at": datetime.now().isoformat()
            }
            recommendations_cache.set(cache_key, result, ttl=1800)  # Cache failures for 30 min
            return result
        
        # Process recommendations into categories
        processed_recs = process_recommendations(recommendations)
        
        result = {
            "commander": commander_name,
            "recommendations": processed_recs,
            "total_cards": len(recommendations),
            "status": "success",
            "cached_at": datetime.now().isoformat()
        }
        
        recommendations_cache.set(cache_key, result)
        return result
        
    except Exception as e:
        # Return empty recommendations instead of error for better UX
        result = {
            "commander": commander_name,
            "recommendations": {},
            "total_cards": 0,
            "status": "error",
            "error": str(e),
            "cached_at": datetime.now().isoformat()
        }
        recommendations_cache.set(cache_key, result, ttl=900)  # Cache errors for 15 min
        return result

def process_recommendations(recommendations: List) -> Dict[str, List[str]]:
    """Process EDHREC recommendations into categorized suggestions"""
    categories = {
        "High Synergy Cards": [],
        "Creatures": [],
        "Instants": [],
        "Sorceries": [],
        "Enchantments": [],
        "Artifacts": [],
        "Planeswalkers": [],
        "Lands": []
    }
    
    for card in recommendations:
        card_name = card.get('name', '')
        card_type = card.get('type_line', '').lower()
        
        if not card_name:
            continue
            
        # Categorize based on type line
        if 'creature' in card_type:
            categories["Creatures"].append(card_name)
        elif 'instant' in card_type:
            categories["Instants"].append(card_name)
        elif 'sorcery' in card_type:
            categories["Sorceries"].append(card_name)
        elif 'enchantment' in card_type:
            categories["Enchantments"].append(card_name)
        elif 'artifact' in card_type:
            categories["Artifacts"].append(card_name)
        elif 'planeswalker' in card_type:
            categories["Planeswalkers"].append(card_name)
        elif 'land' in card_type:
            categories["Lands"].append(card_name)
        else:
            # High synergy for cards that don't fit other categories
            categories["High Synergy Cards"].append(card_name)
    
    # Remove empty categories and limit cards per category
    filtered_categories = {}
    for category, cards in categories.items():
        if cards:
            filtered_categories[category] = cards[:8]  # Limit to 8 cards per category
    
    return filtered_categories

@app.get("/search/commanders")
async def search_commanders(
    colors: Optional[str] = None,
    min_cmc: Optional[int] = None,
    max_cmc: Optional[int] = None,
    power_level: Optional[str] = None,  # casual, focused, optimized, competitive
    themes: Optional[str] = None,  # tribal, combo, control, aggro, etc.
    limit: int = 20
):
    """Advanced commander search with filters"""
    # Create cache key from all parameters
    cache_key = f"search:{colors}:{min_cmc}:{max_cmc}:{power_level}:{themes}:{limit}"
    cached_result = search_cache.get(cache_key)
    
    if cached_result:
        return cached_result
    
    try:
        # Build Scryfall query
        query_parts = ["is:commander"]
        
        if colors:
            # Handle exact color identity matching
            if colors.lower() == 'colorless':
                query_parts.append("id:c")
            else:
                query_parts.append(f"id:{colors}")
        
        if min_cmc is not None:
            query_parts.append(f"mv>={min_cmc}")
            
        if max_cmc is not None:
            query_parts.append(f"mv<={max_cmc}")
        
        # Power level filtering (approximate)
        if power_level:
            if power_level.lower() == 'casual':
                query_parts.append("(rarity:common OR rarity:uncommon)")
            elif power_level.lower() == 'competitive':
                query_parts.append("(is:reserved OR rarity:mythic)")
            elif power_level.lower() == 'optimized':
                query_parts.append("rarity:rare")
        
        # Theme-based filtering
        if themes:
            theme_queries = {
                'tribal': 'o:"creature type"',
                'combo': 'o:"infinite" OR o:"win the game"',
                'control': 'o:"counter" OR o:"draw"',
                'aggro': 'o:"haste" OR o:"attack"',
                'ramp': 'o:"search your library for" OR o:"add mana"',
                'graveyard': 'o:"graveyard" OR o:"return"'
            }
            
            if themes.lower() in theme_queries:
                query_parts.append(f"({theme_queries[themes.lower()]})")
        
        query = " ".join(query_parts)
        
        # Use rate-limited Scryfall API call
        scryfall_url = "https://api.scryfall.com/cards/search"
        params = {
            "q": query,
            "order": "edhrec",  # Order by EDHREC popularity
            "unique": "cards"
        }
        
        data = await make_scryfall_request(scryfall_url, params)
        commanders = data.get('data', [])[:limit]
        
        # Enhance commander data with estimated power levels
        enhanced_commanders = []
        for commander in commanders:
            enhanced = enhance_commander_data(commander)
            enhanced_commanders.append(enhanced)
        
        result = {
            "commanders": enhanced_commanders,
            "total": len(enhanced_commanders),
            "query": query,
            "filters": {
                "colors": colors,
                "min_cmc": min_cmc,
                "max_cmc": max_cmc,
                "power_level": power_level,
                "themes": themes
            },
            "status": "success",
            "cached_at": datetime.now().isoformat()
        }
        
        search_cache.set(cache_key, result)
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching commanders: {str(e)}")

def enhance_commander_data(commander: dict) -> dict:
    """Enhance commander data with additional metadata"""
    enhanced = commander.copy()
    
    # Estimate power level
    power_level = estimate_power_level(commander)
    enhanced['estimated_power_level'] = power_level
    
    # Add bracket estimation
    enhanced['estimated_bracket'] = power_level_to_bracket(power_level)
    
    # Add theme suggestions based on oracle text
    enhanced['suggested_themes'] = suggest_themes(commander.get('oracle_text', ''))
    
    return enhanced

def estimate_power_level(commander: dict) -> str:
    """Estimate commander power level based on various factors"""
    score = 0
    
    # Reserved list cards are typically higher power
    if commander.get('reserved', False):
        score += 3
    
    # Rarity affects power level
    rarity = commander.get('rarity', '').lower()
    if rarity == 'mythic':
        score += 2
    elif rarity == 'rare':
        score += 1
    
    # EDHREC rank (lower is more popular/powerful)
    edhrec_rank = commander.get('edhrec_rank')
    if edhrec_rank:
        if edhrec_rank < 100:
            score += 3
        elif edhrec_rank < 500:
            score += 2
        elif edhrec_rank < 2000:
            score += 1
    
    # Color identity complexity
    color_count = len(commander.get('color_identity', []))
    if color_count >= 4:
        score += 1
    elif color_count >= 3:
        score += 0.5
    
    # Convert score to power level
    if score >= 4:
        return 'competitive'
    elif score >= 2.5:
        return 'optimized'
    elif score >= 1:
        return 'focused'
    else:
        return 'casual'

def power_level_to_bracket(power_level: str) -> int:
    """Convert power level to bracket number"""
    mapping = {
        'casual': 1,
        'focused': 2,
        'optimized': 3,
        'competitive': 4
    }
    return mapping.get(power_level, 2)

def suggest_themes(oracle_text: str) -> List[str]:
    """Suggest deck themes based on oracle text"""
    themes = []
    text = oracle_text.lower()
    
    theme_keywords = {
        'tribal': ['creature type', 'tribal', 'share a creature type'],
        'combo': ['infinite', 'win the game', 'each opponent loses'],
        'control': ['counter', 'draw cards', 'return to hand'],
        'aggro': ['haste', 'attack', 'combat damage'],
        'ramp': ['search your library', 'add mana', 'untap'],
        'graveyard': ['graveyard', 'return', 'from your graveyard'],
        'tokens': ['create', 'token', 'creature tokens'],
        'artifacts': ['artifact', 'equipment', 'attach'],
        'enchantments': ['enchantment', 'aura', 'enchanted'],
        'lifegain': ['gain life', 'life you gained', 'whenever you gain life']
    }
    
    for theme, keywords in theme_keywords.items():
        if any(keyword in text for keyword in keywords):
            themes.append(theme)
    
    return themes[:3]  # Limit to top 3 themes

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)