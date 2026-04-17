/**
 * server.js — Node.js Static File Server Entry Point
 *
 * Serves the public/index.html and static assets via Node's built-in
 * http module — zero external dependencies required.
 *
 * Usage:
 *   node src/interfaces/server.js
 *   PORT=8080 node src/interfaces/server.js
 *
 * Layer: Interfaces → Entry Point (server)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = path.resolve(__dirname, '../../');

/** @type {Record<string, string>} */
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]; // strip query strings

  // Default to index.html for /
  if (urlPath === '/') {
    urlPath = '/index.html';
  }

  const filePath = path.join(ROOT, urlPath);

  // Prevent path traversal outside project root
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // SPA fallback — serve index.html for unknown paths
        fs.readFile(path.join(ROOT, 'index.html'), (_err2, fallback) => {
          if (_err2) {
            res.writeHead(404);
            res.end('404 Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallback);
          }
        });
      } else {
        res.writeHead(500);
        res.end('500 Internal Server Error');
      }
      return;
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`dasdasdsa server running at http://localhost:${PORT}`);
});
