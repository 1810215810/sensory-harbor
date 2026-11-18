(() => {
  const config = globalThis.SensoryConfig;
  const dimensions = config.dimensions.map(item => item.id);
  const levels = { recommended: '推荐', conditional: '有条件推荐', excluded: '不公开', insufficient: '资料不足', pending: '待定级' };
  const official = () => readyToPublish() && Array.isArray(globalThis.SensoryPublic) ? globalThis.SensoryPublic.filter(validPublic).map(publicFields) : [];

  function readyToPublish() {
    const map = config.study.publicMap;
    return Boolean(validPolicy(config.policy) && text(config.study.dataLicense) && text(map?.src) && text(map?.label) && text(map?.attribution));
  }

  function validPolicy(policy) {
    return Boolean(policy.state === 'approved' && typeof policy.version === 'string' && policy.version.trim() &&
      Number.isInteger(policy.recommendedMin) && policy.recommendedMin >= 3 && policy.recommendedMin <= 5 &&
      Number.isInteger(policy.rejectMax) && policy.rejectMax >= 1 && policy.rejectMax < policy.recommendedMin - 1 &&
      Number.isInteger(policy.maxMissing) && policy.maxMissing >= 0 && policy.maxMissing < dimensions.length &&
      Array.isArray(policy.required) && policy.required.every(id => dimensions.includes(id)) &&
      config.dimensions.every(item => [1, 2, 3, 4, 5].every(score => text(item.criteria?.[score]))));
  }

  function classify(scores = {}, policy = config.policy) {
    const missing = dimensions.filter(id => scores[id] == null);
    if (!validPolicy(policy)) return { level: 'pending', missing };
    if (Object.keys(scores).some(id => !dimensions.includes(id) || !Number.isInteger(scores[id]) || scores[id] < 1 || scores[id] > 5)) return { level: 'insufficient', missing };
    const lowest = Math.min(...Object.values(scores));
    if (lowest <= policy.rejectMax) return { level: 'excluded', missing };
    if (missing.length > policy.maxMissing || missing.some(id => policy.required.includes(id))) return { level: 'insufficient', missing };
    if (missing.length || lowest < policy.recommendedMin) return { level: 'conditional', missing };
    return { level: 'recommended', missing };
  }

  const text = value => typeof value === 'string' && value.trim().length > 0;
  const position = value => Array.isArray(value) && value.length === 2 && value.every(number => Number.isFinite(number) && number >= 0 && number <= 100);
  const isoTime = value => text(value) && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));

  function validPublic(point) {
    if (!point || !text(point.id) || point.id.startsWith('DEMO-') || !text(point.name) || !Object.hasOwn(config.types, point.type)) return false;
    if (!point.scores || typeof point.scores !== 'object' || Array.isArray(point.scores)) return false;
    const { level } = classify(point.scores);
    return point.status === 'verified' && point.reviewed === true && point.policyVersion === config.policy.version &&
      ['recommended', 'conditional'].includes(level) && position(point.position) && isoTime(point.observedAt) &&
      text(point.location) && text(point.finding) && text(point.advice);
  }

  function publicFields({ id, name, type, location, observedAt, scores, finding, advice, position, reviewed, status, policyVersion }) {
    return { id, name, type, location, observedAt, scores, finding, advice, position, reviewed, status, policyVersion };
  }

  function publicRecord(observation, site) {
    const point = {
      id: observation.pointId, name: observation.name, type: observation.type, location: observation.location,
      observedAt: observation.observedAt, scores: observation.scores, finding: site.finding, advice: site.advice,
      position: site.position, reviewed: site.reviewed, status: 'verified', policyVersion: observation.policyVersion
    };
    if (observation.schemaVersion !== config.schemaVersion || observation.kind !== 'sensory-observation' || !validPublic(point)) throw new Error('记录不能发布：检查规则版本、必填字段、坐标、分级及人工复核。');
    return point;
  }

  function exportBundle(kind, content) {
    return { kind, schemaVersion: config.schemaVersion, exportedAt: new Date().toISOString(), ...content };
  }

  function download(filename, body, type = 'application/json') {
    const blob = new Blob([body], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    let safe = String(value ?? '');
    if (/^\s*[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
    return `"${safe.replaceAll('"', '""')}"`;
  }

  const tools = new Map();
  const readTools = pointId => tools.get(pointId) || {};
  function attachTool(pointId, id, value) {
    const current = readTools(pointId);
    tools.set(pointId, { ...current, [id]: [...(current[id] || []), { recordedAt: new Date().toISOString(), ...value }] });
  }

  globalThis.Sensory = { config, levels, classify, validPolicy, readyToPublish, official, validPublic, publicRecord, exportBundle, download, csvCell, readTools, attachTool, clearTools: pointId => tools.delete(pointId) };
})();
