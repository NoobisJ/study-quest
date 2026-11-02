(() => {
  const STORAGE_KEY = 'studyQuest.spotify.v1';
  const grid = document.querySelector('.grid');
  if (!grid) return;

  const card = document.createElement('section');
  card.className = 'card spotify-card';
  card.setAttribute('aria-labelledby', 'spotifyTitle');
  card.innerHTML = `
    <div class="spotify-head">
      <div class="spotify-title">
        <div class="spotify-mark" aria-hidden="true">♫</div>
        <div><h3 id="spotifyTitle">Spotify focus music</h3><p>Keep a favorite playlist, album, track, or podcast beside your timer.</p></div>
      </div>
      <a class="spotify-open" id="spotifyOpen" href="https://open.spotify.com/search/focus" target="_blank" rel="noopener noreferrer" aria-label="Open Spotify in a new tab">Open Spotify ↗</a>
    </div>
    <form class="spotify-form" id="spotifyForm">
      <label for="spotifyLink">Spotify share link</label>
      <input id="spotifyLink" name="spotifyLink" type="url" inputmode="url" autocomplete="url" placeholder="https://open.spotify.com/playlist/…" aria-describedby="spotifyHelp spotifyStatus">
      <button class="spotify-save" type="submit">Save &amp; play</button>
    </form>
    <p class="spotify-help" id="spotifyHelp">In Spotify, choose Share → Copy link, then paste it here. Playback needs an internet connection and may open Spotify for full tracks.</p>
    <p class="spotify-status" id="spotifyStatus" role="status" aria-live="polite"></p>
    <div class="spotify-player" id="spotifyPlayer">
      <iframe id="spotifyFrame" title="Spotify player" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe>
      <div class="spotify-player-actions"><button class="spotify-remove" id="spotifyRemove" type="button">Remove saved Spotify link</button></div>
    </div>`;
  grid.appendChild(card);

  const form = card.querySelector('#spotifyForm');
  const input = card.querySelector('#spotifyLink');
  const status = card.querySelector('#spotifyStatus');
  const player = card.querySelector('#spotifyPlayer');
  const frame = card.querySelector('#spotifyFrame');
  const open = card.querySelector('#spotifyOpen');

  function parseSpotify(value) {
    const trimmed = value.trim();
    const uri = trimmed.match(/^spotify:(playlist|album|track|episode|show|artist):([A-Za-z0-9]+)$/i);
    if (uri) return { type: uri[1].toLowerCase(), id: uri[2] };
    try {
      const url = new URL(trimmed);
      if (url.hostname !== 'open.spotify.com' && url.hostname !== 'play.spotify.com') return null;
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts[0]?.toLowerCase().startsWith('intl-')) parts.shift();
      const type = parts[0]?.toLowerCase();
      const id = parts[1];
      if (!['playlist', 'album', 'track', 'episode', 'show', 'artist'].includes(type) || !/^[A-Za-z0-9]+$/.test(id || '')) return null;
      return { type, id };
    } catch (_) {
      return null;
    }
  }

  function render(saved) {
    if (!saved) {
      input.value = '';
      frame.removeAttribute('src');
      player.classList.remove('show');
      open.href = 'https://open.spotify.com/search/focus';
      status.textContent = navigator.onLine ? 'No Spotify link saved yet.' : 'Offline — your saved focus setup still works, but Spotify needs a connection.';
      status.className = 'spotify-status' + (navigator.onLine ? '' : ' offline');
      return;
    }
    input.value = saved.url;
    frame.src = `https://open.spotify.com/embed/${saved.type}/${saved.id}?utm_source=generator&theme=0`;
    player.classList.add('show');
    open.href = saved.url;
    status.textContent = navigator.onLine ? 'Saved on this device and ready to play.' : 'Offline — the link is saved, but the Spotify player needs a connection.';
    status.className = 'spotify-status' + (navigator.onLine ? '' : ' offline');
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      render(saved?.type && saved?.id && saved?.url ? saved : null);
    } catch (_) {
      localStorage.removeItem(STORAGE_KEY);
      render(null);
    }
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const parsed = parseSpotify(input.value);
    if (!parsed) {
      status.textContent = 'Paste a valid Spotify playlist, album, track, artist, show, or episode link.';
      status.className = 'spotify-status error';
      input.focus();
      return;
    }
    const saved = { ...parsed, url: `https://open.spotify.com/${parsed.type}/${parsed.id}` };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    render(saved);
    if (typeof toast === 'function') toast('Spotify focus music saved ✓');
  });

  card.querySelector('#spotifyRemove').addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    render(null);
    input.focus();
    if (typeof toast === 'function') toast('Spotify link removed');
  });
  addEventListener('online', load);
  addEventListener('offline', load);
  load();
})();

