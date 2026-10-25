(() => {
  const top = document.querySelector('.top');
  const stats = document.querySelector('.stats');
  if (!top || !stats) return;

  const installButton = document.createElement('button');
  installButton.className = 'install-app';
  installButton.type = 'button';
  installButton.setAttribute('aria-label', 'Install Study Quest app');
  installButton.innerHTML = '<span class="connection-dot" aria-hidden="true"></span><span class="install-label">Install app</span><span aria-hidden="true">↘</span>';
  top.insertBefore(installButton, stats);

  const modal = document.createElement('div');
  modal.className = 'install-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'installTitle');
  modal.innerHTML = `
    <section class="install-card">
      <button class="install-close" type="button" aria-label="Close">×</button>
      <img src="icons/icon-192.png" alt="Moss the Study Quest fox">
      <h2 id="installTitle">Take Study Quest with you</h2>
      <p id="installIntro">Install it like a normal app—free, with no account required.</p>
      <ol class="install-steps" id="installSteps"></ol>
      <p class="install-note">Your classes, missions, XP, and settings stay privately in this browser. Installing does not upload them anywhere.</p>
    </section>`;
  document.body.appendChild(modal);

  const closeModal = () => modal.classList.remove('show');
  modal.querySelector('.install-close').onclick = closeModal;
  modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

  let installPrompt = null;
  const standalone = () => matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const updateInstallState = () => {
    if (!standalone()) return;
    installButton.classList.add('installed');
    installButton.setAttribute('aria-label', 'Study Quest is installed');
    installButton.innerHTML = '<span class="connection-dot" aria-hidden="true"></span><span class="install-label">App installed</span><span aria-hidden="true">✓</span>';
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    installButton.hidden = false;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    updateInstallState();
    if (typeof toast === 'function') toast('Study Quest installed ✓');
  });

  function fallbackSteps() {
    const ua = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(ua)) {
      return ['Open this page in Safari.', 'Tap the Share button.', 'Choose “Add to Home Screen,” then tap Add.'];
    }
    if (/Android/.test(ua)) {
      return ['Open the browser menu (⋮).', 'Choose “Install app” or “Add to Home screen.”', 'Confirm Install.'];
    }
    return ['Open your browser menu.', 'Choose “Install Study Quest” or “Apps → Install this site as an app.”', 'Confirm Install, then launch it from your desktop or Start menu.'];
  }

  installButton.onclick = async () => {
    if (standalone()) {
      if (typeof toast === 'function') toast('You are already using the installed app');
      return;
    }
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    document.querySelector('#installSteps').innerHTML = fallbackSteps().map(step => `<li>${step}</li>`).join('');
    modal.classList.add('show');
  };

  const setConnection = () => {
    const dot = installButton.querySelector('.connection-dot');
    if (!dot) return;
    dot.classList.toggle('offline', !navigator.onLine);
    dot.title = navigator.onLine ? 'Online' : 'Offline mode';
  };
  addEventListener('online', setConnection);
  addEventListener('offline', setConnection);
  setConnection();
  updateInstallState();

  if ('serviceWorker' in navigator) {
    addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
  }

  if (location.hash === '#new-mission') {
    addEventListener('load', () => document.querySelector('#forgeMission')?.click(), {once:true});
  } else if (location.hash === '#focus') {
    addEventListener('load', () => document.querySelector('#start')?.focus(), {once:true});
  }
})();
