const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove gray borders
  content = content.replace(/border-zinc-\d{3}(\/\d{2})?/g, '');
  content = content.replace(/border-gray-\d{3}(\/\d{2})?/g, '');
  content = content.replace(/border-velatra-border(\/\d{2})?/g, '');
  // Also remove 'border ' if it's left alone, but that might be tricky.
  // Let's just remove the specific color classes.
  fs.writeFileSync(file, content);
});
console.log('Done replacing borders in src');
