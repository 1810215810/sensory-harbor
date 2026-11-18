(() => {
  const normalize = value => value.normalize('NFKC').toLowerCase().replace(/[\s()·-]/g, '');
  const stripRegion = value => value.replace(/^秦皇岛市?海港区|^秦皇岛市|^海港区/, '');

  function findPlaces(query, rows) {
    const key = normalize(query);
    if (!key) return [];
    const localKey = stripRegion(key);
    const matches = rows.map(([name, lng, lat, address, aliases, category]) => {
      const names = [name, ...aliases.split(';')].filter(Boolean).map(normalize);
      const namesAndAddress = [...names, normalize(address)];
      const score = namesAndAddress.reduce((best, value) => {
        const local = stripRegion(value);
        const match = value === key ? 6 : value.startsWith(key) ? 5 : value.includes(key) ? 4 :
          localKey && local === localKey ? 3 : localKey && local.startsWith(localKey) ? 2 : localKey && local.includes(localKey) ? 1 : 0;
        return Math.max(best, match);
      }, 0);
      return { name, lng, lat, address, category, score };
    }).filter(place => place.score > 0)
      .sort((first, second) => second.score - first.score || (first.category === 'stop') - (second.category === 'stop') || first.name.length - second.name.length);
    return (matches[0]?.score >= 4 ? matches.filter(place => place.score >= 4) : matches).slice(0, 8);
  }

  function amapCoords(lng, lat) {
    const axis = lng - 105;
    const offset = lat - 35;
    const pi = Math.PI;
    const waves = (20 * Math.sin(6 * axis * pi) + 20 * Math.sin(2 * axis * pi)) * 2 / 3;
    const north = -100 + 2 * axis + 3 * offset + .2 * offset ** 2 + .1 * axis * offset + .2 * Math.sqrt(Math.abs(axis)) + waves +
      (20 * Math.sin(offset * pi) + 40 * Math.sin(offset * pi / 3) + 160 * Math.sin(offset * pi / 12) + 320 * Math.sin(offset * pi / 30)) * 2 / 3;
    const east = 300 + axis + 2 * offset + .1 * axis ** 2 + .1 * axis * offset + .1 * Math.sqrt(Math.abs(axis)) + waves +
      (20 * Math.sin(axis * pi) + 40 * Math.sin(axis * pi / 3) + 150 * Math.sin(axis * pi / 12) + 300 * Math.sin(axis * pi / 30)) * 2 / 3;
    const radians = lat * pi / 180;
    const eccentricity = .006693421622965943;
    const magic = 1 - eccentricity * Math.sin(radians) ** 2;
    const radius = 6378245;
    return {
      lng: Number((lng + east * 180 * Math.sqrt(magic) / (radius * Math.cos(radians) * pi)).toFixed(6)),
      lat: Number((lat + north * 180 * magic ** 1.5 / (radius * (1 - eccentricity) * pi)).toFixed(6))
    };
  }

  function embed(mode, params) {
    const query = new URLSearchParams({ ...params, platform: 'pc', src: 'sensory-harbor' });
    return `https://www.amap.com/ssr/embed/${mode}?${query}`;
  }

  const placeUrl = place => embed('place', { ...amapCoords(place.lng, place.lat), name: place.name, address: place.address || 'OpenStreetMap 地名索引', zoom: place.category === 'street' ? 15 : 17 });
  const regionParams = ({ lng, lat, zoom }) => ({ lng, lat, zoom });
  globalThis.SensoryMap = {
    findPlaces,
    placeUrl,
    viewUrl: region => embed('view', regionParams(region)),
    searchUrl: (region, keyword) => embed('search', { ...regionParams(region), city: region.city, keyword })
  };
})();
