# Deployment Guide

This guide covers multiple deployment options for the MTG Commander Picker application.

## Quick Deploy Options

### 1. Railway (Recommended for Full-Stack)
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click the Railway button above
2. Connect your GitHub repository
3. Railway will automatically detect the Dockerfile and deploy
4. Your app will be available at `https://your-app.railway.app`

### 2. Render
1. Connect your GitHub repository to Render
2. Render will use the `render.yaml` configuration automatically
3. Your app will be available at `https://your-app.onrender.com`

### 3. Docker (Self-Hosted)
```bash
# Build and run with Docker
docker build -t mtg-commander-picker .
docker run -p 8000:8000 mtg-commander-picker

# Or use Docker Compose
docker-compose up
```

### 4. Vercel (Frontend + Serverless Functions)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Manual Deployment

### Prerequisites
- Python 3.9+
- Node.js 18+
- Git

### Backend Deployment (Python API)

#### Option A: Traditional Server
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run the API server
python api/edhrec_service.py

# Or with Gunicorn for production
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker api.edhrec_service:app
```

#### Option B: Serverless (AWS Lambda, Google Cloud Functions)
The FastAPI app can be adapted for serverless deployment using:
- Mangum (for AWS Lambda)
- Functions Framework (for Google Cloud)

### Frontend Deployment

#### Static Hosting (Netlify, Vercel, GitHub Pages)
```bash
# Build the frontend
npm run build

# Upload the 'dist' folder to your static host
```

#### CDN Deployment
The built files in `dist/` can be uploaded to any CDN:
- AWS CloudFront + S3
- Cloudflare Pages
- Azure Static Web Apps

## Environment Configuration

### Development
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
```

### Production Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 8000 |
| `CORS_ORIGINS` | Allowed CORS origins | * |
| `NODE_ENV` | Environment mode | development |
| `VITE_EDHREC_API_URL` | API URL for frontend | http://localhost:8000 |

## Performance Optimization

### Caching
- The Python API includes built-in caching for EDHREC data
- Cache TTL: 1-2 hours for most data
- Clear cache via `/cache/clear` endpoint

### Rate Limiting
- Scryfall API: 50-100ms delay between requests (built-in)
- EDHREC API: Respectful usage via pyedhrec wrapper

### Monitoring
- Health check endpoint: `/api/health`
- Cache statistics: `/api/` (root endpoint)

## Scaling Considerations

### Horizontal Scaling
- The API is stateless and can be scaled horizontally
- Use a shared cache (Redis) for multi-instance deployments

### Database Integration
For high-traffic deployments, consider:
- PostgreSQL for persistent caching
- Redis for session management
- MongoDB for user preferences

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - Ensure `CORS_ORIGINS` includes your frontend domain
   - Check that the API is accessible from your frontend

2. **Python Dependencies**
   - Use Python 3.9+ for best compatibility
   - Install with `pip install -r requirements.txt`

3. **Node.js Build Issues**
   - Use Node.js 18+ for Vite compatibility
   - Clear node_modules and reinstall if needed

4. **API Timeouts**
   - EDHREC API may be slow; increase timeout settings
   - Implement retry logic for failed requests

### Logs and Debugging

#### Development
```bash
# Python API logs
python api/edhrec_service.py

# Frontend dev server
npm run dev
```

#### Production
- Check application logs in your deployment platform
- Monitor the `/api/health` endpoint
- Use the cache statistics at `/api/` root endpoint

## Security Considerations

### API Security
- CORS is configured for your domains
- No authentication required (public API)
- Rate limiting prevents abuse

### Frontend Security
- Static files served with appropriate headers
- No sensitive data stored client-side
- API calls use HTTPS in production

## Cost Optimization

### Free Tier Options
- **Railway**: 500 hours/month free
- **Render**: 750 hours/month free
- **Vercel**: Generous free tier for hobby projects
- **Netlify**: 100GB bandwidth/month free

### Paid Scaling
- Start with basic plans ($5-10/month)
- Scale based on actual usage
- Monitor API call patterns for optimization