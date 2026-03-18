# Deployment Checklist for Railway

## ✅ Configuration Complete

### API URL Centralization
- **Status**: ✅ Complete
- **Location**: All services use `environment.apiUrl` from single source
- **Production URL**: `https://auctiondeck-api-production.up.railway.app/api`
- **Files Modified**:
  - `src/environments/environment.prod.ts` - Updated with production API URL

### Deployment Files Created
- ✅ `server.js` - Express server to serve your Angular app
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Build and start instructions
- ✅ `.railwayignore` - Excludes unnecessary files from deployment

### Dependencies Updated
- ✅ `express` - Web framework for serving your app
- ✅ `compression` - HTTP compression for faster delivery
- Package scripts updated for proper build/start sequence

### NPM Scripts Ready
```bash
npm run build      # Build for production (ng build --configuration production)
npm start          # Start Express server (used by Railway)
npm run dev        # Local development (ng serve)
npm test           # Run tests
```

## 🚀 Next Steps for Railway Deployment

1. **Install dependencies locally** (to update package-lock.json):
   ```bash
   npm install
   ```

2. **Test locally before deploying**:
   ```bash
   npm run build
   npm start
   # Visit: http://localhost:3000
   ```

3. **Push to GitHub** (Railway deploys from Git):
   ```bash
   git add -A
   git commit -m "Setup for Railway deployment with centralized API URL"
   git push origin main
   ```

4. **In Railway Dashboard**:
   - Create new project → Deploy from GitHub
   - Connect your repo
   - Set Environment Variables:
     - `NODE_ENV=production`
     - `PORT=3000` (optional, Railway auto-assigns)

5. **Verify Deployment**:
   - Check Railway logs during build
   - Visit your Railway app URL
   - Test API calls to backend

## 📋 API Architecture

```
┌─────────────────────────────────────────────┐
│        Angular App (This Repo)              │
│  Frontend: auction-ui.up.railway.app        │
│                                             │
│  └─ All Services                            │
│     └─ Use: environment.apiUrl              │
│        └─ Prod: https://auctiondeck-api... │
│        └─ Dev:  http://localhost:8080     │
└─────────────────────────────────────────────┘
                    ↓ API Calls
┌─────────────────────────────────────────────┐
│     Backend API (Separate Deployment)       │
│  https://auctiondeck-api-production         │
│              .up.railway.app                │
│                 /api/                       │
└─────────────────────────────────────────────┘
```

## 📝 Files You Now Have

**New:**
- `server.js` - Production Express server
- `railway.json` - Railway-specific config
- `.railwayignore` - Deployment ignore rules
- `Procfile` - Build process instructions
- `RAILWAY_DEPLOYMENT.md` - Detailed deployment guide

**Modified:**
- `package.json` - Dependencies & scripts updated
- `src/environments/environment.prod.ts` - New backend URL

## ⚠️ Important Notes

- **Single Point of Configuration**: All services use `environment.apiUrl`
- **No Hardcoded URLs**: Database of available services confirms no hardcoded backend URLs
- **CORS**: Ensure your backend allows requests from your Railway domain
- **No Changes Needed to Components**: Environment substitution happens at build time

---

**Ready to deploy!** Follow the Railway Deployment Guide in RAILWAY_DEPLOYMENT.md for detailed instructions.
