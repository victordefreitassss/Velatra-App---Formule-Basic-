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

    // Reverse the changes made
    content = content.replace(/bg-zinc-900/g, 'bg-zinc-100');
    content = content.replace(/hover:bg-zinc-800/g, 'hover:bg-zinc-100');
    content = content.replace(/text-zinc-200/g, 'text-zinc-800');
    content = content.replace(/bg-white\/5/g, 'bg-zinc-50');
    content = content.replace(/text-white/g, 'text-zinc-900');
    content = content.replace(/bg-white\/10/g, 'bg-zinc-200');
    content = content.replace(/hover:bg-white\/20/g, 'hover:bg-zinc-200');

    // Also revert the ones from the original revert.cjs just in case
    content = content.replace(/bg-zinc-900\/90/g, 'bg-white/90');
    content = content.replace(/bg-zinc-900\/60/g, 'bg-white/60');
    content = content.replace(/bg-zinc-900\/50/g, 'bg-white/50');
    content = content.replace(/bg-zinc-900\/40/g, 'bg-white/40');
    content = content.replace(/bg-zinc-900\/30/g, 'bg-white/30');
    content = content.replace(/bg-zinc-900\/20/g, 'bg-white/20');
    content = content.replace(/bg-zinc-900\/10/g, 'bg-white/10');
    content = content.replace(/border-zinc-800/g, 'border-zinc-200');
    content = content.replace(/bg-zinc-800/g, 'bg-zinc-50');
    content = content.replace(/text-zinc-300/g, 'text-zinc-700');

    fs.writeFileSync(filePath, content, 'utf8');
  }
});

console.log('Reversion done.');
