const express = require('express');
const path = require('path');
const compression = require('compression');

const app = express();
const distFolder = path.join(__dirname, 'dist/auction-ui/browser');
const PORT = process.env.PORT || 3000;

// Enable compression
app.use(compression());

// Serve static files
app.use(express.static(distFolder, {
  maxAge: '1y',
  etag: false,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// Redirect all routes to index.html (SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(distFolder, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving from: ${distFolder}`);
});
