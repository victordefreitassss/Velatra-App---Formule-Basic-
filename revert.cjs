const fs = require('fs');
const path = require('path');

const dirs = [path.join(__dirname, 'pages'), path.join(__dirname, 'components')];
const filesToProcess = [];

dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        filesToProcess.push(path.join(dir, file));
      }
    });
  }
});

filesToProcess.push(path.join(__dirname, 'App.tsx'));

filesToProcess.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Revert backgrounds
    content = content.replace(/bg-zinc-900\/90/g, 'bg-white/90');
    content = content.replace(/bg-zinc-900\/60/g, 'bg-white/60');
    content = content.replace(/bg-zinc-900\/50/g, 'bg-white/50');
    content = content.replace(/bg-zinc-900\/40/g, 'bg-white/40');
    content = content.replace(/bg-zinc-900\/30/g, 'bg-white/30');
    content = content.replace(/bg-zinc-900\/20/g, 'bg-white/20');
    content = content.replace(/bg-zinc-900\/10/g, 'bg-white/10');
    content = content.replace(/bg-zinc-900/g, 'bg-white');

    // Revert text colors
    content = content.replace(/text-white/g, 'text-zinc-900');
    content = content.replace(/text-zinc-200/g, 'text-zinc-800');
    content = content.replace(/text-zinc-300/g, 'text-zinc-700');

    // Revert borders
    content = content.replace(/border-zinc-800/g, 'border-zinc-200');

    // Revert light grays
    content = content.replace(/bg-zinc-800/g, 'bg-zinc-50');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('Reversion done.');
