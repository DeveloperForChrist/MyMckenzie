const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function shouldDelete(filePath) {
  const lower = filePath.toLowerCase();
  // keep anything under assets/ or scripts/ or node_modules/
  if (lower.includes(path.join('assets', '').toLowerCase())) return false;
  if (lower.includes(path.join('scripts', '').toLowerCase())) return false;
  if (lower.includes('node_modules')) return false;
  // delete .css and .js files only
  if (lower.endsWith('.css') || lower.endsWith('.js')) return true;
  return false;
}

function findCandidates() {
  const list = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // skip assets and scripts and node_modules
        const bn = path.basename(p).toLowerCase();
        if (bn === 'assets' || bn === 'scripts' || bn === 'node_modules') continue;
        walk(p);
      } else if (e.isFile()) {
        if (shouldDelete(p)) list.push(p);
      }
    }
  }
  walk(root);
  return list;
}

const candidates = findCandidates();
if (candidates.length === 0) {
  console.log('No duplicate CSS/JS files found outside assets/ or scripts/.');
  process.exit(0);
}

console.log('Files to be removed:');
candidates.forEach(f => console.log('  ' + f));

// Proceed to delete
for (const f of candidates) {
  try {
    fs.unlinkSync(f);
    console.log('Deleted: ' + f);
  } catch (e) {
    console.error('Failed to delete: ' + f, e.message);
  }
}

console.log('Cleanup complete.');
