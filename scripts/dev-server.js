import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package versions for dynamic replacement
const modelViewerPkgPath = path.resolve(__dirname, '../packages/model-viewer/package.json');
const effectsPkgPath = path.resolve(__dirname, '../packages/model-viewer-effects/package.json');

const modelViewerPkg = JSON.parse(fs.readFileSync(modelViewerPkgPath, 'utf8'));
const effectsPkg = JSON.parse(fs.readFileSync(effectsPkgPath, 'utf8'));

const extractPackageVersion = (packageJson, packageName) => {
  const version = packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName] || '';
  return version.replace(/^[^\d]*/, '');
};

const versions = {
  three: extractPackageVersion(modelViewerPkg, 'three'),
  modelViewer: modelViewerPkg.version || '',
  postprocessing: extractPackageVersion(effectsPkg, 'postprocessing'),
};

const replacements = {
  '{{THREEJS_VERSION}}': versions.three,
  '{{MODELVIEWER_VERSION}}': versions.modelViewer,
  '{{POSTPROCESSING_VERSION}}': versions.postprocessing,
};

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.hdr': 'application/octet-stream',
  '.glb': 'model/gltf-binary',
  '.webp': 'image/webp'
};

const PORT = 8080;
const ROOT_DIR = path.resolve(__dirname, '..');

const server = http.createServer((req, res) => {
  // Basic URL parsing
  let url = req.url.split('?')[0]; // Remove query params

  // Default to resolving paths to the packages/modelviewer.dev folder for root requests
  if (url === '/') {
    url = '/packages/modelviewer.dev/index.html';
  }

  // Attempt to map absolute paths from the root directory
  let filePath = path.join(ROOT_DIR, url);

  // If someone requests /examples/..., map it to modelviewer.dev/examples/
  if (url.startsWith('/examples/') || url.startsWith('/styles/') || url.startsWith('/data/') || url.startsWith('/assets/') || url.startsWith('/shared-assets/')) {
    filePath = path.join(ROOT_DIR, 'packages/modelviewer.dev', url);
  }
  // Shared assets fallbacks
  if (url.startsWith('/shared-assets/')) {
    filePath = path.join(ROOT_DIR, 'packages', url);
  }

  // If the compiled path is a directory, append index.html
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      // Redirect if URL is missing trailing slash so relative HTML paths resolve correctly
      if (!url.endsWith('/')) {
        res.writeHead(301, { 'Location': url + '/' });
        res.end();
        return;
      }
      filePath = path.join(filePath, 'index.html');
    }
  } catch (e) {
    // Ignore stat errors, let readFile handle ENOENT
  }

  const extname = String(path.extname(filePath)).toLowerCase();

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'ENOTDIR') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${filePath}`, 'utf-8');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end(`500 Internal Server Error: ${err.code}`, 'utf-8');
      }
    } else {
      let contentType = mimeTypes[extname] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });

      // Dynamically replace placeholders in HTML and JSON files!
      if (extname === '.html' || extname === '.json') {
        let text = content.toString('utf8');
        for (const [placeholder, value] of Object.entries(replacements)) {
          text = text.replaceAll(placeholder, value);
          // Also replace URL encoded versions since browsers might encode '{{' and '}}'
          text = text.replaceAll(encodeURIComponent(placeholder), value);
        }
        res.end(text, 'utf-8');
      } else {
        res.end(content, 'utf-8');
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`✅ [modelviewer.dev] Local Dev Server is Running!`);
  console.log(`======================================================\n`);
  console.log(`The proxy server has successfully intercepted the config:`);
  console.log(`- three: ${versions.three}`);
  console.log(`- model-viewer: ${versions.modelViewer}`);
  console.log(`- postprocessing: ${versions.postprocessing}\n`);
  console.log(`The server is currently listening for connections.`);
  console.log(`👉 PLEASE OPEN YOUR BROWSER TO: http://localhost:${PORT}/ \n`);
});
