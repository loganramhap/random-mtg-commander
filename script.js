class MTGCommanderPicker {
    constructor() {
        this.selectedColors = new Set();
        this.currentCommander = null;
        this.filters = {
            colors: [],
            manaMin: 1,
            manaMax: 10
        };
        
        // API endpoints
        this.scryfallAPI = 'https://api.scryfall.com';
        
        // Rate limiting for Scryfall (50-100ms between requests)
        this.lastScryfallRequest = 0;
        this.scryfallDelay = 75; // 75ms delay = ~13 requests per second (within limits)
        
        // Simple client-side cache
        this.cache = new Map();
        this.cacheTimeout = 10 * 60 * 1000; // 10 minutes
        
        // Commander queue for prefetching
        this.commanderQueue = [];
        this.queueSize = 10; // Prefetch 10 commanders at a time
        this.minQueueSize = 3; // Refill when queue drops below this
        
        this.initializeEventListeners();
        this.updateManaFilter(); // Initialize mana filter
    }

    initializeEventListeners() {
        // Color filter buttons
        document.querySelectorAll('.color-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.toggleColor(e.target.dataset.color));
        });

        // Mana value radio buttons
        document.querySelectorAll('input[name="mana-filter"]').forEach(radio => {
            radio.addEventListener('change', () => this.updateManaFilter());
        });

        // Custom mana value inputs
        document.getElementById('mana-min-input').addEventListener('input', () => this.updateCustomManaValues());
        document.getElementById('mana-max-input').addEventListener('input', () => this.updateCustomManaValues());

        // Apply filters button
        document.getElementById('apply-filters').addEventListener('click', () => this.findCommander());

        // Swipe buttons (fallback)
        document.getElementById('reject-btn').addEventListener('click', () => this.rejectCommander());
        document.getElementById('accept-btn').addEventListener('click', () => this.acceptCommander());

        // New search button
        document.getElementById('new-search').addEventListener('click', () => this.resetToFilters());
        
        // Initialize swipe functionality
        this.initializeSwipe();
    }

    initializeSwipe() {
        const cardContainer = document.getElementById('card-container');
        if (!cardContainer) {
            console.log('Card container not found');
            return;
        }

        // Remove old listeners by cloning the element
        const newCardContainer = cardContainer.cloneNode(true);
        cardContainer.parentNode.replaceChild(newCardContainer, cardContainer);
        
        let startX = 0;
        let startY = 0;
        let currentX = 0;
        let currentY = 0;
        let isDragging = false;

        console.log('Swipe initialized for card container');

        // Mouse events
        newCardContainer.addEventListener('mousedown', (e) => {
            const card = newCardContainer.querySelector('.commander-card');
            if (!card) return;
            
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            newCardContainer.style.cursor = 'grabbing';
            
            // Prevent body scroll during drag
            document.body.style.overflow = 'hidden';
            
            console.log('Mouse down - drag started');
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault(); // Prevent any default behavior during drag
            
            currentX = e.clientX - startX;
            currentY = e.clientY - startY;
            
            const card = newCardContainer.querySelector('.commander-card');
            if (card) {
                const rotation = currentX / 20;
                card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
                card.style.transition = 'none';
                
                // Visual feedback
                if (Math.abs(currentX) > 50) {
                    if (currentX > 0) {
                        card.style.borderColor = '#4caf50';
                        console.log('Swiping right (accept)');
                    } else {
                        card.style.borderColor = '#ff5252';
                        console.log('Swiping left (reject)');
                    }
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            
            console.log('Mouse up - checking swipe distance:', currentX);
            isDragging = false;
            newCardContainer.style.cursor = 'grab';
            
            // Re-enable body scroll
            document.body.style.overflow = '';
            
            const card = newCardContainer.querySelector('.commander-card');
            if (card) {
                // Check if swipe was significant enough
                if (Math.abs(currentX) > 100) {
                    console.log('Swipe threshold met! Direction:', currentX > 0 ? 'right' : 'left');
                    // Animate card flying off screen
                    const direction = currentX > 0 ? 1 : -1;
                    card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                    card.style.transform = `translate(${direction * 1000}px, ${currentY}px) rotate(${direction * 30}deg)`;
                    card.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (currentX > 0) {
                            console.log('Accepting commander');
                            this.acceptCommander();
                        } else {
                            console.log('Rejecting commander');
                            this.rejectCommander();
                        }
                    }, 300);
                } else {
                    console.log('Swipe too short, snapping back');
                    // Snap back to center
                    card.style.transition = 'transform 0.3s ease-out, border-color 0.3s ease-out';
                    card.style.transform = 'translate(0, 0) rotate(0deg)';
                    card.style.borderColor = 'transparent';
                }
            }
            
            currentX = 0;
            currentY = 0;
        });

        // Touch events
        newCardContainer.addEventListener('touchstart', (e) => {
            const card = newCardContainer.querySelector('.commander-card');
            if (!card) return;
            
            isDragging = true;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            
            // Prevent body scroll during drag
            document.body.style.overflow = 'hidden';
            
            console.log('Touch start - drag started');
            e.preventDefault();
        }, { passive: false });

        newCardContainer.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            
            e.preventDefault();
            currentX = e.touches[0].clientX - startX;
            currentY = e.touches[0].clientY - startY;
            
            const card = newCardContainer.querySelector('.commander-card');
            if (card) {
                const rotation = currentX / 20;
                card.style.transform = `translate(${currentX}px, ${currentY}px) rotate(${rotation}deg)`;
                card.style.transition = 'none';
                
                // Visual feedback
                if (Math.abs(currentX) > 50) {
                    if (currentX > 0) {
                        card.style.borderColor = '#4caf50';
                    } else {
                        card.style.borderColor = '#ff5252';
                    }
                }
            }
        }, { passive: false });

        newCardContainer.addEventListener('touchend', () => {
            if (!isDragging) return;
            
            console.log('Touch end - checking swipe distance:', currentX);
            isDragging = false;
            
            // Re-enable body scroll
            document.body.style.overflow = '';
            
            const card = newCardContainer.querySelector('.commander-card');
            if (card) {
                if (Math.abs(currentX) > 100) {
                    console.log('Touch swipe threshold met!');
                    const direction = currentX > 0 ? 1 : -1;
                    card.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
                    card.style.transform = `translate(${direction * 1000}px, ${currentY}px) rotate(${direction * 30}deg)`;
                    card.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (currentX > 0) {
                            this.acceptCommander();
                        } else {
                            this.rejectCommander();
                        }
                    }, 300);
                } else {
                    card.style.transition = 'transform 0.3s ease-out, border-color 0.3s ease-out';
                    card.style.transform = 'translate(0, 0) rotate(0deg)';
                    card.style.borderColor = 'transparent';
                }
            }
            
            currentX = 0;
            currentY = 0;
        });
        
        // Also handle touchcancel to re-enable scroll
        newCardContainer.addEventListener('touchcancel', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.overflow = '';
            }
        });
    }

    toggleColor(color) {
        const btn = document.querySelector(`[data-color="${color}"]`);
        
        if (this.selectedColors.has(color)) {
            this.selectedColors.delete(color);
            btn.classList.remove('active');
        } else {
            this.selectedColors.add(color);
            btn.classList.add('active');
        }
    }

    async rateLimitedScryfallRequest(url, params = null) {
        // Ensure we respect Scryfall's rate limits (50-100ms between requests)
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastScryfallRequest;
        
        if (timeSinceLastRequest < this.scryfallDelay) {
            const waitTime = this.scryfallDelay - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
        
        this.lastScryfallRequest = Date.now();
        
        try {
            // Build the full URL with parameters
            const fullUrl = url + (params ? '?' + new URLSearchParams(params) : '');
            
            // Make request with proper headers for Scryfall CORS
            const response = await fetch(fullUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'MTGCommanderPicker/1.0 (randomcommander.xyz)'
                },
                mode: 'cors'
            });
            
            if (!response.ok) {
                throw new Error(`Scryfall API error: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Scryfall request failed:', error);
            throw error;
        }
    }

    getCacheKey(prefix, data) {
        return `${prefix}:${JSON.stringify(data)}`;
    }

    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        this.cache.delete(key);
        return null;
    }

    setCache(key, data) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now()
        });
        
        // Clean old cache entries periodically
        if (this.cache.size > 100) {
            const cutoff = Date.now() - this.cacheTimeout;
            for (const [k, v] of this.cache.entries()) {
                if (v.timestamp < cutoff) {
                    this.cache.delete(k);
                }
            }
        }
    }

    updateManaFilter() {
        const selectedFilter = document.querySelector('input[name="mana-filter"]:checked').value;
        const customControls = document.getElementById('custom-mana-controls');
        
        // Show/hide custom controls
        if (selectedFilter === 'custom') {
            customControls.style.display = 'block';
            this.updateCustomManaValues();
        } else {
            customControls.style.display = 'none';
            
            // Set predefined ranges
            switch (selectedFilter) {
                case 'any':
                    this.filters.manaMin = 0;
                    this.filters.manaMax = 15;
                    break;
                case 'low':
                    this.filters.manaMin = 1;
                    this.filters.manaMax = 3;
                    break;
                case 'mid':
                    this.filters.manaMin = 4;
                    this.filters.manaMax = 6;
                    break;
                case 'high':
                    this.filters.manaMin = 7;
                    this.filters.manaMax = 15;
                    break;
            }
        }
    }

    updateCustomManaValues() {
        const minInput = document.getElementById('mana-min-input');
        const maxInput = document.getElementById('mana-max-input');
        
        let min = parseInt(minInput.value);
        let max = parseInt(maxInput.value);
        
        // Ensure min doesn't exceed max
        if (min > max) {
            if (document.activeElement === minInput) {
                max = min;
                maxInput.value = max;
            } else {
                min = max;
                minInput.value = min;
            }
        }
        
        this.filters.manaMin = min;
        this.filters.manaMax = max;
    }

    async findCommander() {
        this.filters.colors = Array.from(this.selectedColors);
        
        // Clear queue when filters change
        this.commanderQueue = [];
        
        // Check cache first
        const cacheKey = this.getCacheKey('commander', this.filters);
        const cachedCommander = this.getFromCache(cacheKey);
        
        if (cachedCommander) {
            this.currentCommander = cachedCommander;
            document.getElementById('card-section').style.display = 'block';
            document.getElementById('deck-suggestions').style.display = 'none';
            this.displayCommander();
            // Prefetch more commanders in background
            this.prefetchCommanders();
            return;
        }
        
        // Show loading state
        document.getElementById('card-section').style.display = 'block';
        document.getElementById('deck-suggestions').style.display = 'none';
        document.getElementById('loading-screen').style.display = 'block';
        document.getElementById('swipe-hint').style.display = 'none';
        document.getElementById('card-container').style.display = 'none';
        document.getElementById('swipe-buttons').style.display = 'none';
        
        try {
            // Fetch a batch of commanders
            await this.prefetchCommanders();
            
            // Get the first one from the queue
            if (this.commanderQueue.length > 0) {
                this.currentCommander = this.commanderQueue.shift();
                this.setCache(cacheKey, this.currentCommander);
                this.displayCommander();
            } else {
                throw new Error('No commanders found');
            }
        } catch (error) {
            console.error('Error fetching commander:', error);
            document.getElementById('loading-screen').innerHTML = '<div style="text-align: center; padding: 40px; color: #ff5252;">❌ Error loading commander. Please try again.</div>';
        }
    }

    async prefetchCommanders() {
        console.log('Prefetching commanders... Current queue size:', this.commanderQueue.length);
        
        // Build Scryfall search query
        let query = 'is:commander';
        
        // Add color filter
        if (this.filters.colors.length > 0) {
            const colorQuery = this.filters.colors.join('');
            query += ` id:${colorQuery}`;
        }
        
        // Add mana value filter
        query += ` mv>=${this.filters.manaMin} mv<=${this.filters.manaMax}`;
        
        console.log('Scryfall query:', query);
        
        try {
            // Use rate-limited Scryfall request
            const searchParams = {
                q: query,
                order: 'random'
            };
            
            const data = await this.rateLimitedScryfallRequest(`${this.scryfallAPI}/cards/search`, searchParams);
            
            if (!data.data || data.data.length === 0) {
                // Fallback to any commander if no results
                const fallbackParams = {
                    q: 'is:commander',
                    order: 'random'
                };
                
                const fallbackData = await this.rateLimitedScryfallRequest(`${this.scryfallAPI}/cards/search`, fallbackParams);
                
                if (fallbackData.data && fallbackData.data.length > 0) {
                    // Shuffle the results to avoid alphabetical ordering
                    const shuffled = this.shuffleArray(fallbackData.data);
                    const commandersToAdd = shuffled.slice(0, this.queueSize);
                    
                    for (const card of commandersToAdd) {
                        await this.processAndQueueCommander(card);
                    }
                    console.log('Prefetched', commandersToAdd.length, 'commanders (fallback)');
                    return;
                }
                
                throw new Error('No commanders found');
            }
            
            // Shuffle the results to avoid alphabetical ordering
            const shuffled = this.shuffleArray(data.data);
            const commandersToAdd = shuffled.slice(0, this.queueSize);
            
            for (const card of commandersToAdd) {
                await this.processAndQueueCommander(card);
            }
            
            console.log('Prefetched', commandersToAdd.length, 'commanders. Queue size:', this.commanderQueue.length);
            
        } catch (error) {
            console.error('Error prefetching commanders:', error);
            throw error;
        }
    }

    async fetchRandomCommander() {
        // Check if we need to refill the queue
        if (this.commanderQueue.length < this.minQueueSize) {
            console.log('Queue low, prefetching more commanders...');
            await this.prefetchCommanders();
        }
        
        // Get next commander from queue
        if (this.commanderQueue.length > 0) {
            const commander = this.commanderQueue.shift();
            console.log('Got commander from queue:', commander.name, '- Remaining in queue:', this.commanderQueue.length);
            
            // Prefetch more in background if queue is getting low
            if (this.commanderQueue.length < this.minQueueSize) {
                this.prefetchCommanders().catch(err => console.log('Background prefetch failed:', err));
            }
            
            return commander;
        }
        
        // Fallback: fetch one commander directly if queue is empty
        console.log('Queue empty, fetching single commander...');
        return await this.fetchSingleCommander();
    }

    async fetchSingleCommander() {
        // Build Scryfall search query
        let query = 'is:commander';
        
        // Add color filter
        if (this.filters.colors.length > 0) {
            const colorQuery = this.filters.colors.join('');
            query += ` id:${colorQuery}`;
        }
        
        // Add mana value filter
        query += ` mv>=${this.filters.manaMin} mv<=${this.filters.manaMax}`;
        
        // Add bracket filter (approximate mapping)
        if (this.filters.bracket) {
            const bracket = parseInt(this.filters.bracket);
            if (bracket === 1) {
                query += ' -is:reserved (rarity:common OR rarity:uncommon)';
            } else if (bracket === 5) {
                query += ' (is:reserved OR rarity:mythic)';
            }
        }
        
        console.log('Scryfall query:', query);
        
        // Use rate-limited Scryfall request
        const searchParams = {
            q: query,
            order: 'random'
        };
        
        const data = await this.rateLimitedScryfallRequest(`${this.scryfallAPI}/cards/search`, searchParams);
        
        if (!data.data || data.data.length === 0) {
            // Fallback to any commander if no results
            const fallbackParams = {
                q: 'is:commander',
                order: 'random'
            };
            
            const fallbackData = await this.rateLimitedScryfallRequest(`${this.scryfallAPI}/cards/search`, fallbackParams);
            
            if (fallbackData.data && fallbackData.data.length > 0) {
                return this.processCommanderCard(fallbackData.data[0]);
            }
            
            throw new Error('No commanders found');
        }
        
        // Get random commander from results
        const randomCard = data.data[Math.floor(Math.random() * Math.min(data.data.length, 20))];
        return this.processCommanderCard(randomCard);
    }

    shuffleArray(array) {
        // Fisher-Yates shuffle algorithm
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    colorSymbols(colors) {
        // Convert color letters to mana symbols
        const symbolMap = {
            'W': '⚪',
            'U': '🔵',
            'B': '⚫',
            'R': '🔴',
            'G': '🟢',
            'C': '◯'
        };
        
        if (!colors || colors.length === 0) {
            return '◯'; // Colorless
        }
        
        return colors.map(c => symbolMap[c] || c).join('');
    }

    async processAndQueueCommander(card) {
        // Check if this commander has Partner
        const oracleText = card.oracle_text?.toLowerCase() || '';
        const hasPartner = card.keywords?.includes('Partner') || oracleText.includes('partner');
        
        if (hasPartner) {
            // Check for "Partner with [Name]"
            const partnerWithMatch = card.oracle_text?.match(/Partner with ([^(\n]+)/i);
            
            if (partnerWithMatch) {
                // This has a specific partner
                const partnerName = partnerWithMatch[1].trim();
                console.log(`${card.name} has Partner with ${partnerName}, fetching specific partner...`);
                
                try {
                    const partnerCard = await this.fetchSpecificPartner(partnerName);
                    if (partnerCard) {
                        const pairedCommander = this.processCommanderCard(card, partnerCard);
                        this.commanderQueue.push(pairedCommander);
                        return;
                    }
                } catch (error) {
                    console.log('Failed to fetch specific partner, using solo:', error);
                }
            } else if (!oracleText.includes('partner with')) {
                // This is a generic partner commander - fetch a random partner to pair with it
                console.log(`${card.name} has Partner, fetching a random partner...`);
                
                try {
                    const partnerCard = await this.fetchPartnerCommander(card);
                    if (partnerCard) {
                        const pairedCommander = this.processCommanderCard(card, partnerCard);
                        this.commanderQueue.push(pairedCommander);
                        return;
                    }
                } catch (error) {
                    console.log('Failed to fetch partner, using solo:', error);
                }
            }
        }
        
        // Regular commander or failed to get partner
        this.commanderQueue.push(this.processCommanderCard(card));
    }

    async fetchSpecificPartner(partnerName) {
        // Fetch the specific partner by name
        try {
            const data = await this.rateLimitedScryfallRequest(
                `${this.scryfallAPI}/cards/named`,
                { fuzzy: partnerName }
            );
            
            return data || null;
        } catch (error) {
            console.error('Error fetching specific partner:', error);
            return null;
        }
    }

    async fetchPartnerCommander(mainCard) {
        // Fetch a random commander with Partner that isn't the same as mainCard
        const partnerQuery = 'is:commander (o:"partner" OR keyword:partner) -o:"partner with"';
        
        try {
            const data = await this.rateLimitedScryfallRequest(
                `${this.scryfallAPI}/cards/search`,
                { q: partnerQuery, order: 'random' }
            );
            
            if (data.data && data.data.length > 0) {
                // Find a partner that isn't the same card
                const partner = data.data.find(card => card.id !== mainCard.id);
                return partner || null;
            }
        } catch (error) {
            console.error('Error fetching partner:', error);
        }
        
        return null;
    }

    processCommanderCard(card, partnerCard = null) {
        // Extract colors from color identity
        let colors = card.color_identity || [];
        let combinedColors = [...colors];
        
        // If there's a partner, combine color identities
        if (partnerCard) {
            const partnerColors = partnerCard.color_identity || [];
            combinedColors = [...new Set([...colors, ...partnerColors])].sort();
        }
        
        return {
            name: partnerCard ? `${card.name} & ${partnerCard.name}` : card.name,
            colors: combinedColors,
            manaValue: card.cmc || 0,
            type: card.type_line,
            imageUrl: card.image_uris?.normal || card.image_uris?.large || '',
            scryfallId: card.id,
            oracleText: card.oracle_text || '',
            explanation: partnerCard ? this.generatePartnerExplanation(card, partnerCard) : this.generateExplanation(card),
            deckSuggestions: null, // Will be fetched from EDHREC
            partner: partnerCard ? {
                name: partnerCard.name,
                imageUrl: partnerCard.image_uris?.normal || partnerCard.image_uris?.large || '',
                type: partnerCard.type_line,
                oracleText: partnerCard.oracle_text || ''
            } : null
        };
    }

    generatePartnerExplanation(card1, card2) {
        const colors = [...new Set([...(card1.color_identity || []), ...(card2.color_identity || [])])];
        return `This partner pairing gives you access to ${colors.length} colors and combines ${card1.name}'s abilities with ${card2.name}'s strengths. Partner commanders offer incredible flexibility and synergy potential!`;
    }

    generateRandomCommander() {
        // Sample commanders with different attributes
        const commanders = [
            {
                name: "Atraxa, Praetors' Voice",
                colors: ['W', 'U', 'B', 'G'],
                manaValue: 4,
                bracket: 4,
                type: "Legendary Creature — Phyrexian Angel Horror",
                imageUrl: "https://cards.scryfall.io/normal/front/d/0/d0d33d52-3d28-4635-b985-51e126289259.jpg",
                explanation: "Atraxa is perfect for +1/+1 counters, planeswalkers, or infect strategies. Her proliferate ability doubles down on any counter-based strategy, and her four-color identity gives you access to incredible versatility.",
                deckSuggestions: {
                    "Ramp & Fixing": ["Chromatic Lantern", "Farseek", "Cultivate", "Kodama's Reach"],
                    "Proliferate Synergy": ["Inexorable Tide", "Contagion Engine", "Viral Drake", "Thrummingbird"],
                    "Planeswalkers": ["Jace, the Mind Sculptor", "Elspeth, Knight-Errant", "Vraska the Unseen", "Garruk Wildspeaker"],
                    "Protection": ["Heroic Intervention", "Teferi's Protection", "Counterspell", "Path to Exile"]
                }
            },
            {
                name: "Rhys the Redeemed",
                colors: ['W', 'G'],
                manaValue: 1,
                bracket: 2,
                type: "Legendary Creature — Elf Warrior",
                imageUrl: "https://cards.scryfall.io/normal/front/b/9/b91dadcb-31e9-43b0-b425-c9311af3e9d7.jpg",
                explanation: "Rhys excels at token strategies and going wide. His low mana cost means early pressure, and his abilities scale incredibly well into the late game. Perfect for players who love overwhelming opponents with creatures.",
                deckSuggestions: {
                    "Token Generators": ["Parallel Lives", "Doubling Season", "Anointed Procession", "Rhys the Exiled"],
                    "Anthem Effects": ["Intangible Virtue", "Honor of the Pure", "Glorious Anthem", "Collective Blessing"],
                    "Ramp": ["Sol Ring", "Selesnya Signet", "Rampant Growth", "Nature's Lore"],
                    "Protection": ["Heroic Intervention", "Rootborn Defenses", "Make a Stand", "Unbreakable Formation"]
                }
            },
            {
                name: "Krenko, Mob Boss",
                colors: ['R'],
                manaValue: 4,
                bracket: 3,
                type: "Legendary Creature — Goblin Warrior",
                imageUrl: "https://cards.scryfall.io/normal/front/c/d/cd9fec9d-23c8-4d35-97c1-9499527198fb.jpg",
                explanation: "Krenko is the ultimate goblin tribal commander. He creates explosive turns and can quickly overwhelm opponents with sheer numbers. Great for aggressive players who want to see big numbers fast.",
                deckSuggestions: {
                    "Goblin Tribal": ["Goblin Chieftain", "Goblin King", "Goblin Warchief", "Siege-Gang Commander"],
                    "Token Support": ["Purphoros, God of the Forge", "Impact Tremors", "Goblin Bombardment", "Skirk Prospector"],
                    "Haste Enablers": ["Fervor", "Mass Hysteria", "Hammer of Purphoros", "Urabrask the Hidden"],
                    "Card Draw": ["Skullclamp", "Wheel of Fortune", "Reforge the Soul", "Faithless Looting"]
                }
            },
            {
                name: "Meren of Clan Nel Toth",
                colors: ['B', 'G'],
                manaValue: 4,
                bracket: 3,
                type: "Legendary Creature — Human Shaman",
                imageUrl: "https://cards.scryfall.io/normal/front/1/7/17d6703c-ad79-457b-a1b5-c2284e363085.jpg",
                explanation: "Meren rewards you for creatures dying and coming back. She's perfect for graveyard value strategies, sacrifice synergies, and controlling the board through recursive threats.",
                deckSuggestions: {
                    "Sacrifice Outlets": ["Viscera Seer", "Carrion Feeder", "Ashnod's Altar", "Phyrexian Altar"],
                    "Recursion": ["Eternal Witness", "Regrowth", "Reanimate", "Animate Dead"],
                    "Value Creatures": ["Sakura-Tribe Elder", "Wood Elves", "Solemn Simulacrum", "Acidic Slime"],
                    "Removal": ["Beast Within", "Putrefy", "Abrupt Decay", "Maelstrom Pulse"]
                }
            },
            {
                name: "Talrand, Sky Summoner",
                colors: ['U'],
                manaValue: 4,
                bracket: 2,
                type: "Legendary Creature — Merfolk Wizard",
                imageUrl: "https://cards.scryfall.io/normal/front/9/f/9f4e8d4c-79f8-4313-bdb4-2062d8f5299b.jpg",
                explanation: "Talrand turns every instant and sorcery into a threat. He's perfect for control players who want to win through incremental advantage while protecting themselves with counterspells and removal.",
                deckSuggestions: {
                    "Counterspells": ["Counterspell", "Mana Drain", "Force of Will", "Pact of Negation"],
                    "Card Draw": ["Rhystic Study", "Mystic Remora", "Fact or Fiction", "Blue Sun's Zenith"],
                    "Cheap Spells": ["Brainstorm", "Ponder", "Preordain", "Opt"],
                    "Win Conditions": ["Coat of Arms", "Favorable Winds", "Gravitational Shift", "Bident of Thassa"]
                }
            },
            {
                name: "Thrasios & Tymna",
                colors: ['W', 'U', 'G'],
                manaValue: 4,
                bracket: 5,
                type: "Legendary Creature — Merfolk Wizard // Legendary Creature — Human Cleric",
                imageUrl: "https://cards.scryfall.io/normal/front/f/2/f21f99ef-d6f4-4128-b778-de68ec7e79b6.jpg",
                explanation: "The ultimate cEDH partnership. Thrasios provides card advantage and mana sink, while Tymna draws cards off combat damage. Together they enable fast combo wins with incredible consistency and interaction.",
                deckSuggestions: {
                    "Fast Mana": ["Mana Crypt", "Sol Ring", "Mana Vault", "Chrome Mox"],
                    "Tutors": ["Demonic Tutor", "Vampiric Tutor", "Enlightened Tutor", "Mystical Tutor"],
                    "Combo Pieces": ["Thassa's Oracle", "Demonic Consultation", "Tainted Pact", "Laboratory Maniac"],
                    "Interaction": ["Force of Will", "Mental Misstep", "Swords to Plowshares", "Assassin's Trophy"]
                }
            },
            {
                name: "Kinnan, Bonder Prodigy",
                colors: ['U', 'G'],
                manaValue: 2,
                bracket: 5,
                type: "Legendary Creature — Human Druid",
                imageUrl: "https://cards.scryfall.io/normal/front/6/3/63cda4a0-0dff-4edb-ae67-a2b7e2971350.jpg",
                explanation: "Kinnan is a cEDH powerhouse that doubles mana from creatures and artifacts. He enables explosive turns and can consistently threaten wins by turn 3-4 through various infinite mana combos.",
                deckSuggestions: {
                    "Mana Dorks": ["Birds of Paradise", "Elvish Mystic", "Deathrite Shaman", "Bloom Tender"],
                    "Combo Enablers": ["Basalt Monolith", "Grim Monolith", "Rings of Brighthearth", "Freed from the Real"],
                    "Win Conditions": ["Thassa's Oracle", "Blue Sun's Zenith", "Walking Ballista", "Finale of Devastation"],
                    "Protection": ["Force of Will", "Force of Negation", "Veil of Summer", "Heroic Intervention"]
                }
            }
        ];

        // Filter commanders based on current filters
        let filteredCommanders = commanders.filter(commander => {
            // Color filter
            if (this.filters.colors.length > 0) {
                const hasAllColors = this.filters.colors.every(color => commander.colors.includes(color));
                const hasOnlySelectedColors = commander.colors.every(color => this.filters.colors.includes(color));
                if (!hasAllColors || !hasOnlySelectedColors) return false;
            }

            // Bracket filter
            if (this.filters.bracket && commander.bracket !== parseInt(this.filters.bracket)) {
                return false;
            }

            // Mana value filter
            if (commander.manaValue < this.filters.manaMin || commander.manaValue > this.filters.manaMax) {
                return false;
            }

            return true;
        });

        // If no commanders match, use all commanders
        if (filteredCommanders.length === 0) {
            filteredCommanders = commanders;
        }

        // Return random commander
        return filteredCommanders[Math.floor(Math.random() * filteredCommanders.length)];
    }

    displayCommander() {
        console.log('Displaying commander:', this.currentCommander.name);
        console.log('Commander mana value:', this.currentCommander.manaValue);
        console.log('Commander colors:', this.currentCommander.colors);
        
        // Reset loading screen content in case it had an error message
        const loadingScreen = document.getElementById('loading-screen');
        loadingScreen.innerHTML = `
            <div class="loading-spinner"></div>
            <p>Finding your perfect commander...</p>
        `;
        
        // Hide loading, show card
        loadingScreen.style.display = 'none';
        document.getElementById('swipe-hint').style.display = 'block';
        document.getElementById('card-container').style.display = 'block';
        document.getElementById('swipe-buttons').style.display = 'flex';
        
        const cardContainer = document.getElementById('card-container');
        const commander = this.currentCommander;
        
        // Reset container styles completely
        cardContainer.style.opacity = '1';
        cardContainer.style.transform = '';
        cardContainer.style.transition = '';
        
        // Check if this is a partner pairing
        if (commander.partner) {
            cardContainer.innerHTML = `
                <div class="commander-card partner-card">
                    <div class="partner-images">
                        <img class="partner-img" src="${commander.imageUrl}" alt="${commander.name.split(' & ')[0]}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1URyBDYXJkPC90ZXh0Pjwvc3ZnPg=='">
                        <img class="partner-img" src="${commander.partner.imageUrl}" alt="${commander.partner.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1URyBDYXJkPC90ZXh0Pjwvc3ZnPg=='">
                    </div>
                    <div class="card-info">
                        <h2 id="card-name">${commander.name}</h2>
                        <p id="card-type">Partner Commanders</p>
                        <p style="margin-bottom: 10px;"><strong>Colors:</strong> ${this.colorSymbols(commander.colors)}</p>
                        <div class="explanation" id="explanation">
                            <strong>Why build this deck?</strong><br>
                            ${commander.explanation}
                        </div>
                    </div>
                </div>
            `;
        } else {
            cardContainer.innerHTML = `
                <div class="commander-card">
                    <img id="card-image" src="${commander.imageUrl}" alt="${commander.name}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk1URyBDYXJkPC90ZXh0Pjwvc3ZnPg=='">
                    <div class="card-info">
                        <h2 id="card-name">${commander.name}</h2>
                        <p id="card-type">${commander.type}</p>
                        <p style="margin-bottom: 10px;"><strong>Mana Value:</strong> ${commander.manaValue} | <strong>Colors:</strong> ${this.colorSymbols(commander.colors)}</p>
                        <div class="explanation" id="explanation">
                            <strong>Why build this deck?</strong><br>
                            ${commander.explanation}
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Re-initialize swipe after new card is displayed
        console.log('Re-initializing swipe for new card');
        this.initializeSwipe();
    }

    async fetchCardsByQuery(query, limit = 6) {
        try {
            const params = {
                q: query,
                order: 'edhrec',
                unique: 'cards'
            };
            
            const data = await this.rateLimitedScryfallRequest(`${this.scryfallAPI}/cards/search`, params);
            return data.data ? data.data.slice(0, limit).map(card => card.name) : [];
        } catch (error) {
            console.error('Error fetching cards by query:', error);
            return [];
        }
    }

    async acceptCommander() {
        console.log('Accept commander called for:', this.currentCommander.name);
        
        document.getElementById('card-section').style.display = 'none';
        document.getElementById('deck-suggestions').style.display = 'block';
        
        // Show loading state for deck suggestions
        const deckContent = document.getElementById('deck-content');
        deckContent.innerHTML = '<div style="text-align: center; padding: 40px;">📊 Fetching popular cards from EDHREC...</div>';
        
        try {
            await this.fetchDeckSuggestions();
            this.displayDeckSuggestions();
        } catch (error) {
            console.error('Error fetching deck suggestions:', error);
            deckContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff5252;">❌ Error loading deck suggestions. Using basic recommendations.</div>';
            this.displayBasicDeckSuggestions();
        }
    }

    async fetchDeckSuggestions() {
        if (!this.currentCommander.name) {
            throw new Error('No commander name available');
        }

        try {
            // Try to get EDHREC data by scraping
            const suggestions = await this.scrapeEDHRECData(this.currentCommander.name);
            
            if (suggestions && Object.keys(suggestions).length > 0) {
                this.currentCommander.deckSuggestions = suggestions;
            } else {
                throw new Error('No EDHREC data available');
            }
        } catch (error) {
            console.log('EDHREC scraping failed, using Scryfall recommendations:', error);
            // Fallback to Scryfall-based suggestions
            this.currentCommander.deckSuggestions = await this.generateScryfallSuggestions();
        }
    }

    async scrapeEDHRECData(commanderName) {
        // Normalize commander name for EDHREC URL
        const normalizedName = commanderName.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-');
        
        const edhrecUrl = `https://edhrec.com/commanders/${normalizedName}`;
        
        try {
            // Use a CORS proxy to fetch EDHREC data
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(edhrecUrl)}`;
            const response = await fetch(proxyUrl);
            
            if (!response.ok) {
                throw new Error('Failed to fetch EDHREC data');
            }
            
            const data = await response.json();
            const htmlContent = data.contents;
            
            // Parse the HTML to extract card recommendations
            return this.parseEDHRECHTML(htmlContent);
            
        } catch (error) {
            console.error('EDHREC scraping error:', error);
            return null;
        }
    }

    parseEDHRECHTML(html) {
        // Create a temporary DOM element to parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const suggestions = {};
        
        try {
            // Look for card recommendation sections
            const cardSections = doc.querySelectorAll('.cardview-container, .card-grid, .cardlist');
            
            cardSections.forEach((section, index) => {
                const cards = [];
                
                // Extract card names from various possible selectors
                const cardElements = section.querySelectorAll(
                    '.card-name, .cardview-name, [data-card-name], .card-title, a[href*="/cards/"]'
                );
                
                cardElements.forEach(element => {
                    let cardName = element.textContent?.trim() || 
                                  element.getAttribute('data-card-name') || 
                                  element.getAttribute('title');
                    
                    if (cardName && cardName.length > 2 && !cards.includes(cardName)) {
                        cards.push(cardName);
                    }
                });
                
                if (cards.length > 0) {
                    // Try to determine category from section headers
                    const header = section.querySelector('h2, h3, .section-title, .cardlist-title');
                    const categoryName = header?.textContent?.trim() || `Category ${index + 1}`;
                    
                    suggestions[categoryName] = cards.slice(0, 8); // Limit to 8 cards per category
                }
            });
            
            // If no structured data found, try alternative parsing
            if (Object.keys(suggestions).length === 0) {
                return this.parseEDHRECAlternative(doc);
            }
            
            return suggestions;
            
        } catch (error) {
            console.error('Error parsing EDHREC HTML:', error);
            return {};
        }
    }

    parseEDHRECAlternative(doc) {
        // Alternative parsing method for different EDHREC layouts
        const suggestions = {
            "Popular Cards": [],
            "Creatures": [],
            "Instants & Sorceries": [],
            "Artifacts & Enchantments": []
        };
        
        // Look for any links that might be card names
        const cardLinks = doc.querySelectorAll('a[href*="/cards/"], a[href*="scryfall.com"]');
        
        cardLinks.forEach(link => {
            const cardName = link.textContent?.trim();
            if (cardName && cardName.length > 2) {
                // Categorize based on context or just add to popular
                suggestions["Popular Cards"].push(cardName);
            }
        });
        
        // Remove duplicates and limit
        Object.keys(suggestions).forEach(category => {
            suggestions[category] = [...new Set(suggestions[category])].slice(0, 8);
        });
        
        // Remove empty categories
        Object.keys(suggestions).forEach(category => {
            if (suggestions[category].length === 0) {
                delete suggestions[category];
            }
        });
        
        return suggestions;
    }

    async generateScryfallSuggestions() {
        // Generate suggestions based on commander colors and characteristics
        const colors = this.currentCommander.colors;
        const suggestions = {};
        
        try {
            // Fetch popular cards in commander's colors
            const colorQuery = colors.length > 0 ? `id:${colors.join('')}` : '';
            
            // Ramp spells
            const rampQuery = `${colorQuery} (o:"search your library for" OR o:"add mana") type:instant OR type:sorcery`;
            const rampCards = await this.fetchCardsByQuery(rampQuery, 6);
            if (rampCards.length > 0) suggestions['Ramp & Fixing'] = rampCards;
            
            // Removal spells
            const removalQuery = `${colorQuery} (o:"destroy" OR o:"exile") -type:creature`;
            const removalCards = await this.fetchCardsByQuery(removalQuery, 6);
            if (removalCards.length > 0) suggestions['Removal'] = removalCards;
            
            // Card draw
            const drawQuery = `${colorQuery} o:"draw" type:instant OR type:sorcery OR type:enchantment`;
            const drawCards = await this.fetchCardsByQuery(drawQuery, 6);
            if (drawCards.length > 0) suggestions['Card Draw'] = drawCards;
            
            // Creatures
            const creatureQuery = `${colorQuery} type:creature cmc<=4`;
            const creatures = await this.fetchCardsByQuery(creatureQuery, 8);
            if (creatures.length > 0) suggestions['Creatures'] = creatures;
            
        } catch (error) {
            console.error('Error generating Scryfall suggestions:', error);
        }
        
        // Fallback basic suggestions if API fails
        if (Object.keys(suggestions).length === 0) {
            suggestions['Staples'] = ['Sol Ring', 'Command Tower', 'Arcane Signet', 'Swords to Plowshares'];
            suggestions['Ramp'] = ['Cultivate', 'Kodama\'s Reach', 'Rampant Growth', 'Farseek'];
        }
        
        return suggestions;
    }

    generateExplanation(card) {
        // Get more specific based on card characteristics
        const colors = card.color_identity || [];
        const colorCount = colors.length;
        const cmc = card.cmc || 0;
        const oracleText = (card.oracle_text || '').toLowerCase();
        
        // Analyze card abilities for better explanations
        let themes = [];
        if (oracleText.includes('draw')) themes.push('card advantage');
        if (oracleText.includes('token')) themes.push('token generation');
        if (oracleText.includes('counter')) themes.push('counter synergies');
        if (oracleText.includes('graveyard') || oracleText.includes('dies')) themes.push('graveyard recursion');
        if (oracleText.includes('sacrifice')) themes.push('sacrifice strategies');
        if (oracleText.includes('combat') || oracleText.includes('attack')) themes.push('combat-focused gameplay');
        if (oracleText.includes('spell') || oracleText.includes('instant') || oracleText.includes('sorcery')) themes.push('spellslinger');
        if (oracleText.includes('artifact')) themes.push('artifact synergies');
        if (oracleText.includes('enchantment')) themes.push('enchantment strategies');
        if (oracleText.includes('tribal') || oracleText.includes('creature type')) themes.push('tribal synergies');
        
        // Build explanation based on characteristics
        let explanation = `${card.name} `;
        
        if (themes.length > 0) {
            explanation += `excels at ${themes.slice(0, 2).join(' and ')}. `;
        } else {
            explanation += `offers unique gameplay opportunities. `;
        }
        
        // Add color-based strategy
        if (colorCount === 0) {
            explanation += `As a colorless commander, it fits into any deck and offers universal utility.`;
        } else if (colorCount === 1) {
            const colorThemes = {
                'W': 'protection, lifegain, and go-wide strategies',
                'U': 'control, card draw, and spell manipulation',
                'B': 'removal, graveyard recursion, and sacrifice synergies',
                'R': 'aggressive strategies, direct damage, and artifact synergies',
                'G': 'ramp, big creatures, and overwhelming board presence'
            };
            explanation += `This mono-${colors[0]} commander focuses on ${colorThemes[colors[0]] || 'focused strategies'}.`;
        } else if (colorCount === 2) {
            explanation += `This two-color commander provides excellent flexibility while maintaining consistent mana.`;
        } else if (colorCount >= 3) {
            explanation += `With access to ${colorCount} colors, this commander offers incredible versatility and powerful card options.`;
        }
        
        // Add CMC consideration
        if (cmc <= 3) {
            explanation += ` Its low mana cost means you can cast it early and often.`;
        } else if (cmc >= 6) {
            explanation += ` While expensive, the powerful abilities justify the investment.`;
        }
        
        return explanation;
    }

    displayDeckSuggestions() {
        const deckContent = document.getElementById('deck-content');
        const commander = this.currentCommander;
        
        if (!commander.deckSuggestions || Object.keys(commander.deckSuggestions).length === 0) {
            this.displayBasicDeckSuggestions();
            return;
        }
        
        let suggestionsHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3>Building around ${commander.name}</h3>
                <p>Popular cards from EDHREC and Scryfall data:</p>
            </div>
        `;
        
        Object.entries(commander.deckSuggestions).forEach(([category, cards]) => {
            if (cards && cards.length > 0) {
                suggestionsHTML += `
                    <div class="deck-category">
                        <h3>${category}</h3>
                        <div class="card-list">
                            ${cards.map(card => `<span class="card-suggestion">${card}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        });
        
        deckContent.innerHTML = suggestionsHTML;
    }

    displayBasicDeckSuggestions() {
        const deckContent = document.getElementById('deck-content');
        const commander = this.currentCommander;
        
        // Basic suggestions based on colors
        const basicSuggestions = {
            'Staples': ['Sol Ring', 'Command Tower', 'Arcane Signet', 'Lightning Greaves'],
            'Ramp': ['Cultivate', 'Kodama\'s Reach', 'Rampant Growth', 'Nature\'s Lore'],
            'Removal': ['Swords to Plowshares', 'Path to Exile', 'Beast Within', 'Generous Gift'],
            'Card Draw': ['Rhystic Study', 'Mystic Remora', 'Phyrexian Arena', 'Sylvan Library']
        };
        
        let suggestionsHTML = `
            <div style="text-align: center; margin-bottom: 20px;">
                <h3>Building around ${commander.name}</h3>
                <p>Basic deck building recommendations:</p>
            </div>
        `;
        
        Object.entries(basicSuggestions).forEach(([category, cards]) => {
            suggestionsHTML += `
                <div class="deck-category">
                    <h3>${category}</h3>
                    <div class="card-list">
                        ${cards.map(card => `<span class="card-suggestion">${card}</span>`).join('')}
                    </div>
                </div>
            `;
        });
        
        deckContent.innerHTML = suggestionsHTML;
    }

    rejectCommander() {
        console.log('Reject commander called');
        
        // Show loading state immediately
        const cardContainer = document.getElementById('card-container');
        const loadingScreen = document.getElementById('loading-screen');
        const swipeHint = document.getElementById('swipe-hint');
        const swipeButtons = document.getElementById('swipe-buttons');
        
        // Wait for fly-off animation, then show next commander
        setTimeout(() => {
            // Check if we have a commander in the queue
            if (this.commanderQueue.length > 0) {
                console.log('Getting commander from queue. Remaining:', this.commanderQueue.length);
                this.currentCommander = this.commanderQueue.shift();
                this.displayCommander();
                
                // Prefetch more in background if queue is getting low
                if (this.commanderQueue.length < this.minQueueSize) {
                    console.log('Queue low, prefetching in background...');
                    this.prefetchCommanders().catch(err => console.log('Background prefetch failed:', err));
                }
            } else {
                // Queue is empty, show loading and fetch
                cardContainer.style.display = 'none';
                swipeHint.style.display = 'none';
                swipeButtons.style.display = 'none';
                loadingScreen.style.display = 'block';
                
                // Fetch new commander
                this.fetchRandomCommander()
                    .then(commander => {
                        console.log('New commander fetched:', commander.name);
                        this.currentCommander = commander;
                        this.displayCommander();
                    })
                    .catch(error => {
                        console.error('Error fetching new commander:', error);
                        loadingScreen.innerHTML = '<div style="text-align: center; padding: 40px; color: #ff5252;">❌ Error loading commander. Please try again.</div>';
                    });
            }
        }, 350); // Wait for fly-off animation to complete
    }

    resetToFilters() {
        document.getElementById('card-section').style.display = 'none';
        document.getElementById('deck-suggestions').style.display = 'none';
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Initialize the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new MTGCommanderPicker();
});