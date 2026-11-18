(() => {
  const api = globalThis.Sensory;
  const seconds = start => Math.max(1, Math.round((Date.now() - start) / 1000));
  const clock = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

  function render(main, { heading, icon, option, pointId = '' }) {
    main.innerHTML = heading('04 / 现场工具箱', '把现场情况记下来', '四个辅助工具只记录观察，不替你打分。未定稿的现场流程可以先用人工记录。') +
      `<section class="panel"><div class="fieldgrid"><label class="label">本次点位编号<input id="tool-point" maxlength="40" placeholder="与评估表一致"></label><div><p class="help">使用同一编号，数据会随评估表一起导出。同一地点开始下一次独立观察前，请先导出旧记录，再清空工具记录。</p><button class="button ghost" type="button" id="reset-tools">清空本点位工具记录</button></div></div><p id="tool-report" class="report" role="status"></p></section>
      <div class="section grid"><section class="panel" id="event-tool"><div class="tool-title">${icon('pulse')}<h2>突发声记录</h2></div><p class="muted">开一个观察窗，听到声音就记下类型和能否预料。不录音。</p><div class="tool-rows"><p><span class="readout" id="event-time">00:00</span> · <span id="event-count">0 次</span></p><label class="label">声源<select id="event-source">${api.config.sources.map(source => option(source, source)).join('')}</select></label>
      <label class="label">能否预料<select id="event-predict"><option value="unknown">不确定</option><option value="yes">能</option><option value="no">不能</option></select></label>
      <div class="tags"><button class="button" id="event-toggle">开始 10 分钟</button><button class="button secondary" id="event-add" disabled>记一次</button></div></div></section>
      <section class="panel" id="crowd-tool"><div class="tool-title">${icon('people')}<h2>人流计数</h2></div><p class="muted">选一个固定断面，每有一人经过就点一次。结束后按实际时长换算。</p><div class="tool-rows"><p><span class="readout" id="crowd-time">00:00</span> · <span id="crowd-count">0 人</span></p><div class="tags"><button class="button" id="crowd-toggle">开始 5 分钟</button><button class="button secondary" id="crowd-add" disabled>经过 +1</button><button class="button ghost" id="crowd-minus" disabled>撤回 1 次</button></div></div></section>
      <section class="panel"><div class="tool-title">${icon('volume')}<h2>声音指示值</h2></div><p class="muted">需主动授权麦克风，30 秒后停止。只在浏览器里计算相对信号强度，不保存或上传音频。dBFS 不是环境声压级，不能和其他设备直接比较。</p><div class="tool-rows"><p class="readout" id="audio-value">—</p><div class="tags"><button class="button" id="audio-toggle">开始 30 秒采样</button></div></div></section>
      <section class="panel"><div class="tool-title">${icon('sun')}<h2>光环境自查</h2></div><p class="muted">手工记录眩光或可见闪动；不启动摄像头，也不把未观察到当成无频闪。</p><form id="light-tool" class="tool-rows"><label class="label">是否看到闪动<select name="flicker"><option value="unknown">不确定 / 未查看</option><option value="seen">观察到</option><option value="not-seen">本次未观察到</option></select></label><label class="label">位置、光源或眩光情况<input name="note" maxlength="240" required></label><div><button class="button">附到评估记录</button></div></form></section></div>`;

    const get = id => main.querySelector(`#${id}`);
    const input = get('tool-point');
    const status = get('tool-report');
    const reset = get('reset-tools');
    const audioButton = get('audio-toggle');
    const audioValue = get('audio-value');
    input.value = pointId;
    let running = 0;
    let disposed = false;
    let audio = null;
    const say = text => { status.textContent = text; };
    const refresh = () => {
      const locked = running > 0 || audio !== null;
      input.disabled = locked;
      reset.disabled = locked;
    };
    function requirePoint() {
      const id = input.value.trim();
      if (!id) {
        say('请先填写点位编号。');
        input.focus();
      }
      return id;
    }

    function timer(kind, limit, unit) {
      const toggle = get(`${kind}-toggle`);
      const add = get(`${kind}-add`);
      const minus = get(`${kind}-minus`);
      const display = get(`${kind}-time`);
      const countLabel = get(`${kind}-count`);
      const startText = toggle.textContent;
      let start = 0;
      let interval = 0;
      let id = '';
      let count = 0;
      let events = [];
      const updateCount = () => {
        countLabel.textContent = `${count} ${unit}`;
        if (minus) minus.disabled = !start || count === 0;
      };
      function stop(save) {
        if (!start) return;
        const durationSeconds = Math.min(limit, seconds(start));
        clearInterval(interval);
        if (save) {
          const result = { startedAt: new Date(start).toISOString(), durationSeconds, count };
          if (kind === 'event') result.events = events;
          else result.perMinute = Math.round(count * 600 / durationSeconds) / 10;
          api.attachTool(id, kind === 'event' ? 'soundEvents' : 'crowd', result);
          say(`已附上 ${clock(durationSeconds)} 的${kind === 'event' ? '事件' : '人流'}记录。可在评估表导出。`);
        }
        start = 0;
        running -= 1;
        refresh();
        toggle.textContent = startText;
        add.disabled = true;
        updateCount();
      }
      toggle.addEventListener('click', () => {
        if (start) return stop(true);
        id = requirePoint();
        if (!id) return;
        count = 0;
        events = [];
        start = Date.now();
        display.textContent = '00:00';
        updateCount();
        running += 1;
        refresh();
        add.disabled = false;
        toggle.textContent = '结束并保存';
        interval = setInterval(() => {
          const elapsed = Math.floor((Date.now() - start) / 1000);
          display.textContent = clock(Math.min(elapsed, limit));
          if (elapsed >= limit) stop(true);
        }, 250);
      });
      add.addEventListener('click', () => {
        if (!start) return;
        count += 1;
        if (kind === 'event') events.push({ offsetSeconds: Math.floor((Date.now() - start) / 1000), source: get('event-source').value, predictability: get('event-predict').value });
        updateCount();
      });
      if (minus) minus.addEventListener('click', () => { if (count > 0 && start) count -= 1; updateCount(); });
      return stop;
    }

    const stopEvent = timer('event', 600, '次');
    const stopCrowd = timer('crowd', 300, '人');
    reset.addEventListener('click', () => {
      const id = requirePoint();
      if (id && window.confirm(`清空 ${id} 的工具记录？已下载的文件不会受影响。`)) {
        api.clearTools(id);
        say('本点位的工具记录已清空。');
      }
    });
    get('light-tool').addEventListener('submit', event => {
      event.preventDefault();
      const id = requirePoint();
      const fields = Object.fromEntries(new FormData(event.currentTarget));
      if (!id || !fields.note.trim()) return;
      api.attachTool(id, 'light', { flicker: fields.flicker, note: fields.note.trim() });
      say('光环境记录已附到评估表。');
    });

    function endAudio() {
      if (!audio) return;
      clearInterval(audio.interval);
      audio.stream?.getTracks().forEach(track => track.stop());
      audio.context?.close().catch(() => {});
      audio = null;
      audioButton.disabled = false;
      audioButton.textContent = '开始 30 秒采样';
      refresh();
    }

    audioButton.addEventListener('click', async () => {
      if (audio) { endAudio(); say('已取消采样，没有保存读数。'); return; }
      const id = requirePoint();
      if (!id) return;
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioContext) {
        say('当前环境不支持麦克风采样，请在评估表手工记录。');
        return;
      }
      const session = {};
      audio = session;
      refresh();
      audioButton.textContent = '取消采样';
      audioValue.textContent = '—';
      say('等待麦克风权限。');
      try {
        session.stream = await navigator.mediaDevices.getUserMedia({ audio: { autoGainControl: false, echoCancellation: false, noiseSuppression: false } });
        if (disposed || audio !== session) { session.stream.getTracks().forEach(track => track.stop()); return; }
        session.context = new AudioContext();
        await session.context.resume();
        if (disposed || audio !== session) return;
        const track = session.stream.getAudioTracks()[0];
        const start = Date.now();
        const analyser = session.context.createAnalyser();
        analyser.fftSize = 2048;
        session.context.createMediaStreamSource(session.stream).connect(analyser);
        const buffer = new Float32Array(analyser.fftSize);
        const db = value => Math.round(10 * Math.log10(Math.max(1e-12, value)) * 10) / 10;
        let total = 0;
        let peak = 0;
        let samples = 0;
        session.interval = setInterval(() => {
          if (track.readyState !== 'live') { endAudio(); say('设备已断开，未保存读数。'); return; }
          analyser.getFloatTimeDomainData(buffer);
          for (const sample of buffer) { total += sample * sample; peak = Math.max(peak, sample * sample); }
          samples += buffer.length;
          const elapsed = Math.floor((Date.now() - start) / 1000);
          audioValue.textContent = `${db(total / samples)} dBFS`;
          say(`采样中：${Math.min(elapsed, 30)} / 30 秒。`);
          if (elapsed >= 30) {
            const settings = track.getSettings();
            api.attachTool(id, 'noise', { unit: 'dBFS', durationSeconds: elapsed, rms: db(total / samples), peak: db(peak), method: 'sampled-rms-v1', autoGainControl: settings.autoGainControl ?? null });
            endAudio();
            say('已附上声音指示值，麦克风已停止。');
          }
        }, 125);
      } catch {
        if (audio !== session) return;
        endAudio();
        say('无法使用麦克风，请检查授权或在评估表手工记录。');
      }
    });

    const hide = () => {
      if (document.hidden && audio) { endAudio(); say('切到后台，麦克风采样已取消。'); }
    };
    document.addEventListener('visibilitychange', hide);
    return () => {
      disposed = true;
      stopEvent(false);
      stopCrowd(false);
      endAudio();
      document.removeEventListener('visibilitychange', hide);
    };
  }

  globalThis.SensoryTools = { render };
})();
