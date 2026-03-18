# Railway Deployment Guide

## 🚀 Quick Start

### Prerequisites
- Railway Account (https://railway.app)
- Git repository linked to Railway
- Environment variables set up in Railway dashboard

### Environment Variables to Add in Railway Dashboard
```
NODE_ENV=production
PORT=3000
```

### Deployment Steps

1. **Push your code to GitHub/GitLab** (if not already done)
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **In Railway Dashboard**
   - Create a new project
   - Select "Deploy from GitHub"
   - Connect your repository
   - Select the `auction-ui` directory as the root (if in monorepo)

3. **Configure Build Settings**
   - Root Directory: `.` (or relative path to auction-ui)
   - Start Command: `npm start`
   - Build Command: `npm run build` (should auto-detect from package.json)

4. **Add Environment Variables**
   In Railway dashboard → Project Settings → Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `3000` (or leave empty for auto-assignment)

5. **Deploy**
   - Railway will automatically:
     - Install dependencies from package.json
     - Run `npm run build` to build Angular app
     - Run `npm start` to serve the app from server.js

### API Configuration

The backend API URL is centralized in:
- **Development**: `src/environments/environment.ts` → `http://localhost:8080`
- **Production**: `src/environments/environment.prod.ts` → `https://auctiondeck-api-production.up.railway.app/api`

All services use `environment.apiUrl`, so no other changes needed!

### Files Added/Modified

**New Files:**
- `server.js` - Express server to serve static Angular build
- `railway.json` - Railway configuration
- `Procfile` - Process file for Railway
- `.railwayignore` - Files to ignore during Railway deployment

**Modified Files:**
- `package.json` - Added express, compression, and updated scripts
- `src/environments/environment.prod.ts` - Updated with production API URL

### Local Testing Before Deployment

```bash
# Build the app
npm run build

# Start the server (same as Railway will do)
npm start

# Visit http://localhost:3000
```

### Troubleshooting

**Build fails?**
- Check Node.js version compatibility (should be 18+)
- Clear `npm cache`: `npm cache clean --force`
- Delete `package-lock.json` and reinstall: `rm package-lock.json && npm install`

**App shows blank page?**
- Check browser console for errors
- Verify API calls in Network tab
- Ensure backend API is accessible from Railway domain

**API calls fail?**
- Check CORS settings on your backend
- Verify `environment.prod.ts` has correct API URL
- Test API directly: `curl https://auctiondeck-api-production.up.railway.app/api/...`

**Port issues?**
- Railway automatically assigns a port via `PORT` environment variable
- server.js reads from `process.env.PORT` or defaults to 3000

### Monitoring

In Railway Dashboard:
- Check Deployments tab for build logs
- Check Logs tab for runtime errors
- Check Metrics tab for CPU/Memory usage

### Update Process

For future updates:
1. Make changes to source code
2. Push to GitHub
3. Railway auto-deploys on push (if enabled)

---

**API URL Reference:**
- Frontend: Any Railway-provided domain (e.g., `auction-ui-production.up.railway.app`)
- Backend: https://auctiondeck-api-production.up.railway.app/api/
