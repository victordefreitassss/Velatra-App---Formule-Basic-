import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
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

const files = walk('./components').concat(walk('./pages')).concat(['./App.tsx', './index.tsx']);
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Remove gray borders
  content = content.replace(/border-zinc-\d{2,3}(\/\d{2})?/g, '');
  content = content.replace(/border-gray-\d{2,3}(\/\d{2})?/g, '');
  content = content.replace(/border-velatra-border(\/\d{2})?/g, '');
  // Remove gray rings
  content = content.replace(/ring-zinc-\d{2,3}(\/\d{2})?/g, '');
  content = content.replace(/ring-gray-\d{2,3}(\/\d{2})?/g, '');
  content = content.replace(/ring-velatra-border(\/\d{2})?/g, '');
  // Remove gray divides
  content = content.replace(/divide-zinc-\d{2,3}(\/\d{2})?/g, 'divide-transparent');
  content = content.replace(/divide-gray-\d{2,3}(\/\d{2})?/g, 'divide-transparent');
  content = content.replace(/divide-velatra-border(\/\d{2})?/g, 'divide-transparent');
  fs.writeFileSync(file, content);
});
console.log('Done replacing borders');
