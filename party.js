(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const PREFS = 'studyQuest.party.v1';
  const MODULE_URL = 'https://esm.sh/trystero@0.26.0';
  const COLORS = ['#2f735b', '#7b61a8', '#cb6f57', '#397f9c', '#a17725', '#b6537d', '#4d7b46'];
  const EMOJIS = ['🦊', '🐼', '🐸', '🐯', '🐙', '🐝', '🦉', '🐧'];
  const REACTIONS = ['🔥', '🙌', '🦊', '✨', '💪', '🌱'];
  const safeParse = (value, fallback = {}) => { try { return JSON.parse(value) || fallback; } catch { return fallback; } };
  const prefs = { name: '', avatar: EMOJIS[0], color: COLORS[0], ...safeParse(localStorage.getItem(PREFS)) };
  const persistPrefs = () => localStorage.setItem(PREFS, JSON.stringify(prefs));
  const cleanCode = value => String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const displayCode = value => cleanCode(value).replace(/(.{4})(?=.)/g, '$1-');
  const randomCode = () => {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return [...bytes].map(byte => alphabet[byte % alphabet.length]).join('');
  };
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]));
  const time = seconds => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;
  const relativeTime = timestamp => {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 8) return 'now';
    if (seconds < 60) return `${seconds}s`;
    return `${Math.floor(seconds / 60)}m`;
  };

  let room = null;
  let actions = {};
  let selfId = '';
  let roomCode = '';
  let connected = false;
  let joining = false;
  let applyingRemote = false;
  let connectAttempt = 0;
  let sharedMission = '';
  let leaderId = '';
  let isHost = false;
  let lastTimerStamp = 0;
  let pauseRequest = null;
  let consensusPauseAuthorized = false;
  const members = new Map();
  const messages = [];

  const top = $('.top');
  if (!top) return;
  const partyButton = document.createElement('button');
  partyButton.className = 'party-app';
  partyButton.type = 'button';
  partyButton.setAttribute('aria-label', 'Open Study Party');
  partyButton.innerHTML = '<span class="party-spark" aria-hidden="true">✦</span><span>Study Party</span><i id="partyCount">1</i>';
  top.insertBefore(partyButton, $('.stats'));

  const moreButton = $('#sqMore');
  if (moreButton) {
    const navParty = document.createElement('button');
    navParty.type = 'button'; navParty.className = 'sq-party-nav'; navParty.innerHTML = '<span>♣</span>Party';
    moreButton.before(navParty);
    navParty.onclick = () => openParty();
  }

  const modal = document.createElement('div');
  modal.className = 'party-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'partyTitle');
  modal.innerHTML = `
    <section class="party-shell">
      <button class="party-close" type="button" aria-label="Close Study Party">×</button>
      <div class="party-lobby" id="partyLobby">
        <div class="party-hero">
          <div class="party-orbit" aria-hidden="true"><span>🦊</span><i>✦</i><b>●</b></div>
          <div class="party-kicker">Focus is better together</div>
          <h2 id="partyTitle">Start a Study Party.</h2>
          <p>Share one mission, one timer, and a little momentum with people you trust. No account required.</p>
          <div class="party-benefits"><span><b>◎</b> Synced focus</span><span><b>✦</b> Shared mission</span><span><b>♡</b> Live encouragement</span></div>
        </div>
        <div class="party-setup">
          <div class="party-tabs" role="tablist"><button class="active" type="button" data-party-tab="create">Create a party</button><button type="button" data-party-tab="join">Join friends</button></div>
          <div class="party-profile">
            <label>Your name<input id="partyName" maxlength="20" autocomplete="nickname" placeholder="What should friends call you?"></label>
            <div><span>Your party buddy</span><div class="party-avatar-picker" id="partyAvatarPicker"></div></div>
          </div>
          <div class="party-pane active" data-party-pane="create">
            <div class="party-note"><span>🔒</span><p><b>Private by design</b>Your invite code protects the room. Study data stays on everyone’s own device.</p></div>
            <button class="party-main" id="createParty" type="button">Create my Study Party</button>
          </div>
          <div class="party-pane" data-party-pane="join">
            <label class="party-code-field">Private invite code<input id="joinCode" maxlength="14" inputmode="text" autocomplete="off" placeholder="ABCD-EFGH-JKLM"></label>
            <button class="party-main" id="joinParty" type="button">Join the party</button>
          </div>
          <p class="party-privacy">Party mode needs internet and uses encrypted peer-to-peer connections. Public relays only introduce browsers; party messages are not saved there.</p>
        </div>
      </div>
      <div class="party-room" id="partyRoom">
        <header class="party-room-head">
          <div><div class="party-live"><i></i><span id="partyStatus">Connecting…</span></div><h2>Study Party</h2><p>Room <button type="button" id="copyRoomCode"></button></p></div>
          <div class="party-room-actions"><button id="shareParty" type="button">↗ Invite friends</button><button id="leaveParty" type="button">Leave</button></div>
        </header>
        <div class="party-grid">
          <main class="party-main-column">
            <section class="party-mission-card">
              <div class="party-card-label">Everyone’s mission</div>
              <div class="party-mission-edit"><input id="partyMission" maxlength="120" placeholder="What are you tackling together?"><button id="savePartyMission" type="button">Set mission</button></div>
              <p id="partyMissionBy">Choose something that everyone can move forward.</p>
            </section>
            <section class="party-timer-card">
              <div class="party-timer-ring" id="partyTimerRing"><div><strong id="partyTime">25:00</strong><span id="partyTimerMode">ready together</span></div></div>
              <div class="party-timer-controls">
                <h3>One timer. One team.</h3><p>Everyone must be ready to start, and everyone must approve before the timer pauses.</p>
                <div class="party-durations"><button data-party-min="15">15m</button><button class="active" data-party-min="25">25m</button><button data-party-min="45">45m</button><button data-party-min="60">60m</button></div>
                <button class="party-focus-button" id="partyStart" type="button">▶ Start together</button>
                <div class="party-ready-gate" id="partyReadyGate" role="status" aria-live="polite"></div>
                <div class="party-pause-vote" id="partyPauseVote" hidden>
                  <p id="partyPausePrompt"></p><strong id="partyPauseCount"></strong>
                  <div><button id="allowPartyPause" type="button">Allow pause</button><button id="declinePartyPause" type="button">Keep focusing</button></div>
                </div>
              </div>
            </section>
            <section class="party-chat-card">
              <div class="party-card-label">Camp chat</div><div class="party-feed" id="partyFeed" aria-live="polite"></div>
              <form id="partyChatForm"><textarea id="partyMessage" rows="1" maxlength="500" placeholder="Send a message…" aria-label="Party message"></textarea><div><span id="partyChatCount">0/500</span><button>Send</button></div></form>
            </section>
          </main>
          <aside class="party-side-column">
            <section class="party-members-card"><div class="party-card-title"><div><span>Party members</span><strong id="partyMemberCount">1 adventurer</strong></div><button id="toggleReady" type="button">I’m ready</button></div><div class="party-members" id="partyMembers"></div></section>
            <section class="party-reaction-card"><div class="party-card-label">Cheer someone on</div><div class="party-reactions" id="partyReactions"></div></section>
            <section class="party-promise"><span>🛡</span><div><b>Small, private rooms</b><p>Best with 2–6 friends. No accounts, ads, public profiles, or stored chat history.</p></div></section>
          </aside>
        </div>
      </div>
      <div class="party-loading" id="partyLoading"><div class="party-loader"><i></i><i></i><i></i></div><h3>Opening the trail…</h3><p id="partyLoadingText">Connecting your browser securely.</p><button id="cancelParty" type="button">Cancel</button></div>
      <div class="party-error" id="partyError"><span>☁</span><h3>We couldn’t open the party.</h3><p id="partyErrorText">Check your connection and try again.</p><button type="button" id="partyRetry">Back to setup</button></div>
      <div class="party-invite-sheet" id="partyInviteSheet" aria-hidden="true">
        <div class="party-invite-card">
          <button class="party-invite-close" id="closePartyInvite" type="button" aria-label="Close invite panel">×</button>
          <div class="party-invite-icon">↗</div>
          <div class="party-kicker">Bring your people in</div>
          <h3>Invite friends to the party.</h3>
          <p id="partyInviteHelp">Send the private link below. Anyone with it can enter this temporary room.</p>
          <button class="party-code-copy" id="copyPartyCode" type="button"><span>Private room code</span><strong id="partyInviteCode"></strong><i>Copy</i></button>
          <button class="party-link-copy" id="copyPartyLink" type="button">Copy secure invite link</button>
          <button class="party-native-share" id="nativePartyShare" type="button">Share with another app</button>
          <div class="party-invite-status" id="partyInviteStatus" role="status" aria-live="polite"></div>
          <small>Only invite people you trust. The room disappears when everyone leaves.</small>
        </div>
      </div>
      <div class="party-resize-hint" title="Drag this corner to resize the Study Party window" aria-hidden="true"><i></i><i></i><i></i></div>
    </section>`;
  document.body.appendChild(modal);

  const partyShell = $('.party-shell');
  const savedWindowSize = safeParse(localStorage.getItem('studyQuest.partyWindow.v1'), null);
  if (innerWidth > 850 && savedWindowSize?.width && savedWindowSize?.height) {
    partyShell.style.width = `${savedWindowSize.width}px`;
    partyShell.style.height = `${savedWindowSize.height}px`;
  }
  if ('ResizeObserver' in window) {
    let sizeSaveTimer;
    new ResizeObserver(([entry]) => {
      if (!modal.classList.contains('show') || innerWidth <= 850) return;
      clearTimeout(sizeSaveTimer);
      sizeSaveTimer = setTimeout(() => localStorage.setItem('studyQuest.partyWindow.v1', JSON.stringify({ width: Math.round(entry.contentRect.width), height: Math.round(entry.contentRect.height) })), 180);
    }).observe(partyShell);
  }

  const reactionLayer = document.createElement('div');
  reactionLayer.className = 'party-reaction-layer';
  document.body.appendChild(reactionLayer);

  function showView(view) {
    ['partyLobby', 'partyRoom', 'partyLoading', 'partyError'].forEach(id => $(`#${id}`).classList.toggle('active', id === view));
  }
  function openParty(tab = null) {
    modal.classList.add('show'); document.body.classList.add('sq-modal-open');
    if (connected) showView('partyRoom'); else if (!joining) showView('partyLobby');
    if (tab) switchTab(tab);
  }
  function closeParty() { closeInvitePanel(); modal.classList.remove('show'); document.body.classList.remove('sq-modal-open'); }
  function switchTab(tab) {
    $$('.party-tabs button').forEach(button => button.classList.toggle('active', button.dataset.partyTab === tab));
    $$('.party-pane').forEach(pane => pane.classList.toggle('active', pane.dataset.partyPane === tab));
  }
  function saveProfile() {
    prefs.name = $('#partyName').value.trim().slice(0, 20) || 'Trail Friend';
    persistPrefs();
  }
  function renderAvatarPicker() {
    $('#partyAvatarPicker').innerHTML = EMOJIS.map(emoji => `<button type="button" class="${emoji === prefs.avatar ? 'active' : ''}" data-avatar="${emoji}">${emoji}</button>`).join('');
  }
  function selfMember() { return { id: selfId || 'self', name: prefs.name || 'Trail Friend', avatar: prefs.avatar, color: prefs.color, ready: members.get(selfId)?.ready || false, host: isHost, self: true }; }
  function partyMemberList() {
    return [selfMember(), ...[...members.entries()].filter(([id]) => id !== selfId).map(([id, member]) => ({ id, ...member }))];
  }
  function readinessState() {
    const list = partyMemberList();
    const waiting = list.filter(member => !member.ready);
    if (list.length < 2) return { canStart: false, text: 'Waiting for a friend to join and ready up.' };
    if (waiting.length) {
      const names = waiting.map(member => member.self ? 'you' : member.name || 'a friend');
      return { canStart: false, text: `Waiting for ${names.join(' and ')} to be ready.` };
    }
    return { canStart: true, text: 'Everyone is ready ✓ Start when you are.' };
  }
  function renderReadyGate() {
    const state = readinessState();
    const isTimerRunning = typeof running === 'boolean' && running;
    $('#partyReadyGate').textContent = isTimerRunning ? 'Focus session in progress · everyone is synced.' : state.text;
    $('#partyReadyGate').classList.toggle('ready', state.canStart && !isTimerRunning);
    $('#partyStart').disabled = !isTimerRunning && !state.canStart;
  }
  function memberName(memberId) {
    if (memberId === selfId) return prefs.name || 'You';
    return members.get(memberId)?.name || 'A friend';
  }
  function renderPauseVote() {
    const panel = $('#partyPauseVote');
    if (!pauseRequest || !(typeof running === 'boolean' && running)) { panel.hidden = true; return; }
    const pending = pauseRequest.participants.filter(id => !pauseRequest.approvals.has(id));
    const selfApproved = pauseRequest.approvals.has(selfId);
    if (pauseRequest.requesterId === selfId) $('#partyPausePrompt').textContent = pending.length ? `Pause requested · waiting for ${pending.map(memberName).join(' and ')}.` : 'Everyone approved. Pausing together…';
    else if (selfApproved) $('#partyPausePrompt').textContent = pending.length ? `You allowed the pause · waiting for ${pending.map(memberName).join(' and ')}.` : 'Everyone approved. Pausing together…';
    else $('#partyPausePrompt').textContent = `${pauseRequest.requesterName} wants to pause for everyone.`;
    $('#partyPauseCount').textContent = `${pauseRequest.approvals.size}/${pauseRequest.participants.length} approved`;
    $('#allowPartyPause').hidden = selfApproved;
    $('#declinePartyPause').textContent = pauseRequest.requesterId === selfId ? 'Cancel request' : 'Keep focusing';
    panel.hidden = false;
  }
  function clearPauseRequest(message = '') {
    pauseRequest = null; renderPauseVote();
    if (message) addFeed({ system: true, text: message });
  }
  function beginPauseRequest() {
    if (pauseRequest || !(typeof running === 'boolean' && running)) { renderPauseVote(); return; }
    if (!modal.classList.contains('show')) openParty();
    const participants = partyMemberList().map(member => member.id);
    pauseRequest = { id: `${selfId}-${Date.now()}`, requesterId: selfId, requesterName: prefs.name || 'Trail Friend', participants, approvals: new Set([selfId]) };
    actions.pause?.send({ type: 'request', id: pauseRequest.id, requesterName: pauseRequest.requesterName, participants });
    renderPauseVote(); addFeed({ system: true, text: 'You asked the party to pause. The timer keeps running until everyone agrees.' });
  }
  function maybeCompletePauseVote() {
    if (!pauseRequest || pauseRequest.requesterId !== selfId || !pauseRequest.participants.every(id => pauseRequest.approvals.has(id))) return;
    const requestId = pauseRequest.id;
    actions.pause?.send({ type: 'approved', id: requestId });
    clearPauseRequest('Everyone approved the pause.');
    consensusPauseAuthorized = true;
    $('#start')?.click();
    setTimeout(() => { consensusPauseAuthorized = false; }, 250);
  }
  function voteOnPause(allow) {
    if (!pauseRequest) return;
    if (!allow) {
      actions.pause?.send({ type: 'decline', id: pauseRequest.id });
      clearPauseRequest(pauseRequest.requesterId === selfId ? 'You canceled the pause request.' : 'You chose to keep the focus timer running.');
      return;
    }
    pauseRequest.approvals.add(selfId);
    actions.pause?.send({ type: 'vote', id: pauseRequest.id, allow: true });
    renderPauseVote(); maybeCompletePauseVote();
  }
  function receivePauseAction(data, peerId) {
    if (!data || !data.type) return;
    if (data.type === 'request') {
      if (!(typeof running === 'boolean' && running)) return;
      const incomingId = String(data.id || '');
      if (pauseRequest && pauseRequest.id !== incomingId && pauseRequest.id.localeCompare(incomingId) < 0) return;
      if (pauseRequest?.id === incomingId) return;
      const participants = [...new Set([...(Array.isArray(data.participants) ? data.participants : []), peerId, selfId])];
      pauseRequest = { id: String(data.id || ''), requesterId: peerId, requesterName: members.get(peerId)?.name || String(data.requesterName || 'A friend'), participants, approvals: new Set([peerId]) };
      if (!modal.classList.contains('show')) openParty();
      renderPauseVote(); addFeed({ system: true, text: `${pauseRequest.requesterName} asked everyone to approve a pause.` });
      return;
    }
    if (!pauseRequest || data.id !== pauseRequest.id) return;
    if (data.type === 'vote' && data.allow) { pauseRequest.approvals.add(peerId); renderPauseVote(); maybeCompletePauseVote(); }
    if (data.type === 'decline') clearPauseRequest(`${members.get(peerId)?.name || 'A friend'} chose to keep focusing.`);
    if (data.type === 'approved') clearPauseRequest('Everyone approved the pause.');
  }
  function renderMembers() {
    const list = partyMemberList();
    $('#partyCount').textContent = list.length;
    $('#partyMemberCount').textContent = `${list.length} adventurer${list.length === 1 ? '' : 's'}`;
    $('#partyMembers').innerHTML = list.map(member => `<article class="party-member ${member.ready ? 'ready' : ''}"><div class="party-member-avatar" style="--member:${esc(member.color || COLORS[0])}">${esc(member.avatar || '🧭')}<i></i></div><div><strong>${esc(member.name)}${member.self ? ' <small>you</small>' : ''}</strong><span>${member.ready ? 'Ready to focus' : 'At the camp'}</span></div><b>${member.ready ? '✓' : '·'}</b></article>`).join('');
    renderReadyGate();
    renderPauseVote();
  }
  function addFeed(entry) {
    messages.push({ at: Date.now(), ...entry });
    if (messages.length > 60) messages.shift();
    $('#partyFeed').innerHTML = messages.map(item => item.system
      ? `<div class="party-feed-system"><span>${esc(item.text)}</span><time>${relativeTime(item.at)}</time></div>`
      : `<div class="party-feed-message ${item.self ? 'self' : ''}"><div style="--member:${esc(item.color || COLORS[0])}">${esc(item.avatar || '🧭')}</div><p><b>${esc(item.name)}</b><span>${esc(item.text)}</span></p><time>${relativeTime(item.at)}</time></div>`).join('');
    $('#partyFeed').scrollTop = $('#partyFeed').scrollHeight;
  }
  function floatReaction(emoji, name = '') {
    const bubble = document.createElement('div'); bubble.className = 'party-reaction-float'; bubble.textContent = emoji; bubble.title = name ? `${name} reacted` : 'Party reaction';
    bubble.style.setProperty('--x', `${35 + Math.random() * 30}vw`); bubble.style.setProperty('--drift', `${-50 + Math.random() * 100}px`);
    reactionLayer.appendChild(bubble); setTimeout(() => bubble.remove(), 2600);
  }
  const isPortable = () => location.protocol === 'file:';
  function inviteUrl() {
    if (isPortable()) return '';
    const url = new URL(location.href); url.hash = `party=${roomCode}`; return url.href;
  }
  async function copyText(text) {
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; }
    } catch {}
    const field = document.createElement('textarea'); field.value = text; field.setAttribute('readonly', ''); field.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(field); field.select();
    let copied = false; try { copied = document.execCommand('copy'); } catch {} field.remove(); return copied;
  }
  function setInviteStatus(message, success = true) {
    const status = $('#partyInviteStatus'); status.textContent = message; status.classList.toggle('error', !success);
  }
  function openInvitePanel() {
    const portable = isPortable(), url = inviteUrl();
    $('#partyInviteCode').textContent = displayCode(roomCode);
    $('#partyInviteHelp').textContent = portable ? 'Because this is the portable HTML app, your friend should open their own Study Quest copy and enter this room code.' : 'Send the private link below. Anyone with it can enter this temporary room.';
    $('#copyPartyLink').hidden = portable;
    $('#nativePartyShare').hidden = portable || !navigator.share;
    $('#partyInviteStatus').textContent = '';
    $('#partyInviteSheet').classList.add('show'); $('#partyInviteSheet').setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#copyPartyCode').focus(), 30);
  }
  function closeInvitePanel() { $('#partyInviteSheet').classList.remove('show'); $('#partyInviteSheet').setAttribute('aria-hidden', 'true'); }
  async function copyInviteCode() {
    const copied = await copyText(displayCode(roomCode));
    setInviteStatus(copied ? 'Room code copied. Your friend can paste it into Join friends.' : `Copy this code: ${displayCode(roomCode)}`, copied);
    if (!$('#partyInviteSheet').classList.contains('show')) { if (copied) toast?.('Room code copied ✓'); else openInvitePanel(); }
  }
  async function copyInviteLink() {
    const url = inviteUrl(); if (!url) return copyInviteCode();
    const copied = await copyText(`Join my Study Party!\n${url}\nRoom code: ${displayCode(roomCode)}`);
    setInviteStatus(copied ? 'Secure invite link copied.' : 'Copying was blocked. Use the room code above.', copied);
  }
  async function nativeShareInvite() {
    if (isPortable() || !navigator.share) return;
    try { await navigator.share({ title: 'Join my Study Party', text: `Join my Study Party! Room code: ${displayCode(roomCode)}`, url: inviteUrl() }); setInviteStatus('Invite opened in your share menu.'); }
    catch (error) { if (error?.name !== 'AbortError') setInviteStatus('Sharing was unavailable. Copy the invite link instead.', false); }
  }
  function currentTimerSnapshot() {
    const isRunning = typeof running === 'boolean' && running;
    const remaining = typeof left === 'number' ? left : 1500;
    return { stamp: Date.now(), status: isRunning ? 'running' : $('#modeLabel')?.textContent === 'complete' ? 'complete' : remaining < (typeof chosen === 'number' ? chosen * 60 : 1500) ? 'paused' : 'ready', minutes: typeof chosen === 'number' ? chosen : 25, remaining, deadline: isRunning ? Date.now() + remaining * 1000 : null };
  }
  function renderPartyTimer(snapshot = currentTimerSnapshot()) {
    const remaining = snapshot.status === 'running' && snapshot.deadline ? Math.max(0, Math.ceil((snapshot.deadline - Date.now()) / 1000)) : Math.max(0, snapshot.remaining);
    $('#partyTime').textContent = time(remaining);
    $('#partyTimerMode').textContent = snapshot.status === 'running' ? 'focusing together' : snapshot.status === 'paused' ? 'paused together' : snapshot.status === 'complete' ? 'quest complete' : 'ready together';
    $('#partyStart').textContent = snapshot.status === 'running' ? 'Ⅱ Pause together' : snapshot.status === 'paused' ? '▶ Resume together' : '▶ Start together';
    const total = Math.max(60, snapshot.minutes * 60); $('#partyTimerRing').style.setProperty('--party-angle', `${360 * (total - remaining) / total}deg`);
    $$('.party-durations button').forEach(button => button.classList.toggle('active', Number(button.dataset.partyMin) === snapshot.minutes));
    renderReadyGate();
    renderPauseVote();
  }
  function applyTimer(snapshot, sourceName = 'A friend') {
    if (!snapshot || snapshot.stamp <= lastTimerStamp || typeof chosen !== 'number') return;
    lastTimerStamp = snapshot.stamp; applyingRemote = true;
    try {
      if (typeof running === 'boolean' && running) stop();
      chosen = Math.max(1, Math.min(240, Number(snapshot.minutes) || 25));
      left = snapshot.status === 'running' && snapshot.deadline ? Math.max(1, Math.ceil((snapshot.deadline - Date.now()) / 1000)) : Math.max(0, Number(snapshot.remaining) || chosen * 60);
      $$('.preset').forEach(button => button.classList.toggle('active', Number(button.dataset.min) === chosen));
      drawClock();
      if (snapshot.status === 'running') $('#start')?.click();
      else { pauseRequest = null; $('#start').textContent = snapshot.status === 'paused' ? 'Resume focus quest' : 'Begin focus quest'; $('#modeLabel').textContent = snapshot.status === 'paused' ? 'paused' : 'ready'; }
      renderPartyTimer(snapshot); addFeed({ system: true, text: snapshot.status === 'running' ? `${sourceName} started the focus timer.` : snapshot.status === 'paused' ? `${sourceName} paused the timer.` : `${sourceName} changed the timer.` });
    } finally { setTimeout(() => { applyingRemote = false; }, 220); }
  }
  function syncSnapshot(target = null) {
    if (!actions.snapshot || !connected || leaderId !== selfId) return;
    actions.snapshot.send({ mission: sharedMission, timer: currentTimerSnapshot(), leaderId, members: [...members.entries()] }, target ? { target } : undefined);
  }

  async function connect(code, host = false) {
    if (joining || connected) return;
    saveProfile(); roomCode = cleanCode(code); if (roomCode.length !== 12) { $('#joinCode').classList.add('invalid'); return; }
    joining = true; const attempt = ++connectAttempt; showView('partyLoading'); $('#partyLoadingText').textContent = 'Finding your friends through the encrypted trail…';
    try {
      const module = await import(MODULE_URL);
      if (!joining || attempt !== connectAttempt) return;
      selfId = module.selfId;
      isHost = host;
      room = module.joinRoom({ appId: 'chatgpt.study-quest.party.v1', password: roomCode }, `study-quest-${roomCode}`, { onJoinError: ({ error }) => showConnectionError(error?.message || 'A peer connection could not be completed.') });
      leaderId = isHost ? selfId : '';
      actions.hello = room.makeAction('sq-hello'); actions.snapshot = room.makeAction('sq-snapshot'); actions.mission = room.makeAction('sq-mission'); actions.timer = room.makeAction('sq-timer'); actions.ready = room.makeAction('sq-ready'); actions.pause = room.makeAction('sq-pause'); actions.reaction = room.makeAction('sq-reaction'); actions.chat = room.makeAction('sq-chat'); actions.complete = room.makeAction('sq-complete');
      actions.hello.onMessage = (member, { peerId }) => { members.set(peerId, { ...member, ready: Boolean(member.ready) }); if (member.host) leaderId = peerId; if (!leaderId) leaderId = [selfId, ...members.keys()].sort()[0]; isHost = leaderId === selfId; renderMembers(); syncSnapshot(peerId); };
      actions.snapshot.onMessage = (data, { peerId }) => { if (data.leaderId) leaderId = data.leaderId; if (leaderId && peerId !== leaderId) return; if (data.mission && !sharedMission) { sharedMission = data.mission; $('#partyMission').value = sharedMission; $('#partyMissionBy').textContent = `Shared by ${members.get(peerId)?.name || 'a party member'}.`; } if (data.timer) applyTimer(data.timer, members.get(peerId)?.name || 'A friend'); renderMembers(); };
      actions.mission.onMessage = (data, { peerId }) => { sharedMission = String(data.text || '').slice(0, 120); $('#partyMission').value = sharedMission; const member = members.get(peerId); $('#partyMissionBy').textContent = `Set by ${member?.name || 'a party member'} · synced for everyone`; addFeed({ system: true, text: `${member?.name || 'A friend'} set the party mission.` }); };
      actions.timer.onMessage = (snapshot, { peerId }) => applyTimer(snapshot, members.get(peerId)?.name || 'A friend');
      actions.ready.onMessage = (ready, { peerId }) => { const member = members.get(peerId) || {}; members.set(peerId, { ...member, ready: Boolean(ready) }); renderMembers(); };
      actions.pause.onMessage = (data, { peerId }) => receivePauseAction(data, peerId);
      actions.reaction.onMessage = (data, { peerId }) => { const member = members.get(peerId); floatReaction(data.emoji, member?.name); addFeed({ system: true, text: `${member?.name || 'A friend'} sent ${data.emoji}` }); };
      actions.chat.onMessage = (data, { peerId }) => { const member = members.get(peerId) || {}; addFeed({ name: member.name || 'Trail Friend', avatar: member.avatar, color: member.color, text: String(data.text || '').slice(0, 500) }); };
      actions.complete.onMessage = (_, { peerId }) => { const member = members.get(peerId); floatReaction('🎉', member?.name); addFeed({ system: true, text: `${member?.name || 'A friend'} completed a focus quest!` }); };
      room.onPeerJoin = peerId => { members.set(peerId, { name: 'Joining friend…', avatar: '🧭', color: COLORS[members.size % COLORS.length], ready: false, host: false }); actions.hello.send({ name: prefs.name, avatar: prefs.avatar, color: prefs.color, ready: false, host: isHost }, { target: peerId }); if (leaderId === selfId) setTimeout(() => syncSnapshot(peerId), 120); renderMembers(); $('#partyStatus').textContent = 'Friends connected'; addFeed({ system: true, text: 'A friend found the party trail.' }); };
      room.onPeerLeave = peerId => { const name = members.get(peerId)?.name || 'A friend'; members.delete(peerId); if (pauseRequest?.participants.includes(peerId)) clearPauseRequest(`${name} left, so the pause request was canceled.`); if (peerId === leaderId) { leaderId = [selfId, ...members.keys()].sort()[0]; isHost = leaderId === selfId; } renderMembers(); $('#partyStatus').textContent = members.size > 1 ? 'Friends connected' : 'Waiting for friends'; addFeed({ system: true, text: `${name} left the party.` }); };
      connected = true; joining = false; members.set(selfId, selfMember()); showView('partyRoom'); $('#copyRoomCode').textContent = displayCode(roomCode); $('#partyStatus').textContent = 'Waiting for friends'; partyButton.classList.add('live'); renderMembers(); renderPartyTimer();
      if (!sharedMission) sharedMission = $('#quest')?.value === 'No active mission yet' || $('#quest')?.value === 'Choose your first quest' ? '' : $('#quest')?.value || '';
      $('#partyMission').value = sharedMission; $('#partyMissionBy').textContent = sharedMission ? 'Started from your active quest · synced for everyone' : 'Choose something that everyone can move forward.';
      addFeed({ system: true, text: `You opened room ${displayCode(roomCode)}.` });
    } catch (error) { showConnectionError(error?.message || 'Party networking could not load.'); }
  }
  function showConnectionError(message) { joining = false; connected = false; connectAttempt++; try { room?.leave?.(); } catch {} room = null; $('#partyErrorText').textContent = `${message} Solo Study Quest is still available.`; showView('partyError'); }
  async function leaveParty() {
    try { await room?.leave?.(); } catch {}
    room = null; actions = {}; members.clear(); messages.length = 0; pauseRequest = null; consensusPauseAuthorized = false; connected = false; joining = false; connectAttempt++; roomCode = ''; leaderId = ''; isHost = false; partyButton.classList.remove('live'); $('#partyCount').textContent = '1'; history.replaceState(null, '', `${location.pathname}${location.search}`); showView('partyLobby'); renderMembers();
  }

  partyButton.onclick = () => openParty();
  $('.party-close').onclick = closeParty;
  modal.addEventListener('click', event => { if (event.target === modal) closeParty(); });
  $$('.party-tabs button').forEach(button => button.onclick = () => switchTab(button.dataset.partyTab));
  $('#partyAvatarPicker').addEventListener('click', event => { const button = event.target.closest('[data-avatar]'); if (!button) return; prefs.avatar = button.dataset.avatar; prefs.color = COLORS[EMOJIS.indexOf(prefs.avatar) % COLORS.length]; renderAvatarPicker(); });
  $('#joinCode').addEventListener('input', event => { event.target.value = displayCode(event.target.value); event.target.classList.remove('invalid'); });
  $('#createParty').onclick = () => connect(randomCode(), true);
  $('#joinParty').onclick = () => connect($('#joinCode').value, false);
  $('#cancelParty').onclick = () => { joining = false; connectAttempt++; showView('partyLobby'); };
  $('#partyRetry').onclick = () => showView('partyLobby');
  $('#leaveParty').onclick = leaveParty;
  $('#shareParty').onclick = openInvitePanel;
  $('#closePartyInvite').onclick = closeInvitePanel;
  $('#copyPartyCode').onclick = copyInviteCode;
  $('#copyPartyLink').onclick = copyInviteLink;
  $('#nativePartyShare').onclick = nativeShareInvite;
  $('#partyInviteSheet').addEventListener('click', event => { if (event.target === $('#partyInviteSheet')) closeInvitePanel(); });
  $('#copyRoomCode').onclick = copyInviteCode;
  $('#savePartyMission').onclick = () => { const text = $('#partyMission').value.trim(); if (!text) return; sharedMission = text; actions.mission?.send({ text }); $('#partyMissionBy').textContent = `Set by ${prefs.name} · synced for everyone`; $('#quest').value = text; $('#saveQuest')?.click(); addFeed({ system: true, text: 'You set the party mission.' }); };
  $('#toggleReady').onclick = () => { const current = members.get(selfId) || selfMember(); current.ready = !current.ready; members.set(selfId, current); actions.ready?.send(current.ready); $('#toggleReady').textContent = current.ready ? 'Ready ✓' : 'I’m ready'; $('#toggleReady').classList.toggle('ready', current.ready); renderMembers(); };
  $('#partyStart').onclick = () => $('#start')?.click();
  $('#allowPartyPause').onclick = () => voteOnPause(true);
  $('#declinePartyPause').onclick = () => voteOnPause(false);
  $$('.party-durations button').forEach(button => button.onclick = () => { const minutes = Number(button.dataset.partyMin); const preset = $(`.preset[data-min="${minutes}"]`); if (preset) preset.click(); else if (typeof chosen === 'number') { if (running) stop(); chosen = minutes; left = minutes * 60; $('#start').textContent = 'Begin focus quest'; $('#modeLabel').textContent = 'ready'; drawClock(); } setTimeout(() => { const snapshot = currentTimerSnapshot(); snapshot.stamp = Date.now(); lastTimerStamp = snapshot.stamp; actions.timer?.send(snapshot); renderPartyTimer(snapshot); }, 40); });
  function resizeChatInput() { const input = $('#partyMessage'); input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 92)}px`; $('#partyChatCount').textContent = `${input.value.length}/500`; }
  $('#partyChatForm').onsubmit = event => { event.preventDefault(); const input = $('#partyMessage'), text = input.value.trim(); if (!text) return; actions.chat?.send({ text }); addFeed({ name: prefs.name, avatar: prefs.avatar, color: prefs.color, text, self: true }); input.value = ''; resizeChatInput(); };
  $('#partyMessage').addEventListener('input', resizeChatInput);
  $('#partyMessage').addEventListener('keydown', event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); $('#partyChatForm').requestSubmit(); } });
  $('#partyReactions').innerHTML = REACTIONS.map(emoji => `<button type="button" data-reaction="${emoji}">${emoji}</button>`).join('');
  $('#partyReactions').onclick = event => { const button = event.target.closest('[data-reaction]'); if (!button) return; const emoji = button.dataset.reaction; actions.reaction?.send({ emoji }); floatReaction(emoji, prefs.name); addFeed({ system: true, text: `You sent ${emoji}` }); };

  $('#start')?.addEventListener('click', event => {
    if (!connected || applyingRemote) return;
    if (typeof running === 'boolean' && running) {
      if (consensusPauseAuthorized) { consensusPauseAuthorized = false; return; }
      event.preventDefault(); event.stopImmediatePropagation(); beginPauseRequest(); return;
    }
    const state = readinessState();
    if (state.canStart) return;
    event.preventDefault(); event.stopImmediatePropagation();
    $('#partyReadyGate').textContent = state.text;
    $('#partyReadyGate').classList.remove('ready', 'attention');
    requestAnimationFrame(() => $('#partyReadyGate').classList.add('attention'));
    addFeed({ system: true, text: `Timer waiting: ${state.text}` });
  }, true);
  $('#start')?.addEventListener('click', () => setTimeout(() => { if (!connected || applyingRemote) return; const snapshot = currentTimerSnapshot(); snapshot.stamp = Date.now(); lastTimerStamp = snapshot.stamp; actions.timer?.send(snapshot); renderPartyTimer(snapshot); }, 90));
  $('#reset')?.addEventListener('click', () => setTimeout(() => { if (!connected || applyingRemote) return; const snapshot = currentTimerSnapshot(); snapshot.stamp = Date.now(); lastTimerStamp = snapshot.stamp; actions.timer?.send(snapshot); renderPartyTimer(snapshot); }, 60));
  ['claim', 'skip'].forEach(id => document.getElementById(id)?.addEventListener('click', () => { if (connected) { actions.complete?.send({ at: Date.now() }); floatReaction('🎉', prefs.name); addFeed({ system: true, text: 'Your focus quest is complete. The party cheered!' }); } }));
  const timerText = $('#time');
  if (timerText) new MutationObserver(() => { if (connected) renderPartyTimer(currentTimerSnapshot()); }).observe(timerText, { childList: true, subtree: true });
  setInterval(() => { if (connected) { renderPartyTimer(currentTimerSnapshot()); $$('#partyFeed time').forEach((node, index) => { if (messages[index]) node.textContent = relativeTime(messages[index].at); }); } }, 1000);
  addEventListener('beforeunload', () => room?.leave?.());
  document.addEventListener('keydown', event => { if (event.key !== 'Escape' || !modal.classList.contains('show')) return; if ($('#partyInviteSheet').classList.contains('show')) closeInvitePanel(); else closeParty(); });

  $('#partyName').value = prefs.name;
  renderAvatarPicker(); renderMembers();
  const inviteMatch = location.hash.match(/^#party=([A-Za-z0-9-]+)/);
  if (inviteMatch) { $('#joinCode').value = displayCode(inviteMatch[1]); switchTab('join'); setTimeout(() => openParty('join'), 400); }
})();
