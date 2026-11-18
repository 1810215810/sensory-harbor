(() => {
  const api = globalThis.Sensory;
  const mapSearch = globalThis.SensoryMap;
  const { config } = api;
  const main = document.querySelector('main');
  const iconPaths = {
    volume: '<path d="M3 9v6h4l5 4V5L7 9H3zM16 9a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12"/>',
    pulse: '<path d="M2 12h5l3-7 4 14 3-7h5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2m1-15a3 3 0 0 1 0 6m6 9v-2a5 5 0 0 0-4-5"/>',
    leaf: '<path d="M20 4C10 4 5 7 5 14c0 4 3 6 7 5 7-2 8-8 8-15ZM3 21l9-9"/>',
    wind: '<path d="M2 8h13a2.5 2.5 0 1 0-2.5-2.5M2 12h17a2 2 0 1 1 0 4M2 17h9a2 2 0 1 1-2 2"/>'
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const icon = key => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24">${iconPaths[key]}</svg></span>`;
  const option = (value, title) => `<option value="${escape(value)}">${escape(title)}</option>`;
  const options = object => Object.entries(object).map(([key, value]) => option(key, value)).join('');
  const heading = (label, title, text) => `<header class="pagehead"><div class="eyebrow">${label}</div><h1>${title}</h1><p>${text}</p></header>`;
  const action = (href, title, style = '') => `<a class="button ${style}" href="${href}">${title} <span class="arrow" aria-hidden="true">→</span></a>`;
  const demoNotice = '<p class="notice"><strong>示例模式。</strong> 名称、位置、分数和建议均用于演示，请勿据此出行。</p>';
  const publicNotice = '<p class="notice good">这里仅展示已人工核验并获准发布的记录。一次观察不代表整个场所或其他时段。</p>';
  const blank = (title, text, buttons = '') => `<div class="panel empty"><h2>${title}</h2><p class="muted">${text}</p>${buttons ? `<div class="actions">${buttons}</div>` : ''}</div>`;
  const demoMode = value => value ? '?demo=1' : '';
  const dateLabel = input => new Date(input).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  let assessDraft = null;
  let clearView = () => {};

  function mapImage(map, points, { preview = false, selected = '' } = {}) {
    const pins = points.map((point, index) => {
      const style = `left:${point.position[0]}%;top:${point.position[1]}%`;
      return preview ? `<span class="pin ${point.status}" style="${style}" aria-hidden="true">${index + 1}</span>` :
        `<button class="pin ${point.status}" type="button" data-point="${escape(point.id)}" style="${style}" aria-pressed="${point.id === selected}" aria-label="${escape(point.name)}，${point.status === 'candidate' ? '待核验' : '已核验'}">${index + 1}</button>`;
    }).join('');
    const staticImage = map.width && map.height;
    const ratio = staticImage ? ` style="aspect-ratio:${Number(map.width)}/${Number(map.height)}"` : '';
    return `<div class="mapframe${staticImage ? ' standard-map' : ''}"${ratio}><img src="${escape(map.src)}" alt="${escape(map.alt)}">${staticImage ? '' : `<span class="maptag">${escape(map.label)}</span>`}${pins}${preview ? '<div class="preview-card"><span class="badge">示例卡片</span><strong>候诊等候区</strong><p>入口较静，候诊区有间歇叫号。</p></div>' : ''}</div>`;
  }

  const mapCredit = map => map.source ? `<a href="${escape(map.source)}" target="_blank" rel="noopener noreferrer">${escape(map.attribution)}</a>` : escape(map.attribution);

  function pointCard(point, demo, inMap = false) {
    const candidate = point.status === 'candidate';
    const level = demo ? (candidate ? '候选示例' : '观察示例') : api.levels[api.classify(point.scores).level];
    const date = point.observedAt ? dateLabel(point.observedAt) : point.period;
    const scores = !candidate && `<details><summary>查看六项记录</summary><div class="scores">${config.dimensions.map(item => `<div><span>${escape(item.name)}</span><strong>${point.scores?.[item.id] ?? '未测'}</strong></div>`).join('')}</div></details>`;
    const toMap = inMap ? '' : `<a href="#map?${demo ? 'demo=1&' : ''}point=${encodeURIComponent(point.id)}">在地图看这个点 →</a>`;
    return `<article class="panel card"><div class="tags"><span class="badge ${candidate ? 'pending' : ''}">${level}</span><span class="badge pending">${escape(config.types[point.type])}</span></div>
      <h2>${escape(point.name)}</h2><dl><div><dt>具体位置：</dt><dd>${escape(point.location)}</dd></div>${date ? `<div><dt>观察时间：</dt><dd>${escape(date)}${point.observedAt ? '（北京时间）' : ''}</dd></div>` : ''}</dl>
      <p>${escape(point.finding)}</p>${point.advice ? `<div class="advice"><strong>出行怎么准备</strong>${escape(point.advice)}</div>` : ''}${scores || ''}${toMap}</article>`;
  }

  function home() {
    const publishedCount = api.official().length;
    const region = config.study.placeSearch;
    const heroMap = region ? `<div class="panel hero-map hero-live"><iframe src="${escape(mapSearch.viewUrl(region))}" title="高德地图：秦皇岛海港区" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="geolocation 'none'"></iframe><div class="mapnote"><strong>海港区街道地图</strong><a href="#map">搜索地点 →</a></div></div>` :
      `<div class="panel hero-map" aria-label="示例地图画板">${mapImage(config.demoMap, config.demoPoints, { preview: true })}<div class="mapnote"><strong>感官地图 / 点位呈现</strong><span>${mapCredit(config.demoMap)}</span></div></div>`;
    return `<section class="hero"><div><div class="eyebrow">秦皇岛 · 海港区试点</div><h1>出门前，<span>先看看环境。</span></h1>
      <p class="hero-copy">走进候诊区、菜市场或公园之前，先了解声音、人流、灯光和可以休息的地方。给需要提前做准备的家庭，多一点可用的信息。</p>
      <div class="actions">${action('#places', '查看点位清单')}${action(region ? '#map' : '#map?demo=1', region ? '在地图上查地点' : '浏览地图示例', 'secondary')}</div>
      <p class="statusline">${publishedCount ? `已有 ${publishedCount} 个核验点位公开` : '网站原型已开放 · 正式实测数据待接入'}</p></div>
      ${heroMap}</section>
      <section class="section"><div class="section-head"><h2>现场看这六项</h2><p>每份记录都有具体的位置和时间。</p></div>
      <div class="dimstrip">${config.dimensions.map(item => `<div class="dimension">${icon(item.icon)}<span>${escape(item.name)}</span></div>`).join('')}</div></section>
      <section class="strip"><div><h3>要去现场做记录？</h3><p>打开评估表开始填写，或先到工具箱记录声音事件和人流。</p></div>${action('#assess', '打开评估表', 'ghost')}</section>`;
  }

  function places(demo) {
    const points = demo ? config.demoPoints : api.official();
    main.innerHTML = heading('01 / 点位清单', '先查你要去的地方', '每张卡片讲清看到了什么、在哪儿测的，以及出行前可以做什么准备。') +
      (demo ? demoNotice : publicNotice) + `<div class="actions">${action(demo ? '#places' : '#places?demo=1', demo ? '返回正式清单' : '查看示例清单', 'secondary')}</div>` +
      (points.length ? `<div class="filters"><label class="label">搜索点位<input id="query" type="search" placeholder="输入名称或具体区域"></label><label class="label">环境类型<select id="type">${option('', '所有类型')}${options(config.types)}</select></label><label class="label">${demo ? '记录状态' : '观察等级'}<select id="status">${option('', '全部')}${demo ? option('verified', '已观察示例') + option('candidate', '待核验示例') : option('recommended', '推荐') + option('conditional', '有条件推荐')}</select></label></div><p class="help" id="results" aria-live="polite"></p><div class="grid" id="cards"></div>` : `<section class="section">${blank('暂未发布实测点位', '点位核验并审核后会发布到这里。可先用示例了解网站怎么展示。')}</section>`) +
      `<section class="section panel"><details><summary>提名一个候选地点</summary><p class="help">只生成提名文件，不在线提交。请把文件交给项目组核验，不要填个人联系方式或健康信息。</p><form id="nominate" class="fieldgrid"><label class="label">地点名称<input name="name" required maxlength="100"></label><label class="label">环境类型<select name="type">${options(config.types)}</select></label><label class="label wide">为什么值得去观察？<textarea name="reason" required maxlength="500"></textarea></label><div class="wide"><button class="button secondary">导出提名</button></div></form></details></section>`;

    const filter = () => {
      const query = document.querySelector('#query').value.trim().toLowerCase();
      const type = document.querySelector('#type').value;
      const status = document.querySelector('#status').value;
      const found = points.filter(point => (!type || point.type === type) && (!status || (demo ? point.status : api.classify(point.scores).level) === status) && `${point.name} ${point.location}`.toLowerCase().includes(query));
      document.querySelector('#results').textContent = `找到 ${found.length} 条记录`;
      document.querySelector('#cards').innerHTML = found.length ? found.map(point => pointCard(point, demo)).join('') : '<p class="muted">没有符合条件的记录。</p>';
    };
    if (points.length) {
      document.querySelector('.filters').addEventListener('input', filter);
      filter();
    }
    document.querySelector('#nominate').addEventListener('submit', event => {
      event.preventDefault();
      const form = Object.fromEntries(new FormData(event.currentTarget));
      if (!form.name.trim() || !form.reason.trim()) return;
      api.download('sensory-nomination.json', JSON.stringify(api.exportBundle('sensory-nomination', form), null, 2));
    });
  }

  function mountPlaceSearch(region) {
    const form = main.querySelector('#place-search');
    const input = form.elements.keyword;
    const frame = main.querySelector('#street-frame');
    const external = main.querySelector('#street-external');
    const baidu = main.querySelector('#street-baidu');
    const status = main.querySelector('#place-search-status');
    const choices = main.querySelector('#place-choices');
    const suggestions = main.querySelector('#place-suggestions');
    const rows = globalThis.HaigangPlaces || [];
    let matches = [];
    let active = -1;
    let composing = false;
    const selectPlace = place => {
      frame.title = `高德地图：${place.name}`;
      frame.src = mapSearch.placeUrl(place);
      status.textContent = `已定位：${place.name}${place.address ? ` · ${place.address}` : ''}`;
    };
    function show(keyword, selectedPlace) {
      const amapParams = new URLSearchParams({ keyword, city: region.city, src: 'sensory-harbor', callnative: '0' });
      const baiduParams = new URLSearchParams({ query: keyword, region: region.city, output: 'html', src: 'webapp.sensory.harbor' });
      external.href = `https://uri.amap.com/search?${amapParams}`;
      baidu.href = `https://api.map.baidu.com/place/search?${baiduParams}`;
      baidu.hidden = false;
      const places = selectedPlace ? [selectedPlace] : mapSearch.findPlaces(keyword, rows);
      choices.replaceChildren();
      choices.hidden = places.length < 2;
      if (!places.length) {
        frame.title = `高德地图：${keyword}搜索结果`;
        frame.src = mapSearch.searchUrl(region, keyword);
        status.textContent = '本地索引没有匹配，正在用高德查找。若地图没显示结果，可在高德或百度继续查。';
        return;
      }
      selectPlace(places[0]);
      if (places.length < 2) return;
      places.forEach((place, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'button secondary';
        button.textContent = `${index + 1}. ${place.name}${place.address ? ` · ${place.address}` : ''}`;
        button.setAttribute('aria-pressed', String(index === 0));
        button.addEventListener('click', () => {
          choices.querySelector('[aria-pressed="true"]').setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-pressed', 'true');
          selectPlace(place);
        });
        choices.append(button);
      });
    }

    function closeSuggestions() {
      suggestions.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    }

    function choose(place) {
      input.value = place.name;
      closeSuggestions();
      show(place.name, place);
    }

    function renderSuggestions() {
      closeSuggestions();
      const keyword = input.value.trim();
      matches = [...keyword].length >= 2 ? mapSearch.findPlaces(keyword, rows).slice(0, 6) : [];
      suggestions.replaceChildren();
      if (!matches.length) return;
      matches.forEach((place, index) => {
        const option = document.createElement('li');
        option.id = `place-suggestion-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        const name = document.createElement('strong');
        name.textContent = place.name;
        const detail = document.createElement('span');
        detail.textContent = place.address || ({ stop: '公交站点', street: '道路', place: '本地地点' })[place.category];
        option.append(name, detail);
        option.addEventListener('pointerdown', event => event.preventDefault());
        option.addEventListener('click', () => choose(place));
        suggestions.append(option);
      });
      suggestions.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    input.addEventListener('input', event => { if (!composing && !event.isComposing) renderSuggestions(); });
    input.addEventListener('compositionstart', () => { composing = true; closeSuggestions(); });
    input.addEventListener('compositionend', () => { composing = false; renderSuggestions(); });
    input.addEventListener('focus', renderSuggestions);
    input.addEventListener('blur', closeSuggestions);
    input.addEventListener('keydown', event => {
      if (composing || event.isComposing || event.keyCode === 229) return;
      if (event.key === 'Enter' && !suggestions.hidden && active >= 0) {
        event.preventDefault();
        choose(matches[active]);
        return;
      }
      if (event.key === 'Escape' && !suggestions.hidden) {
        event.preventDefault();
        closeSuggestions();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (suggestions.hidden) renderSuggestions();
      if (suggestions.hidden) return;
      event.preventDefault();
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      active = active < 0 ? (direction === 1 ? 0 : matches.length - 1) : (active + direction + matches.length) % matches.length;
      [...suggestions.children].forEach((option, index) => option.setAttribute('aria-selected', String(index === active)));
      const highlighted = suggestions.children[active];
      input.setAttribute('aria-activedescendant', highlighted.id);
      highlighted.scrollIntoView({ block: 'nearest' });
    });

    form.addEventListener('submit', event => {
      event.preventDefault();
      if (composing) return;
      const keyword = input.value.trim();
      if (!keyword) {
        status.textContent = '请输入地点名称、地址或类别。';
        input.focus();
        return;
      }
      closeSuggestions();
      show(keyword);
    });
    frame.src = external.href = mapSearch.viewUrl(region);
    status.textContent = '当前显示海港区周边。搜到地点后，地图会移过去放大。';
  }

  function mapPage(demo, selected) {
    const points = demo ? config.demoPoints : api.official();
    const map = demo ? config.demoMap : config.study.publicMap;
    const region = !demo && config.study.placeSearch;
    const lookup = region ? `<section class="panel street-map" aria-label="查找真实地点">
      <form id="place-search" class="place-search" role="search" aria-label="地图地点搜索"><label class="label" for="place-keyword">地点名称、地址或类别</label><div class="search-row"><input name="keyword" id="place-keyword" type="search" maxlength="100" required placeholder="例如：秦皇岛站、人民公园、医院" autocomplete="off" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="place-suggestions" aria-describedby="place-search-status"><button class="button" type="submit" aria-controls="street-frame">搜索地点</button></div><ul id="place-suggestions" class="place-suggestions" role="listbox" aria-label="地点候选" hidden></ul></form>
      <p class="help" id="place-search-status" role="status"></p><div id="place-choices" class="maplist" role="group" aria-label="切换匹配地点" hidden></div><div class="mapnote"><span>本地地名：海港区主城区 · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap 贡献者</a></span><div class="tags"><a id="street-external" target="_blank" rel="noopener noreferrer">打开高德地图 ↗</a><a id="street-baidu" target="_blank" rel="noopener noreferrer" hidden>在百度地图搜索 ↗</a></div></div>
      <iframe id="street-frame" title="高德地图" referrerpolicy="strict-origin-when-cross-origin" allow="geolocation 'none'"></iframe></section>` : '';
    const pointMap = map ? `<div class="section maplayout"><div class="panel"><h2 class="basemap-title">${demo ? '街区示意' : escape(map.label)}</h2>${mapImage(map, points, { selected })}<div class="mapnote"><span>${demo ? '深色：观察示例 · 空心：候选示例' : mapCredit(map)}</span>${demo ? `<span>${mapCredit(map)}</span>` : `<a href="${escape(map.src)}" target="_blank" rel="noopener">打开原图（新标签页）</a>`}</div>${points.length ? `<div class="maplist" aria-label="地图点位列表">${points.map((point, index) => `<button class="button secondary" type="button" data-point="${escape(point.id)}">${index + 1} · ${escape(point.name)}</button>`).join('')}</div>` : ''}</div><div id="map-detail" aria-live="polite"></div></div>` : '';
    main.innerHTML = heading('02 / 点位地图', demo ? '从地图看点位' : '海港区地图', demo ? '点一下标记，看看点位卡片怎么展示。' : '按名称、地址或类别查找秦皇岛的真实地点。地图默认打开海港区，可以拖动和缩放。') +
      (demo ? demoNotice : lookup) + `<div class="actions">${action(`#places${demoMode(demo)}`, '查看感官评测清单', 'secondary')}${action(demo ? '#map' : '#map?demo=1', demo ? '返回海港区地图' : '体验示例点位', 'ghost')}</div>` +
      (demo || points.length ? pointMap : `<p class="section muted">暂无公开感官评测点位。</p>${map ? `<details class="section panel"><summary>查看秦皇岛行政区总览图</summary>${pointMap}</details>` : ''}`);
    if (region) mountPlaceSearch(region);
    const detail = document.querySelector('#map-detail');
    if (!detail) return;
    const select = id => {
      const point = points.find(item => item.id === id);
      detail.innerHTML = point ? pointCard(point, demo, true) : points.length ? blank('请选择一个点位', '可以点地图标记，也可以用地图下方的点位按钮。') : '';
      main.querySelectorAll('.pin').forEach(pin => pin.setAttribute('aria-pressed', String(pin.dataset.point === id)));
    };
    main.querySelectorAll('[data-point]').forEach(button => button.addEventListener('click', () => {
      select(button.dataset.point);
      if (matchMedia('(max-width: 720px)').matches) {
        detail.querySelector('article h2')?.setAttribute('tabindex', '-1');
        detail.querySelector('article h2')?.focus({ preventScroll: true });
        detail.scrollIntoView({ block: 'nearest' });
      }
    }));
    select(selected);
  }

  function assess() {
    const approved = api.validPolicy(config.policy);
    main.innerHTML = heading('03 / 现场采集', '现场评估表', '一份记录对应一个明确的区域和观察时段。可先记下现场事实，正式评分规则就绪后再启用定级。') +
      `<p class="notice ${approved ? 'good' : ''}">${approved ? `正在使用规则 ${escape(config.policy.version)}。导出后仍须人工审核才可公开。` : '<strong>评测标准待确认。</strong> 当前可填写原始观察或试记分，不生成正式推荐。'}</p>
      <form id="observation" class="stack"><section class="panel"><h2 class="subhead">观察条件</h2><div class="fieldgrid">
      <label class="label">点位编号<input name="pointId" required maxlength="40" placeholder="例如：HGG-01"></label>
      <label class="label">场所名称<input name="name" required maxlength="100"></label>
      <label class="label">环境类型<select name="type">${options(config.types)}</select></label>
      <label class="label">场景包<select name="scenario">${options(Object.fromEntries(Object.entries(config.scenarios).map(([key, value]) => [key, value.label])))}</select></label>
      <p id="scenario-note" class="help wide"></p><label class="label wide">具体位置或路段<input name="location" required maxlength="160" placeholder="例如：东门到一层候诊区"></label>
      <label class="label">观察开始时间（北京时间）<input name="time" type="datetime-local" required></label>
      <label class="label">观察时长（分钟）<input name="duration" type="number" min="1" max="1440" required></label>
      <label class="label">采集员代号（选填）<input name="rater" maxlength="40"></label>
      <label class="label">设备或异常情况（选填）<input name="context" maxlength="180"></label></div></section>
      <section class="panel"><h2 class="subhead">六项观察</h2><div class="grid">${config.dimensions.map(item => `<div class="measure"><div class="tool-title">${icon(item.icon)}<h3>${escape(item.name)}</h3></div><label class="label">${approved ? '评分' : '试记分'}<select name="score-${item.id}" aria-label="${escape(item.name)}评分">${option('', '未测')}${[1, 2, 3, 4, 5].map(score => option(score, score)).join('')}</select></label><label class="label wide">${escape(item.name)}现场依据<span class="help">${escape(item.prompt)}</span><input name="note-${item.id}" maxlength="240"></label>${item.criteria ? `<details class="wide"><summary>查看评分细则</summary><ul>${Object.entries(item.criteria).map(([score, description]) => `<li>${escape(score)} 分：${escape(description)}</li>`).join('')}</ul></details>` : ''}</div>`).join('')}</div></section>
      <section class="panel"><h2 class="subhead">出行提示与导出</h2><div class="fieldgrid"><label class="label wide">观察后能给什么建议？<textarea name="advice" maxlength="500" placeholder="比如：从哪个入口进、哪里可以暂时休息。不确定就留空。"></textarea></label></div><p id="attached" class="help"></p><p class="help">本表数据不会上传。离开或刷新前请导出；请勿填写姓名、面孔、健康资料或可识别他人身份的信息。</p><div class="actions"><button class="button" type="submit">导出观察 JSON</button>${action('#tools', '打开现场工具箱', 'secondary')}</div><p id="assessment-report" class="report" aria-live="polite"></p></section></form>`;
    const form = document.querySelector('#observation');
    const field = name => form.elements.namedItem(name);
    for (const [key, value] of Object.entries(assessDraft || {})) if (field(key)) field(key).value = value;
    if (!field('time').value) field('time').value = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 16);
    const refresh = () => {
      document.querySelector('#scenario-note').textContent = config.scenarios[field('scenario').value].notes;
      const count = Object.keys(api.readTools(field('pointId').value.trim())).length;
      document.querySelector('#attached').textContent = count ? `已关联 ${count} 类工具记录，将一起导出。` : '未关联工具记录。工具箱和评估表用同一个点位编号即可关联。';
    };
    refresh();
    form.addEventListener('input', refresh);
    clearView = () => { assessDraft = Object.fromEntries(new FormData(form)); };
    form.addEventListener('submit', event => {
      event.preventDefault();
      const report = document.querySelector('#assessment-report');
      const pointId = field('pointId').value.trim();
      const name = field('name').value.trim();
      const location = field('location').value.trim();
      const observedAt = `${field('time').value}:00+08:00`;
      if (!pointId || !name || !location || !Number.isFinite(Date.parse(observedAt))) {
        report.textContent = '请填写有效的编号、场所名称、具体位置和时间。';
        return;
      }
      const scores = {};
      const evidence = {};
      for (const { id } of config.dimensions) {
        if (field(`score-${id}`).value) scores[id] = Number(field(`score-${id}`).value);
        if (field(`note-${id}`).value.trim()) evidence[id] = field(`note-${id}`).value.trim();
      }
      const { level, missing } = api.classify(scores);
      const toolReadings = api.readTools(pointId);
      const record = api.exportBundle('sensory-observation', { pointId, name, location, observedAt, type: field('type').value,
        scenario: field('scenario').value, durationMinutes: Number(field('duration').value), rater: field('rater').value.trim(),
        context: field('context').value.trim(), scores, evidence, advice: field('advice').value.trim(), toolReadings,
        missing, level, policyVersion: config.policy.version });
      api.download(`${pointId.replace(/[^\w-]/g, '_')}-observation.json`, JSON.stringify(record, null, 2));
      report.textContent = `已生成观察文件。${api.levels[level]}；未公开。`;
    });
  }

  function method() {
    const approved = api.validPolicy(config.policy);
    return heading('05 / 观察方法', '我们怎么记录', '记录当时看到了什么，不替某个家庭决定一个地方能不能去。') +
      `<p class="notice"><strong>${approved ? '规则已启用' : '规则尚未定稿'}：</strong> ${escape(config.policy.version)}。${approved ? '对外展示前仍须人工复核。' : '五档评分细则、缺项和定级参数确认后再启用。'}</p>
      <div class="grid">${config.dimensions.map(item => `<article class="panel method-dim"><div class="tool-title">${icon(item.icon)}<h3>${escape(item.name)}</h3></div><p class="muted">${escape(item.prompt)}</p>${item.criteria ? `<ul>${Object.entries(item.criteria).map(([score, description]) => `<li>${escape(score)} 分：${escape(description)}</li>`).join('')}</ul>` : '<p class="help">判分细则待确认。</p>'}</article>`).join('')}</div>
      <section class="section"><div class="section-head"><h2>三个场景包</h2></div><div class="grid">${Object.values(config.scenarios).map(scenario => `<article class="panel"><h3>${escape(scenario.label)}</h3><p>${escape(scenario.notes)}</p></article>`).join('')}</div></section>
      <section class="section panel"><h2 class="subhead">本地声源备忘</h2><p>${config.sources.map(escape).join(' · ')}</p><p class="help">同一种声源可能有固定时段，也可能突然发生，现场分别记录。</p></section>
      <section class="section panel"><h2 class="subhead">哪些结论不能下</h2><ul><li>只测了一个时段，就不判断哪个时段更安静。</li><li>声音指示值不是校准后的声压级；没有看到条纹不能证明没有频闪。</li><li>不同人的感官体验不同，卡片只作出行参考，不用于诊断或场所认证。</li></ul></section>`;
  }

  function dataPage() {
    const records = api.official().map(point => ({ ...point, level: api.classify(point.scores).level }));
    main.innerHTML = heading('06 / 开放数据', '数据与下载', '公开下载只包含审核后的可发布观察记录。示例、低分内部记录和采集员信息不作为公开数据。') +
      `<div class="grid"><section class="panel"><h2 class="subhead">公开数据</h2><p class="muted">${records.length ? `当前有 ${records.length} 条公开记录。` : '当前没有正式记录可下载。'}</p><div class="actions"><button class="button" id="download-json" ${records.length ? '' : 'disabled'}>下载 JSON</button><button class="button secondary" id="download-csv" ${records.length ? '' : 'disabled'}>下载 CSV</button></div></section><section class="panel"><h2 class="subhead">开发与迁移</h2><p class="muted">数据结构、审核导入、底图坐标和规则接入写在仓库说明里。</p><div class="actions">${action('./README.md', '查看接入说明', 'secondary')}</div></section></div>
      <section class="section panel"><h2 class="subhead">字段速览</h2><div class="kv"><div><span>观察对象</span><strong>点位编号 / 名称 / 具体位置</strong></div><div><span>观察条件</span><strong>北京时间 / 六项原始分 / 规则版本</strong></div><div><span>使用说明</span><strong>观察发现 / 出行准备 / 发布状态</strong></div></div><p class="help">${config.study.dataLicense ? `正式数据许可：${escape(config.study.dataLicense)}。` : '正式数据许可待确认。'}地图示例为项目自绘示意。</p></section>`;
    document.querySelector('#download-json').addEventListener('click', () => api.download('sensory-public.json', JSON.stringify(api.exportBundle('sensory-public', { license: config.study.dataLicense, records }), null, 2)));
    document.querySelector('#download-csv').addEventListener('click', () => {
      const keys = ['id', 'name', 'type', 'location', 'observedAt', 'finding', 'advice', 'level', 'policyVersion'];
      const dims = config.dimensions.map(item => item.id);
      const values = [[...keys, ...dims], ...records.map(point => [...keys.map(key => point[key]), ...dims.map(key => point.scores[key])])];
      api.download('sensory-public.csv', '\uFEFF' + values.map(row => row.map(api.csvCell).join(',')).join('\r\n'), 'text/csv');
    });
  }

  const routes = { home: '首页', places: '清单', map: '地图', assess: '评估', tools: '工具箱', method: '方法', data: '数据' };

  function route(initial = false) {
    if (location.hash === '#main') return;
    clearView();
    clearView = () => {};
    const [path, query] = location.hash.slice(1).split('?');
    const page = Object.hasOwn(routes, path) ? path : 'home';
    const params = new URLSearchParams(query);
    const demo = params.get('demo') === '1';
    document.querySelectorAll('.nav a').forEach(link => link.hash === `#${page}` ? link.setAttribute('aria-current', 'page') : link.removeAttribute('aria-current'));
    document.title = `${routes[page]} · 感官地图`;
    if (page === 'home') main.innerHTML = home();
    if (page === 'places') places(demo);
    if (page === 'map') mapPage(demo, params.get('point'));
    if (page === 'assess') assess();
    if (page === 'tools') clearView = globalThis.SensoryTools.render(main, { heading, icon, option, pointId: assessDraft?.pointId });
    if (page === 'method') main.innerHTML = method();
    if (page === 'data') dataPage();
    window.scrollTo(0, 0);
    if (!initial) main.focus({ preventScroll: true });
  }

  document.querySelector('.skip').addEventListener('click', event => { event.preventDefault(); main.focus(); });
  window.addEventListener('hashchange', () => route());
  document.addEventListener('DOMContentLoaded', () => route(true));
})();
