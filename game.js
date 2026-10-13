(function () {
  "use strict";

  const root = document.getElementById("app-root");
  const STORAGE_KEY = "pocketParty.web.v1";
  const colors = ["#ff5d7d", "#37d9f2", "#ffc857", "#40e0a0"];
  const softColors = ["#ffebf0", "#e3fbff", "#fff6dc", "#e4fff4"];
  const ink = "#17233e";
  const purple = "#5848d8";
  const gameList = [
    { id: "tap_sprint", title: "Tap Sprint", category: "SPEED", desc: "Mash the button. Own the leaderboard.", color: "#2eb8e8", soft: "#dff6fd", length: "10 SEC" },
    { id: "reflex_rush", title: "Reflex Rush", category: "REACTION", desc: "Wait for GO. Don't jump the gun.", color: "#ff6c84", soft: "#ffeaee", length: "ONE SHOT" },
    { id: "memory_grid", title: "Memory Grid", category: "BRAIN", desc: "Remember the pattern. Repeat it perfectly.", color: "#9875ef", soft: "#f0eaff", length: "TURN BASED" },
    { id: "mini_racers", title: "Mini Racers", category: "RACING", desc: "Drive through traffic and dodge cars as the rush gets faster.", color: "#ffad4d", soft: "#fff0dd", length: "30 SEC" },
    { id: "dodge_arena", title: "Dodge Arena", category: "SURVIVAL", desc: "Dodge on the signal. Last player wins.", color: "#47c995", soft: "#e1f8ed", length: "8 WAVES" },
    { id: "target_rush", title: "Target Rush", category: "ACCURACY", desc: "Hit the matching color before time runs out.", color: "#ed7ac4", soft: "#fdeafa", length: "12 SEC" },
    { id: "block_battle", title: "Block Battle", category: "PUZZLE", desc: "Place glossy blocks, plan clears, and build giant combos.", color: "#4d8dff", soft: "#e9f1ff", length: "35 SEC EACH" },
    { id: "orb_dash", title: "Orb Dash", category: "MOVEMENT", desc: "Steer your orb, grab gems, and dodge rivals.", color: "#7d65f2", soft: "#eeebff", length: "30 SEC" },
    { id: "star_snatch", title: "Star Snatch", category: "TIMING", desc: "Tap when the moving star hits the sweet spot.", color: "#f6bd43", soft: "#fff5d7", length: "15 SEC" },
    { id: "stack_tower", title: "Stack Tower", category: "SKILL", desc: "Drop moving blocks, keep your tower balanced, and climb.", color: "#5a9cff", soft: "#eaf3ff", length: "8 SEC PER PLAYER" }
  ];
  // Deliberately varied, normalized polyominoes from 1–5 cells. Pieces rotate in play.
  const BLOCK_SHAPES = [
    [[0,0]], [[0,0],[1,0]], [[0,0],[1,0],[2,0]], [[0,0],[0,1],[1,1]],
    [[1,0],[0,1],[1,1]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0],[3,0]],
    [[0,0],[0,1],[0,2],[0,3]], [[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[2,0],[1,1]],
    [[0,0],[1,0],[1,1],[2,1]], [[1,0],[2,0],[0,1],[1,1]], [[0,0],[0,1],[0,2],[1,2]],
    [[1,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[2,0],[0,1],[0,2]],
    [[0,0],[1,0],[2,0],[1,1],[1,2]], [[0,0],[1,0],[1,1],[2,1],[2,2]],
    [[1,0],[0,1],[1,1],[1,2],[2,2]], [[0,0],[1,0],[2,0],[0,1],[1,1]],
    [[0,0],[1,0],[2,0],[2,1],[2,2]], [[0,0],[0,1],[0,2],[1,0],[1,1]]
  ];
  let settings = { players: 2, rounds: 5, sound: true, theme: "nebula", difficulty: "normal", motion: true };
  let currentScreen = "home";
  let game = null;
  let tournament = null;
  let toastTimer = null;
  let audioContext = null;
  let activeBlockDrag = null;

  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    if (saved.players) settings.players = Math.max(1, Math.min(4, Number(saved.players) || 2));
    if (saved.rounds === 10) settings.rounds = 10;
    settings.sound = saved.sound !== false;
    if (["nebula", "ocean", "sunset"].includes(saved.theme)) settings.theme = saved.theme;
    if (["chill", "normal", "chaos"].includes(saved.difficulty)) settings.difficulty = saved.difficulty;
    settings.motion = saved.motion !== false;
  } catch (e) {}

  function applySettings() {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.classList.toggle("reduced-motion", !settings.motion);
    const soundBtn = document.getElementById("sound-toggle");
    if (soundBtn) soundBtn.classList.toggle("is-muted", !settings.sound);
  }
  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
    applySettings();
  }
  function gameById(id) { return gameList.find(function (g) { return g.id === id; }) || gameList[0]; }
  function escapeText(value) {
    return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function playerName(p) { return "PLAYER " + (p + 1); }
  function fmtTime(n) { return Math.max(0, n).toFixed(1) + " SEC"; }
  function toast(message) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 1600);
  }
  function beep(freq, length, wave) {
    if (!settings.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
      const now = audioContext.currentTime;
      const duration = Math.max(0.025, length || 0.08);
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = wave || "sine";
      oscillator.frequency.setValueAtTime(Math.max(60, freq || 440), now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.035, now + Math.min(0.012, duration * 0.22));
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + duration + 0.015);
    } catch (e) {}
  }
  function sfx(name, accent) {
    if (!settings.sound) return;
    try {
      audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === "suspended") audioContext.resume();
    } catch (e) {}
    const tunes = {
      ui: [[540,0.035,"triangle",0]],
      select: [[430,0.045,"sine",0],[650,0.055,"triangle",28]],
      tap: [[360 + (accent || 0),0.032,"triangle",0]],
      stick: [[280,0.025,"sine",0]],
      place: [[310,0.045,"triangle",0],[470,0.045,"sine",24]],
      clear: [[540,0.07,"triangle",0],[760,0.09,"sine",42]],
      combo: [[480,0.07,"triangle",0],[690,0.08,"triangle",38],[920,0.12,"sine",78]],
      rotate: [[260,0.05,"triangle",0],[390,0.055,"sine",35]],
      hint: [[480,0.045,"sine",0],[620,0.055,"sine",40],[790,0.08,"triangle",80]],
      error: [[170,0.075,"sawtooth",0]],
      boost: [[170,0.065,"sawtooth",0],[260,0.07,"sawtooth",38],[720,0.08,"triangle",72]],
      bump: [[125,0.11,"sawtooth",0],[90,0.08,"square",35]],
      gem: [[720,0.05,"sine",0],[980,0.08,"triangle",45]],
      win: [[520,0.08,"triangle",0],[700,0.1,"triangle",70],[920,0.15,"sine",145]]
    };
    (tunes[name] || tunes.ui).forEach(function (note) {
      window.setTimeout(function () { beep(note[0] + (accent || 0), note[1], note[2]); }, note[3]);
    });
  }

  function art(id) {
    const commonStart = '<svg viewBox="0 0 320 150" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">';
    let shapes = "";
    if (id === "tap_sprint") {
      shapes = '<circle cx="41" cy="31" r="18" fill="#fff" opacity=".54"/><circle cx="278" cy="28" r="25" fill="#fff" opacity=".36"/><path d="M32 114H289" stroke="#fff" stroke-width="8" stroke-linecap="round" opacity=".7"/><g transform="translate(55 0)"><circle cx="17" cy="74" r="18" fill="#ff6c84"/><circle cx="64" cy="74" r="21" fill="#fff"/><circle cx="112" cy="74" r="25" fill="#ffe16b"/><circle cx="160" cy="74" r="21" fill="#fff"/><circle cx="207" cy="74" r="18" fill="#47c995"/></g><path d="M108 38l12-10 8 11M202 30l14 10-2-15" fill="none" stroke="#17233e" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (id === "reflex_rush") {
      shapes = '<circle cx="160" cy="76" r="57" fill="#fff" opacity=".65"/><circle cx="160" cy="76" r="43" fill="#ff6c84"/><circle cx="160" cy="76" r="29" fill="#fff"/><circle cx="160" cy="76" r="16" fill="#47c995"/><path d="M160 76l23-27" stroke="#17233e" stroke-width="6" stroke-linecap="round"/><circle cx="160" cy="76" r="5" fill="#17233e"/><path d="M47 105l8-21 8 11 15-28M245 38l9-12 7 15 15-3" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    } else if (id === "memory_grid") {
      shapes = '<g transform="translate(102 24)"><rect width="50" height="46" rx="12" fill="#ff6c84"/><rect x="59" width="50" height="46" rx="12" fill="#ffe16b"/><rect y="55" width="50" height="46" rx="12" fill="#2eb8e8"/><rect x="59" y="55" width="50" height="46" rx="12" fill="#47c995"/><path d="M25 12v22M14 23h22" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="84" cy="23" r="8" fill="#fff"/><path d="M15 76l10 10 13-17M72 78l8 8 16-19" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></g><circle cx="58" cy="35" r="13" fill="#fff" opacity=".65"/><circle cx="262" cy="117" r="18" fill="#fff" opacity=".6"/>';
    } else if (id === "mini_racers") {
      shapes = '<path d="M0 42H320M0 109H320" stroke="#fff" stroke-width="6" opacity=".85"/><path d="M0 75H320" stroke="#fff" stroke-width="4" stroke-dasharray="13 12" opacity=".8"/><g transform="translate(38 41)"><rect x="0" y="3" width="74" height="34" rx="12" fill="#ff6c84"/><rect x="18" y="-7" width="35" height="22" rx="7" fill="#fff"/><circle cx="17" cy="39" r="9" fill="#17233e"/><circle cx="58" cy="39" r="9" fill="#17233e"/><path d="M28 9h18" stroke="#2eb8e8" stroke-width="7" stroke-linecap="round"/></g><g transform="translate(183 71)"><rect x="0" y="3" width="84" height="34" rx="12" fill="#2eb8e8"/><rect x="20" y="-7" width="39" height="22" rx="7" fill="#fff"/><circle cx="17" cy="39" r="9" fill="#17233e"/><circle cx="67" cy="39" r="9" fill="#17233e"/><path d="M30 9h19" stroke="#ffe16b" stroke-width="7" stroke-linecap="round"/></g>';
    } else if (id === "dodge_arena") {
      shapes = '<circle cx="160" cy="75" r="54" fill="#fff" opacity=".6"/><circle cx="160" cy="75" r="39" fill="#47c995"/><circle cx="160" cy="75" r="24" fill="#fff"/><circle cx="160" cy="75" r="11" fill="#ff6c84"/><path d="M67 32l8 13 15 2-11 10 3 15-15-7-13 7 2-15-11-10 15-2zM254 83l6 10 12 2-9 8 2 12-11-6-11 6 2-12-9-8 12-2z" fill="#ffe16b"/><path d="M118 20l-13 14M204 118l-14 12" stroke="#fff" stroke-width="6" stroke-linecap="round"/>';
    } else if (id === "block_battle") {
      shapes = '<g transform="translate(78 18)"><rect x="0" y="0" width="38" height="38" rx="7" fill="#4d8dff"/><rect x="42" y="0" width="38" height="38" rx="7" fill="#7d65f2"/><rect x="84" y="0" width="38" height="38" rx="7" fill="#ff6c84"/><rect x="0" y="42" width="38" height="38" rx="7" fill="#47c995"/><rect x="42" y="42" width="38" height="38" rx="7" fill="#ffad4d"/><rect x="84" y="42" width="38" height="38" rx="7" fill="#ffe16b"/><rect x="126" y="0" width="38" height="38" rx="7" fill="#2eb8e8"/><rect x="126" y="42" width="38" height="38" rx="7" fill="#4d8dff"/><path d="M0 98H164" stroke="#fff" stroke-width="7" stroke-linecap="round" opacity=".8"/></g>';
    } else if (id === "orb_dash") {
      shapes = '<circle cx="160" cy="75" r="59" fill="#fff" opacity=".5"/><circle cx="160" cy="75" r="41" fill="#7d65f2"/><circle cx="150" cy="63" r="13" fill="#fff" opacity=".7"/><path d="M222 32l8 18 19 2-14 13 4 19-17-10-17 10 4-19-14-13 19-2z" fill="#ffe16b"/><circle cx="78" cy="105" r="12" fill="#2eb8e8" stroke="#fff" stroke-width="4"/><circle cx="262" cy="110" r="9" fill="#ff6c84" stroke="#fff" stroke-width="3"/>';
    } else {
      shapes = '<circle cx="160" cy="75" r="57" fill="#fff" opacity=".6"/><circle cx="160" cy="75" r="44" fill="#ed7ac4"/><circle cx="160" cy="75" r="31" fill="#fff"/><circle cx="160" cy="75" r="18" fill="#ff6c84"/><circle cx="160" cy="75" r="7" fill="#ffe16b"/><path d="M65 37l20 20M255 112l-17-17M259 36l-10 12M58 103l13-7" stroke="#fff" stroke-width="7" stroke-linecap="round"/>';
    }
    return commonStart + '<rect width="320" height="150" rx="18" fill="' + gameById(id).soft + '"/>' + shapes + '</svg>';
  }
  const KENNEY_ASSET = "https://raw.githubusercontent.com/shorepine/kenney/main/2d/";
  const puzzleAsset = function (name) { return KENNEY_ASSET + "Puzzle%20Pack%201/" + name; };
  const racingAsset = function (name) { return KENNEY_ASSET + "Racing%20Pack/Cars/" + name; };
  function assetArt(id) {
    const sprite = function (src, cls, alt) {
      return '<img class="real-sprite ' + cls + '" src="' + src + '" alt="' + alt + '" loading="lazy" decoding="async" draggable="false">';
    };
    const squares = ["element_red_square_glossy.png", "element_blue_square_glossy.png", "element_yellow_square_glossy.png", "element_green_square_glossy.png"];
    const tiles = function (cls, count) {
      return squares.slice(0, count || 4).map(function (name, i) {
        return sprite(puzzleAsset(name), cls + " " + cls + "-" + i, "Kenney CC0 glossy game tile");
      }).join("");
    };
    let images = "";
    if (id === "mini_racers") {
      images = sprite(racingAsset("car_red_1.png"), "sprite-car car-a", "Kenney CC0 red racing car") +
        sprite(racingAsset("car_blue_1.png"), "sprite-car car-b", "Kenney CC0 blue racing car") +
        '<span class="asset-lane-lines"></span><span class="asset-badge">TRAFFIC RUN</span>';
    } else if (id === "block_battle") {
      images = tiles("puzzle-sprite") + '<span class="asset-badge">8 × 8 PUZZLE</span>';
    } else if (id === "memory_grid") {
      images = tiles("memory-sprite");
    } else if (id === "target_rush") {
      images = tiles("target-sprite") + '<span class="asset-badge">LOCK ON</span>';
    } else if (id === "star_snatch") {
      images = sprite(puzzleAsset("particleCartoonStar.png"), "sprite-star star-large", "Kenney CC0 cartoon star") +
        sprite(puzzleAsset("particleSmallStar.png"), "sprite-star star-small", "Kenney CC0 star particle") +
        '<span class="asset-badge">PERFECT TIMING</span>';
    } else if (id === "stack_tower") {
      images = '<img class="real-sprite tower-crate" src="' + KENNEY_ASSET + 'Block%20Pack/box.png" alt="Kenney CC0 crate game sprite" loading="lazy" decoding="async">' +
        sprite(puzzleAsset("element_blue_square_glossy.png"), "tower-block", "Kenney CC0 tower block") +
        sprite(puzzleAsset("element_red_square_glossy.png"), "tower-block tower-block-high", "Kenney CC0 tower block") +
        '<span class="asset-badge">BUILD THE STACK</span>';
    } else if (id === "orb_dash") {
      images = sprite(puzzleAsset("particleCartoonStar.png"), "sprite-star star-large", "Kenney CC0 star") +
        sprite(puzzleAsset("element_yellow_square_glossy.png"), "sprite-gem", "Kenney CC0 collectible sprite") +
        sprite(puzzleAsset("element_blue_square_glossy.png"), "sprite-orb orb-blue", "Kenney CC0 blue tile") +
        '<span class="asset-badge">GEM CHASE</span>';
    } else if (id === "dodge_arena") {
      images = sprite(puzzleAsset("particleStar.png"), "sprite-star star-large", "Kenney CC0 star particle") +
        sprite(puzzleAsset("element_red_square_glossy.png"), "sprite-danger", "Kenney CC0 danger tile") +
        sprite(puzzleAsset("element_blue_square_glossy.png"), "sprite-orb orb-blue", "Kenney CC0 blue tile");
    } else if (id === "reflex_rush") {
      images = tiles("reflex-sprite", 3) + '<span class="asset-badge">READY?</span>';
    } else if (id === "tap_sprint") {
      images = tiles("tap-sprite") + '<span class="asset-badge">TAP FAST</span>';
    }
    return '<div class="real-art real-art-' + id + '" aria-label="' + escapeText(gameById(id).title) + ' artwork">' + images + '</div>';
  }

  function closeSettingsModal() {
    const modal = root.querySelector(".settings-modal");
    if (modal) modal.remove();
  }
  function renderSettingsModal() {
    closeSettingsModal();
    const themeLabels = { nebula: "NEBULA", ocean: "OCEAN", sunset: "SUNSET" };
    const difficultyLabels = { chill: "CHILL", normal: "NORMAL", chaos: "CHAOS" };
    root.insertAdjacentHTML("beforeend",
      '<div class="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">' +
        '<div class="settings-dialog">' +
          '<div class="settings-modal-head"><div><span class="eyebrow">POCKET PARTY</span><h2 id="settings-title">Arcade settings</h2><p>Your preferences save on this device.</p></div><button class="settings-close" data-action="settings-close" aria-label="Close settings">×</button></div>' +
          '<section class="setting-section"><h3>COLOR THEME</h3><div class="setting-options">' +
            Object.keys(themeLabels).map(function (theme) { return '<button class="setting-choice ' + (settings.theme === theme ? "selected" : "") + '" data-action="setting-theme" data-value="' + theme + '"><span class="theme-swatch theme-' + theme + '"></span>' + themeLabels[theme] + '</button>'; }).join("") +
          '</div></section>' +
          '<section class="setting-section"><h3>GAME DIFFICULTY</h3><p>Affects traffic pace and timing challenge.</p><div class="setting-options">' +
            Object.keys(difficultyLabels).map(function (level) { return '<button class="setting-choice ' + (settings.difficulty === level ? "selected" : "") + '" data-action="setting-difficulty" data-value="' + level + '">' + difficultyLabels[level] + '</button>'; }).join("") +
          '</div></section>' +
          '<section class="setting-section setting-row"><div><strong>Sound effects</strong><small>Arcade clicks, clears, boosts, and collisions</small></div><button class="setting-toggle ' + (settings.sound ? "enabled" : "") + '" data-action="setting-sound" aria-pressed="' + settings.sound + '">' + (settings.sound ? "ON" : "OFF") + '</button></section>' +
          '<section class="setting-section setting-row"><div><strong>Motion effects</strong><small>Animations and screen transitions</small></div><button class="setting-toggle ' + (settings.motion ? "enabled" : "") + '" data-action="setting-motion" aria-pressed="' + settings.motion + '">' + (settings.motion ? "ON" : "OFF") + '</button></section>' +
          '<div class="settings-modal-footer"><button class="secondary-button" data-action="settings-reset">RESET SETTINGS</button><button class="primary-button" data-action="settings-close">DONE ✓</button></div>' +
          '<p class="asset-credit">Artwork uses Kenney CC0 game assets. <a href="https://kenney.nl/assets/racing-pack" target="_blank" rel="noreferrer">Asset source</a></p>' +
        '</div></div>');
  }

  function renderHome() {
    currentScreen = "home";
    root.innerHTML = '<div class="shell">' +
      '<section class="home-top">' +
        '<div class="hero-card">' +
          '<div class="hero-spark"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 2L60 37L96 50L60 62L50 98L39 62L4 50L39 37Z" fill="#ffe16b"/><circle cx="79" cy="18" r="7" fill="#ff7188"/><circle cx="20" cy="76" r="5" fill="#5ed0ed"/></svg></div>' +
          '<span class="eyebrow"><span class="star">✦</span> THE LIVING ROOM ARCADE</span>' +
          '<h1>One phone.<br><span>Four players.</span><br>Big chaos.</h1>' +
          '<p>Pick your players, choose your challenge, and fight for the crown. Ten mini-games, real-time action, and zero Wi-Fi required.</p>' +
          '<div class="hero-bottom"><div class="hero-stat"><strong>10</strong><small>Mini games</small></div><div class="hero-separator"></div><div class="hero-stat"><strong>1–4</strong><small>Players</small></div><div class="hero-separator"></div><div class="hero-stat"><strong>0</strong><small>Wi-Fi required</small></div></div>' +
        '</div>' +
        '<div class="settings-card">' +
          '<div class="section-heading"><div><h2>Build your party</h2><p>Pass one device around or crowd around the screen.</p></div><span class="step-mark">STEP 01 / 02</span></div>' +
          '<div class="control-block"><div class="control-label">HOW MANY PLAYERS? <small>same device</small></div><div class="choice-row">' +
            [1,2,3,4].map(function (n) { return '<button class="choice-button ' + (settings.players === n ? "selected" : "") + '" data-action="players" data-value="' + n + '">' + n + '<span class="choice-sub">P' + n + '</span></button>'; }).join("") +
          '</div></div>' +
          '<div class="control-block"><div class="control-label">TOURNAMENT LENGTH <small>for tournament mode</small></div><div class="choice-row">' +
            [5,10].map(function (n) { return '<button class="choice-button round ' + (settings.rounds === n ? "selected" : "") + '" data-action="rounds" data-value="' + n + '">' + n + ' ROUNDS</button>'; }).join("") +
          '</div></div>' +
          '<div class="setup-bottom"><div class="ready-note"><strong>' + settings.players + ' PLAYER' + (settings.players === 1 ? "" : "S") + ' READY</strong><br>Quick games or a full random tournament.</div><button class="primary-button" data-action="play">PLAY&nbsp; →</button></div>' +
        '</div>' +
      '</section>' +
      '<div class="home-footnote"><span>✦</span> MADE FOR LOCAL MULTIPLAYER <span>·</span> NO ACCOUNTS <span>·</span> JUST PLAY</div>' +
    '</div>';
    updateSoundButton();
  }

  function renderGameSelect() {
    currentScreen = "select";
    root.innerHTML = '<div class="shell game-select-shell">' +
      '<div class="selection-heading"><div><span class="eyebrow"><span class="star">✦</span> STEP 02 / 02</span><h1>Choose your game.</h1><p>' + settings.players + ' player' + (settings.players === 1 ? "" : "s") + ' · Same device · Pick a game to start</p></div>' +
      '<button class="secondary-button" data-action="home">← BACK TO SETUP</button></div>' +
      '<section class="game-grid" aria-label="Choose a mini-game">' +
        gameList.map(function (g, i) {
          return '<button class="game-card" data-action="quick-play" data-game="' + g.id + '">' +
            '<div class="game-art">' + assetArt(g.id) + '</div>' +
            '<div class="game-card-top"><span class="game-category">' + g.category + '</span><span class="game-number">0' + (i + 1) + '</span></div>' +
            '<h3>' + g.title + '</h3><p>' + g.desc + '</p>' +
            '<div class="game-card-footer"><span class="game-meta">' + g.length + '</span><span class="play-link">PLAY GAME <span>↗</span></span></div>' +
          '</button>';
        }).join("") +
      '</section>' +
      '<section class="tournament-launch"><div class="tournament-icon">🏆</div><div class="tournament-copy"><strong>Feeling competitive?</strong><span>Play ' + settings.rounds + ' random rounds, earn points, and crown one champion.</span></div><button class="primary-button" data-action="start-tournament">START TOURNAMENT&nbsp; →</button></section>' +
    '</div>';
    updateSoundButton();
  }

  function newPlayer() {
    return {
      taps: 0, comboBonus: 0, reaction: null, responded: false, progress: 0, raceSpeed: 0, throttle: false, boosts: 0,
      hits: 0, misses: 0, early: false, dodged: false, status: "READY",
      memoryInput: 0, memoryScore: 0, done: false, score: 0,
      board: Array(64).fill(null), blockPieces: [], blockScore: 0, blockLines: 0, blockStreak: 0,
      blockCursor: { row: 3, col: 3 }, lastPlaced: [], lastCleared: [],
      orbX: 50, orbY: 50, joystickX: 0, joystickY: 0, raceSteer: 0, cleanPasses: 0,
      throttleButtonHeld: false, boostFlash: 0, raceEvent: "", raceEventUntil: 0,
      trafficSpawnCooldown: 0.6, raceCrashUntil: 0, starCooldownUntil: 0,
      stackWidth: 220, stackHeight: 0, stackScore: 0, stackAlive: true, stackLayers: [], stackDrops: 0
    };
  }
  function spawnOrbTarget() {
    let candidate = { x: 50, y: 50 };
    for (let attempt = 0; attempt < 24; attempt++) {
      candidate = { x: 8 + Math.random() * 84, y: 12 + Math.random() * 76 };
      const safe = !game || !game.players || game.players.every(function (p) {
        return Math.hypot(p.orbX - candidate.x, p.orbY - candidate.y) > 12;
      });
      if (safe) return candidate;
    }
    return candidate;
  }
  function normalizeBlockCells(cells) {
    const minX = Math.min.apply(null, cells.map(function (c) { return c[0]; }));
    const minY = Math.min.apply(null, cells.map(function (c) { return c[1]; }));
    return cells.map(function (c) { return [c[0] - minX, c[1] - minY]; })
      .sort(function (a, b) { return a[1] - b[1] || a[0] - b[0]; });
  }
  function blockShapeKey(cells) {
    return normalizeBlockCells(cells).map(function (c) { return c[0] + ":" + c[1]; }).join("|");
  }
  function blockRotations(piece) {
    const out = [];
    let cells = piece.cells.map(function (c) { return [c[0], c[1]]; });
    for (let i = 0; i < 4; i++) {
      const normalized = normalizeBlockCells(cells);
      const key = blockShapeKey(normalized);
      if (!out.some(function (entry) { return entry.key === key; })) out.push({ cells: normalized, rotation: i, key: key });
      cells = cells.map(function (c) { return [-c[1], c[0]]; });
    }
    return out;
  }
  function makeBlockPieces(board) {
    const currentBoard = Array.isArray(board) ? board : Array(64).fill(null);
    const occupied = currentBoard.filter(function (value) { return value !== null; }).length;
    const openCells = 64 - occupied;
    const placeableShapes = BLOCK_SHAPES.filter(function (cells) {
      const testPiece = { cells: cells };
      return blockRotations(testPiece).some(function (rotation) {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          if (blockPieceFits(currentBoard, { cells: rotation.cells }, x, y)) return true;
        }
        return false;
      });
    });
    if (!placeableShapes.length) {
      return Array.from({ length: 3 }, function () {
        return { cells: [[0,0]], colorIndex: Math.floor(Math.random() * colors.length), used: false, rotation: 0 };
      });
    }
    const targetSizes = openCells > 42 ? [3,4,5] : (openCells > 24 ? [2,3,4] : [1,2,3]);
    const picked = [];
    for (let slot = 0; slot < 3; slot++) {
      let candidates = placeableShapes.filter(function (cells) {
        const key = blockShapeKey(cells);
        return !picked.some(function (piece) { return piece.shapeKey === key; });
      });
      if (!candidates.length) candidates = placeableShapes.slice();
      const preferred = candidates.filter(function (cells) { return targetSizes.indexOf(cells.length) >= 0; });
      if (preferred.length) candidates = preferred;
      const shape = candidates[Math.floor(Math.random() * candidates.length)];
      picked.push({
        cells: normalizeBlockCells(shape),
        shapeKey: blockShapeKey(shape),
        colorIndex: Math.floor(Math.random() * colors.length),
        used: false,
        rotation: 0
      });
    }
    return picked;
  }
  function blockPieceFits(board, piece, x, y) {
    return piece.cells.every(function (cell) {
      const px = x + cell[0], py = y + cell[1];
      return px >= 0 && px < 8 && py >= 0 && py < 8 && board[py * 8 + px] === null;
    });
  }
  function blockPlayerHasMove(player) {
    return player.blockPieces.some(function (piece) {
      if (piece.used) return false;
      return blockRotations(piece).some(function (rotation) {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          if (blockPieceFits(player.board, { cells: rotation.cells }, x, y)) return true;
        }
        return false;
      });
    });
  }
  function firstUsableBlockPiece(player) {
    for (let i = 0; i < player.blockPieces.length; i++) if (!player.blockPieces[i].used) return i;
    return -1;
  }
  function findBestBlockMove(player, onlyIndex) {
    let best = null;
    player.blockPieces.forEach(function (piece, pieceIndex) {
      if (piece.used || (onlyIndex !== undefined && pieceIndex !== onlyIndex)) return;
      blockRotations(piece).forEach(function (rotation) {
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          if (!blockPieceFits(player.board, { cells: rotation.cells }, x, y)) continue;
          const board = player.board.slice();
          const placed = [];
          rotation.cells.forEach(function (cell) {
            const index = (y + cell[1]) * 8 + x + cell[0];
            board[index] = piece.colorIndex;
            placed.push(index);
          });
          let rows = 0, cols = 0, adjacency = 0;
          for (let row = 0; row < 8; row++) if (board.slice(row * 8, row * 8 + 8).every(function (v) { return v !== null; })) rows++;
          for (let col = 0; col < 8; col++) {
            let full = true;
            for (let row = 0; row < 8; row++) if (board[row * 8 + col] === null) full = false;
            if (full) cols++;
          }
          placed.forEach(function (index) {
            const row = Math.floor(index / 8), col = index % 8;
            [[row-1,col],[row+1,col],[row,col-1],[row,col+1]].forEach(function (pos) {
              if (pos[0] >= 0 && pos[0] < 8 && pos[1] >= 0 && pos[1] < 8 && player.board[pos[0] * 8 + pos[1]] !== null) adjacency++;
            });
          });
          const lines = rows + cols;
          const score = lines * 100 + Math.max(0, lines - 1) * 35 + rotation.cells.length * 2 + adjacency * 0.35 + (3 - Math.abs(3.5 - (x + 0.5))) * 0.2;
          if (!best || score > best.score) best = { pieceIndex: pieceIndex, row: y, col: x, rotation: rotation.rotation, score: score };
        }
      });
    });
    return best;
  }
  function orientBlockPiece(piece, turns) {
    if (!piece) return;
    for (let i = 0; i < turns; i++) piece.cells = normalizeBlockCells(piece.cells.map(function (c) { return [-c[1], c[0]]; }));
    piece.rotation = ((piece.rotation || 0) + turns) % 4;
  }
  function findPlacementForCurrentOrientation(player, piece) {
    if (!piece || piece.used) return null;
    const cursor = player.blockCursor || { row: 3, col: 3 };
    let best = null;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      if (!blockPieceFits(player.board, piece, col, row)) continue;
      const board = player.board.slice();
      piece.cells.forEach(function (cell) { board[(row + cell[1]) * 8 + col + cell[0]] = piece.colorIndex; });
      let lineCount = 0;
      for (let y = 0; y < 8; y++) if (board.slice(y * 8, y * 8 + 8).every(function (v) { return v !== null; })) lineCount++;
      for (let x = 0; x < 8; x++) {
        let full = true;
        for (let y = 0; y < 8; y++) if (board[y * 8 + x] === null) full = false;
        if (full) lineCount++;
      }
      const distance = Math.abs(row - cursor.row) + Math.abs(col - cursor.col);
      const score = lineCount * 100 - distance + piece.cells.length * 0.1;
      if (!best || score > best.score) best = { row: row, col: col, score: score };
    }
    return best;
  }
  function rotateSelectedBlock() {
    if (!game || game.id !== "block_battle" || currentScreen !== "game") return;
    const player = game.players[game.activePuzzlePlayer];
    const piece = player.blockPieces[game.selectedPiece];
    if (!piece || piece.used) return;
    orientBlockPiece(piece, 1);
    const placement = findPlacementForCurrentOrientation(player, piece);
    if (placement) {
      player.blockCursor = { row: placement.row, col: placement.col };
      player.status = "ROTATED · READY TO PLACE";
    } else {
      player.status = "NO FIT IN THIS ROTATION";
      toast("No legal placement in that rotation. Rotate again or use Smart Move.");
    }
    sfx("rotate");
    renderGame();
  }
    function suggestBlockMove() {
    if (!game || game.id !== "block_battle" || currentScreen !== "game") return;
    const player = game.players[game.activePuzzlePlayer];
    const move = findBestBlockMove(player);
    if (!move) { toast("No legal move left on this board."); sfx("error"); return; }
    game.selectedPiece = move.pieceIndex;
    const piece = player.blockPieces[move.pieceIndex];
    if (piece) orientBlockPiece(piece, move.rotation);
    player.blockCursor = { row: move.row, col: move.col };
    player.status = move.score >= 100 ? "SMART MOVE · LINE CLEAR!" : "SMART MOVE READY";
    sfx("hint");
    renderGame();
    toast(move.score >= 100 ? "Best move found: line clear!" : "Best legal placement highlighted.");
  }
  function advanceBlockTurn() {
    if (!game || currentScreen !== "game" || game.id !== "block_battle") return;
    const next = game.activePuzzlePlayer + 1;
    if (next >= game.players.length) { finishRound(); return; }
    game.activePuzzlePlayer = next;
    const player = game.players[next];
    game.timeLeft = game.duration;
    let move = findBestBlockMove(player);
    if (!move) {
      player.blockPieces = makeBlockPieces(player.board);
      move = findBestBlockMove(player);
    }
    if (move) {
      game.selectedPiece = move.pieceIndex;
      const piece = player.blockPieces[move.pieceIndex];
      if (piece) orientBlockPiece(piece, move.rotation);
      player.blockCursor = { row: move.row, col: move.col };
      player.status = "YOUR TURN — MAKE IT COUNT!";
    } else {
      game.selectedPiece = -1;
      player.status = "NO LEGAL MOVES";
      game.timeLeft = 0.01;
    }
    renderGame();
  }
  function placeBlockPiece(row, col) {
    if (!game || currentScreen !== "game" || game.id !== "block_battle" || row < 0 || row > 7 || col < 0 || col > 7) return;
    const player = game.players[game.activePuzzlePlayer];
    const pieceIndex = game.selectedPiece;
    const piece = player.blockPieces[pieceIndex];
    if (!piece || piece.used) { toast("Choose an unused shape first."); sfx("error"); return; }
    if (!blockPieceFits(player.board, piece, col, row)) {
      toast("That shape doesn't fit. Rotate it or use Smart Move.");
      sfx("error");
      return;
    }
    player.blockCursor = { row: row, col: col };
    player.lastPlaced = [];
    player.lastCleared = [];
    piece.cells.forEach(function (cell) {
      const index = (row + cell[1]) * 8 + col + cell[0];
      player.board[index] = piece.colorIndex;
      player.lastPlaced.push(index);
    });
    player.blockScore += piece.cells.length;
    piece.used = true;
    const fullRows = [], fullCols = [];
    for (let y = 0; y < 8; y++) if (player.board.slice(y * 8, y * 8 + 8).every(function (v) { return v !== null; })) fullRows.push(y);
    for (let x = 0; x < 8; x++) {
      let full = true;
      for (let y = 0; y < 8; y++) if (player.board[y * 8 + x] === null) full = false;
      if (full) fullCols.push(x);
    }
    if (fullRows.length || fullCols.length) {
      const cleared = new Set();
      fullRows.forEach(function (y) { for (let x = 0; x < 8; x++) cleared.add(y * 8 + x); });
      fullCols.forEach(function (x) { for (let y = 0; y < 8; y++) cleared.add(y * 8 + x); });
      player.lastCleared = Array.from(cleared);
      cleared.forEach(function (index) { player.board[index] = null; });
      const lineCount = fullRows.length + fullCols.length;
      player.blockLines += lineCount;
      player.blockStreak++;
      const bonus = lineCount * 10 + Math.max(0, lineCount - 1) * 8 + Math.max(0, player.blockStreak - 1) * 3;
      player.blockScore += bonus;
      player.status = lineCount > 1 ? "MEGA CLEAR x" + lineCount + " · +" + bonus : "LINE CLEAR! +" + bonus;
      sfx(lineCount > 1 ? "combo" : "clear");
    } else {
      player.blockStreak = 0;
      player.status = "+" + piece.cells.length + " BLOCKS";
      sfx("place");
    }
    if (player.blockPieces.every(function (p) { return p.used; })) {
      player.blockPieces = makeBlockPieces(player.board);
    }
    let nextMove = findBestBlockMove(player);
    if (!nextMove) {
      player.blockPieces = makeBlockPieces(player.board);
      nextMove = findBestBlockMove(player);
    }
    if (nextMove) {
      game.selectedPiece = nextMove.pieceIndex;
      const nextPiece = player.blockPieces[nextMove.pieceIndex];
      if (nextPiece) orientBlockPiece(nextPiece, nextMove.rotation);
      player.blockCursor = { row: nextMove.row, col: nextMove.col };
    } else {
      game.selectedPiece = -1;
      player.status = "BOARD FULL — TURN OVER";
      game.timeLeft = 0.01;
      renderGame();
      return;
    }
    renderGame();
  }
  function updateBlockGhostAtCell(cell) {
    if (!game || game.id !== "block_battle" || currentScreen !== "game") return;
    const boardElement = root.querySelector(".block-board");
    if (!boardElement) return;
    boardElement.querySelectorAll(".block-cell").forEach(function (el) {
      el.classList.remove("ghost-valid", "ghost-invalid", "cursor-anchor");
    });
    if (!cell || !boardElement.contains(cell)) return;
    const player = game.players[game.activePuzzlePlayer];
    const row = Number(cell.dataset.row), col = Number(cell.dataset.col);
    player.blockCursor = { row: row, col: col };
    const piece = player.blockPieces[game.selectedPiece];
    if (!piece || piece.used) return;
    const fits = blockPieceFits(player.board, piece, col, row);
    piece.cells.forEach(function (shapeCell) {
      const target = boardElement.querySelector('.block-cell[data-row="' + (row + shapeCell[1]) + '"][data-col="' + (col + shapeCell[0]) + '"]');
      if (target) target.classList.add(fits ? "ghost-valid" : "ghost-invalid");
    });
    cell.classList.add("cursor-anchor");
  }
  function releaseBlockCursor() {
    if (!game || game.id !== "block_battle" || currentScreen !== "game") return;
    const player = game.players[game.activePuzzlePlayer];
    const cursor = player.blockCursor || { row: 3, col: 3 };
    placeBlockPiece(cursor.row, cursor.col);
  }
    function updateOrbArena() {
    if (!game || game.id !== "orb_dash") return;
    game.players.forEach(function (p, i) {
      const orb = document.getElementById("orb-player-" + i);
      if (orb) { orb.style.left = p.orbX + "%"; orb.style.top = p.orbY + "%"; }
    });
    const target = document.getElementById("orb-gem");
    if (target) { target.style.left = game.orbTarget.x + "%"; target.style.top = game.orbTarget.y + "%"; }
    const hud = document.getElementById("orb-leader");
    if (hud) {
      const ranked = game.players.map(function (p, i) { return { i: i, score: p.hits }; }).sort(function (a, b) { return b.score - a.score; });
      hud.textContent = "P" + (ranked[0].i + 1) + " LEADS · " + (ranked[0].score * 10) + " PTS";
    }
  }
  function setJoystickValue(playerIndex, button, event) {
    if (!game || !game.players[playerIndex]) return null;
    const rect = button.getBoundingClientRect();
    const radius = Math.max(20, Math.min(rect.width, rect.height) * 0.36);
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > radius) { dx *= radius / distance; dy *= radius / distance; }
    const value = { x: dx / radius, y: dy / radius, magnitude: Math.min(1, distance / radius) };
    game.players[playerIndex].joystickX = value.x;
    game.players[playerIndex].joystickY = value.y;
    const knob = button.querySelector(".joystick-knob");
    if (knob) knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
    return value;
  }
  function joystickColor(value) {
    if (Math.abs(value.x) > Math.abs(value.y)) return value.x < 0 ? 0 : 2;
    return value.y < 0 ? 1 : 3;
  }
  function applyJoystickInput(owner, value) {
    if (!game || currentScreen !== "game" || game.id !== owner.gameId || !game.players[owner.playerIndex]) return;
    const p = game.players[owner.playerIndex];
    if (game.id === "mini_racers") {
      p.raceSteer = value.magnitude > 0.12 ? value.x : 0;
      p.throttle = !!p.throttleButtonHeld || value.y < -0.15;
      updateRaceTrack();
      refreshPlayerPanels();
    } else if (game.id === "orb_dash") {
      // The arena tick reads this vector so motion stays smooth between touch events.
    } else if (game.id === "memory_grid" || game.id === "target_rush") {
      if (!owner.acted && value.magnitude > 0.30) {
        owner.acted = true;
        colorAction(owner.playerIndex, joystickColor(value));
      }
    } else if (game.id === "block_battle") {
      if (value.magnitude > 0.27) {
        const direction = joystickColor(value);
        const now = performance.now();
        if (owner.lastDir !== direction || now - owner.lastStepAt > 170) {
          const cursor = p.blockCursor || { row: 3, col: 3 };
          const piece = player.blockPieces[game.selectedPiece];
          const width = piece ? Math.max.apply(null, piece.cells.map(function (c) { return c[0]; })) + 1 : 1;
          const height = piece ? Math.max.apply(null, piece.cells.map(function (c) { return c[1]; })) + 1 : 1;
          if (direction === 0) cursor.col = Math.max(0, cursor.col - 1);
          else if (direction === 2) cursor.col = Math.min(8 - width, cursor.col + 1);
          else if (direction === 1) cursor.row = Math.max(0, cursor.row - 1);
          else cursor.row = Math.min(8 - height, cursor.row + 1);
          p.blockCursor = cursor;
          owner.lastDir = direction;
          owner.lastStepAt = now;
          owner.moved = true;
          const cell = root.querySelector('.block-cell[data-row="' + cursor.row + '"][data-col="' + cursor.col + '"]');
          updateBlockGhostAtCell(cell);
        }
      } else {
        owner.lastDir = null;
      }
    }
  }
  function releaseJoystick(pointerId, cancelled) {
    const owner = joystickPointerOwners.get(pointerId);
    if (!owner) return;
    joystickPointerOwners.delete(pointerId);
    const knob = owner.button.querySelector(".joystick-knob");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
    const p = game && game.players[owner.playerIndex];
    if (p && game.id === owner.gameId) {
      p.joystickX = 0;
      p.joystickY = 0;
      if (owner.gameId === "mini_racers") {
        const raceHeld = Array.from(racePointerOwners.values()).includes(owner.playerIndex);
        p.raceSteer = 0;
        p.throttle = !!p.throttleButtonHeld || raceHeld;
        updateRaceTrack();
      }
      if (owner.gameId === "block_battle" && !cancelled && game.activePuzzlePlayer === owner.playerIndex) {
        releaseBlockCursor();
      }
    }
  }
  function startTournament() {
    tournament = { active: true, round: 1, rounds: settings.rounds, scores: [0,0,0,0], recent: [] };
    startNextTournamentRound();
  }
  function startNextTournamentRound() {
    if (!tournament || tournament.round > tournament.rounds) { renderFinal(); return; }
    const options = gameList.filter(function (g) { return tournament.recent.indexOf(g.id) === -1; });
    const pool = options.length ? options : gameList;
    const choice = pool[Math.floor(Math.random() * pool.length)];
    tournament.recent.push(choice.id);
    if (tournament.recent.length > 2) tournament.recent.shift();
    startGame(choice.id, true);
  }
  function startQuickGame(id) {
    tournament = { active: false, round: 1, rounds: 1, scores: [0,0,0,0], recent: [] };
    startGame(id, false);
  }
  function startGame(id, inTournament) {
    const g = gameById(id);
    const durations = { tap_sprint: 10, mini_racers: 30, target_rush: 12, block_battle: 35, orb_dash: 30, star_snatch: 15, stack_tower: 8 };
    const duration = durations[id] || 0;
    game = {
      id: id, data: g, tournament: inTournament, round: tournament ? tournament.round : 1,
      players: Array.from({ length: settings.players }, newPlayer),
      duration: duration, timeLeft: duration, phase: "playing", phaseTimer: 0,
      startedAt: performance.now(), target: Math.floor(Math.random() * 4), targetCooldown: 0.65,
      sequence: Array.from({ length: settings.players >= 3 ? 6 : 5 }, function () { return Math.floor(Math.random() * 4); }),
      showIndex: -1, memoryPlayer: 0, wave: 1, nextSoundAt: 0,
      activePuzzlePlayer: 0, selectedPiece: 0, orbTarget: { x: 50, y: 50 }, raceTraffic: [],
      raceTimeElapsed: 0, raceDifficulty: 0, roadScroll: 0, activeStackPlayer: 0,
      stackX: 35, stackDirection: 1, stackSpeed: 235, starX: 12, starDirection: 1, starSpeed: 78, nextTrafficId: 1
    };
    game.players.forEach(function (p, i) {
      p.blockPieces = makeBlockPieces(p.board);
      p.orbX = i % 2 === 0 ? 17 : 83;
      p.orbY = i < 2 ? 24 : 76;
      p.raceSpeed = 42;
      p.stackWidth = 220;
      p.stackLayers = [{ x: 270, width: 220, colorIndex: i }];
    });
    if (id === "block_battle") {
      game.players.forEach(function (p, i) {
        const opening = findBestBlockMove(p);
        if (opening) {
          const piece = p.blockPieces[opening.pieceIndex];
          orientBlockPiece(piece, opening.rotation);
          p.blockCursor = { row: opening.row, col: opening.col };
          if (game.activePuzzlePlayer === 0 && i === 0) game.selectedPiece = opening.pieceIndex;
        }
      });
      game.players[0].status = "YOUR TURN — MAKE IT COUNT!";
      game.timeLeft = duration;
    }
    if (id === "mini_racers") {
      game.duration = 30;
      game.timeLeft = 30;
      game.raceTraffic = [];
      game.roadScroll = 0;
      game.raceTimeElapsed = 0;
      game.players.forEach(function (p, i) { p.trafficSpawnCooldown = 0.25 + i * 0.12; });
    }
    if (id === "orb_dash") {
      game.orbTarget = spawnOrbTarget();
      game.timeLeft = duration;
    }
    if (id === "star_snatch") {
      game.duration = 15; game.timeLeft = 15; game.starX = 12; game.starDirection = 1;
      game.starSpeed = settings.difficulty === "chill" ? 62 : (settings.difficulty === "chaos" ? 112 : 78);
    }
    if (id === "stack_tower") {
      game.duration = 8; game.timeLeft = 8; game.activeStackPlayer = 0;
      game.stackX = 35; game.stackDirection = 1; game.stackSpeed = 235;
    }
    if (id === "reflex_rush") {
      game.phase = "reflex_wait";
      game.phaseTimer = 1.5 + Math.random() * 2.2;
      game.timeLeft = null;
    }
    if (id === "memory_grid") {
      game.phase = "memory_show";
      game.phaseTimer = 0.32;
      game.timeLeft = null;
    }
    if (id === "dodge_arena") {
      game.phase = "dodge_ready";
      game.phaseTimer = 0.7 + Math.random() * 0.8;
      game.timeLeft = null;
    }
    currentScreen = "game";
    renderGame();
    stopTick();
    lastTick = performance.now();
    tickTimer = window.setInterval(tick, 80);
    if (id === "reflex_rush" || id === "dodge_arena" || id === "mini_racers") sfx("select");
  }

  let tickTimer = null;
  let lastTick = 0;
  function stopTick() {
    if (tickTimer !== null) window.clearInterval(tickTimer);
    tickTimer = null;
  }
  function tick() {
    if (!game || currentScreen !== "game") { stopTick(); return; }
    const now = performance.now();
    const dt = Math.min(0.12, Math.max(0, (now - lastTick) / 1000));
    lastTick = now;
    let needsRender = false;

    if (game.id === "tap_sprint" || game.id === "mini_racers" || game.id === "target_rush" || game.id === "star_snatch") {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      const timer = document.getElementById("timer-value");
      if (timer) timer.textContent = fmtTime(game.timeLeft);
      if (game.id === "mini_racers") {
        game.raceTimeElapsed += dt;
        game.raceDifficulty = Math.floor(game.raceTimeElapsed / 5);
        game.roadScroll = (game.roadScroll + dt * (98 + game.raceDifficulty * 20)) % 72;
        const baseSpawn = settings.difficulty === "chill" ? 1.48 : (settings.difficulty === "chaos" ? 0.98 : 1.25);
        const trafficBaseSpeed = settings.difficulty === "chill" ? 118 : (settings.difficulty === "chaos" ? 158 : 137);
        const collisionWindow = settings.difficulty === "chill" ? 0.17 : (settings.difficulty === "chaos" ? 0.29 : 0.23);
        game.players.forEach(function (p, i) {
          p.throttle = !!p.throttleButtonHeld || p.joystickY < -0.15;
          p.raceSpeed = p.throttle ? Math.min(112, p.raceSpeed + 62 * dt) : Math.max(34, p.raceSpeed - 27 * dt);
          p.progress += p.raceSpeed * dt;
          p.trafficSpawnCooldown -= dt;
          if (p.trafficSpawnCooldown <= 0) {
            const offsets = [-0.82, 0, 0.82];
            const colorsForTraffic = ["red", "blue", "green", "black"];
            game.raceTraffic.push({
              id: game.nextTrafficId++,
              lane: i,
              y: -76,
              offset: offsets[Math.floor(Math.random() * offsets.length)],
              speed: trafficBaseSpeed + game.raceDifficulty * 19 + Math.random() * 22,
              color: colorsForTraffic[Math.floor(Math.random() * colorsForTraffic.length)],
              resolved: false,
              passed: false
            });
            p.trafficSpawnCooldown = Math.max(0.43, baseSpawn - game.raceDifficulty * 0.14) + Math.random() * 0.3;
          }
        });
        game.raceTraffic.forEach(function (car) {
          const previousY = car.y;
          car.y += car.speed * dt;
          if (!car.resolved && previousY < 286 && car.y >= 242) {
            const p = game.players[car.lane];
            car.resolved = true;
            if (Math.abs(p.raceSteer - car.offset) < collisionWindow) {
              p.misses++;
              p.raceSpeed = Math.max(30, p.raceSpeed - 30);
              p.raceCrashUntil = now + 620;
              p.raceEvent = "CRASH! CHANGE LANES";
              p.raceEventUntil = now + 780;
              p.status = p.raceEvent;
              sfx("bump");
            } else {
              p.cleanPasses++;
              p.raceSpeed = Math.min(112, p.raceSpeed + 8);
              p.raceEvent = "CLEAN PASS · +" + (10 + game.raceDifficulty * 3);
              p.raceEventUntil = now + 680;
              p.status = p.raceEvent;
              sfx("boost");
            }
          }
          if (car.y > 410) car.passed = true;
        });
        game.raceTraffic = game.raceTraffic.filter(function (car) { return !car.passed; });
        updateRaceTrack();
        refreshPlayerPanels();
      }
      if (game.id === "star_snatch") {
        const elapsed = game.duration - game.timeLeft;
        const baseSpeed = settings.difficulty === "chill" ? 60 : (settings.difficulty === "chaos" ? 105 : 78);
        game.starSpeed = baseSpeed + Math.floor(elapsed / 5) * 18;
        game.starX += game.starDirection * game.starSpeed * dt;
        if (game.starX >= 88) { game.starX = 88; game.starDirection = -1; }
        if (game.starX <= 12) { game.starX = 12; game.starDirection = 1; }
        const cursor = document.getElementById("star-cursor");
        if (cursor) cursor.style.left = game.starX + "%";
        const level = document.getElementById("star-level");
        if (level) level.textContent = "SPEED " + (Math.floor(elapsed / 5) + 1);
      }
      if (game.id === "target_rush") {
        game.targetCooldown -= dt;
        if (game.targetCooldown <= 0) {
          game.targetCooldown = Math.max(0.32, 0.72 - (game.duration - game.timeLeft) * 0.025);
          game.target = Math.floor(Math.random() * 4);
          updateTargetDisplay();
        }
      }
      if (game.timeLeft <= 0) finishRound();
    } else if (game.id === "block_battle") {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      const timer = document.getElementById("timer-value");
      if (timer) timer.textContent = fmtTime(game.timeLeft);
      if (game.timeLeft <= 0) advanceBlockTurn();
    } else if (game.id === "stack_tower") {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      const timer = document.getElementById("timer-value");
      if (timer) timer.textContent = fmtTime(game.timeLeft);
      const player = game.players[game.activeStackPlayer];
      const maxX = Math.max(32, 728 - (player ? player.stackWidth : 220));
      game.stackX += game.stackDirection * game.stackSpeed * dt;
      if (game.stackX > maxX) { game.stackX = maxX; game.stackDirection = -1; }
      if (game.stackX < 32) { game.stackX = 32; game.stackDirection = 1; }
      updateStackTower();
      if (game.timeLeft <= 0) advanceStackTurn();
    } else if (game.id === "orb_dash") {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      const timer = document.getElementById("timer-value");
      if (timer) timer.textContent = fmtTime(game.timeLeft);
      game.players.forEach(function (p, i) {
        p.orbX = Math.max(5, Math.min(95, p.orbX + p.joystickX * 22 * dt));
        p.orbY = Math.max(12, Math.min(88, p.orbY + p.joystickY * 22 * dt));
        const dx = p.orbX - game.orbTarget.x, dy = p.orbY - game.orbTarget.y;
        if (Math.hypot(dx, dy) < 5.2) {
          p.hits++;
          p.status = "GEM +10 · " + (p.hits * 10) + " PTS";
          game.orbTarget = spawnOrbTarget();
          sfx("gem", i * 28);
        } else if (Math.abs(p.joystickX) + Math.abs(p.joystickY) > 0.2) {
          p.status = "MOVING · " + (p.hits * 10) + " PTS";
        }
      });
      updateOrbArena();
      refreshPlayerPanels();
      if (game.timeLeft <= 0) finishRound();
    } else if (game.id === "reflex_rush") {
      game.phaseTimer -= dt;
      if (game.phase === "reflex_wait" && game.phaseTimer <= 0) {
        game.phase = "reflex_go";
        game.phaseTimer = 3;
        game.players.forEach(function (p) { if (!p.responded) p.status = "TAP NOW!"; });
        beep(760, 0.18, "square");
        if (allReflexResponded()) finishRound(); else renderGame();
      } else if (game.phase === "reflex_go") {
        game.phaseTimer = Math.max(0, game.phaseTimer);
        const state = document.getElementById("arena-state");
        const count = document.getElementById("reflex-countdown");
        if (count) count.textContent = game.phaseTimer.toFixed(1) + "s";
        if (game.phaseTimer <= 0) {
          game.players.forEach(function (p) {
            if (!p.responded) { p.responded = true; p.reaction = null; p.status = "TOO SLOW!"; }
          });
          finishRound();
        }
      }
    } else if (game.id === "memory_grid") {
      game.phaseTimer -= dt;
      if (game.phase === "memory_show" && game.phaseTimer <= 0) {
        if (game.showIndex < game.sequence.length - 1) {
          game.showIndex++;
          game.phaseTimer = 0.42;
          beep(250 + game.sequence[game.showIndex] * 130, 0.10, "sine");
          renderGame();
        } else {
          game.phase = "memory_input";
          game.players[game.memoryPlayer].status = "YOUR TURN!";
          renderGame();
        }
      } else if (game.phase === "memory_switch" && game.phaseTimer <= 0) {
        game.memoryPlayer++;
        if (game.memoryPlayer >= settings.players) {
          finishRound();
        } else {
          game.showIndex = -1;
          game.phase = "memory_show";
          game.phaseTimer = 0.42;
          game.players[game.memoryPlayer].status = "WATCH THE PATTERN";
          renderGame();
        }
      }
    } else if (game.id === "dodge_arena") {
      game.phaseTimer -= dt;
      if (game.phase === "dodge_ready" && game.phaseTimer <= 0) {
        game.phase = "dodge_live";
        game.phaseTimer = Math.max(0.36, 0.72 - (game.wave - 1) * 0.045);
        game.players.forEach(function (p) {
          p.dodged = false;
          p.status = "DODGE NOW!";
        });
        beep(560, 0.12, "triangle");
        renderGame();
      } else if (game.phase === "dodge_live" && game.phaseTimer <= 0) {
        game.players.forEach(function (p) {
          if (p.dodged) { p.hits++; p.status = "CLEAN DODGE!"; }
          else { p.misses++; p.status = "MISSED!"; }
        });
        if (game.wave >= 8) finishRound();
        else {
          game.wave++;
          game.phase = "dodge_ready";
          game.phaseTimer = 0.65 + Math.random() * 0.95;
          game.players.forEach(function (p) { p.early = false; });
          renderGame();
        }
      }
    }
  }

  function allReflexResponded() {
    return game.players.every(function (p) { return p.responded; });
  }
  function playerAction(pIndex) {
    if (!game || currentScreen !== "game" || pIndex < 0 || pIndex >= settings.players) return;
    const p = game.players[pIndex];
    if (game.id === "tap_sprint" && game.timeLeft > 0) {
      p.taps++;
      if (p.taps % 5 === 0) {
        p.comboBonus++;
        p.status = "COMBO x" + p.comboBonus + "! +" + p.comboBonus + " BONUS";
        beep(650 + Math.min(360, p.comboBonus * 40), 0.075, "triangle");
      } else {
        p.status = p.taps + " TAPS · " + (5 - p.taps % 5) + " TO COMBO";
        beep(380 + Math.min(400, p.taps * 3), 0.025, "triangle");
      }
    } else if (game.id === "mini_racers" && game.timeLeft > 0) {
      p.boosts++;
      p.raceSpeed = Math.min(112, p.raceSpeed + 24);
      p.boostFlash = performance.now() + 460;
      p.status = "NITRO BOOST! " + p.boosts;
      sfx("boost", pIndex * 22);
      updateRaceTrack();
    } else if (game.id === "star_snatch" && game.timeLeft > 0) {
      const now = performance.now();
      if (now < p.starCooldownUntil) return;
      const missDistance = Math.abs(game.starX - 50);
      const tolerance = settings.difficulty === "chill" ? 10 : (settings.difficulty === "chaos" ? 5.5 : 7.5);
      if (missDistance <= tolerance) {
        p.hits++;
        p.status = "NICE SNATCH! +" + (10 + Math.max(0, 7 - Math.round(missDistance)));
        sfx("gem", pIndex * 18);
      } else {
        p.misses++;
        p.status = "MISSED BY " + Math.round(missDistance) + "%";
        sfx("error");
      }
      p.starCooldownUntil = now + 330;
      refreshPlayerPanels();
      return;
    } else if (game.id === "stack_tower" && game.activeStackPlayer === pIndex && game.timeLeft > 0 && p.stackAlive) {
      const top = p.stackLayers[p.stackLayers.length - 1] || { x: 270, width: 220 };
      const movingWidth = p.stackWidth;
      const left = Math.max(game.stackX, top.x);
      const right = Math.min(game.stackX + movingWidth, top.x + top.width);
      const overlap = right - left;
      if (overlap < 22) {
        p.stackAlive = false;
        p.stackScore = p.stackHeight * 10;
        p.status = "TOWER COLLAPSED · " + p.stackHeight + " LAYERS";
        sfx("bump");
        refreshPlayerPanels();
        advanceStackTurn();
        return;
      }
      const perfect = Math.abs((game.stackX + movingWidth / 2) - (top.x + top.width / 2)) <= 6;
      p.stackLayers.push({ x: left, width: overlap, colorIndex: pIndex });
      p.stackHeight++;
      p.stackDrops++;
      p.stackWidth = overlap;
      p.stackScore += 10 + (perfect ? 8 : 0);
      p.status = perfect ? "PERFECT STACK! +18" : "STACK " + p.stackHeight + " · +" + 10;
      game.stackSpeed += 16;
      sfx(perfect ? "combo" : "place", pIndex * 16);
      if (p.stackHeight >= 8) {
        p.status = "TOWER COMPLETE!";
        p.stackScore += 35;
        sfx("win");
        renderGame();
        advanceStackTurn();
        return;
      }
      game.stackDirection *= -1;
      game.stackX = game.stackDirection > 0 ? 32 : Math.max(32, 728 - p.stackWidth);
      renderGame();
      return;
    } else if (game.id === "reflex_rush") {
      if (p.responded) return;
      p.responded = true;
      if (game.phase === "reflex_wait") {
        p.reaction = -1;
        p.status = "FALSE START!";
        beep(150, 0.16, "sawtooth");
      } else {
        p.reaction = Math.round(performance.now() - (game.startedGoAt || 0));
        p.status = p.reaction + " MS";
        beep(690, 0.05, "triangle");
        if (allReflexResponded()) finishRound();
      }
    } else if (game.id === "dodge_arena") {
      if (game.phase === "dodge_live") {
        if (!p.dodged) { p.dodged = true; p.status = "NICE DODGE!"; beep(520, 0.05, "triangle"); }
      } else if (game.phase === "dodge_ready" && !p.early) {
        p.early = true;
        p.misses++;
        p.status = "TOO EARLY!";
      }
    }
    refreshPlayerPanels();
  }
  function colorAction(pIndex, colorIndex) {
    if (!game || currentScreen !== "game") return;
    const p = game.players[pIndex];
    if (!p) return;
    if (game.id === "target_rush" && game.timeLeft > 0) {
      if (colorIndex === game.target) {
        p.hits++;
        p.status = "HIT! " + p.hits;
        beep(500 + colorIndex * 90, 0.04, "triangle");
      } else {
        p.misses++;
        p.status = "MISS!";
        beep(180, 0.04, "sawtooth");
      }
    } else if (game.id === "memory_grid" && game.phase === "memory_input" && game.memoryPlayer === pIndex && !p.done) {
      if (colorIndex === game.sequence[p.memoryInput]) {
        p.memoryInput++;
        p.memoryScore = p.memoryInput;
        p.status = "MATCH " + p.memoryInput + "/" + game.sequence.length;
        beep(420 + colorIndex * 120, 0.08, "sine");
        if (p.memoryInput >= game.sequence.length) {
          p.done = true;
          p.status = "PERFECT MEMORY!";
          game.phase = "memory_switch";
          game.phaseTimer = 0.75;
          beep(900, 0.13, "triangle");
        }
      } else {
        p.done = true;
        p.status = "SCORE: " + p.memoryInput;
        game.phase = "memory_switch";
        game.phaseTimer = 0.75;
        beep(160, 0.12, "triangle");
      }
      renderGame();
      return;
    } else return;
    refreshPlayerPanels();
  }
  function refreshPlayerPanels() {
    game.players.forEach(function (p, i) {
      const status = document.getElementById("player-status-" + i);
      const score = document.getElementById("player-mini-score-" + i);
      if (status) status.textContent = p.status;
      if (score) score.textContent = miniScore(p, game.id);
      if (game.id === "mini_racers") updateRaceTrack();
    });
    if (game.id === "tap_sprint") {
      const count = document.getElementById("arena-count");
      if (count) count.textContent = game.players.reduce(function (sum, p) { return sum + p.taps; }, 0) + " TAPS";
    }
    if (game.id === "block_battle") {
      const player = game.players[game.activePuzzlePlayer];
      const score = document.getElementById("block-score-live"), lines = document.getElementById("block-lines-live");
      if (score) score.textContent = "SCORE " + player.blockScore;
      if (lines) lines.textContent = player.blockLines + " LINES CLEARED";
    }
  }
  function updateRaceTrack() {
    if (!game || game.id !== "mini_racers") return;
    const roadLeft = 120, roadWidth = 560, laneWidth = roadWidth / settings.players;
    game.players.forEach(function (p, i) {
      const center = roadLeft + (i + 0.5) * laneWidth;
      const car = document.getElementById("race-car-" + i);
      if (car) {
        car.setAttribute("transform", "translate(" + (center + p.raceSteer * laneWidth * 0.34) + " 270)");
        car.classList.toggle("car-moving", p.raceSpeed > 4);
        car.classList.toggle("car-boost", p.raceSpeed > 65 || performance.now() < p.boostFlash);
        car.classList.toggle("car-crashed", performance.now() < p.raceCrashUntil);
      }
    });
    (game.raceTraffic || []).forEach(function (trafficCar) {
      const lane = game.players[trafficCar.lane] ? trafficCar.lane : 0;
      const cx = roadLeft + (lane + 0.5) * laneWidth + trafficCar.offset * laneWidth * 0.34;
      const el = document.getElementById("traffic-car-" + trafficCar.id);
      if (el) {
        el.setAttribute("transform", "translate(" + cx + " " + trafficCar.y + ")");
        el.classList.toggle("traffic-resolved", !!trafficCar.resolved);
      }
    });
    const roadMarks = document.getElementById("road-dash-marks");
    if (roadMarks) roadMarks.setAttribute("transform", "translate(0 " + game.roadScroll + ")");
    const hud = document.getElementById("race-hud-status");
    if (hud) {
      const leader = game.players.reduce(function (best, p, i, arr) {
        const bestValue = arr[best].progress + arr[best].cleanPasses * 22 - arr[best].misses * 18;
        const value = p.progress + p.cleanPasses * 22 - p.misses * 18;
        return value > bestValue ? i : best;
      }, 0);
      hud.textContent = "P" + (leader + 1) + " LEADS · " + Math.round(game.players[leader].progress) + " M";
    }
    const level = document.getElementById("race-level");
    if (level) {
      const names = ["EASY TRAFFIC", "TRAFFIC PICKING UP", "BUSY ROAD", "HEAVY TRAFFIC", "MAX RUSH", "FINAL RUSH"];
      level.textContent = "LEVEL " + (game.raceDifficulty + 1) + " · " + (names[Math.min(names.length - 1, game.raceDifficulty)] || "MAX RUSH");
    }
    const clean = document.getElementById("race-clean-passes");
    if (clean) clean.textContent = game.players.reduce(function (sum, p) { return sum + p.cleanPasses; }, 0) + " CLEAN PASSES";
  }
  function updateStackTower() {
    if (!game || game.id !== "stack_tower") return;
    const block = document.getElementById("stack-moving-block");
    if (block) {
      block.setAttribute("x", String(game.stackX));
      block.setAttribute("width", String(game.players[game.activeStackPlayer].stackWidth));
    }
    const level = document.getElementById("stack-height-live");
    if (level) level.textContent = "LAYER " + game.players[game.activeStackPlayer].stackHeight + " / 8";
  }
  function advanceStackTurn() {
    if (!game || game.id !== "stack_tower" || currentScreen !== "game") return;
    const current = game.players[game.activeStackPlayer];
    if (current.stackAlive && current.stackHeight < 8) current.status = "TIME UP · " + current.stackHeight + " LAYERS";
    game.activeStackPlayer++;
    if (game.activeStackPlayer >= game.players.length) { finishRound(); return; }
    const player = game.players[game.activeStackPlayer];
    game.timeLeft = game.duration;
    game.stackDirection = Math.random() < 0.5 ? 1 : -1;
    game.stackX = game.stackDirection > 0 ? 32 : Math.max(32, 728 - player.stackWidth);
    game.stackSpeed = 235 + player.stackHeight * 20;
    player.status = "YOUR TURN · DROP AT THE RIGHT MOMENT";
    renderGame();
  }
  function resultScores() {
    return game.players.map(function (p) {
      if (game.id === "tap_sprint") return p.taps + p.comboBonus;
      if (game.id === "reflex_rush") return p.reaction === null ? -2000 : (p.reaction < 0 ? -1000 : 10000 - p.reaction);
      if (game.id === "memory_grid") return p.memoryScore;
      if (game.id === "mini_racers") return Math.max(0, Math.round(p.progress) + p.cleanPasses * 48 - p.misses * 34);
      if (game.id === "dodge_arena") return p.hits * 2 - p.misses;
      if (game.id === "target_rush") return p.hits * 2 - p.misses;
      if (game.id === "block_battle") return p.blockScore;
      if (game.id === "orb_dash") return p.hits * 10;
      if (game.id === "star_snatch") return p.hits * 10 - p.misses * 3;
      if (game.id === "stack_tower") return p.stackScore + p.stackHeight * 10;
      return 0;
    });
  }

  function scoreText(p, id) {
    if (id === "tap_sprint") return p.taps + " taps · " + p.comboBonus + " combo bonus";
    if (id === "reflex_rush") return p.reaction === null ? "Too slow" : (p.reaction < 0 ? "False start" : p.reaction + " ms");
    if (id === "memory_grid") return p.memoryScore + " / " + (game ? game.sequence.length : 5) + " remembered";
    if (id === "mini_racers") return Math.round(p.progress) + " m · " + p.cleanPasses + " clean passes · " + p.misses + " collisions";
    if (id === "block_battle") return p.blockScore + " points · " + p.blockLines + " lines cleared";
    if (id === "orb_dash") return p.hits * 10 + " gem points";
    if (id === "star_snatch") return p.hits + " stars caught · " + p.misses + " mistimed taps";
    if (id === "stack_tower") return p.stackHeight + " layers · " + p.stackScore + " stack points";
    if (id === "dodge_arena") return p.hits + " dodges · " + p.misses + " missed";
    return p.hits + " hits · " + p.misses + " misses";
  }

  function miniScore(p, id) {
    if (id === "tap_sprint") return p.taps + " taps · " + p.comboBonus + " bonus";
    if (id === "mini_racers") return Math.round(p.progress) + " m · " + p.cleanPasses + " passes · " + p.misses + " crashes";
    if (id === "block_battle") return p.blockScore + " points · " + p.blockLines + " lines";
    if (id === "orb_dash") return p.hits * 10 + " points";
    if (id === "star_snatch") return p.hits + " stars · " + p.misses + " misses";
    if (id === "stack_tower") return p.stackHeight + " layers · " + p.stackScore + " pts";
    if (id === "reflex_rush") return p.reaction !== null && p.reaction >= 0 ? p.reaction + " ms" : p.status;
    if (id === "memory_grid") return p.memoryScore + " matched";
    if (id === "dodge_arena") return p.hits + " dodges";
    return p.hits + " hits";
  }

  function finishRound() {
    if (!game || currentScreen !== "game") return;
    stopTick();
    joystickPointerOwners.clear(); racePointerOwners.clear();
    const scores = resultScores();
    game.players.forEach(function (p, i) { p.score = scores[i]; });
    const ranks = rankPlayers(scores);
    const points = game.players.map(function (p, i) {
      const rank = scores.filter(function (other) { return other > scores[i]; }).length;
      const pts = rank === 0 ? 3 : (rank === 1 ? 2 : (rank === 2 ? 1 : 0));
      return pts;
    });
    if (game.tournament && tournament) {
      points.forEach(function (pts, i) { tournament.scores[i] += pts; });
    }
    game.resultScores = scores;
    game.points = points;
    game.ranks = ranks;
    currentScreen = "result";
    sfx("win");
    renderResult();
  }

  function renderArenaContent() {
    const id = game.id;
    let bg = game.data.soft;
    let html = "";
    if (id === "tap_sprint") {
      html = '<div class="arena-symbols">● ● ● ● ●</div><div class="arena-big" id="arena-count">' + game.players.reduce(function (s,p){return s+p.taps;},0) + ' TAPS</div><h2>FASTEST FINGERS WIN</h2><p>Tap your color panel as fast as you can.</p>';
    } else if (id === "reflex_rush") {
      const ready = game.phase === "reflex_go";
      html = '<div class="arena-big" id="arena-state" style="color:' + (ready ? "#1cb97d" : "#ff6c84") + '">' + (ready ? "GO!" : "WAIT…") + '</div><h2>' + (ready ? "TAP NOW!" : "DON’T JUMP THE GUN") + '</h2><p>' + (ready ? 'React before the timer runs out. <b id="reflex-countdown">3.0s</b>' : "The signal will change without warning.") + '</p><div class="arena-grid"><span class="arena-tile" style="background:#ff6c84"></span><span class="arena-tile" style="background:#ffe16b"></span><span class="arena-tile ' + (ready ? 'lit' : '') + '" style="background:#47c995"></span></div>';
    } else if (id === "memory_grid") {
      let tiles = "";
      for (let c = 0; c < 4; c++) {
        const lit = game.phase === "memory_show" && game.sequence[game.showIndex] === c && game.showIndex >= 0;
        tiles += '<span class="arena-tile ' + (lit ? "lit" : "") + '" style="background:' + colors[c] + ';opacity:' + (game.phase === "memory_show" && game.showIndex >= 0 && game.sequence[game.showIndex] !== c ? ".35" : "1") + '"></span>';
      }
      html = '<div class="arena-big">' + (game.phase === "memory_show" ? "WATCH!" : (game.phase === "memory_input" ? "YOUR TURN" : "NICE TRY")) + '</div><h2>' + (game.phase === "memory_show" ? "MEMORIZE THE PATTERN" : "REPEAT IT IN ORDER") + '</h2><p>Player ' + (game.memoryPlayer + 1) + " out of " + settings.players + '</p><div class="arena-grid">' + tiles + '</div>';
    } else if (id === "mini_racers") {
      const roadLeft = 120, roadWidth = 560, laneWidth = roadWidth / settings.players;
      const laneLines = Array.from({ length: settings.players - 1 }, function (_, i) {
        const x = roadLeft + laneWidth * (i + 1);
        return '<path d="M' + x + ' 0 V380" stroke="#EAF0FF" stroke-width="3" stroke-dasharray="24 22" opacity=".48"/>';
      }).join("");
      const roadside = Array.from({ length: 10 }, function (_, i) {
        const y = -50 + i * 72;
        return '<g><rect x="128" y="' + y + '" width="9" height="34" rx="3" fill="#FFE27A"/><rect x="663" y="' + y + '" width="9" height="34" rx="3" fill="#FFE27A"/></g>';
      }).join("");
      const playerCars = game.players.map(function (p, i) {
        const center = roadLeft + (i + 0.5) * laneWidth;
        const x = center + p.raceSteer * laneWidth * 0.34;
        const carName = ["car_red_1.png", "car_blue_1.png", "car_green_1.png", "car_black_1.png"][i];
        const crashed = performance.now() < p.raceCrashUntil;
        return '<g id="race-car-' + i + '" class="race-car' + (p.raceSpeed > 48 ? ' car-boost' : '') + (crashed ? ' car-crashed' : '') + '" transform="translate(' + x + ' 270)">' +
          '<ellipse cx="0" cy="25" rx="23" ry="9" fill="#020816" opacity=".38"/>' +
          '<image href="' + racingAsset(carName) + '" x="-24" y="-35" width="48" height="66" preserveAspectRatio="xMidYMid meet"/>' +
          '<circle cx="0" cy="-23" r="10" fill="' + colors[i] + '" stroke="#FFFFFF" stroke-width="2"/><text x="0" y="-19" font-size="10" text-anchor="middle" font-weight="1000" fill="#18203A">' + (i + 1) + '</text>' +
          '<path class="race-crash-flash" d="M-35 -5 L-21 -1 M35 -5 L21 -1" stroke="#FF5D7D" stroke-width="4" stroke-linecap="round"/></g>';
      }).join("");
      const traffic = (game.raceTraffic || []).map(function (car) {
        if (car.y < -90 || car.y > 420) return "";
        const cx = roadLeft + (car.lane + 0.5) * laneWidth + car.offset * laneWidth * 0.34;
        const carFiles = { red: "car_red_2.png", blue: "car_blue_2.png", green: "car_green_2.png", black: "car_black_2.png" };
        const file = carFiles[car.color] || carFiles.blue;
        return '<g id="traffic-car-' + car.id + '" class="traffic-car' + (car.resolved ? " traffic-resolved" : "") + '" transform="translate(' + cx + ' ' + car.y + ')"><ellipse cx="0" cy="19" rx="22" ry="7" fill="#030918" opacity=".32"/><image href="' + racingAsset(file) + '" x="-22" y="-31" width="44" height="61" preserveAspectRatio="xMidYMid meet"/><path d="M-13 -14 H13" stroke="#FFFFFF" stroke-width="2" opacity=".65"/></g>';
      }).join("");
      html = '<div class="race-scene"><div class="race-scene-hud"><span>🚦 TRAFFIC RUSH</span><span id="race-hud-status">STEER TO DODGE · PUSH UP TO ACCELERATE</span></div>' +
        '<div class="race-scene-hud race-sub-hud"><span id="race-level">LEVEL 1 · EASY TRAFFIC</span><span id="race-clean-passes">0 CLEAN PASSES</span></div>' +
        '<svg id="race-track" class="race-track traffic-track" viewBox="0 0 800 380" role="img" aria-label="Vertical scrolling traffic race with cars to dodge" preserveAspectRatio="xMidYMid meet">' +
        '<defs><linearGradient id="raceGrass" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#247C68"/><stop offset="1" stop-color="#0E5148"/></linearGradient><linearGradient id="raceRoad" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#171F34"/><stop offset=".5" stop-color="#2B354C"/><stop offset="1" stop-color="#171F34"/></linearGradient><pattern id="roadTexture" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 24 L24 0" stroke="#FFFFFF" stroke-width="1" opacity=".035"/></pattern></defs>' +
        '<rect width="800" height="380" rx="18" fill="url(#raceGrass)"/><rect x="92" y="-4" width="616" height="388" rx="9" fill="#F6F8FC" opacity=".1"/><rect x="120" y="0" width="560" height="380" fill="url(#raceRoad)"/><rect x="120" y="0" width="560" height="380" fill="url(#roadTexture)"/>' +
        '<path d="M120 0V380 M680 0V380" stroke="#FFE27A" stroke-width="5"/>' + laneLines +
        '<g id="road-dash-marks">' + roadside + '</g>' +
        '<path d="M100 0V380 M700 0V380" stroke="#D0D8E9" stroke-width="3" stroke-dasharray="10 10" opacity=".24"/>' +
        traffic + playerCars + '</svg><div class="race-bottom-tip">The road gets busier every 5 seconds. Change lanes early, not at the last second.</div></div>';
    } else if (id === "stack_tower") {
      const player = game.players[game.activeStackPlayer];
      const layerMarkup = player.stackLayers.map(function (layer, index) {
        const y = 242 - index * 22;
        const tileColor = colors[(game.activeStackPlayer + index) % colors.length];
        return '<g class="stack-layer"><rect x="' + layer.x + '" y="' + y + '" width="' + layer.width + '" height="19" rx="4" fill="' + tileColor + '" stroke="#FFFFFF" stroke-width="1.5"/><path d="M' + (layer.x + 6) + ' ' + (y + 4) + ' H' + (layer.x + layer.width - 6) + '" stroke="#FFFFFF" stroke-width="2" opacity=".45"/></g>';
      }).join("");
      const movingY = 242 - player.stackHeight * 22;
      html = '<div class="stack-scene"><div class="stack-hud"><span class="stack-kicker">STACK TOWER · PLAYER ' + (game.activeStackPlayer + 1) + '</span><span id="stack-height-live">LAYER ' + player.stackHeight + ' / 8</span></div><strong>Line up the block. Drop on the beat.</strong><p>Only the overlap stays. Perfect alignment earns bonus points.</p><svg class="stack-track" viewBox="0 0 760 280" role="img" aria-label="Stack Tower moving block timing game"><defs><linearGradient id="stackSky" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17234B"/><stop offset="1" stop-color="#463990"/></linearGradient><linearGradient id="stackFloor" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#495B83"/><stop offset="1" stop-color="#253455"/></linearGradient></defs><rect width="760" height="280" rx="20" fill="url(#stackSky)"/><path d="M0 55H760M0 100H760M0 145H760M0 190H760M0 235H760" stroke="#FFFFFF" stroke-width="1" opacity=".07"/><path d="M80 0V280M160 0V280M240 0V280M320 0V280M400 0V280M480 0V280M560 0V280M640 0V280M720 0V280" stroke="#FFFFFF" stroke-width="1" opacity=".05"/>' + layerMarkup + '<rect id="stack-moving-block" x="' + game.stackX + '" y="' + movingY + '" width="' + player.stackWidth + '" height="19" rx="4" fill="' + colors[game.activeStackPlayer] + '" stroke="#FFFFFF" stroke-width="2"/><path d="M30 261H730" stroke="#A5B8E8" stroke-width="3" stroke-linecap="round" opacity=".48"/><circle cx="30" cy="261" r="5" fill="#FFE27A"/><circle cx="730" cy="261" r="5" fill="#FFE27A"/></svg><div class="stack-tip">Each player gets up to eight drops. A tiny overlap will collapse the tower.</div></div>';
    } else if (id === "block_battle") {
      const player = game.players[game.activePuzzlePlayer];
      const cursor = player.blockCursor || { row: 3, col: 3 };
      const activePiece = player.blockPieces[game.selectedPiece];
      const ghostCells = new Set();
      const ghostFits = !!activePiece && !activePiece.used && blockPieceFits(player.board, activePiece, cursor.col, cursor.row);
      if (activePiece && !activePiece.used) activePiece.cells.forEach(function (cell) {
        const x = cursor.col + cell[0], y = cursor.row + cell[1];
        if (x >= 0 && x < 8 && y >= 0 && y < 8) ghostCells.add(y * 8 + x);
      });
      const placed = new Set(player.lastPlaced || []);
      const cleared = new Set(player.lastCleared || []);
      const boardCells = player.board.map(function (value, index) {
        const row = Math.floor(index / 8), col = index % 8;
        const classes = ["block-cell"];
        if (value !== null) classes.push("filled");
        if (ghostCells.has(index)) classes.push(ghostFits ? "ghost-valid" : "ghost-invalid");
        if (cursor.row === row && cursor.col === col) classes.push("cursor-anchor");
        if (placed.has(index) && value !== null) classes.push("place-pop");
        if (cleared.has(index) && value === null) classes.push("line-flash");
        const tileTextures = ["element_red_square_glossy.png","element_blue_square_glossy.png","element_yellow_square_glossy.png","element_green_square_glossy.png"];
        const tileIndex = value !== null ? value : (ghostCells.has(index) && activePiece ? activePiece.colorIndex : -1);
        const ghostColor = tileIndex >= 0 ? colors[tileIndex] : "";
        const bgStyle = tileIndex >= 0 ? ' style="--block-color:' + ghostColor + ';--block-sprite:url(' + puzzleAsset(tileTextures[tileIndex]) + ')"' : "";
        const bgStyle = ghostColor ? ' style="--block-color:' + ghostColor + '"' : "";
        return '<button class="' + classes.join(" ") + '"' + bgStyle + ' data-action="block-place" data-row="' + row + '" data-col="' + col + '" aria-label="Row ' + (row + 1) + ', column ' + (col + 1) + '"></button>';
      }).join("");
      player.lastPlaced = [];
      player.lastCleared = [];
      const tray = player.blockPieces.map(function (piece, index) {
        const maxX = Math.max.apply(null, piece.cells.map(function (c) { return c[0]; })) + 1;
        const maxY = Math.max.apply(null, piece.cells.map(function (c) { return c[1]; })) + 1;
        const spans = piece.cells.map(function (cell) {
          return '<span style="grid-column:' + (cell[0] + 1) + ';grid-row:' + (cell[1] + 1) + ';--block-color:' + colors[piece.colorIndex] + '"></span>';
        }).join("");
        return '<button class="block-piece-button' + (piece.used ? " used" : (game.selectedPiece === index ? " chosen" : "")) + '" data-action="block-piece" data-piece="' + index + '"' + (piece.used ? " disabled" : "") + '><span class="piece-caption">' + (piece.used ? "PLACED" : (game.selectedPiece === index ? "SELECTED" : "SHAPE " + (index + 1))) + '</span><span class="piece-preview" style="grid-template-columns:repeat(' + maxX + ',16px);grid-template-rows:repeat(' + maxY + ',16px)">' + spans + '</span></button>';
      }).join("");
      html = '<div class="block-game-layout"><div class="block-game-intro"><span class="block-kicker">BLOCK BATTLE · PLAYER ' + (game.activePuzzlePlayer + 1) + '</span><strong>Build smart. Rotate freely. Clear big.</strong><span>Every fresh rack has legal options for the current board. Tap any cell to place, or use Smart Move for the strongest placement.</span></div><div class="block-game-main"><div class="block-board" role="grid" aria-label="8 by 8 block puzzle board">' + boardCells + '</div><div class="block-side-panel"><div class="block-piece-tray">' + tray + '</div><div class="block-tools"><button data-action="block-rotate" class="block-tool-button">↻ ROTATE</button><button data-action="block-hint" class="block-tool-button smart">✦ SMART MOVE</button><button data-action="block-place-cursor" class="block-tool-button place">PLACE PIECE</button></div></div></div><div class="block-game-footer"><span id="block-score-live">SCORE ' + player.blockScore + '</span><span id="block-lines-live">' + player.blockLines + ' LINES CLEARED</span><span>STREAK ×' + Math.max(1, player.blockStreak) + '</span><span>PASS DEVICE AFTER YOUR TURN</span></div></div>';
    } else if (id === "orb_dash") {
      const orbs = game.players.map(function (p, i) { return '<span class="orb-player" id="orb-player-' + i + '" style="--orb-color:' + colors[i] + ';left:' + p.orbX + '%;top:' + p.orbY + '%"><span>' + (i + 1) + '</span></span>'; }).join("");
      html = '<div class="orb-dash-layout"><div class="orb-dash-heading"><div><span class="orb-kicker">ORBIT ARENA</span><strong>Grab the gems!</strong><small>Move with your joystick. Every gem is worth 10 points.</small></div><span class="orb-leader" id="orb-leader">P1 LEADS · 0 PTS</span></div><div class="orb-arena-field" id="orb-arena-field"><span class="orb-gem" id="orb-gem" style="left:' + game.orbTarget.x + '%;top:' + game.orbTarget.y + '%">✦</span>' + orbs + '</div><div class="orb-arena-note">Keep moving, collect the gold gem, and beat your friends to the next one.</div></div>';
    } else if (id === "star_snatch") {
      html = '<div class="star-snatch-scene"><div class="star-snatch-hud"><span class="star-snatch-kicker">STAR SNATCH</span><span id="star-level">SPEED 1</span></div><div class="arena-big star-score-live" id="star-score-live">CATCH THE STAR ✦</div><h2>Tap when the star crosses the gold zone</h2><p>Early and late taps cost points. Timing gets quicker every five seconds.</p><div class="star-meter"><span class="star-target-zone"></span><span class="star-center-line"></span><span class="star-cursor" id="star-cursor" style="left:' + game.starX + '%"><img src="' + puzzleAsset("particleCartoonStar.png") + '" alt="" draggable="false"></span></div><div class="star-meter-legend"><span>TOO EARLY</span><span>PERFECT ZONE</span><span>TOO LATE</span></div></div>';
    } else if (id === "dodge_arena") {
      html = '<div class="arena-big" style="color:' + (game.phase === "dodge_live" ? "#168e64" : "#dba23a") + '">' + (game.phase === "dodge_live" ? "DODGE!" : "READY?") + '</div><h2>' + (game.phase === "dodge_live" ? "TAP BEFORE THE WAVE HITS" : "WAIT FOR THE SIGNAL") + '</h2><p>WAVE ' + game.wave + ' / 8 · One chance per wave.</p><div class="arena-symbols">' + (game.phase === "dodge_live" ? "⚡ 🌀 ⚡" : "◌ ◌ ◌") + '</div>';
    } else {
      html = '<div class="arena-big">MATCH THIS!</div><h2>COLOR TARGET</h2><p>Tap the same color in your panel.</p><div class="arena-grid"><span class="arena-tile" id="target-display" style="width:65px;height:65px;font-weight:1000;display:grid;place-items:center;background:' + colors[game.target] + ';color:' + (game.target === 2 ? ink : "#fff") + '">' + ["R","B","Y","G"][game.target] + '</span></div><p style="margin-top:10px;font-weight:1000;color:' + game.data.color + '" id="target-label">' + ["RED","BLUE","YELLOW","GREEN"][game.target] + '</p>';
    }
    const arenaClass = ({ tap_sprint: " tap-arena", reflex_rush: " reflex-arena", memory_grid: " memory-arena", mini_racers: " racing-arena", dodge_arena: " dodge-arena", target_rush: " target-arena", block_battle: " block-arena", orb_dash: " orb-arena", star_snatch: " star-arena", stack_tower: " stack-arena" })[id] || "";
    return '<div class="arena' + arenaClass + '" style="--arena-bg:' + bg + ';--arena-dot:' + game.data.color + '"><div class="arena-pattern"></div><div class="arena-center">' + html + '</div></div>';
  }
  function renderGame() {
    currentScreen = "game";
    if (!game) { renderHome(); return; }
    const g = game.data;
    const isTimed = game.timeLeft !== null;
    const tournamentRibbon = game.tournament && tournament ? '<div class="tournament-ribbon"><span class="tournament-ribbon-label">TOURNAMENT · ROUND ' + game.round + ' / ' + tournament.rounds + '</span>' + game.players.map(function (p, i) { return '<span class="tournament-ribbon-score" style="--ribbon-color:' + colors[i] + '">P' + (i + 1) + ' <b>' + tournament.scores[i] + '</b></span>'; }).join('') + '</div>' : '';
    root.innerHTML = '<div class="game-shell">' +
      '<div class="game-top"><button class="back-button" data-action="game-menu">← GAMES</button><div class="game-heading"><h1>' + g.title + '</h1><p>' + (game.tournament ? "TOURNAMENT · ROUND " + game.round + " / " + tournament.rounds : "QUICK PLAY · " + g.category) + '</p></div><div class="game-top-right">' + (isTimed ? '<span class="timer-chip" id="timer-value">' + fmtTime(game.timeLeft) + '</span>' : '<button class="sound-chip" data-action="sound">♫ SOUND</button>') + '</div></div>' +
      tournamentRibbon +
      '<div class="game-board">' + renderArenaContent() +
      '<div class="player-grid ' + (game.id === "block_battle" ? "block-score-panels" : (game.id === "orb_dash" ? "orb-player-panels" : "")) + '">' + game.players.map(function (p, i) {
        const activeMemory = game.id === "memory_grid" && game.phase === "memory_input" && game.memoryPlayer === i;
        const activePuzzle = game.id === "block_battle" && game.activePuzzlePlayer === i;
        const activeStack = game.id === "stack_tower" && game.activeStackPlayer === i;
        const disabledMemory = game.id === "memory_grid" && !activeMemory;
        return '<section class="player-panel ' + ((activeMemory || activePuzzle || activeStack) ? "active-turn" : "") + '" style="--player-color:' + colors[i] + ';--player-soft:' + softColors[i] + ';--player-border:' + colors[i] + '55">' +
          '<div class="player-id"><div class="player-badge"><i class="player-dot"></i>' + playerName(i) + (activePuzzle ? ' <span class="active-tag">YOUR TURN</span>' : '') + '</div><div class="player-status" id="player-status-' + i + '">' + escapeText(p.status) + '</div><div class="player-points" id="player-mini-score-' + i + '">' + miniScore(p, game.id) + (game.tournament ? " · TOUR " + tournament.scores[i] + " PTS" : "") + '</div></div>' +
          (game.id === "block_battle" ? (activePuzzle ?
            '<div class="puzzle-player-badge">YOUR PUZZLE<br>Tap or drag pieces above</div>' :
            '<div class="puzzle-player-badge">UP NEXT<br>BOARD READY</div>') :
            (game.id === "orb_dash" ? '<button class="joystick-control orb-stick" data-action="joystick" data-player="' + i + '" aria-label="Move ' + playerName(i) + '"><span class="joystick-ring"></span><span class="joystick-knob"></span><span class="joystick-hint">STEER</span></button>' :
            (game.id === "mini_racers" ? '<div class="panel-controls race-controls"><button class="action-button race-boost-button" data-action="player" data-player="' + i + '">NITRO<br>BOOST</button><button class="joystick-control race-stick" data-action="joystick" data-player="' + i + '" aria-label="Steer and accelerate ' + playerName(i) + '"><span class="joystick-ring"></span><span class="joystick-knob"></span><span class="joystick-hint">STEER</span></button></div>' :
            ((game.id === "memory_grid" || game.id === "target_rush") ?
              '<div class="color-actions">' + colors.map(function (c, ci) { return '<button class="color-button" data-action="color" data-player="' + i + '" data-color="' + ci + '" style="background:' + c + ';color:' + (ci === 2 ? ink : "#fff") + '" ' + (disabledMemory ? "disabled" : "") + '>' + ["R","B","Y","G"][ci] + '</button>'; }).join("") + '</div>' :
            (game.id === "stack_tower" ? '<button class="action-button stack-drop-button" data-action="player" data-player="' + i + '" ' + (activeStack ? "" : "disabled") + '>' + (activeStack ? "DROP BLOCK" : "WAIT TURN") + '</button>' :
              '<button class="action-button ' + (i === 2 ? "soft-text" : "") + '" data-action="player" data-player="' + i + '">' + (game.id === "tap_sprint" ? "TAP FAST!" : game.id === "dodge_arena" ? "DODGE NOW!" : game.id === "star_snatch" ? "SNATCH STAR!" : "TAP ON GO!") + '</button>'))))) +
        '</section>';
      }).join("") + '</div><div class="game-tip">' + (game.id === "memory_grid" ? "Pass the phone: each player gets a turn to repeat the sequence." : (game.id === "mini_racers" ? "Push UP to accelerate, steer left or right around cones, and tap NITRO BOOST for a burst. First across the finish line wins!" : (game.id === "block_battle" ? "Take turns with your own puzzle board. Clear complete rows and columns to earn bonus points." : (game.id === "orb_dash" ? "Drag your player joystick to move in any direction. Collect ✦ gems for 10 points each." : (game.id === "star_snatch" ? "Tap SNATCH STAR when the moving star enters the gold target zone." : (game.id === "stack_tower" ? "Take turns dropping moving blocks. Precise overlaps build a taller tower." : "Everybody plays on one screen. Tap only your own player panel.")))))) + '</div></div></div>';
    if (game.id === "reflex_rush" && game.phase === "reflex_go") {
      game.startedGoAt = performance.now();
    }
    updateSoundButton();
  }

  function renderResult() {
    currentScreen = "result";
    const ranks = game.ranks || rankPlayers(game.resultScores || []);
    const finalRound = game.tournament && tournament && tournament.round >= tournament.rounds;
    root.innerHTML = '<div class="result-wrap"><div class="result-card">' +
      '<div class="result-banner"><div class="mini-eyebrow">✦ ROUND COMPLETE ✦</div><h1>' + (game.tournament ? "POINTS ON THE BOARD" : "THAT WAS A CLOSE ONE") + '</h1><p>' + game.data.title + (game.tournament ? " · Round " + tournament.round + " of " + tournament.rounds : " · Quick play") + '</p></div>' +
      ranks.map(function (row, rank) {
        const p = game.players[row.index];
        return '<div class="result-row" style="--player-color:' + colors[row.index] + ';--player-soft:' + softColors[row.index] + '"><div class="rank-pill">' + (rank + 1) + '</div><div><div class="result-player">' + playerName(row.index) + '</div><div class="result-detail">' + escapeText(scoreText(p, game.id)) + '</div></div><div class="result-score">' + (Number.isFinite(row.score) ? Math.round(row.score) : "—") + '</div>' + (game.tournament ? '<div class="points-badge">+' + game.points[row.index] + ' PTS</div>' : '') + '</div>';
      }).join("") +
      '<div class="result-actions">' +
        (game.tournament ? '<button class="primary-button" data-action="' + (finalRound ? "final" : "next-round") + '">' + (finalRound ? "SEE CHAMPION →" : "NEXT ROUND →") + '</button>' : '<button class="primary-button" data-action="rematch">REMATCH →</button>') +
        '<button class="secondary-button" data-action="game-menu">BACK TO GAMES</button>' +
      '</div></div></div>';
  }
  function renderFinal() {
    stopTick();
    currentScreen = "final";
    if (!tournament) { renderHome(); return; }
    const ranks = rankPlayers(tournament.scores);
    const winner = ranks[0] ? ranks[0].index : 0;
    root.innerHTML = '<div class="result-wrap"><div class="result-card">' +
      '<div class="result-banner final-banner"><div class="final-trophy">🏆</div><div class="mini-eyebrow">✦ THAT’S A WRAP ✦</div><h1>' + (settings.players === 1 ? "RUN COMPLETE!" : playerName(winner) + " TAKES THE CROWN!") + '</h1><p>' + tournament.rounds + ' rounds played · The party has a champion.</p></div>' +
      ranks.map(function (row, rank) {
        return '<div class="result-row" style="--player-color:' + colors[row.index] + ';--player-soft:' + softColors[row.index] + '"><div class="rank-pill">' + (rank + 1) + '</div><div><div class="result-player">' + playerName(row.index) + '</div><div class="result-detail">' + (rank === 0 ? "THE CHAMPION" : "GREAT RUN") + '</div></div><div class="result-score">' + row.score + ' PTS</div><div></div></div>';
      }).join("") +
      '<div class="result-actions"><button class="primary-button" data-action="start-tournament">RUN IT BACK →</button><button class="secondary-button" data-action="game-menu">BACK TO GAMES</button></div></div></div>';
  }
  function updateSoundButton() {
    const btn = document.getElementById("sound-toggle");
    if (btn) {
      btn.classList.toggle("is-muted", !settings.sound);
      btn.textContent = settings.sound ? "♫" : "♪̸";
      btn.title = settings.sound ? "Turn sound off" : "Turn sound on";
    }
  }
  function handleAction(action, el) {
    if (action === "settings-close") closeSettingsModal();
    else if (action === "setting-theme") { settings.theme = el.dataset.value; saveSettings(); renderSettingsModal(); }
    else if (action === "setting-difficulty") { settings.difficulty = el.dataset.value; saveSettings(); renderSettingsModal(); }
    else if (action === "setting-sound") { settings.sound = !settings.sound; saveSettings(); renderSettingsModal(); }
    else if (action === "setting-motion") { settings.motion = !settings.motion; saveSettings(); renderSettingsModal(); }
    else if (action === "settings-reset") { settings.theme = "nebula"; settings.difficulty = "normal"; settings.motion = true; settings.sound = true; saveSettings(); renderSettingsModal(); }
    else if (action === "players") { settings.players = Number(el.dataset.value); saveSettings(); sfx("select"); renderHome(); }
    else if (action === "rounds") { settings.rounds = Number(el.dataset.value); saveSettings(); renderHome(); }
    else if (action === "play") renderGameSelect();
    else if (action === "block-piece") {
      if (game && game.id === "block_battle") {
        game.selectedPiece = Number(el.dataset.piece);
        const player = game.players[game.activePuzzlePlayer];
        const move = findBestBlockMove(player, game.selectedPiece);
        if (move) {
          orientBlockPiece(player.blockPieces[game.selectedPiece], move.rotation);
          player.blockCursor = { row: move.row, col: move.col };
        }
        sfx("select");
        renderGame();
      }
    }
    else if (action === "block-rotate") rotateSelectedBlock();
    else if (action === "block-hint") suggestBlockMove();
    else if (action === "block-place-cursor") releaseBlockCursor();
    else if (action === "block-place") placeBlockPiece(Number(el.dataset.row), Number(el.dataset.col));
    else if (action === "quick-play") startQuickGame(el.dataset.game);
    else if (action === "start-tournament") startTournament();
    else if (action === "home") { stopTick(); game = null; renderHome(); }
    else if (action === "game-menu") { stopTick(); game = null; renderGameSelect(); }
    else if (action === "player") playerAction(Number(el.dataset.player));
    else if (action === "color") colorAction(Number(el.dataset.player), Number(el.dataset.color));
    else if (action === "next-round") {
      if (tournament) { tournament.round++; startNextTournamentRound(); }
    }
    else if (action === "final") renderFinal();
    else if (action === "rematch") startQuickGame(game.id);
    else if (action === "sound") { settings.sound = !settings.sound; saveSettings(); updateSoundButton(); toast(settings.sound ? "Sound on" : "Sound off"); }
  }
  const racePointerOwners = new Map();
  const joystickPointerOwners = new Map();
  root.addEventListener("pointerdown", function (event) {
    const puzzlePiece = event.target.closest('[data-action="block-piece"]');
    if (puzzlePiece && root.contains(puzzlePiece) && currentScreen === "game" && game && game.id === "block_battle") {
      const pieceIndex = Number(puzzlePiece.dataset.piece);
      if (game.players[game.activePuzzlePlayer].blockPieces[pieceIndex] && !game.players[game.activePuzzlePlayer].blockPieces[pieceIndex].used) {
        game.selectedPiece = pieceIndex;
        activeBlockDrag = { pointerId: event.pointerId, pieceIndex: pieceIndex, button: puzzlePiece };
        puzzlePiece.classList.add("dragging");
        sfx("select");
      }
      return;
    }
    const stick = event.target.closest('[data-action="joystick"]');
    if (stick && root.contains(stick) && currentScreen === "game" && game) {
      const playerIndex = Number(stick.dataset.player);
      if (!game.players[playerIndex] || stick.disabled) return;
      const owner = { playerIndex: playerIndex, button: stick, gameId: game.id, acted: false, moved: false, lastDir: null, lastStepAt: 0 };
      joystickPointerOwners.set(event.pointerId, owner);
      const value = setJoystickValue(playerIndex, stick, event);
      if (value) applyJoystickInput(owner, value);
      if (game.id === "tap_sprint" || game.id === "reflex_rush" || game.id === "dodge_arena") {
        owner.acted = true;
        playerAction(playerIndex);
      }
      sfx("stick");
      event.preventDefault();
      if (stick.setPointerCapture) { try { stick.setPointerCapture(event.pointerId); } catch (e) {} }
      return;
    }
    const button = event.target.closest('[data-action="player"]');
    if (!button || !root.contains(button) || currentScreen !== "game" || !game || game.id !== "mini_racers") return;
    const playerIndex = Number(button.dataset.player);
    const player = game.players[playerIndex];
    if (!player) return;
    racePointerOwners.set(event.pointerId, playerIndex);
    player.throttleButtonHeld = true;
    player.throttle = true;
    button.classList.add("racing-active");
  });
  document.addEventListener("pointermove", function (event) {
    const owner = joystickPointerOwners.get(event.pointerId);
    if (owner) {
      const value = setJoystickValue(owner.playerIndex, owner.button, event);
      if (value) applyJoystickInput(owner, value);
      event.preventDefault();
      return;
    }
    if (activeBlockDrag && activeBlockDrag.pointerId === event.pointerId) {
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const cell = under && typeof under.closest === "function" ? under.closest('[data-action="block-place"]') : null;
      if (cell) updateBlockGhostAtCell(cell);
      event.preventDefault();
    } else if (currentScreen === "game" && game && game.id === "block_battle" && event.pointerType === "mouse") {
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const cell = under && typeof under.closest === "function" ? under.closest('[data-action="block-place"]') : null;
      if (cell) updateBlockGhostAtCell(cell);
    }
  }, { passive: false });
  document.addEventListener("pointerup", function (event) {
    releaseJoystick(event.pointerId, false);
    if (activeBlockDrag && activeBlockDrag.pointerId === event.pointerId) {
      const drag = activeBlockDrag;
      const under = document.elementFromPoint(event.clientX, event.clientY);
      const cell = under && typeof under.closest === "function" ? under.closest('[data-action="block-place"]') : null;
      if (drag.button) drag.button.classList.remove("dragging");
      if (cell && currentScreen === "game" && game && game.id === "block_battle") {
        game.selectedPiece = drag.pieceIndex;
        const player = game.players[game.activePuzzlePlayer];
        const beforeScore = player.blockScore;
        placeBlockPiece(Number(cell.dataset.row), Number(cell.dataset.col));
        if (player.blockScore === beforeScore) renderGame();
      } else if (currentScreen === "game" && game && game.id === "block_battle") {
        renderGame();
      }
      activeBlockDrag = null;
    }
  });
  document.addEventListener("pointercancel", function (event) {
    releaseJoystick(event.pointerId, true);
    if (activeBlockDrag && activeBlockDrag.pointerId === event.pointerId) {
      if (activeBlockDrag.button) activeBlockDrag.button.classList.remove("dragging");
      activeBlockDrag = null;
      if (currentScreen === "game" && game && game.id === "block_battle") renderGame();
    }
  });
  function releaseRacePointer(event) {
    if (!racePointerOwners.has(event.pointerId)) return;
    const playerIndex = racePointerOwners.get(event.pointerId);
    racePointerOwners.delete(event.pointerId);
    if (!game || game.id !== "mini_racers") return;
    const stillHeld = Array.from(racePointerOwners.values()).includes(playerIndex);
    if (game.players[playerIndex]) {
      game.players[playerIndex].throttleButtonHeld = stillHeld;
      game.players[playerIndex].throttle = stillHeld || game.players[playerIndex].joystickY < -0.15;
    }
    const buttons = root.querySelectorAll('[data-action="player"][data-player="' + playerIndex + '"]');
    buttons.forEach(function (button) { button.classList.toggle("racing-active", stillHeld); });
  }
  document.addEventListener("pointerup", releaseRacePointer);
  document.addEventListener("pointercancel", releaseRacePointer);

  root.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");
    if (!button || !root.contains(button)) return;
    const action = button.dataset.action;
    if (action === "player" || action === "color" || action === "joystick" || action === "block-place" || action === "block-piece") event.preventDefault();
    if (["play","home","quick-play","start-tournament","game-menu","players","rounds","next-round","final","rematch"].indexOf(action) >= 0) sfx("ui");
    handleAction(action, button);
  });
  document.getElementById("settings-toggle").addEventListener("click", function () {
    renderSettingsModal();
    sfx("ui");
  });
  document.getElementById("sound-toggle").addEventListener("click", function () {
    settings.sound = !settings.sound;
    saveSettings();
    updateSoundButton();
    toast(settings.sound ? "Sound on" : "Sound off");
  });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden && game && currentScreen === "game") {
      toast("Paused while you were away.");
      stopTick();
    } else if (!document.hidden && game && currentScreen === "game" && !tickTimer) {
      lastTick = performance.now();
      tickTimer = window.setInterval(tick, 80);
    }
  });
  applySettings();
  renderHome();
})();