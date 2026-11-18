const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../data/config.js');
require('../data/public.js');
require('../assets/core.js');
const api = globalThis.Sensory;
const goodScores = Object.fromEntries(api.config.dimensions.map(({ id }) => [id, 4]));

test('草案环境不定级、不公开示例，也不误开导出', () => {
  assert.equal(api.classify(goodScores).level, 'pending');
  assert.equal(api.readyToPublish(), false);
  assert.deepEqual(api.official(), []);
  assert.equal(api.config.demoPoints.length, 4);
});

test('可接入已批准标准及正式记录，过滤无效数据和私有字段', () => {
  const policy = { state: 'approved', version: 'test-fixture', recommendedMin: 4, rejectMax: 2, maxMissing: 1, required: ['sudden'] };
  api.config.policy = policy;
  api.config.study.dataLicense = 'test fixture only';
  api.config.study.publicMap = { src: './data/example.svg', label: 'fixture', attribution: 'fixture' };
  assert.equal(api.readyToPublish(), false);
  for (const item of api.config.dimensions) item.criteria = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };
  assert.equal(api.readyToPublish(), true);
  assert.equal(api.classify(goodScores).level, 'recommended');
  assert.equal(api.classify({ ...goodScores, noise: 3 }).level, 'conditional');
  assert.equal(api.classify({ ...goodScores, crowd: 2 }).level, 'excluded');
  assert.equal(api.classify({ noise: 4 }).level, 'insufficient');
  assert.equal(api.classify({ ...goodScores, noise: 6 }).level, 'insufficient');
  const { sudden, noise, ...others } = goodScores;
  assert.equal(api.classify({ ...others, noise }).level, 'insufficient');
  assert.deepEqual(api.classify({ ...others, sudden }), { level: 'conditional', missing: ['noise'] });
  const observation = { kind: 'sensory-observation', schemaVersion: 1, pointId: 'TEST-01', name: '接入测试', location: '东门', type: 'daily', observedAt: '2026-11-18T10:00:00+08:00', scores: goodScores, rater: 'private', policyVersion: policy.version };
  const metadata = { position: [42, 68], finding: '观察', advice: '建议', reviewed: true };
  const valid = api.publicRecord(observation, metadata);
  assert.throws(() => api.publicRecord(observation, { ...metadata, reviewed: false }));
  assert.throws(() => api.publicRecord(observation, { ...metadata, position: [105, 0] }));
  assert.throws(() => api.publicRecord({ ...observation, policyVersion: 'old' }, metadata));
  assert.throws(() => api.publicRecord({ ...observation, observedAt: '2026-11-18T10:00:00' }, metadata));
  assert.equal('rater' in valid, false);
  globalThis.SensoryPublic = [{ ...valid, privateNotes: 'private' }, { ...valid, id: 'DEMO-01' }, { ...valid, scores: null }, { ...valid, scores: { ...goodScores, crowd: 1 } }];
  assert.deepEqual(api.official(), [valid]);
});

test('工具按点位关联，保留多观察窗且可清除', () => {
  api.attachTool('first', 'soundEvents', { count: 3 });
  api.attachTool('first', 'soundEvents', { count: 1 });
  api.attachTool('second', 'soundEvents', { count: 0 });
  assert.deepEqual(api.readTools('first').soundEvents.map(item => item.count), [3, 1]);
  assert.equal(api.readTools('second').soundEvents[0].count, 0);
  api.clearTools('first');
  assert.deepEqual(api.readTools('first'), {});
});

test('CSV 对引号和电子表格公式做安全转义', () => {
  assert.equal(api.csvCell('东门,"等候区"'), '"东门,""等候区"""');
  assert.equal(api.csvCell('=1+1'), `"'=1+1"`);
});
