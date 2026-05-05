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
    } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./Frontend/pages');
let modifiedCount = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace style="display: grid; grid-template-columns: 1fr 1fr;" -> class="grid-2" style=""
  content = content.replace(/style=['"](.*?)grid-template-columns:\s*(repeat\(4,\s*1fr\)|1fr 1fr 1fr 1fr)[^;]*;?(.*?)['"]/gi, (match, p1, p2, p3) => {
    return `class="grid-4" style="${(p1 + p3).trim()}"`;
  });
  content = content.replace(/style=['"](.*?)grid-template-columns:\s*(repeat\(3,\s*1fr\)|1fr 1fr 1fr|1\.5fr 1fr 1fr|2fr 1fr 1fr)[^;]*;?(.*?)['"]/gi, (match, p1, p2, p3) => {
    return `class="grid-3" style="${(p1 + p3).trim()}"`;
  });
  content = content.replace(/style=['"](.*?)grid-template-columns:\s*(repeat\(2,\s*1fr\)|1fr 1fr|2fr 1fr|1fr 2fr|3fr 1fr|1fr 3fr)[^;]*;?(.*?)['"]/gi, (match, p1, p2, p3) => {
    return `class="grid-2" style="${(p1 + p3).trim()}"`;
  });
  
  // Clean up any empty styles
  content = content.replace(/style=""/gi, '');
  content = content.replace(/style=" "/gi, '');
  
  // For remaining inline grid-template-columns that couldn't be caught by the above:
  // e.g. style="grid-template-columns: 280px 1fr;"
  // We'll leave those for now as they might be specific layouts.
  // Wait, let's also catch repeat(auto-fill, ...) and just let css handle it
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log('Modified', file);
    modifiedCount++;
  }
});

console.log('Total files modified:', modifiedCount);
