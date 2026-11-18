const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../data/haigang-places.js');
require('../assets/map-search.js');
const map = globalThis.SensoryMap;
const rows = globalThis.HaigangPlaces;

test('完整校名、括号写法和门牌均定位到真实校区', () => {
  for (const query of ['东北大学秦皇岛分校', '东北大学（秦皇岛分校）', '秦皇岛市海港区泰山路143号']) {
    const [place] = map.findPlaces(query, rows);
    assert.equal(place.name, '东北大学秦皇岛分校');
    assert.equal(place.address, '泰山路143号');
    const target = new URL(map.placeUrl(place));
    assert.equal(target.pathname, '/ssr/embed/place');
    assert.equal(target.searchParams.get('zoom'), '17');
    assert.ok(Math.abs(Number(target.searchParams.get('lng')) - 119.55) < .002);
    assert.ok(Math.abs(Number(target.searchParams.get('lat')) - 39.922) < .002);
  }
});

test('未命中返回空结果；站点别名优先匹配火车站而不是公交站', () => {
  assert.deepEqual(map.findPlaces('未收录测试地点', rows), []);
  assert.equal(map.findPlaces('秦皇岛站', rows)[0].category, 'place');
  assert.ok(map.findPlaces('医院', rows).length > 1);
});

test('未输完的地名保留城市前缀并给出相关地点', () => {
  assert.deepEqual(map.findPlaces('秦皇岛市第一', rows).map(place => place.name).sort(),
    ['秦皇岛市第一中学', '秦皇岛市第一医院'].sort());
  assert.ok(map.findPlaces('秦皇岛市', rows).length > 0);
});
