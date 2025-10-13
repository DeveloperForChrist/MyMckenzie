const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const assetsDir = path.join(root, 'assets');
const cssDir = path.join(assetsDir, 'css');
const jsDir = path.join(assetsDir, 'js');

function ensureDir(d) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function isLocalLink(href) {
  if (!href) return false;
  // treat absolute URLs and protocol-relative as external
  return !/^(https?:)?\/\//i.test(href) && !href.startsWith('data:') && !href.startsWith('#');
}

ensureDir(cssDir);
ensureDir(jsDir);

// Find and move files
function moveFiles(ext, destDir) {
  const files = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        // skip assets folder to avoid recursion
        if (p === assetsDir) continue;
        walk(p);
      } else if (e.isFile() && p.toLowerCase().endsWith(ext)) {
        files.push(p);
      }
    }
  }
  walk(root);
  for (const f of files) {
    const base = path.basename(f);
    const dest = path.join(destDir, base);
    // if already in dest, skip
    if (path.dirname(f) === destDir) continue;
    // if dest exists, append numeric suffix
    let finalDest = dest;
    let i = 1;
    while (fs.existsSync(finalDest)) {
      const name = path.basename(base, ext);
      finalDest = path.join(destDir, `${name}_${i}${ext}`);
      i++;
    }
    fs.copyFileSync(f, finalDest);
    // keep original (safer) - comment out next line to delete originals
    // fs.unlinkSync(f);
    console.log(`Moved ${f} -> ${finalDest}`);
  }
}

moveFiles('.css', cssDir);
moveFiles('.js', jsDir);

// Update HTML files
function updateHtmlFiles() {
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (p === assetsDir) continue;
        walk(p);
      } else if (e.isFile() && p.toLowerCase().endsWith('.html')) {
        let content = fs.readFileSync(p, 'utf8');

        // replace <link ... href="something.css"
        content = content.replace(/(<link[^>]+href\s*=\s*["'])([^"'>]+\.css)(["'][^>]*>)/gi, (m, pre, href, post) => {
          if (!isLocalLink(href)) return m;
          const newHref = path.posix.join('assets/css', path.posix.basename(href));
          return pre + newHref + post;
        });

        // replace <script src="something.js"
        content = content.replace(/(<script[^>]+src\s*=\s*["'])([^"'>]+\.js)(["'][^>]*>)/gi, (m, pre, src, post) => {
          if (!isLocalLink(src)) return m;
          const newSrc = path.posix.join('assets/js', path.posix.basename(src));
          return pre + newSrc + post;
        });

        fs.writeFileSync(p, content, 'utf8');
        console.log(`Updated ${p}`);
      }
    }
  }
  walk(root);
}

updateHtmlFiles();

console.log('Restructure complete. Please review assets/ and run a local server to test.');
