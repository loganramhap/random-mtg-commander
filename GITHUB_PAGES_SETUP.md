# GitHub Pages Setup Guide

This guide will help you deploy the MTG Commander Picker to GitHub Pages.

## Automatic Deployment (Recommended)

### 1. Enable GitHub Pages
1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Pages** section
4. Under **Source**, select **GitHub Actions**
5. The workflow will automatically deploy on every push to `main`

### 2. Repository Settings
Make sure your repository name matches the `base` path in `vite.config.js`:
- If your repo is named `random-mtg-commander`, the config is already correct
- If you rename it, update the `base` path in `vite.config.js`

### 3. Access Your App
After the first successful deployment:
- Your app will be available at: `https://yourusername.github.io/random-mtg-commander/`
- Check the **Actions** tab to monitor deployment progress

## Manual Deployment (Alternative)

If you prefer manual deployment:

```bash
# Install dependencies
npm install

# Build and deploy
npm run deploy
```

This uses the `gh-pages` package to push the built files to the `gh-pages` branch.

## Custom Domain (Optional)

### 1. Add Your Domain
1. Uncomment and edit the `CNAME` file with your domain
2. Commit and push the changes

### 2. Configure DNS
Point your domain's DNS to GitHub Pages:
- **A Records**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- **CNAME Record**: `yourusername.github.io`

### 3. Update Vite Config
Update `vite.config.js` to use your custom domain:
```javascript
base: process.env.NODE_ENV === 'production' ? '/' : '/'
```

## Troubleshooting

### Build Fails
- Check the **Actions** tab for error details
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### 404 Errors
- Check that the `base` path in `vite.config.js` matches your repository name
- Ensure GitHub Pages is enabled and set to use GitHub Actions

### CORS Issues
- The app uses a CORS proxy (allorigins.win) for EDHREC data
- If the proxy is down, the app falls back to Scryfall-only recommendations
- No additional CORS configuration needed for GitHub Pages

### Slow Loading
- GitHub Pages uses a CDN, but first load might be slow
- Consider enabling browser caching headers (automatic with GitHub Pages)

## Development vs Production

### Development
```bash
npm run dev
# Runs on http://localhost:3000
```

### Production Build
```bash
npm run build
# Creates optimized files in dist/
```

### Preview Production Build
```bash
npm run preview
# Test the production build locally
```

## GitHub Actions Workflow

The included workflow (`.github/workflows/deploy.yml`) automatically:
1. **Triggers** on pushes to `main` branch
2. **Installs** Node.js and dependencies
3. **Builds** the application with Vite
4. **Deploys** to GitHub Pages
5. **Provides** the live URL in the deployment

## Performance on GitHub Pages

### Advantages
- **Free hosting** with generous bandwidth
- **Global CDN** for fast loading worldwide
- **HTTPS** enabled by default
- **Custom domains** supported
- **Automatic deployments** with GitHub Actions

### Considerations
- **Static only** - perfect for this app since it's client-side
- **Rate limits** - GitHub Pages has usage limits but they're generous
- **Build time** - Actions have execution time limits (plenty for this app)

## Monitoring

### Check Deployment Status
- **Actions tab**: See build and deployment logs
- **Environments**: View deployment history and URLs
- **Settings > Pages**: Verify configuration

### Analytics (Optional)
Add Google Analytics or similar by editing `index.html`:
```html
<!-- Add before closing </head> tag -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

## Security

### HTTPS
- GitHub Pages enforces HTTPS automatically
- All API calls (Scryfall, CORS proxy) use HTTPS

### Content Security
- No server-side code means minimal attack surface
- All data fetching happens client-side
- No user data stored or transmitted

Your MTG Commander Picker will be live and accessible to anyone once deployed! 🎯