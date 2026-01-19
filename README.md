# MTG Commander Picker 🎯

A Tinder-style web app for discovering your next Magic: The Gathering commander! Uses Scryfall API for commander data and scrapes EDHREC for popular deck building recommendations. Pure JavaScript - no backend required!

## Features

- **Real MTG Data**: Powered by Scryfall API for accurate commander information
- **EDHREC Integration**: Scrapes EDHREC data for popular card suggestions
- **Smart Filters**: Choose colors, bracket levels (1-5 including cEDH), and mana value ranges
- **Tinder-Style Interface**: Swipe left to pass, right to pick your commander
- **Detailed Card Info**: High-quality card images and oracle text
- **Popular Card Suggestions**: Real EDHREC data organized by deck categories
- **Mobile Responsive**: Works great on desktop and mobile devices
- **Pure Frontend**: No backend required - deploys anywhere static sites work

## Architecture

### Single-Page Application
- **Vanilla JavaScript** with modern ES6+ features
- **Direct API Integration** with Scryfall for commander data
- **Client-side EDHREC scraping** using CORS proxy
- **Built-in caching** for better performance
- **Rate limiting** to respect Scryfall's API guidelines

## Quick Start

### Development
```bash
# If you have an old package-lock.json, delete it first
rm -rf package-lock.json node_modules

# Install dependencies
npm install

# If you get Rollup errors, install the platform-specific dependency
npm install @rollup/rollup-linux-x64-gnu --save-optional

# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## API Integration

### Scryfall API
- **Rate Limited**: 75ms delay between requests (within 50-100ms requirement)
- **Smart Caching**: 10-minute client-side cache for repeated requests
- **Fallback Logic**: Graceful handling of API failures
- **Advanced Filtering**: Color identity, mana value, bracket estimation

### EDHREC Scraping
- **CORS Proxy**: Uses allorigins.win to bypass CORS restrictions
- **HTML Parsing**: Extracts card recommendations from EDHREC pages
- **Fallback System**: Uses Scryfall data if EDHREC scraping fails
- **Smart Categorization**: Organizes cards by type and synergy

## GitHub Pages Deployment

This app is designed specifically for GitHub Pages deployment!

### Automatic Deployment (Recommended)
1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"
   
2. **Push to main branch** - the app auto-deploys via GitHub Actions

3. **Access your app** at: `https://yourusername.github.io/random-mtg-commander/`

### Manual Deployment
```bash
npm install
npm run deploy  # Uses gh-pages package
```

### Custom Domain (Optional)
1. Edit the `CNAME` file with your domain
2. Configure DNS to point to GitHub Pages
3. Update `vite.config.js` base path to `/`

See `GITHUB_PAGES_SETUP.md` for detailed instructions.

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Open http://localhost:3000
```

### Production Build
```bash
# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Performance Features

### Caching System
- **Client-side cache**: 10-minute TTL for API responses
- **Smart cache keys**: Based on filter combinations
- **Automatic cleanup**: Prevents memory leaks
- **Cache statistics**: Monitor performance in browser console

### Rate Limiting
- **Scryfall compliance**: 75ms delay between requests
- **Request queuing**: Prevents API limit violations
- **Graceful degradation**: Continues working if rate limited

### Optimization
- **Lazy loading**: Images load as needed
- **Efficient parsing**: Minimal DOM manipulation
- **Compressed assets**: Vite optimizes bundle size
- **CDN ready**: All assets can be served from CDN

## Browser Support

- **Modern browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Mobile browsers**: iOS Safari 13+, Chrome Mobile 80+
- **Required features**: ES6 modules, Fetch API, DOM Parser

## Development

### Project Structure
```
├── .github/workflows/   # GitHub Actions deployment
├── index.html          # Main HTML file
├── script.js           # Main application logic
├── style.css           # Styles and responsive design
├── vite.config.js      # Vite configuration
├── CNAME               # Custom domain (optional)
└── dist/               # Built files (generated)
```

### Adding Features
1. **New Filters**: Modify `fetchRandomCommander()` Scryfall queries
2. **EDHREC Parsing**: Update `parseEDHRECHTML()` for new layouts
3. **UI Components**: Edit HTML/CSS directly
4. **Caching**: Adjust cache TTL in constructor

### API Rate Limits
- **Scryfall**: ~13 requests/second (within 10 req/sec average guideline)
- **EDHREC**: Respectful scraping with delays between requests
- **CORS Proxy**: allorigins.win has generous limits for hobby projects

## Troubleshooting

### Common Issues

1. **CORS Errors**
   - The app uses allorigins.win proxy for EDHREC
   - If proxy fails, it falls back to Scryfall recommendations

2. **Slow Loading**
   - Check browser network tab for failed requests
   - Clear browser cache if needed
   - EDHREC scraping can be slow on first load

3. **No Commanders Found**
   - Try broader filter settings
   - Check browser console for API errors
   - Scryfall API might be temporarily unavailable

4. **Missing Card Images**
   - Images load from Scryfall CDN
   - Fallback placeholder shows if image fails
   - Check network connectivity

### Performance Tips
- Use browser dev tools to monitor network requests
- Check console for cache hit/miss statistics
- Monitor memory usage for long sessions

## Contributing

Feel free to:
- Improve EDHREC scraping reliability
- Add more sophisticated filtering options
- Enhance mobile responsiveness
- Add new deployment configurations
- Optimize bundle size and performance

## Tech Stack

- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **Build Tool**: Vite for development and building
- **APIs**: Scryfall (direct), EDHREC (scraped via CORS proxy)
- **Deployment**: GitHub Pages with GitHub Actions
- **Hosting**: Static files served from GitHub's CDN

## License

MIT License - feel free to use this project as a starting point for your own MTG tools!