(() => {
  const STORAGE_PREFIX = 'studyQuest.';
  const ROLLBACK_KEY = 'studyQuest.transfer.rollback';
  const MAX_BACKUP_BYTES = 5 * 1024 * 1024;
  const top = document.querySelector('.top');
  const stats = document.querySelector('.stats');
  if (!top || !stats) return;

  const transferButton = document.createElement('button');
  transferButton.className = 'transfer-app';
  transferButton.type = 'button';
  transferButton.setAttribute('aria-label', 'Backup or transfer Study Quest progress');
  transferButton.innerHTML = '<span aria-hidden="true">⇄</span><span class="transfer-label">Transfer</span>';
  top.insertBefore(transferButton, stats);

  const modal = document.createElement('div');
  modal.className = 'transfer-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'transferTitle');
  modal.innerHTML = `
    <section class="transfer-card">
      <button class="transfer-close" type="button" aria-label="Close">×</button>
      <div class="transfer-kicker">Backup & device transfer</div>
      <h2 id="transferTitle">Take your adventure anywhere.</h2>
      <p class="transfer-intro">Move every realm, mission, timer, reward, and setting between Windows and iPhone with one private file.</p>
      <div class="transfer-grid">
        <button class="transfer-option" id="exportProgress" type="button">
          <span class="transfer-icon" aria-hidden="true">↗</span>
          <strong>Export progress</strong>
          <small>Share or save a tiny backup file to iCloud Drive, OneDrive, email, or Files.</small>
        </button>
        <button class="transfer-option" id="importProgress" type="button">
          <span class="transfer-icon" aria-hidden="true">↙</span>
          <strong>Import progress</strong>
          <small>Choose a Study Quest backup and preview it before anything is replaced.</small>
        </button>
      </div>
      <input id="backupFile" type="file" accept="application/json,.json" hidden>
      <div class="transfer-preview" id="transferPreview">
        <strong id="previewTitle">Backup ready</strong>
        <p id="previewCopy"></p>
        <div class="transfer-preview-actions">
          <button class="transfer-cancel" id="cancelImport" type="button">Cancel</button>
          <button class="transfer-restore" id="restoreImport" type="button">Restore & reload</button>
        </div>
      </div>
      <p class="transfer-note"><b>Private by design:</b> the file stays under your control. Study Quest never sends it to us. Keep the newest backup in a shared iCloud Drive or OneDrive folder for an easy two-device routine.</p>
      <button class="transfer-undo" id="undoImport" type="button" hidden>Undo the last import</button>
    </section>`;
  document.body.appendChild(modal);

  const fileInput = modal.querySelector('#backupFile');
  const preview = modal.querySelector('#transferPreview');
  const previewCopy = modal.querySelector('#previewCopy');
  const undoButton = modal.querySelector('#undoImport');
  let pendingBackup = null;

  const notify = message => typeof toast === 'function' ? toast(message) : alert(message);
  const closeModal = () => { modal.classList.remove('show'); preview.classList.remove('show'); pendingBackup = null; fileInput.value = ''; };
  const collectProgress = () => {
    const data = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(STORAGE_PREFIX) && key !== ROLLBACK_KEY) data[key] = localStorage.getItem(key);
    }
    return data;
  };
  const makeBackup = () => ({
    type: 'study-quest-backup',
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Study Quest',
    data: collectProgress()
  });
  const validateBackup = backup => {
    if (!backup || backup.type !== 'study-quest-backup' || backup.version !== 1 || !backup.data || Array.isArray(backup.data)) throw new Error('That is not a Study Quest backup.');
    const entries = Object.entries(backup.data);
    if (!entries.length) throw new Error('This backup does not contain any progress.');
    for (const [key, value] of entries) {
      if (!key.startsWith(STORAGE_PREFIX) || key === ROLLBACK_KEY || typeof value !== 'string') throw new Error('This backup contains unsupported data.');
      JSON.parse(value);
    }
    return entries;
  };
  const summarize = backup => {
    let realms = 0, missions = 0, sessions = 0;
    try {
      const hub = JSON.parse(backup.data['studyQuest.realmEngine.v3'] || '{}');
      realms = hub.realms?.length || 0;
      missions = hub.tasks?.length || 0;
      const base = JSON.parse(backup.data['studyQuest.v1'] || '{}');
      sessions = base.sessions || 0;
    } catch (_) {}
    const date = backup.exportedAt ? new Date(backup.exportedAt).toLocaleString() : 'Unknown date';
    return `${realms} realms · ${missions} missions · ${sessions} completed focus sessions · exported ${date}`;
  };

  async function exportProgress() {
    const backup = makeBackup();
    if (!Object.keys(backup.data).length) return notify('Create a mission first, then export your progress.');
    const json = JSON.stringify(backup, null, 2);
    const date = new Date().toISOString().slice(0, 10);
    const file = new File([json], `study-quest-backup-${date}.json`, {type:'application/json'});
    try {
      if (navigator.share && navigator.canShare?.({files:[file]})) {
        await navigator.share({title:'Study Quest backup',text:'My Study Quest progress backup',files:[file]});
        notify('Backup shared ✓');
      } else {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = file.name;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        notify('Backup downloaded ✓');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') notify('Could not share the backup. Try again or use another browser.');
    }
  }

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('That file is too large to be a Study Quest backup.');
      const parsed = JSON.parse(await file.text());
      validateBackup(parsed);
      pendingBackup = parsed;
      previewCopy.textContent = summarize(parsed);
      preview.classList.add('show');
    } catch (error) {
      pendingBackup = null;
      preview.classList.remove('show');
      notify(error.message || 'Could not read that backup.');
    }
  });

  modal.querySelector('#restoreImport').onclick = () => {
    if (!pendingBackup) return;
    const current = makeBackup();
    localStorage.setItem(ROLLBACK_KEY, JSON.stringify(current));
    for (const [key, value] of Object.entries(pendingBackup.data)) localStorage.setItem(key, value);
    location.reload();
  };
  modal.querySelector('#cancelImport').onclick = () => { preview.classList.remove('show'); pendingBackup = null; fileInput.value = ''; };
  undoButton.onclick = () => {
    try {
      const rollback = JSON.parse(localStorage.getItem(ROLLBACK_KEY));
      validateBackup(rollback);
      for (const [key, value] of Object.entries(rollback.data)) localStorage.setItem(key, value);
      localStorage.removeItem(ROLLBACK_KEY);
      location.reload();
    } catch (_) { notify('No previous import is available.'); }
  };

  transferButton.onclick = () => { undoButton.hidden = !localStorage.getItem(ROLLBACK_KEY); modal.classList.add('show'); };
  modal.querySelector('#exportProgress').onclick = exportProgress;
  modal.querySelector('#importProgress').onclick = () => fileInput.click();
  modal.querySelector('.transfer-close').onclick = closeModal;
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('show')) closeModal(); });
})();
