'use strict';

const express = require('express');
const path = require('path');
const compression = require('compression');
const fs = require('fs');

// ── Uncaught exception / rejection guards ────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise);
  console.error('   Reason:', reason);
  process.exit(1);
});

const app = express();
const distFolder = path.join(__dirname, 'dist/auction-ui/browser');
const PORT = process.env.PORT || 3000;

// ── Verify dist folder exists before doing anything else ─────────────────────
if (!fs.existsSync(distFolder)) {
  console.error(`❌ Dist folder not found: ${distFolder}`);
  console.error('   Run "npm run build" before starting the server.');
  process.exit(1);
}

const indexHtml = path.join(distFolder, 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error(`❌ index.html not found in dist folder: ${indexHtml}`);
  console.error('   The Angular build may have failed or produced an unexpected output path.');
  process.exit(1);
}

console.log(`📁 Dist folder verified: ${distFolder}`);

// Enable compression
app.use(compression());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// Serve static files
app.use(express.static(distFolder, {
  maxAge: '1y',
  etag: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Redirect all routes to index.html (SPA routing)
app.use((req, res) => {
  res.sendFile(indexHtml, (err) => {
    if (err) {
      console.error(`❌ Failed to send index.html for ${req.url}:`, err.message);
      res.status(500).send('Internal Server Error');
    }
  });
});

// ── Start listening ──────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${distFolder}`);
  console.log(`🏥 Health check available at http://localhost:${PORT}/health`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Is another process running?`);
  } else if (err.code === 'EACCES') {
    console.error(`❌ Permission denied to bind on port ${PORT}. Try a port above 1024.`);
  } else {
    console.error(`❌ Server error (${err.code}):`, err.message);
    console.error(err.stack);
  }
  process.exit(1);
});
