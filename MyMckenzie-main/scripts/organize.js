const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');

function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }

// mapping rules based on filename (case-insensitive)
function destinationFor(filename) {
  const name = filename.toLowerCase();
  if (name === 'home.html') return { dir: '.', name: 'index.html' };
  if (name.includes('signin') || name.includes('signup') || name.includes('friend-signup')) return { dir: 'auth', name: filename };
  if (name.includes('user-dashboard')) return { dir: 'dashboard', name: filename };
  if (name.includes('friend-Dashboard') || name.includes('mckenzie-friend')) return { dir: 'friend', name: filename };
  if (name.includes('joinmckenzie') || name === 'join.html') return { dir: 'join', name: filename };
  if (name.includes('chatbot')) return { dir: 'chatbot', name: filename };
  if (name.includes('bill') || name.includes('billing')) return { dir: 'billing', name: filename };
  if (name.includes('contact')) return { dir: 'contact', name: filename };
  if (name.includes('marketplace')) return { dir: 'marketplace', name: filename };
  if (name.includes('setting')) return { dir: 'settings', name: filename };
  // default: leave at root
  return { dir: '.', name: filename };
}

// find html files
function findHtmlFiles() {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (path.basename(p) === 'assets') continue;
        if (path.basename(p) === 'node_modules') continue;
        walk(p);
      } else if (e.isFile() && p.toLowerCase().endsWith('.html')) {
        results.push(p);
      }
    }
  }
  walk(root);
  return results;
}

const htmlFiles = findHtmlFiles();

// build target map
const targetMap = {}; // absolute source -> absolute dest
for (const f of htmlFiles) {
  const fname = path.basename(f);
  const dest = destinationFor(fname);
  const destDir = path.join(root, dest.dir);
  ensureDir(destDir);
  const destPath = path.join(destDir, dest.name);
  // avoid mapping if already at correct place
  if (path.resolve(f) === path.resolve(destPath)) continue;
  targetMap[f] = destPath;
}

// copy files to new locations
for (const [src, dest] of Object.entries(targetMap)) {
  fs.copyFileSync(src, dest);
  console.log(`Copied ${src} -> ${dest}`);
}

// delete originals (except those that are now the same path)
for (const src of Object.keys(targetMap)) {
  try { fs.unlinkSync(src); console.log(`Removed original ${src}`); } catch (e) {}
}

// prepare reverse lookup for HTML link rewriting: basename -> new path relative to root
const nameToNewRootPath = {};
for (const [src, dest] of Object.entries(targetMap)) {
  const b = path.basename(src);
  // dest relative to root
  const rel = path.relative(root, dest).split(path.sep).join('/');
  nameToNewRootPath[b.toLowerCase()] = rel;
}

// function to compute web-relative path from file to an asset or page
function webRel(fromFile, toRootRelative) {
  const fromDir = path.dirname(fromFile);
  const absTo = path.join(root, toRootRelative);
  let rel = path.relative(fromDir, absTo).split(path.sep).join('/');
  if (!rel) rel = './' + path.basename(toRootRelative);
  return rel;
}

// Update all HTML files in repo (new locations included)
function updateHtmlContent() {
  const filesToUpdate = findHtmlFiles();
  for (const f of filesToUpdate) {
    let content = fs.readFileSync(f, 'utf8');

    // update CSS links to correct assets relative path
    content = content.replace(/(<link[^>]+href\s*=\s*["'])([^"'>]+\.css)(["'][^>]*>)/gi, (m, pre, href, post) => {
      // ignore external
      if (/^(https?:)?\/\//i.test(href) || href.startsWith('data:') || href.startsWith('#')) return m;
      const assetName = path.posix.basename(href);
      const assetRoot = `assets/css/${assetName}`;
      const rel = webRel(f, assetRoot);
      return pre + rel + post;
    });

    // update JS src to assets
    content = content.replace(/(<script[^>]+src\s*=\s*["'])([^"'>]+\.js)(["'][^>]*>)/gi, (m, pre, src, post) => {
      if (/^(https?:)?\/\//i.test(src) || src.startsWith('data:') || src.startsWith('#')) return m;
      const assetName = path.posix.basename(src);
      const assetRoot = `assets/js/${assetName}`;
      const rel = webRel(f, assetRoot);
      return pre + rel + post;
    });

    // update internal html links (href="something.html") using nameToNewRootPath map
    content = content.replace(/(<a[^>]+href\s*=\s*["'])([^"'>]+\.html)(["'][^>]*>)/gi, (m, pre, href, post) => {
      if (/^(https?:)?\/\//i.test(href) || href.startsWith('#')) return m;
      const bn = path.posix.basename(href).toLowerCase();
      const newRootRel = nameToNewRootPath[bn] || href; // if unknown, keep as-is
      const rel = webRel(f, newRootRel);
      return pre + rel + post;
    });

    // also update plain href="JoinMckenzie.html" in other tags (e.g., <link> or forms)
    content = content.replace(/(["'])([^"'>]+\.html)(["'])/gi, (m, q1, href, q3) => {
      if (/^(https?:)?\/\//i.test(href) || href.startsWith('#')) return m;
      const bn = path.posix.basename(href).toLowerCase();
      if (!nameToNewRootPath[bn]) return m;
      const rel = webRel(f, nameToNewRootPath[bn]);
      return q1 + rel + q3;
    });

    fs.writeFileSync(f, content, 'utf8');
    console.log(`Rewrote links in ${f}`);
  }
}

updateHtmlContent();

console.log('Organization complete. Review moved HTML files and test the site.');
