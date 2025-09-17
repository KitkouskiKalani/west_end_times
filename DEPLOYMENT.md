# Deployment Guide

This guide will help you deploy your West End game to GitHub Pages or Netlify.

## 🚀 GitHub Pages Deployment

### Prerequisites
- GitHub account
- Repository on GitHub

### Steps

1. **Push your code to GitHub:**
   ```bash
   git add .
   git commit -m "Add mobile touch support and deployment config"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository on GitHub
   - Click on "Settings" tab
   - Scroll down to "Pages" section
   - Under "Source", select "GitHub Actions"
   - The workflow will automatically deploy when you push to main branch

3. **Update the homepage URL:**
   - Edit `package.json` and replace `yourusername` with your actual GitHub username
   - Edit `vite.config.js` and replace `west_end` with your repository name if different

4. **Access your game:**
   - Your game will be available at: `https://yourusername.github.io/west_end`

## 🌐 Netlify Deployment

### Option 1: Drag & Drop (Easiest)

1. **Build your project:**
   ```bash
   npm run build
   ```

2. **Deploy:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up/login with GitHub
   - Drag the `dist` folder to the deploy area
   - Your site will be live instantly!

### Option 2: Git Integration (Recommended)

1. **Connect to GitHub:**
   - Go to [netlify.com](https://netlify.com)
   - Click "New site from Git"
   - Choose GitHub and select your repository
   - Netlify will automatically detect the build settings from `netlify.toml`

2. **Deploy:**
   - Click "Deploy site"
   - Netlify will build and deploy automatically
   - Future pushes to main branch will trigger automatic deployments

### Option 3: Netlify CLI

1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login and deploy:**
   ```bash
   netlify login
   netlify deploy --prod --dir=dist
   ```

## 🔧 Configuration Notes

### Vite Configuration
- The `base` path is set to `/west_end/` for GitHub Pages
- For Netlify, you can change this to `/` in `vite.config.js`

### Build Process
- Both platforms will run `npm run build`
- The built files go to the `dist` directory
- Static assets are optimized for production

### Custom Domain (Optional)
- **GitHub Pages:** Go to repository Settings > Pages > Custom domain
- **Netlify:** Go to Site settings > Domain management > Add custom domain

## 🐛 Troubleshooting

### Common Issues

1. **404 on refresh (SPA routing):**
   - GitHub Pages: The workflow handles this automatically
   - Netlify: The `_redirects` file handles this

2. **Assets not loading:**
   - Check the `base` path in `vite.config.js`
   - Ensure all image paths are correct

3. **Build failures:**
   - Check Node.js version (should be 18+)
   - Run `npm ci` instead of `npm install`
   - Check for any TypeScript or linting errors

### Testing Locally
```bash
npm run build
npm run preview
```

## 📱 Mobile Testing

Your game now supports mobile touch! Test on:
- Mobile devices directly
- Browser dev tools mobile simulation
- Real mobile browsers

## 🎮 Game Features

- ✅ Mobile touch support
- ✅ Responsive design
- ✅ Touch feedback
- ✅ Cross-platform compatibility
- ✅ Production-ready build

Happy gaming! 🎯
