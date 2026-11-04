(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const STORE = 'studyQuest.experience.v4';
  const REALMS = 'studyQuest.realmEngine.v3';
  const CORE = 'studyQuest.v1';
  const TIMER = 'studyQuest.timer.v4';
  const todayKey = (date = new Date()) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const defaults = { version: 4, name: '', dailySessions: 2, dailyMinutes: 50, sessions: [], welcomeDone: false, navHintSeen: false };
  let experience;
  try { experience = { ...defaults, ...JSON.parse(localStorage.getItem(STORE) || '{}') }; }
  catch { experience = { ...defaults }; }
  experience.sessions = Array.isArray(experience.sessions) ? experience.sessions : [];
  const persist = () => localStorage.setItem(STORE, JSON.stringify(experience));
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch { return {}; } };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));

  document.body.classList.add('sq-v4');
  const app = $('.app');
  const top = $('.top');
  const command = $('.quest-command');
  const grid = $('.grid');
  const journal = $('.mission-journal');
  const adventure = $('#adventure');
  const spotify = $('.spotify-card');
  const transfer = $('.transfer-card');

  if (!app || !top || !command || !grid) return;

  top.setAttribute('id', 'today');
  $('.hero')?.setAttribute('id', 'focus');
  journal?.setAttribute('id', 'missions');
  adventure?.setAttribute('id', 'adventure');
  spotify?.setAttribute('id', 'music');
  transfer?.setAttribute('id', 'transfer');
  $('#toast')?.setAttribute('role', 'status');
  $('#toast')?.setAttribute('aria-live', 'polite');
  $('#modal')?.setAttribute('role', 'dialog');
  $('#modal')?.setAttribute('aria-modal', 'true');
  $('#realmModal')?.setAttribute('role', 'dialog');
  $('#realmModal')?.setAttribute('aria-modal', 'true');

  const nav = document.createElement('nav');
  nav.className = 'sq-nav';
  nav.setAttribute('aria-label', 'Study Quest sections');
  nav.innerHTML = `
    <div class="sq-nav-inner">
      <a href="#today" class="active"><span>⌂</span>Today</a>
      <a href="#missions"><span>✦</span>Missions</a>
      <a href="#adventure"><span>♜</span>Adventure</a>
      <a href="#music"><span>♫</span>Music</a>
      <button type="button" id="sqMore"><span>•••</span>More</button>
      <div class="sq-more-menu" id="sqMoreMenu">
        <button type="button" id="sqOpenTransfer">Transfer & backup</button>
        <button type="button" id="sqOpenGuide">Quick tour</button>
        <button type="button" id="sqShortcuts">Keyboard shortcuts</button>
      </div>
    </div>`;
  app.prepend(nav);

  const daily = document.createElement('section');
  daily.className = 'card sq-daily';
  daily.setAttribute('aria-labelledby', 'sqDailyTitle');
  daily.innerHTML = `
    <div class="sq-daily-main">
      <div class="sq-date" id="sqDate"></div>
      <h2 id="sqDailyTitle">Welcome back. What would make today count?</h2>
      <p id="sqDailyLine">One honest session is enough to create momentum.</p>
      <div class="sq-daily-actions">
        <button class="sq-primary" id="sqStartNow" type="button">▶ Start active mission</button>
        <button class="sq-secondary" id="sqQuickMission" type="button">＋ New mission</button>
        <button class="sq-shield" id="sqFocusShield" type="button" aria-pressed="false">◉ Focus shield</button>
      </div>
    </div>
    <div class="sq-goal" aria-label="Today's progress">
      <div class="sq-goal-ring" id="sqGoalRing"><div><strong id="sqGoalPercent">0%</strong><span>today</span></div></div>
      <div class="sq-goal-copy">
        <strong id="sqGoalSummary">0 of 2 sessions</strong>
        <span id="sqMinuteSummary">0 of 50 focused minutes</span>
        <button type="button" id="sqEditGoal">Adjust daily goal</button>
      </div>
    </div>
    <div class="sq-week" id="sqWeek" aria-label="Seven day momentum"></div>`;
  command.after(daily);

  const focusBar = document.createElement('div');
  focusBar.className = 'sq-focus-bar';
  focusBar.setAttribute('aria-live', 'polite');
  focusBar.innerHTML = `<div><span class="sq-pulse"></span><strong id="sqFocusMission">Focus quest</strong><small id="sqFocusTime">25:00 remaining</small></div><button type="button" id="sqExitShield">Exit focus shield</button>`;
  document.body.appendChild(focusBar);

  const goalModal = document.createElement('div');
  goalModal.className = 'sq-overlay';
  goalModal.id = 'sqGoalModal';
  goalModal.setAttribute('role', 'dialog');
  goalModal.setAttribute('aria-modal', 'true');
  goalModal.setAttribute('aria-labelledby', 'sqGoalHeading');
  goalModal.innerHTML = `<div class="sq-dialog sq-goal-dialog">
    <button class="sq-x" type="button" aria-label="Close">×</button>
    <div class="sq-dialog-icon">◎</div><h2 id="sqGoalHeading">Shape a winnable day</h2>
    <p>Choose a target that feels motivating, not punishing. You can change it any time.</p>
    <form id="sqGoalForm"><label>Focus sessions<input name="sessions" type="number" min="1" max="12" required></label><label>Focused minutes<input name="minutes" type="number" min="5" max="600" step="5" required></label><button class="sq-primary">Save today’s goal</button></form>
  </div>`;
  document.body.appendChild(goalModal);

  const welcome = document.createElement('div');
  welcome.className = 'sq-overlay sq-welcome';
  welcome.id = 'sqWelcome';
  welcome.setAttribute('role', 'dialog');
  welcome.setAttribute('aria-modal', 'true');
  welcome.setAttribute('aria-labelledby', 'sqWelcomeTitle');
  welcome.innerHTML = `<div class="sq-dialog sq-welcome-card">
    <button class="sq-x" type="button" aria-label="Skip welcome">×</button>
    <div class="sq-welcome-art" aria-hidden="true"><div class="sq-orbit o1"></div><div class="sq-orbit o2"></div><span>✦</span><b>🦊</b></div>
    <div class="sq-welcome-copy">
      <div class="sq-kicker">Your work. Your world. Your pace.</div>
      <h2 id="sqWelcomeTitle">Make progress feel like an adventure.</h2>
      <p>Study Quest turns anything you care about into a clear next step, a focused sprint, and a world that grows with you.</p>
      <div class="sq-welcome-points"><span><b>1</b> Pick one mission</span><span><b>2</b> Focus your way</span><span><b>3</b> Watch momentum grow</span></div>
      <label class="sq-name">What should Moss call you? <input id="sqName" maxlength="24" autocomplete="given-name" placeholder="Optional"></label>
      <button class="sq-primary" id="sqBegin" type="button">Enter Study Quest</button>
      <button class="sq-text-btn" id="sqExplore" type="button">Explore without setup</button>
    </div>
  </div>`;
  document.body.appendChild(welcome);

  const shortcut = document.createElement('div');
  shortcut.className = 'sq-overlay'; shortcut.id = 'sqShortcutModal'; shortcut.setAttribute('role', 'dialog'); shortcut.setAttribute('aria-modal', 'true');
  shortcut.innerHTML = `<div class="sq-dialog sq-shortcut-dialog"><button class="sq-x" type="button" aria-label="Close">×</button><div class="sq-kicker">Move faster</div><h2>Keyboard shortcuts</h2><div class="sq-shortcut-list"><span><kbd>S</kbd> Start or pause focus</span><span><kbd>N</kbd> Forge a mission</span><span><kbd>F</kbd> Toggle focus shield</span><span><kbd>1</kbd> Today</span><span><kbd>2</kbd> Missions</span><span><kbd>3</kbd> Adventure</span><span><kbd>Esc</kbd> Close or exit focus</span></div></div>`;
  document.body.appendChild(shortcut);

  function daySessions(key) { return experience.sessions.filter(s => s.day === key); }
  function todayStats() {
    const entries = daySessions(todayKey());
    return { sessions: entries.length, minutes: entries.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0) };
  }
  function greeting() {
    const hour = new Date().getHours();
    const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return experience.name ? `${part}, ${experience.name}.` : `${part}.`;
  }
  function activeMission() {
    const hub = read(REALMS), realm = (hub.realms || []).find(r => r.id === hub.activeRealmId);
    const task = (hub.tasks || []).find(t => t.id === hub.activeTaskId) || (hub.tasks || []).find(t => t.realmId === realm?.id && t.status !== 'done');
    return { realm, task };
  }
  function renderDaily() {
    const now = new Date();
    $('#sqDate').textContent = now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
    $('#sqDailyTitle').textContent = `${greeting()} What would make today count?`;
    const { task, realm } = activeMission();
    $('#sqDailyLine').textContent = task ? `Continue “${task.title}” in ${realm?.name || 'your active realm'}, or choose a different path.` : 'Forge one mission, then make a tiny brave start.';
    $('#sqStartNow').textContent = task ? '▶ Start active mission' : '✦ Forge your first mission';
    const stats = todayStats();
    const sessionPct = stats.sessions / Math.max(1, experience.dailySessions);
    const minutePct = stats.minutes / Math.max(1, experience.dailyMinutes);
    const pct = Math.min(100, Math.round(Math.max(sessionPct, minutePct) * 100));
    $('#sqGoalPercent').textContent = `${pct}%`;
    $('#sqGoalRing').style.setProperty('--goal', `${pct * 3.6}deg`);
    $('#sqGoalSummary').textContent = `${stats.sessions} of ${experience.dailySessions} session${experience.dailySessions === 1 ? '' : 's'}`;
    $('#sqMinuteSummary').textContent = `${stats.minutes} of ${experience.dailyMinutes} focused minutes`;
    const week = $('#sqWeek'); week.innerHTML = '';
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(); date.setDate(date.getDate() - offset);
      const entries = daySessions(todayKey(date));
      const mins = entries.reduce((sum, s) => sum + (Number(s.minutes) || 0), 0);
      const intensity = mins === 0 ? 0 : mins < 25 ? 1 : mins < 50 ? 2 : 3;
      const item = document.createElement('div');
      item.className = `sq-day intensity-${intensity}${offset === 0 ? ' today' : ''}`;
      item.title = `${date.toLocaleDateString(undefined, { weekday: 'long' })}: ${mins} focused minute${mins === 1 ? '' : 's'}`;
      item.innerHTML = `<span>${date.toLocaleDateString(undefined, { weekday: 'narrow' })}</span><i>${entries.length ? entries.length : '·'}</i>`;
      week.appendChild(item);
    }
  }
  function openOverlay(el) { el.classList.add('show'); document.body.classList.add('sq-modal-open'); setTimeout(() => $('input,button', el)?.focus(), 30); }
  function closeOverlay(el) { el.classList.remove('show'); if (!$('.sq-overlay.show')) document.body.classList.remove('sq-modal-open'); }
  function toggleShield(force) {
    const active = typeof force === 'boolean' ? force : !document.body.classList.contains('sq-focus-mode');
    document.body.classList.toggle('sq-focus-mode', active);
    $('#sqFocusShield').setAttribute('aria-pressed', String(active));
    $('#sqFocusShield').innerHTML = active ? '✓ Focus shield on' : '◉ Focus shield';
    focusBar.classList.toggle('show', active && $('#modeLabel')?.textContent === 'focusing');
    if (active) location.hash = 'focus';
  }
  function startNow() {
    const { task } = activeMission();
    if (!task) { $('#forgeMission')?.click(); return; }
    $('#focus')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('#start')?.focus(), 450);
  }
  function recordSession() {
    const minutes = typeof chosen === 'number' ? chosen : 25;
    const { task, realm } = activeMission();
    const signature = `${todayKey()}-${Date.now()}`;
    experience.sessions.push({ id: signature, day: todayKey(), minutes, task: task?.title || $('#quest')?.value || 'Focus quest', realm: realm?.name || '', at: new Date().toISOString() });
    experience.sessions = experience.sessions.slice(-400);
    persist(); renderDaily();
  }

  $('#sqStartNow').onclick = startNow;
  $('#sqQuickMission').onclick = () => $('#forgeMission')?.click();
  $('#sqFocusShield').onclick = () => toggleShield();
  $('#sqExitShield').onclick = () => toggleShield(false);
  $('#sqEditGoal').onclick = () => { const f = $('#sqGoalForm'); f.sessions.value = experience.dailySessions; f.minutes.value = experience.dailyMinutes; openOverlay(goalModal); };
  $('#sqGoalForm').onsubmit = event => { event.preventDefault(); const f = new FormData(event.currentTarget); experience.dailySessions = Math.max(1, Math.min(12, Number(f.get('sessions')))); experience.dailyMinutes = Math.max(5, Math.min(600, Number(f.get('minutes')))); persist(); renderDaily(); closeOverlay(goalModal); };
  $('#sqMore').onclick = event => { event.stopPropagation(); $('#sqMoreMenu').classList.toggle('show'); };
  document.addEventListener('click', event => { if (!event.target.closest('#sqMoreMenu') && !event.target.closest('#sqMore')) $('#sqMoreMenu').classList.remove('show'); });
  $('#sqOpenGuide').onclick = () => openOverlay(welcome);
  $('#sqShortcuts').onclick = () => openOverlay(shortcut);
  $('#sqOpenTransfer').onclick = () => $('.transfer-app')?.click();
  $('#sqBegin').onclick = () => { experience.name = $('#sqName').value.trim(); experience.welcomeDone = true; persist(); renderDaily(); closeOverlay(welcome); startNow(); };
  $('#sqExplore').onclick = () => { experience.welcomeDone = true; persist(); closeOverlay(welcome); };
  $$('.sq-overlay .sq-x').forEach(button => button.onclick = () => { const overlay = button.closest('.sq-overlay'); if (overlay === welcome) { experience.welcomeDone = true; persist(); } closeOverlay(overlay); });
  $$('.sq-overlay').forEach(overlay => overlay.addEventListener('click', event => { if (event.target === overlay) closeOverlay(overlay); }));
  ['claim', 'skip'].forEach(id => document.getElementById(id)?.addEventListener('click', () => setTimeout(recordSession, 120)));

  function saveTimerState() {
    if (typeof chosen !== 'number' || typeof left !== 'number' || typeof running !== 'boolean') return;
    const timerState = { minutes: chosen, remaining: left, status: running ? 'running' : 'paused', savedAt: Date.now() };
    if (running) timerState.deadline = Date.now() + left * 1000;
    localStorage.setItem(TIMER, JSON.stringify(timerState));
  }
  function restoreTimerState() {
    let saved;
    try { saved = JSON.parse(localStorage.getItem(TIMER) || 'null'); } catch { saved = null; }
    if (!saved || !Number.isFinite(saved.minutes) || !Number.isFinite(saved.remaining) || typeof chosen !== 'number') return;
    chosen = Math.max(1, Math.min(240, saved.minutes));
    left = saved.status === 'running' && saved.deadline ? Math.max(0, Math.ceil((saved.deadline - Date.now()) / 1000)) : Math.max(0, saved.remaining);
    $$('.preset').forEach(button => button.classList.toggle('active', Number(button.dataset.min) === chosen));
    drawClock();
    if (saved.status === 'running' && left > 0) setTimeout(() => $('#start')?.click(), 80);
    else if (saved.status === 'running' && left <= 0) setTimeout(() => finish(), 80);
    else if (left > 0 && left < chosen * 60) { $('#start').textContent = 'Resume focus quest'; $('#modeLabel').textContent = 'paused'; }
  }

  const timeNode = $('#time');
  if (timeNode) new MutationObserver(() => {
    $('#sqFocusTime').textContent = `${timeNode.textContent} remaining`;
    $('#sqFocusMission').textContent = $('#quest')?.value || 'Focus quest';
    if (typeof running === 'boolean' && running) saveTimerState();
  }).observe(timeNode, { childList: true, characterData: true, subtree: true });
  $('#start')?.addEventListener('click', () => setTimeout(() => {
    const active = $('#modeLabel')?.textContent === 'focusing';
    focusBar.classList.toggle('show', active && document.body.classList.contains('sq-focus-mode'));
    saveTimerState();
  }, 40));
  $('#reset')?.addEventListener('click', () => localStorage.removeItem(TIMER));
  $$('.preset').forEach(button => button.addEventListener('click', () => setTimeout(saveTimerState, 30)));
  ['claim', 'skip'].forEach(id => document.getElementById(id)?.addEventListener('click', () => localStorage.removeItem(TIMER)));
  const modeNode = $('#modeLabel');
  if (modeNode) new MutationObserver(() => {
    const focusing = modeNode.textContent === 'focusing';
    focusBar.classList.toggle('show', focusing && document.body.classList.contains('sq-focus-mode'));
    if (!focusing && modeNode.textContent === 'complete') localStorage.removeItem(TIMER);
  }).observe(modeNode, { childList: true, characterData: true, subtree: true });
  addEventListener('beforeunload', saveTimerState);

  const sections = ['today', 'missions', 'adventure', 'music'];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) $$('.sq-nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
    }), { rootMargin: '-20% 0px -70%', threshold: 0 });
    sections.map(id => document.getElementById(id)).filter(Boolean).forEach(el => observer.observe(el));
  }
  document.addEventListener('keydown', event => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if (event.key === 'Escape') { const open = $('.sq-overlay.show'); if (open) closeOverlay(open); else if (document.body.classList.contains('sq-focus-mode')) toggleShield(false); return; }
    if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 's') { event.preventDefault(); $('#start')?.click(); }
    if (key === 'n') { event.preventDefault(); $('#forgeMission')?.click(); }
    if (key === 'f') { event.preventDefault(); toggleShield(); }
    if (['1','2','3'].includes(key)) document.getElementById({ '1':'today','2':'missions','3':'adventure' }[key])?.scrollIntoView({ behavior:'smooth' });
  });
  window.addEventListener('hashchange', () => { if (location.hash === '#new-mission') setTimeout(() => $('#forgeMission')?.click(), 150); if (location.hash === '#focus') setTimeout(() => $('#focus')?.scrollIntoView(), 100); });

  const originalRenderTargets = [$('#missionList'), $('#realmScroll')].filter(Boolean);
  originalRenderTargets.forEach(target => new MutationObserver(renderDaily).observe(target, { childList: true, subtree: true }));
  renderDaily();
  restoreTimerState();
  if (!experience.welcomeDone) setTimeout(() => openOverlay(welcome), 500);
  if (location.hash === '#new-mission') setTimeout(() => $('#forgeMission')?.click(), 200);
})();
