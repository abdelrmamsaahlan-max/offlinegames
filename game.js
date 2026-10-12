(function () {
  "use strict";

  const root = document.getElementById("app-root");
  const STORAGE_KEY = "pocketParty.web.v1";
  const colors = ["#2eb8e8", "#ff6c84", "#f6ca3f", "#47c995"];
  const softColors = ["#e1f7fe", "#ffebef", "#fff7d7", "#e2f8ee"];
  const ink = "#17233e";
  const purple = "#5848d8";
  const gameList = [
    { id: "tap_sprint", title: "Tap Sprint", category: "SPEED", desc: "Mash the button. Own the leaderboard.", color: "#2eb8e8", soft: "#dff6fd", length: "10 SEC" },
    { id: "reflex_rush", title: "Reflex Rush", category: "REACTION", desc: "Wait for GO. Don't jump the gun.", color: "#ff6c84", soft: "#ffeaee", length: "ONE SHOT" },
    { id: "memory_grid", title: "Memory Grid", category: "BRAIN", desc: "Remember the pattern. Repeat it perfectly.", color: "#9875ef", soft: "#f0eaff", length: "TURN BASED" },
    { id: "mini_racers", title: "Mini Racers", category: "RACING", desc: "Hold to drive. Use nitro to reach the finish.", color: "#ffad4d", soft: "#fff0dd", length: "12 SEC" },
    { id: "dodge_arena", title: "Dodge Arena", category: "SURVIVAL", desc: "Dodge on the signal. Last player wins.", color: "#47c995", soft: "#e1f8ed", length: "8 WAVES" },
    { id: "target_rush", title: "Target Rush", category: "ACCURACY", desc: "Hit the matching color before time runs out.", color: "#ed7ac4", soft: "#fdeafa", length: "12 SEC" },
    { id: "block_battle", title: "Block Battle", category: "PUZZLE", desc: "Place shapes, clear lines, and beat every score.", color: "#4d8dff", soft: "#e9f1ff", length: "35 SEC EACH" },
    { id: "orb_dash", title: "Orb Dash", category: "MOVEMENT", desc: "Steer your orb, grab gems, and dodge rivals.", color: "#7d65f2", soft: "#eeebff", length: "30 SEC" }
  ];
  const BLOCK_SHAPES = [
    [[0,0]], [[0,0],[1,0],[0,1],[1,1]], [[0,0],[1,0],[2,0]], [[0,0],[0,1],[0,2]],
    [[0,0],[1,0],[2,0],[1,1]], [[0,0],[0,1],[1,1],[2,1]], [[0,0],[1,0],[1,1],[2,1]],
    [[0,0],[1,0],[2,0],[3,0]], [[0,0],[0,1],[0,2],[1,2]], [[1,0],[0,1],[1,1],[2,1]]
  ];
  let settings = { players: 2, rounds: 5, sound: true };
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
  } catch (e) {}

  function saveSettings() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(settings)); } catch (e) {}
    const soundBtn = document.getElementById("sound-toggle");
    if (soundBtn) soundBtn.classList.toggle("is-muted", !settings.sound);
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
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = wave || "sine";
      oscillator.frequency.value = freq || 440;
      gain.gain.value = 0.045;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + (length || 0.09));
      oscillator.stop(audioContext.currentTime + (length || 0.09));
    } catch (e) {}
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
  function renderHome() {
    currentScreen = "home";
    root.innerHTML = '<div class="shell">' +
      '<section class="home-top">' +
        '<div class="hero-card">' +
          '<div class="hero-spark"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 2L60 37L96 50L60 62L50 98L39 62L4 50L39 37Z" fill="#ffe16b"/><circle cx="79" cy="18" r="7" fill="#ff7188"/><circle cx="20" cy="76" r="5" fill="#5ed0ed"/></svg></div>' +
          '<span class="eyebrow"><span class="star">✦</span> THE LIVING ROOM ARCADE</span>' +
          '<h1>One phone.<br><span>Four players.</span><br>Big chaos.</h1>' +
          '<p>Pick your players, choose your challenge, and fight for the crown. Six mini-games, real-time action, and zero Wi-Fi required.</p>' +
          '<div class="hero-bottom"><div class="hero-stat"><strong>06</strong><small>Mini games</small></div><div class="hero-separator"></div><div class="hero-stat"><strong>1–4</strong><small>Players</small></div><div class="hero-separator"></div><div class="hero-stat"><strong>0</strong><small>Wi-Fi required</small></div></div>' +
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
            '<div class="game-art">' + art(g.id) + '</div>' +
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
      board: Array(64).fill(null), blockPieces: [], blockScore: 0, blockLines: 0,
      orbX: 50, orbY: 50, joystickX: 0, joystickY: 0
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
  function makeBlockPieces() {
    return Array.from({ length: 3 }, function () {
      return { cells: BLOCK_SHAPES[Math.floor(Math.random() * BLOCK_SHAPES.length)].map(function (cell) { return [cell[0], cell[1]]; }), colorIndex: Math.floor(Math.random() * colors.length), used: false };
    });
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
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) if (blockPieceFits(player.board, piece, x, y)) return true;
      return false;
    });
  }
  function firstUsableBlockPiece(player) {
    for (let i = 0; i < player.blockPieces.length; i++) if (!player.blockPieces[i].used) return i;
    return -1;
  }
  function advanceBlockTurn() {
    if (!game || currentScreen !== "game" || game.id !== "block_battle") return;
    const next = game.activePuzzlePlayer + 1;
    if (next >= game.players.length) { finishRound(); return; }
    game.activePuzzlePlayer = next;
    game.selectedPiece = firstUsableBlockPiece(game.players[next]);
    game.timeLeft = game.duration;
    game.players[next].status = "YOUR TURN — MAKE IT COUNT!";
    if (!blockPlayerHasMove(game.players[next])) {
      game.players[next].status = "NO MOVES LEFT";
      game.timeLeft = 0.01;
    }
    renderGame();
  }
  function placeBlockPiece(row, col) {
    if (!game || currentScreen !== "game" || game.id !== "block_battle" || row < 0 || row > 7 || col < 0 || col > 7) return;
    const player = game.players[game.activePuzzlePlayer];
    const pieceIndex = game.selectedPiece;
    const piece = player.blockPieces[pieceIndex];
    if (!piece || piece.used) { toast("Choose a shape first."); return; }
    if (!blockPieceFits(player.board, piece, col, row)) { toast("That shape doesn't fit there."); beep(170, 0.04, "triangle"); return; }
    piece.cells.forEach(function (cell) { player.board[(row + cell[1]) * 8 + col + cell[0]] = piece.colorIndex; });
    player.blockScore += piece.cells.length;
    piece.used = true;
    const fullRows = [], fullCols = [];
    for (let y = 0; y < 8; y++) if (player.board.slice(y * 8, y * 8 + 8).every(function (v) { return v !== null; })) fullRows.push(y);
    for (let x = 0; x < 8; x++) if (Array.from({ length: 8 }, function (_, y) { return player.board[y * 8 + x]; }).every(function (v) { return v !== null; })) fullCols.push(x);
    if (fullRows.length || fullCols.length) {
      const cleared = new Set();
      fullRows.forEach(function (y) { for (let x = 0; x < 8; x++) cleared.add(y * 8 + x); });
      fullCols.forEach(function (x) { for (let y = 0; y < 8; y++) cleared.add(y * 8 + x); });
      cleared.forEach(function (i) { player.board[i] = null; });
      const lineCount = fullRows.length + fullCols.length;
      player.blockLines += lineCount;
      player.blockScore += lineCount * 10 + Math.max(0, lineCount - 1) * 5;
      player.status = lineCount > 1 ? "COMBO! +" + (lineCount * 10 + (lineCount - 1) * 5) : "LINE CLEAR! +10";
      beep(650 + lineCount * 90, 0.1, "triangle");
    } else {
      player.status = "+" + piece.cells.length + " BLOCKS";
      beep(430, 0.045, "sine");
    }
    if (player.blockPieces.every(function (p) { return p.used; })) {
      player.blockPieces = makeBlockPieces();
      game.selectedPiece = 0;
    } else {
      game.selectedPiece = firstUsableBlockPiece(player);
    }
    if (!blockPlayerHasMove(player)) {
      player.status = "BOARD FULL — TURN OVER";
      renderGame();
      advanceBlockTurn();
      return;
    }
    renderGame();
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
    if (!game || game.id !== "orb_dash" || !game.players[playerIndex]) return;
    const rect = button.getBoundingClientRect();
    const radius = Math.max(20, Math.min(rect.width, rect.height) * 0.36);
    let dx = event.clientX - (rect.left + rect.width / 2);
    let dy = event.clientY - (rect.top + rect.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance > radius) { dx *= radius / distance; dy *= radius / distance; }
    game.players[playerIndex].joystickX = dx / radius;
    game.players[playerIndex].joystickY = dy / radius;
    const knob = button.querySelector(".joystick-knob");
    if (knob) knob.style.transform = "translate(calc(-50% + " + dx + "px), calc(-50% + " + dy + "px))";
  }
  function releaseJoystick(pointerId) {
    const owner = joystickPointerOwners.get(pointerId);
    if (!owner) return;
    joystickPointerOwners.delete(pointerId);
    if (game && game.id === "orb_dash" && game.players[owner.playerIndex]) {
      game.players[owner.playerIndex].joystickX = 0;
      game.players[owner.playerIndex].joystickY = 0;
    }
    const knob = owner.button.querySelector(".joystick-knob");
    if (knob) knob.style.transform = "translate(-50%, -50%)";
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
    const duration = id === "tap_sprint" ? 10 : ((id === "mini_racers" || id === "target_rush") ? 12 : (id === "block_battle" ? 35 : (id === "orb_dash" ? 30 : 0)));
    game = {
      id: id, data: g, tournament: inTournament, round: tournament ? tournament.round : 1,
      players: Array.from({ length: settings.players }, newPlayer),
      duration: duration, timeLeft: duration, phase: "playing", phaseTimer: 0,
      startedAt: performance.now(), target: Math.floor(Math.random() * 4), targetCooldown: 0.65,
      sequence: Array.from({ length: settings.players >= 3 ? 6 : 5 }, function () { return Math.floor(Math.random() * 4); }),
      showIndex: -1, memoryPlayer: 0, wave: 1, nextSoundAt: 0,
      activePuzzlePlayer: 0, selectedPiece: 0, orbTarget: { x: 50, y: 50 }
    };
    game.players.forEach(function (p, i) {
      p.blockPieces = makeBlockPieces();
      p.orbX = i % 2 === 0 ? 17 : 83;
      p.orbY = i < 2 ? 24 : 76;
    });
    if (id === "block_battle") {
      game.players[0].status = "YOUR TURN — MAKE IT COUNT!";
      game.timeLeft = duration;
    }
    if (id === "orb_dash") {
      game.orbTarget = spawnOrbTarget();
      game.timeLeft = duration;
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
    if (id === "reflex_rush" || id === "dodge_arena") beep(320, 0.07, "triangle");
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

    if (game.id === "tap_sprint" || game.id === "mini_racers" || game.id === "target_rush") {
      game.timeLeft = Math.max(0, game.timeLeft - dt);
      const timer = document.getElementById("timer-value");
      if (timer) timer.textContent = fmtTime(game.timeLeft);
      if (game.id === "mini_racers") {
        let crossedFinish = false;
        game.players.forEach(function (p) {
          p.raceSpeed = p.throttle ? Math.min(88, p.raceSpeed + 112 * dt) : Math.max(0, p.raceSpeed - 145 * dt);
          p.progress = Math.min(615, p.progress + p.raceSpeed * dt);
          if (p.progress >= 615) {
            p.status = "FINISH!";
            crossedFinish = true;
          } else if (p.throttle) {
            p.status = "DRIVING · " + Math.round(p.raceSpeed) + " SPEED";
          } else if (p.raceSpeed > 2) {
            p.status = "COASTING · " + Math.round(p.raceSpeed) + " SPEED";
          }
        });
        updateRaceTrack();
        refreshPlayerPanels();
        if (crossedFinish) { finishRound(); return; }
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
          beep(780 + i * 45, 0.07, "sine");
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
    } else if (game.id === "mini_racers" && game.timeLeft > 0 && p.progress < 615) {
      p.boosts++;
      p.raceSpeed = Math.min(88, p.raceSpeed + 18);
      p.status = "NITRO BOOST! " + p.boosts;
      beep(210 + (pIndex * 75), 0.06, "sawtooth");
      updateRaceTrack();
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
    const laneHeight = 260 / settings.players;
    game.players.forEach(function (p, i) {
      const car = document.getElementById("race-car-" + i);
      if (car) car.setAttribute("transform", "translate(" + (68 + p.progress) + " " + (laneHeight * (i + 0.5) - 15) + ")");
    });
    const hud = document.getElementById("race-hud-status");
    if (hud) {
      const leader = game.players.reduce(function(best, p, i, arr) { return p.progress > arr[best].progress ? i : best; }, 0);
      hud.textContent = "P" + (leader + 1) + " LEADS · " + Math.round(game.players[leader].progress) + " m";
    }
  }

  function updateTargetDisplay() {
    const display = document.getElementById("target-display");
    const label = document.getElementById("target-label");
    if (display) {
      display.style.background = colors[game.target];
      display.style.color = game.target === 2 ? "#17233e" : "#fff";
      display.textContent = ["R", "B", "Y", "G"][game.target];
    }
    if (label) label.textContent = ["RED", "BLUE", "YELLOW", "GREEN"][game.target];
  }
  function resultScores() {
    return game.players.map(function (p) {
      if (game.id === "tap_sprint") return p.taps + p.comboBonus;
      if (game.id === "reflex_rush") return p.reaction === null ? -2000 : (p.reaction < 0 ? -1000 : 10000 - p.reaction);
      if (game.id === "memory_grid") return p.memoryScore;
      if (game.id === "mini_racers") return p.progress;
      if (game.id === "dodge_arena") return p.hits * 2 - p.misses;
      if (game.id === "target_rush") return p.hits * 2 - p.misses;
      if (game.id === "block_battle") return p.blockScore;
      if (game.id === "orb_dash") return p.hits * 10;
      return 0;
    });
  }
  function rankPlayers(scores) {
    return scores.map(function (score, i) { return { index: i, score: score }; }).sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.index - b.index;
    });
  }
  function scoreText(p, id) {
    if (id === "tap_sprint") return p.taps + " taps · " + p.comboBonus + " combo bonus";
    if (id === "reflex_rush") return p.reaction === null ? "Too slow" : (p.reaction < 0 ? "False start" : p.reaction + " ms");
    if (id === "memory_grid") return p.memoryScore + " / " + (game ? game.sequence.length : 5) + " remembered";
    if (id === "mini_racers") return Math.round(p.progress) + " m raced · " + p.boosts + " boosts";
    if (id === "block_battle") return p.blockScore + " points · " + p.blockLines + " lines cleared";
    if (id === "orb_dash") return p.hits * 10 + " gem points";
    if (id === "dodge_arena") return p.hits + " dodges · " + p.misses + " missed";
    return p.hits + " hits · " + p.misses + " misses";
  }
  function miniScore(p, id) {
    if (id === "tap_sprint") return p.taps + " taps · " + p.comboBonus + " bonus";
    if (id === "mini_racers") return Math.round(p.raceSpeed) + " speed · " + Math.round(p.progress) + " m";
    if (id === "block_battle") return p.blockScore + " points · " + p.blockLines + " lines";
    if (id === "orb_dash") return p.hits * 10 + " points";
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
    beep(580, 0.1, "triangle");
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
      const laneHeight = 260 / settings.players;
      const dividers = Array.from({length: settings.players - 1}, function(_, i) {
        const y = Math.round((i + 1) * laneHeight);
        return '<path d="M8 ' + y + ' H790" stroke="#7D879B" stroke-width="2" stroke-dasharray="12 10" opacity=".7"/>';
      }).join("");
      const cars = game.players.map(function(p, i) {
        const y = laneHeight * (i + 0.5) - 15;
        return '<g id="race-car-' + i + '" transform="translate(' + (68 + p.progress) + ' ' + y + ')">' +
          '<ellipse cx="28" cy="30" rx="27" ry="5" fill="#111827" opacity=".3"/>' +
          '<rect x="3" y="8" width="51" height="19" rx="6" fill="' + colors[i] + '" stroke="#fff" stroke-width="1.5"/>' +
          '<path d="M13 9 L20 1 H38 L46 9 Z" fill="' + colors[i] + '" stroke="#fff" stroke-width="1.5"/>' +
          '<path d="M22 4 H35 L40 9 H18 Z" fill="#DDF7FF"/>' +
          '<rect x="8" y="13" width="5" height="5" rx="2" fill="#fff"/><rect x="45" y="13" width="5" height="5" rx="2" fill="#fff"/>' +
          '<circle cx="14" cy="27" r="6" fill="#141B2D" stroke="#D8DEEA" stroke-width="2"/><circle cx="44" cy="27" r="6" fill="#141B2D" stroke="#D8DEEA" stroke-width="2"/>' +
          '<text x="28" y="22" font-size="10" text-anchor="middle" font-weight="900" fill="' + (i === 2 ? "#17233e" : "#fff") + '">' + (i + 1) + '</text></g>';
      }).join("");
      html = '<div class="race-scene"><div class="race-scene-hud"><span>🏁 FIRST TO THE LINE WINS</span><span id="race-hud-status">HOLD YOUR BUTTON TO ACCELERATE</span></div>' +
        '<svg id="race-track" class="race-track" viewBox="0 0 800 260" role="img" aria-label="2D race track with moving player cars" preserveAspectRatio="none">' +
        '<defs><linearGradient id="raceRoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#28334B"/><stop offset="100%" stop-color="#1B2437"/></linearGradient><pattern id="raceGrass" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 L18 0" stroke="#6AB58A" stroke-width="2" opacity=".3"/></pattern></defs>' +
        '<rect x="0" y="0" width="800" height="260" rx="16" fill="#BFE8CB"/><rect x="6" y="6" width="788" height="248" rx="14" fill="url(#raceGrass)"/>' +
        '<rect x="18" y="10" width="764" height="240" rx="13" fill="url(#raceRoad)" stroke="#fff" stroke-width="3"/>' +
        '<path d="M27 18 H773 M27 242 H773" stroke="#fff" stroke-width="3" opacity=".9"/>' +
        dividers +
        '<path d="M68 12 V248" stroke="#ffe16b" stroke-width="5" stroke-dasharray="8 6"/>' +
        '<path d="M735 12 V248" stroke="#fff" stroke-width="6" stroke-dasharray="8 5"/>' +
        '<text x="40" y="30" font-size="10" font-weight="900" fill="#fff">START</text><text x="700" y="30" font-size="10" font-weight="900" fill="#fff">FINISH</text>' +
        cars + '</svg></div>';
    } else if (id === "block_battle") {
      const player = game.players[game.activePuzzlePlayer];
      const boardCells = player.board.map(function (value, index) {
        const row = Math.floor(index / 8), col = index % 8;
        const filled = value === null ? "" : " filled";
        const bgStyle = value === null ? "" : ' style="--block-color:' + colors[value] + '"';
        return '<button class="block-cell' + filled + '"' + bgStyle + ' data-action="block-place" data-row="' + row + '" data-col="' + col + '" aria-label="Row ' + (row + 1) + ', column ' + (col + 1) + '"></button>';
      }).join("");
      const tray = player.blockPieces.map(function (piece, index) {
        const maxX = Math.max.apply(null, piece.cells.map(function (c) { return c[0]; })) + 1;
        const maxY = Math.max.apply(null, piece.cells.map(function (c) { return c[1]; })) + 1;
        const spans = piece.cells.map(function (cell) {
          return '<span style="grid-column:' + (cell[0] + 1) + ';grid-row:' + (cell[1] + 1) + ';--block-color:' + colors[piece.colorIndex] + '"></span>';
        }).join("");
        return '<button class="block-piece-button' + (piece.used ? " used" : (game.selectedPiece === index ? " chosen" : "")) + '" data-action="block-piece" data-piece="' + index + '"' + (piece.used ? " disabled" : "") + '><span class="piece-caption">' + (piece.used ? "PLACED" : (game.selectedPiece === index ? "SELECTED" : "SHAPE " + (index + 1))) + '</span><span class="piece-preview" style="grid-template-columns:repeat(' + maxX + ',20px);grid-template-rows:repeat(' + maxY + ',20px)">' + spans + '</span></button>';
      }).join("");
      html = '<div class="block-game-layout"><div class="block-game-intro"><span class="block-kicker">BLOCK BATTLE · PLAYER ' + (game.activePuzzlePlayer + 1) + '</span><strong>Place shapes. Clear lines. Chase the high score.</strong><span>Drag a shape onto the board, or tap a shape and then a spot. Full rows and columns clear together.</span></div><div class="block-game-main"><div class="block-board" role="grid" aria-label="8 by 8 block puzzle board">' + boardCells + '</div><div class="block-piece-tray">' + tray + '</div></div><div class="block-game-footer"><span id="block-score-live">SCORE ' + player.blockScore + '</span><span id="block-lines-live">' + player.blockLines + ' LINES CLEARED</span><span>PASS DEVICE AFTER YOUR TURN</span></div></div>';
    } else if (id === "orb_dash") {
      const orbs = game.players.map(function (p, i) { return '<span class="orb-player" id="orb-player-' + i + '" style="--orb-color:' + colors[i] + ';left:' + p.orbX + '%;top:' + p.orbY + '%"><span>' + (i + 1) + '</span></span>'; }).join("");
      html = '<div class="orb-dash-layout"><div class="orb-dash-heading"><div><span class="orb-kicker">ORBIT ARENA</span><strong>Grab the gems!</strong><small>Move with your joystick. Every gem is worth 10 points.</small></div><span class="orb-leader" id="orb-leader">P1 LEADS · 0 PTS</span></div><div class="orb-arena-field" id="orb-arena-field"><span class="orb-gem" id="orb-gem" style="left:' + game.orbTarget.x + '%;top:' + game.orbTarget.y + '%">✦</span>' + orbs + '</div><div class="orb-arena-note">Keep moving, collect the gold gem, and beat your friends to the next one.</div></div>';
    } else if (id === "dodge_arena") {
      html = '<div class="arena-big" style="color:' + (game.phase === "dodge_live" ? "#168e64" : "#dba23a") + '">' + (game.phase === "dodge_live" ? "DODGE!" : "READY?") + '</div><h2>' + (game.phase === "dodge_live" ? "TAP BEFORE THE WAVE HITS" : "WAIT FOR THE SIGNAL") + '</h2><p>WAVE ' + game.wave + ' / 8 · One chance per wave.</p><div class="arena-symbols">' + (game.phase === "dodge_live" ? "⚡ 🌀 ⚡" : "◌ ◌ ◌") + '</div>';
    } else {
      html = '<div class="arena-big">MATCH THIS!</div><h2>COLOR TARGET</h2><p>Tap the same color in your panel.</p><div class="arena-grid"><span class="arena-tile" id="target-display" style="width:65px;height:65px;font-weight:1000;display:grid;place-items:center;background:' + colors[game.target] + ';color:' + (game.target === 2 ? ink : "#fff") + '">' + ["R","B","Y","G"][game.target] + '</span></div><p style="margin-top:10px;font-weight:1000;color:' + game.data.color + '" id="target-label">' + ["RED","BLUE","YELLOW","GREEN"][game.target] + '</p>';
    }
    const arenaClass = id === "mini_racers" ? " racing-arena" : (id === "block_battle" ? " block-arena" : (id === "orb_dash" ? " orb-arena" : ""));
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
        const disabledMemory = game.id === "memory_grid" && !activeMemory;
        return '<section class="player-panel ' + ((activeMemory || activePuzzle) ? "active-turn" : "") + '" style="--player-color:' + colors[i] + ';--player-soft:' + softColors[i] + ';--player-border:' + colors[i] + '55">' +
          '<div class="player-id"><div class="player-badge"><i class="player-dot"></i>' + playerName(i) + (activePuzzle ? ' <span class="active-tag">YOUR TURN</span>' : '') + '</div><div class="player-status" id="player-status-' + i + '">' + escapeText(p.status) + '</div><div class="player-points" id="player-mini-score-' + i + '">' + miniScore(p, game.id) + (game.tournament ? " · TOUR " + tournament.scores[i] + " PTS" : "") + '</div></div>' +
          (game.id === "block_battle" ? '<div class="puzzle-player-badge">' + (activePuzzle ? "PUZZLE PLAYER" : "UP NEXT") + '</div>' :
            (game.id === "orb_dash" ? '<button class="joystick-control" data-action="joystick" data-player="' + i + '" aria-label="Move ' + playerName(i) + '"><span class="joystick-ring"></span><span class="joystick-knob"></span><span class="joystick-hint">MOVE</span></button>' :
            ((game.id === "memory_grid" || game.id === "target_rush") ?
              '<div class="color-actions">' + colors.map(function (c, ci) { return '<button class="color-button" data-action="color" data-player="' + i + '" data-color="' + ci + '" style="background:' + c + ';color:' + (ci === 2 ? ink : "#fff") + '" ' + (disabledMemory ? "disabled" : "") + '>' + ["R","B","Y","G"][ci] + '</button>'; }).join("") + '</div>' :
              '<button class="action-button ' + (i === 2 ? "soft-text" : "") + '" data-action="player" data-player="' + i + '">' + (game.id === "tap_sprint" ? "TAP FAST!" : game.id === "mini_racers" ? "HOLD TO DRIVE" : game.id === "dodge_arena" ? "DODGE NOW!" : "TAP ON GO!") + '</button>'))) +
        '</section>';
      }).join("") + '</div><div class="game-tip">' + (game.id === "memory_grid" ? "Pass the phone: each player gets a turn to repeat the sequence." : (game.id === "mini_racers" ? "HOLD your lane button to accelerate. Tap for a nitro boost. First across the finish line wins!" : (game.id === "block_battle" ? "Take turns with your own puzzle board. Clear complete rows and columns to earn bonus points." : (game.id === "orb_dash" ? "Drag your player joystick to move in any direction. Collect ✦ gems for 10 points each." : "Everybody plays on one screen. Tap only your own player panel.")))) + '</div></div></div>';
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
    if (action === "players") { settings.players = Number(el.dataset.value); saveSettings(); renderHome(); }
    else if (action === "rounds") { settings.rounds = Number(el.dataset.value); saveSettings(); renderHome(); }
    else if (action === "play") renderGameSelect();
    else if (action === "block-piece") {
      if (game && game.id === "block_battle") { game.selectedPiece = Number(el.dataset.piece); renderGame(); }
    }
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
        activeBlockDrag = { pointerId: event.pointerId, pieceIndex: pieceIndex };
        puzzlePiece.classList.add("dragging");
      }
      return;
    }
    const stick = event.target.closest('[data-action="joystick"]');
    if (stick && root.contains(stick) && currentScreen === "game" && game && game.id === "orb_dash") {
      const playerIndex = Number(stick.dataset.player);
      if (game.players[playerIndex]) {
        joystickPointerOwners.set(event.pointerId, { playerIndex: playerIndex, button: stick });
        setJoystickValue(playerIndex, stick, event);
        event.preventDefault();
        if (stick.setPointerCapture) { try { stick.setPointerCapture(event.pointerId); } catch (e) {} }
      }
      return;
    }
    const button = event.target.closest('[data-action="player"]');
    if (!button || !root.contains(button) || currentScreen !== "game" || !game || game.id !== "mini_racers") return;
    const playerIndex = Number(button.dataset.player);
    const player = game.players[playerIndex];
    if (!player) return;
    racePointerOwners.set(event.pointerId, playerIndex);
    player.throttle = true;
    button.classList.add("racing-active");
  });
  document.addEventListener("pointermove", function (event) {
    const owner = joystickPointerOwners.get(event.pointerId);
    if (!owner) return;
    setJoystickValue(owner.playerIndex, owner.button, event);
    event.preventDefault();
  }, { passive: false });
  document.addEventListener("pointerup", function (event) {
    releaseJoystick(event.pointerId);
    if (activeBlockDrag && activeBlockDrag.pointerId === event.pointerId) {
      const target = event.target;
      const cell = target && typeof target.closest === "function" ? target.closest('[data-action="block-place"]') : null;
      if (cell && currentScreen === "game" && game && game.id === "block_battle") {
        game.selectedPiece = activeBlockDrag.pieceIndex;
        placeBlockPiece(Number(cell.dataset.row), Number(cell.dataset.col));
      }
      activeBlockDrag = null;
    }
  });
  document.addEventListener("pointercancel", function (event) {
    releaseJoystick(event.pointerId);
    if (activeBlockDrag && activeBlockDrag.pointerId === event.pointerId) activeBlockDrag = null;
  });
  function releaseRacePointer(event) {
    if (!racePointerOwners.has(event.pointerId)) return;
    const playerIndex = racePointerOwners.get(event.pointerId);
    racePointerOwners.delete(event.pointerId);
    if (!game || game.id !== "mini_racers") return;
    const stillHeld = Array.from(racePointerOwners.values()).includes(playerIndex);
    if (game.players[playerIndex]) game.players[playerIndex].throttle = stillHeld;
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
    handleAction(action, button);
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
  renderHome();
})();