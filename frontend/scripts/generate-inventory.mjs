import fs from 'node:fs';
import path from 'node:path';
const dir = path.resolve('public/assets/videos/isl/library');
const out = path.resolve('src/data/islVideoInventory.json');
const files = fs.readdirSync(dir).filter(f => f.toLowerCase().endsWith('.mp4')).sort((a,b)=>a.localeCompare(b));
const inventory = files.map(filename => {
  const stem = path.basename(filename, path.extname(filename));
  const gloss = stem.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').toUpperCase();
  return {
    id: stem.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    filename, gloss, displayName: stem.replace(/[_-]+/g, ' '),
    url: `/assets/videos/isl/library/${encodeURIComponent(filename).replaceAll('%2F','/')}`,
    verified: false, reviewStatus: 'source_asset_not_linguistically_reviewed'
  };
});
fs.mkdirSync(path.dirname(out), {recursive:true});
fs.writeFileSync(out, JSON.stringify(inventory, null, 2));
console.log(`Generated ${inventory.length} inventory entries at ${out}`);
