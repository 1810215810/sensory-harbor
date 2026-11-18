const fs = require('node:fs');
const path = require('node:path');
require('../data/config.js');
require('../assets/core.js');

const input = process.argv[2];
const api = globalThis.Sensory;
try {
  if (!input) throw new Error('用法：node scripts/publish-data.cjs <审核清单.json>');
  if (!api.readyToPublish()) throw new Error('请先确认评分细则、定级参数、底图与许可。');
  const manifest = path.resolve(input);
  const entries = JSON.parse(fs.readFileSync(manifest, 'utf8'));
  if (!Array.isArray(entries)) throw new Error('审核清单必须是数组。');
  const records = entries.map(entry => {
    if (typeof entry.observation !== 'string') throw new Error('缺少原始观察文件路径。');
    const raw = JSON.parse(fs.readFileSync(path.resolve(path.dirname(manifest), entry.observation), 'utf8'));
    return api.publicRecord(raw, entry);
  });
  if (new Set(records.map(record => record.id)).size !== records.length) throw new Error('一个点位只能发布一条观察。多时段策略确认前，请人工选择明确标注时段的一条记录。');
  const output = path.resolve(__dirname, '../data/public.js');
  const temp = `${output}.tmp`;
  fs.writeFileSync(temp, `globalThis.SensoryPublic = ${JSON.stringify(records, null, 2)};\n`);
  fs.renameSync(temp, output);
  console.log(`生成 ${records.length} 条可公开记录。请复查脱敏和授权后再提交。`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
