const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function findHtmlFiles() {
  const results = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (path.basename(p) === 'assets') continue;
        walk(p);
      } else if (e.isFile() && p.toLowerCase().endsWith('.html')) {
        results.push(p);
      }
    }
  }
  walk(root);
  return results;
}

function isExternal(url) {
  return /^(https?:)?\/\//i.test(url) || url.startsWith('mailto:') || url.startsWith('tel:') || url.startsWith('#') || url.startsWith('data:');
}

function normalize(p) {
  return p.split('/').join(path.sep);
}

const htmlFiles = findHtmlFiles();
let totalLinks = 0;
const missing = [];

const linkRegex = /(?:href|src)\s*=\s*(["'])([^"'>]+)\1/gi;

for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = linkRegex.exec(content)) !== null) {
    const target = m[2].trim();
    if (!target) continue;
    if (isExternal(target)) continue;
    totalLinks++;
    // resolve path relative to file
    // if target is absolute (starts with /) treat as relative to project root
    let targetPath;
    if (target.startsWith('/')) {
      targetPath = path.join(root, target.slice(1));
    } else {
      targetPath = path.resolve(path.dirname(file), normalize(target));
    }
    // if target has query string or hash, strip
    targetPath = targetPath.replace(/[#?].*$/, '');

    if (!fs.existsSync(targetPath)) {
      missing.push({ from: path.relative(root, file), target, resolved: path.relative(root, targetPath) });
    }
  }
}

console.log(`Checked ${htmlFiles.length} HTML files and ${totalLinks} local links.`);
if (missing.length === 0) {
  console.log('No missing local links were found.');
  process.exit(0);
}

console.log('Missing local links:');
for (const m of missing) {
  console.log(`- From: ${m.from}  -> target: ${m.target}  (resolved: ${m.resolved})`);
}
process.exit(1);
