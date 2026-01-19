# MTG Commander Picker 🎯

A Tinder-style web app for discovering your next Magic: The Gathering commander! Uses real data from Scryfall API and EDHREC via the `pyedhrec` Python wrapper for authentic commander suggestions and popular deck building recommendations.

## Features

- **Real MTG Data**: Powered by Scryfall API for accurate commander information
- **EDHREC Integration**: Uses `pyedhrec` Python wrapper for reliable EDHREC data access
- **Smart Filters**: Choose colors, bracket levels (1-5 including cEDH), and mana value ranges
- **Tinder-Style Interface**: Swipe left to pass, right to pick your commander
- **Detailed Card Info**: High-quality card images and oracle text
- **Popular Card Suggestions**: Real EDHREC data organized by deck categories
- **Mobile Responsive**: Works great on desktop and mobile devices

## Architecture

### Frontend (JavaScript)
- Vanilla JavaScript with modern ES6+ features
- Fetches commanders from Scryfall API
- Communicates with Python backend for EDHREC data

### Backend (Python)
- FastAPI service using `pyedhrec` wrapper
- Handles EDHREC data fetching and processing
- Provides clean REST API for frontend consumption
- CORS enabled for local development

## Quick Start

### Option 1: Automatic Setup (Recommended)
```bash
# Install Node.js dependencies
npm install

# Install Python dependencies
pip install -r requirements.txt

# Start both services automatically
npm run start-all
```

### Option 2: Manual Setup
```bash
# Terminal 1: Start Python EDHREC service
pip install -r requirements.txt
python api/edhrec_service.py

# Terminal 2: Start frontend
npm install
npm run dev
```

## API Endpoints

### Python EDHREC Service (Port 8000)
- `GET /` - Service health check
- `GET /commander/{name}` - Get commander data from EDHREC
- `GET /commander/{name}/recommendations` - Get card recommendations
- `GET /search/commanders` - Search commanders with filters

### Frontend (Port 3000)
- Main web application interface

## Dependencies

### Python Requirements
- `fastapi` - Modern web framework
- `pyedhrec` - Official EDHREC Python wrapper
- `uvicorn` - ASGI server
- `requests` - HTTP client for Scryfall API

### Node.js Requirements
- `vite` - Build tool and dev server
- `express` - Web server for production

## Development

### Adding New Features
1. **Commander Filters**: Modify Scryfall queries in `fetchRandomCommander()`
2. **EDHREC Categories**: Update `process_recommendations()` in Python service
3. **UI Components**: Edit HTML/CSS/JS files directly

### API Integration
- Scryfall API: Direct frontend calls (no rate limiting needed)
- EDHREC API: Through Python service using `pyedhrec` wrapper

## Deployment

### Development
```bash
npm run start-all  # Starts both services
```

### Production Options

#### Option 1: Separate Services
Deploy Python service and Node.js frontend separately:
- Python service: Railway, Render, or Heroku
- Frontend: Vercel, Netlify, or static hosting

#### Option 2: Docker
```dockerfile
# Multi-stage build with both Python and Node.js
# (Docker configuration can be added if needed)
```

#### Option 3: Serverless
- Convert Python service to serverless functions
- Deploy frontend as static site

## Configuration

### Environment Variables
```bash
# Python service
EDHREC_API_PORT=8000
CORS_ORIGINS=http://localhost:3000

# Frontend
VITE_EDHREC_API_URL=http://localhost:8000
```

## Troubleshooting

### Common Issues
1. **CORS Errors**: Ensure Python service is running on port 8000
2. **pyedhrec Import Error**: Run `pip install -r requirements.txt`
3. **Node Modules Missing**: Run `npm install`
4. **Port Conflicts**: Change ports in configuration files

### Service Status
- Python service: http://localhost:8000 (should show service info)
- Frontend: http://localhost:3000 (main application)

## Contributing

Feel free to:
- Add more sophisticated EDHREC data processing
- Improve commander filtering and search
- Add caching for better performance
- Enhance the UI/UX
- Add more deployment options

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, Vite
- **Backend**: Python, FastAPI, pyedhrec
- **APIs**: Scryfall (direct), EDHREC (via pyedhrec)
- **Deployment**: Node.js + Python services