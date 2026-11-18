const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const source = process.argv[2];
if (!source) throw new Error('用法：node scripts/build-place-index.cjs <OSM 区域地图 JSON>');
const { elements } = JSON.parse(readFileSync(source, 'utf8'));
const nodes = new Map(elements.filter(item => item.type === 'node').map(item => [item.id, item]));
const names = new Map();
const round = value => Number(value.toFixed(6));
for (const item of elements) {
  const tags = item.tags;
  const name = tags?.['name:zh'] || tags?.name;
  const street = item.type === 'way' && tags?.highway && !['service', 'footway', 'path'].includes(tags.highway);
  if (!name || !(street || tags.amenity || tags.shop || tags.tourism || tags.leisure || tags.office || tags.railway || tags.public_transport || tags.healthcare || tags['addr:housenumber'])) continue;
  const points = item.type === 'node' ? [item] : (item.nodes || []).map(id => nodes.get(id)).filter(Boolean);
  if (!points.length) continue;
  const mid = axis => round((Math.min(...points.map(point => point[axis])) + Math.max(...points.map(point => point[axis]))) / 2);
  const lng = mid('lon');
  const lat = mid('lat');
  if (lng < 119.49 || lng > 119.65 || lat < 39.88 || lat > 39.975) continue;
  const address = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join('');
  const aliases = [tags.name, tags.alt_name, tags.short_name, tags['name:en']].filter(value => value && value !== name).join(';');
  const category = tags.highway === 'bus_stop' || tags.public_transport === 'platform' ? 'stop' : street ? 'street' : 'place';
  const row = [name, lng, lat, address, aliases, category];
  const matches = names.get(name) || [];
  const duplicate = matches.findIndex(other => Math.hypot(other[1] - lng, other[2] - lat) < .001);
  if (duplicate < 0) matches.push(row);
  else if (!matches[duplicate][3] && address) matches[duplicate] = row;
  names.set(name, matches);
}
const index = [...names.values()].flat().sort((first, second) => first[0].localeCompare(second[0], 'zh-CN'));
writeFileSync(path.join(__dirname, '../data/haigang-places.js'), `globalThis.HaigangPlaces = [\n${index.map(row => JSON.stringify(row)).join(',\n')}\n];\n`);
console.log(`已生成 ${index.length} 条公开地名索引。`);
