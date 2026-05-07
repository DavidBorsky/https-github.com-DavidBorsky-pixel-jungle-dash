const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const overlay = document.getElementById("overlay");
const overlayKicker = document.getElementById("overlayKicker");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayHint = document.getElementById("overlayHint");
const primaryAction = document.getElementById("primaryAction");
const secondaryAction = document.getElementById("secondaryAction");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");

const hud = {
  level: document.getElementById("levelValue"),
  score: document.getElementById("scoreValue"),
  gems: document.getElementById("gemsValue"),
  lives: document.getElementById("livesValue"),
  health: document.getElementById("healthValue"),
  time: document.getElementById("timeValue"),
};

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;
const GRAVITY = 0.7;
const MAX_FALL = 16;
const MOVE_SPEED = 4.5;
const JUMP_FORCE = 13.5;
const LEVEL_TIME = 180;
const TOTAL_LEVELS = 3;
const TILE = 48;

const state = {
  mode: "menu",
  currentLevelIndex: 0,
  score: 0,
  gems: 0,
  lives: 3,
  health: 3,
  timeLeft: LEVEL_TIME,
  cameraX: 0,
  paused: false,
  showInstructions: false,
};

const input = {
  left: false,
  right: false,
  jump: false,
};

const audioContext = window.AudioContext ? new AudioContext() : null;

function playBeep(frequency, duration, type = "square", volume = 0.03) {
  if (!audioContext) return;
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gain.gain.value = volume;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + duration);
}

const levelMaps = [
  [
    "..................................................................................................................",
    "..................................................................................................................",
    "..................................................................................................................",
    "..................................................................................................................",
    "..............................................................................................................P...",
    "..............................................................G...................................................",
    ".................G..............................===.................EEE..............G............................",
    "......G...................===...............................................====..................................",
    "...S......===..........................C..................G.........................^.................====........",
    "#############......#####.........###########......#####..............#####............#######........#############"
  ],
  [
    "..................................................................................................................",
    "..............................................................................................................P...",
    "....................................................................................G.............................",
    "...................................................G.........................................................==..",
    "......................................===......................EEE....................^...........................",
    "......................EEE..........................................................=====...........G..............",
    ".........G......................===............G...........===.........................C...............EEE........",
    "...S.............===....................................................G......^^.............====................",
    "..............G..............^^^^...................====..........................................................",
    "###########......#####..###########......#####..##########......#####......########......#####......##############"
  ],
  [
    "...............................................................................................................P..",
    "...........................................................................G......................................",
    "...................................................EEE..............===..............EEE.........................",
    "............................G............===.......................................................G..............",
    "....................EEE.............^.................G......................^^..........................===......",
    ".......G......===..........................................EEE...................................................",
    "...S......................C.............====....................G..............====.............C................",
    ".............^^....................G.....................^^................G..................^^.................",
    "........==========..............========..............=========.............========..............................",
    "########......#########..########......#########..########......#########..########......#########..#############"
  ],
];

function parseLevel(mapRows) {
  const level = {
    width: mapRows[0].length * TILE,
    height: mapRows.length * TILE,
    tiles: [],
    gems: [],
    enemies: [],
    spikes: [],
    checkpoints: [],
    portal: null,
    spawn: { x: 80, y: 0 },
  };

  mapRows.forEach((row, rowIndex) => {
    [...row].forEach((symbol, colIndex) => {
      const x = colIndex * TILE;
      const y = rowIndex * TILE;

      if (symbol === "#") {
        level.tiles.push({ x, y, width: TILE, height: TILE, kind: "ground" });
      }

      if (symbol === "=") {
        level.tiles.push({ x, y: y + 18, width: TILE, height: 18, kind: "platform" });
      }

      if (symbol === "G") {
        level.gems.push({
          x: x + 14,
          y: y + 8,
          width: 20,
          height: 24,
          collected: false,
          bob: Math.random() * Math.PI * 2,
        });
      }

      if (symbol === "E") {
        level.enemies.push({
          x: x + 6,
          y: y + 8,
          width: 36,
          height: 36,
          vx: Math.random() > 0.5 ? 1.2 : -1.2,
          minX: x - TILE * 2,
          maxX: x + TILE * 2,
          stomped: false,
        });
      }

      if (symbol === "^") {
        level.spikes.push({ x: x + 6, y: y + 18, width: 36, height: 30 });
      }

      if (symbol === "C") {
        level.checkpoints.push({ x: x + 10, y: y - 30, width: 28, height: 78, active: false });
      }

      if (symbol === "P") {
        level.portal = { x: x + 8, y: y - 12, width: 32, height: 60 };
      }

      if (symbol === "S") {
        level.spawn = { x: x + 8, y: y - 18 };
      }
    });
  });

  return level;
}

const levels = levelMaps.map(parseLevel);

const player = {
  x: 0,
  y: 0,
  width: 34,
  height: 44,
  vx: 0,
  vy: 0,
  onGround: false,
  facing: 1,
  invincibleTimer: 0,
  checkpoint: null,
};

function resetPlayerPosition() {
  const level = levels[state.currentLevelIndex];
  const spawn = player.checkpoint || level.spawn;
  player.x = spawn.x;
  player.y = spawn.y;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
}

function loadLevel(index, preserveStats = true) {
  state.currentLevelIndex = index;
  state.cameraX = 0;
  state.timeLeft = LEVEL_TIME;
  state.paused = false;

  const level = levels[index];
  level.gems.forEach((gem) => {
    gem.collected = false;
  });
  level.enemies.forEach((enemy) => {
    enemy.stomped = false;
  });
  level.checkpoints.forEach((checkpoint) => {
    checkpoint.active = false;
  });

  if (!preserveStats) {
    state.score = 0;
    state.gems = 0;
    state.lives = 3;
    state.health = 3;
  }

  player.checkpoint = null;
  resetPlayerPosition();
  updateHud();
}

function startNewGame() {
  state.mode = "playing";
  state.showInstructions = false;
  loadLevel(0, false);
  hideOverlay();
}

function updateHud() {
  hud.level.textContent = String(state.currentLevelIndex + 1);
  hud.score.textContent = String(state.score);
  hud.gems.textContent = String(state.gems);
  hud.lives.textContent = String(state.lives);
  hud.health.textContent = String(state.health);
  hud.time.textContent = String(Math.max(0, Math.ceil(state.timeLeft)));
  pauseButton.textContent = state.paused ? "Resume" : "Pause";
}

function showOverlay(mode) {
  overlay.classList.add("visible");

  if (mode === "menu") {
    overlayKicker.textContent = "Adventure Awaits";
    overlayTitle.textContent = "Pixel Jungle Dash";
    overlayMessage.textContent =
      "Dash through jungle ruins, gather shimmering gems, activate checkpoints, and leap into the portal before the clock hits zero.";
    overlayHint.textContent =
      "Move with A/D or arrow keys, jump with Space, W, or Up.";
    primaryAction.textContent = "Start Game";
    secondaryAction.textContent = "How To Play";
  }

  if (mode === "instructions") {
    overlayKicker.textContent = "How To Play";
    overlayTitle.textContent = "Run, Jump, Survive";
    overlayMessage.textContent =
      "Collect gems for points, avoid spikes, and stomp enemies from above. If you get hurt, you lose health and restart from your latest checkpoint. Lose all health and you lose a life.";
    overlayHint.textContent =
      "Press P to pause, R to restart, and reach the portal to clear each stage.";
    primaryAction.textContent = "Play Now";
    secondaryAction.textContent = "Back";
  }

  if (mode === "paused") {
    overlayKicker.textContent = "Paused";
    overlayTitle.textContent = "Take A Breath";
    overlayMessage.textContent =
      "The jungle is on hold. Resume when you're ready to keep climbing through the ruins.";
    overlayHint.textContent = "Your timer is frozen while paused.";
    primaryAction.textContent = "Resume";
    secondaryAction.textContent = "Restart Run";
  }

  if (mode === "levelComplete") {
    overlayKicker.textContent = `Level ${state.currentLevelIndex + 1} Clear`;
    overlayTitle.textContent = "Portal Reached";
    overlayMessage.textContent =
      state.currentLevelIndex + 1 < TOTAL_LEVELS
        ? "Nice work. The next jungle path is tougher, faster, and packed with more hazards."
        : "You conquered every jungle path and escaped the ruins with your treasure haul.";
    overlayHint.textContent =
      state.currentLevelIndex + 1 < TOTAL_LEVELS
        ? "Get ready for the next stage."
        : "Press restart to play the full adventure again.";
    primaryAction.textContent =
      state.currentLevelIndex + 1 < TOTAL_LEVELS ? "Next Level" : "Play Again";
    secondaryAction.textContent = "Restart Run";
  }

  if (mode === "gameOver") {
    overlayKicker.textContent = "Game Over";
    overlayTitle.textContent = "The Jungle Won This Round";
    overlayMessage.textContent =
      "You ran out of lives before reaching the portal. Restart the expedition and try a cleaner route.";
    overlayHint.textContent = "Tip: checkpoints save your respawn spot.";
    primaryAction.textContent = "Retry";
    secondaryAction.textContent = "Main Menu";
  }
}

function hideOverlay() {
  overlay.classList.remove("visible");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function damagePlayer() {
  if (player.invincibleTimer > 0) return;
  state.health -= 1;
  player.invincibleTimer = 2;
  playBeep(180, 0.12, "sawtooth", 0.04);

  if (state.health <= 0) {
    state.lives -= 1;
    state.health = 3;
    if (state.lives <= 0) {
      state.mode = "gameOver";
      showOverlay("gameOver");
      updateHud();
      return;
    }
  }

  resetPlayerPosition();
  updateHud();
}

function completeLevel() {
  state.score += Math.ceil(state.timeLeft) * 5;
  playBeep(660, 0.12, "triangle", 0.04);
  playBeep(880, 0.18, "triangle", 0.035);
  state.mode = "levelComplete";
  showOverlay("levelComplete");
  updateHud();
}

function nextLevel() {
  if (state.currentLevelIndex + 1 >= TOTAL_LEVELS) {
    startNewGame();
    return;
  }

  state.mode = "playing";
  loadLevel(state.currentLevelIndex + 1, true);
  hideOverlay();
}

function restartRun() {
  startNewGame();
}

function returnToMenu() {
  state.mode = "menu";
  showOverlay("menu");
  updateHud();
}

function updatePlayer(delta) {
  const level = levels[state.currentLevelIndex];
  const moveInput = Number(input.right) - Number(input.left);

  player.vx = moveInput * MOVE_SPEED;
  if (moveInput !== 0) player.facing = moveInput > 0 ? 1 : -1;

  if (input.jump && player.onGround) {
    player.vy = -JUMP_FORCE;
    player.onGround = false;
    input.jump = false;
    playBeep(420, 0.08, "square", 0.03);
  }

  player.vy = clamp(player.vy + GRAVITY, -20, MAX_FALL);
  player.x += player.vx;
  resolveTileCollisions("x", level.tiles);

  player.y += player.vy;
  player.onGround = false;
  resolveTileCollisions("y", level.tiles);

  if (player.y > level.height + 120) {
    damagePlayer();
  }

  player.x = clamp(player.x, 0, level.width - player.width);
  player.invincibleTimer = Math.max(0, player.invincibleTimer - delta);
}

function resolveTileCollisions(axis, tiles) {
  for (const tile of tiles) {
    if (!rectsOverlap(player, tile)) continue;

    if (axis === "x") {
      if (player.vx > 0) {
        player.x = tile.x - player.width;
      } else if (player.vx < 0) {
        player.x = tile.x + tile.width;
      }
      player.vx = 0;
    }

    if (axis === "y") {
      if (player.vy > 0) {
        player.y = tile.y - player.height;
        player.vy = 0;
        player.onGround = true;
      } else if (player.vy < 0) {
        player.y = tile.y + tile.height;
        player.vy = 0;
      }
    }
  }
}

function updateWorld(delta) {
  const level = levels[state.currentLevelIndex];

  level.gems.forEach((gem) => {
    gem.bob += delta * 4;
    if (!gem.collected && rectsOverlap(player, gem)) {
      gem.collected = true;
      state.gems += 1;
      state.score += 100;
      playBeep(760, 0.07, "triangle", 0.03);
      updateHud();
    }
  });

  level.checkpoints.forEach((checkpoint) => {
    if (rectsOverlap(player, checkpoint) && !checkpoint.active) {
      level.checkpoints.forEach((entry) => {
        entry.active = false;
      });
      checkpoint.active = true;
      player.checkpoint = { x: checkpoint.x - 12, y: checkpoint.y + 10 };
      state.score += 50;
      playBeep(540, 0.1, "triangle", 0.03);
      updateHud();
    }
  });

  level.spikes.forEach((spike) => {
    if (rectsOverlap(player, spike)) {
      damagePlayer();
    }
  });

  level.enemies.forEach((enemy) => {
    if (enemy.stomped) return;

    enemy.x += enemy.vx;
    if (enemy.x < enemy.minX || enemy.x > enemy.maxX) {
      enemy.vx *= -1;
    }

    if (!rectsOverlap(player, enemy)) return;

    const stomped = player.vy > 0 && player.y + player.height - 10 < enemy.y + 12;
    if (stomped) {
      enemy.stomped = true;
      player.vy = -8.5;
      state.score += 150;
      playBeep(260, 0.08, "square", 0.03);
      updateHud();
      return;
    }

    damagePlayer();
  });

  if (level.portal && rectsOverlap(player, level.portal)) {
    completeLevel();
  }

  state.cameraX = clamp(
    player.x - GAME_WIDTH / 2 + player.width / 2,
    0,
    Math.max(0, level.width - GAME_WIDTH)
  );
  state.timeLeft -= delta;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    damagePlayer();
    state.timeLeft = LEVEL_TIME;
  }

  updateHud();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  gradient.addColorStop(0, "#7fd6d7");
  gradient.addColorStop(0.45, "#77c96f");
  gradient.addColorStop(1, "#245c38");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  for (let i = 0; i < 7; i += 1) {
    const x = ((i * 240) - state.cameraX * 0.2) % (GAME_WIDTH + 260) - 120;
    ctx.fillStyle = "rgba(22, 70, 44, 0.35)";
    ctx.fillRect(x, 260 - i * 8, 150, 220);
    ctx.fillStyle = "rgba(36, 107, 64, 0.55)";
    ctx.beginPath();
    ctx.arc(x + 75, 220 - i * 5, 75, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 10; i += 1) {
    const x = ((i * 160) - state.cameraX * 0.45) % (GAME_WIDTH + 180) - 90;
    ctx.fillStyle = "rgba(15, 55, 31, 0.5)";
    ctx.fillRect(x + 30, 280, 18, 260);
    ctx.fillStyle = "rgba(71, 155, 89, 0.7)";
    ctx.beginPath();
    ctx.moveTo(x, 320);
    ctx.lineTo(x + 40, 280);
    ctx.lineTo(x + 76, 320);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(0, 0, GAME_WIDTH, 40);
}

function drawTiles(level) {
  level.tiles.forEach((tile) => {
    const screenX = tile.x - state.cameraX;
    const screenY = tile.y;
    if (screenX + tile.width < 0 || screenX > GAME_WIDTH) return;

    if (tile.kind === "ground") {
      ctx.fillStyle = "#4f3524";
      ctx.fillRect(screenX, screenY, tile.width, tile.height);
      ctx.fillStyle = "#698f45";
      ctx.fillRect(screenX, screenY, tile.width, 10);
      ctx.fillStyle = "#2c4e2f";
      ctx.fillRect(screenX + 6, screenY + 16, 12, 12);
      ctx.fillRect(screenX + 26, screenY + 26, 10, 10);
    } else {
      ctx.fillStyle = "#8d6839";
      ctx.fillRect(screenX, screenY, tile.width, tile.height);
      ctx.fillStyle = "#b89a5d";
      ctx.fillRect(screenX, screenY, tile.width, 5);
      ctx.fillStyle = "#31542f";
      ctx.fillRect(screenX + 14, screenY - 6, 14, 8);
    }
  });
}

function drawGems(level) {
  level.gems.forEach((gem) => {
    if (gem.collected) return;
    const x = gem.x - state.cameraX;
    const y = gem.y + Math.sin(gem.bob) * 4;
    ctx.fillStyle = "#66ffe2";
    ctx.beginPath();
    ctx.moveTo(x + 10, y);
    ctx.lineTo(x + 20, y + 12);
    ctx.lineTo(x + 10, y + 24);
    ctx.lineTo(x, y + 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(x + 8, y + 4, 4, 6);
  });
}

function drawSpikes(level) {
  level.spikes.forEach((spike) => {
    const x = spike.x - state.cameraX;
    ctx.fillStyle = "#c6d2d1";
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 12, spike.y + spike.height);
      ctx.lineTo(x + i * 12 + 6, spike.y);
      ctx.lineTo(x + i * 12 + 12, spike.y + spike.height);
      ctx.closePath();
      ctx.fill();
    }
  });
}

function drawCheckpoints(level) {
  level.checkpoints.forEach((checkpoint) => {
    const x = checkpoint.x - state.cameraX;
    const y = checkpoint.y;
    ctx.fillStyle = "#433422";
    ctx.fillRect(x + 8, y + 10, 8, 68);
    ctx.fillStyle = checkpoint.active ? "#ffe36f" : "#ff9276";
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 12);
    ctx.lineTo(x + 16, y + 44);
    ctx.lineTo(x + 42, y + 28);
    ctx.closePath();
    ctx.fill();
  });
}

function drawPortal(level) {
  const portal = level.portal;
  if (!portal) return;
  const x = portal.x - state.cameraX;
  const y = portal.y;
  ctx.fillStyle = "#172620";
  ctx.fillRect(x - 6, y - 6, portal.width + 12, portal.height + 12);
  ctx.fillStyle = "#4c1a82";
  ctx.fillRect(x, y, portal.width, portal.height);
  ctx.fillStyle = "#7b50d1";
  ctx.fillRect(x + 4, y + 4, portal.width - 8, portal.height - 8);
  ctx.fillStyle = "rgba(111,255,233,0.75)";
  ctx.fillRect(x + 10, y + 10, portal.width - 20, portal.height - 20);
}

function drawEnemies(level) {
  level.enemies.forEach((enemy) => {
    if (enemy.stomped) return;
    const x = enemy.x - state.cameraX;
    const y = enemy.y;
    ctx.fillStyle = "#7e2f1c";
    ctx.fillRect(x + 4, y + 6, 28, 26);
    ctx.fillStyle = "#d77c4c";
    ctx.fillRect(x, y + 14, 36, 18);
    ctx.fillStyle = "#f2d6a4";
    ctx.fillRect(x + 8, y + 10, 8, 8);
    ctx.fillRect(x + 20, y + 10, 8, 8);
    ctx.fillStyle = "#241713";
    ctx.fillRect(x + 10, y + 13, 3, 3);
    ctx.fillRect(x + 23, y + 13, 3, 3);
  });
}

function drawPlayer() {
  if (player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 12) % 2 === 0) {
    return;
  }

  const x = player.x - state.cameraX;
  const y = player.y;
  ctx.fillStyle = "#5f3917";
  ctx.fillRect(x + 10, y + 6, 14, 12);
  ctx.fillStyle = "#f5d9a5";
  ctx.fillRect(x + 6, y + 10, 22, 18);
  ctx.fillStyle = "#2d291e";
  ctx.fillRect(x + 10, y + 14, 3, 3);
  ctx.fillRect(x + 21, y + 14, 3, 3);
  ctx.fillStyle = "#d65f3b";
  ctx.fillRect(x + 6, y + 28, 22, 12);
  ctx.fillStyle = "#26495c";
  ctx.fillRect(x + 5, y + 40, 9, 4);
  ctx.fillRect(x + 20, y + 40, 9, 4);
  ctx.fillStyle = "#7ad957";
  ctx.fillRect(x + (player.facing === 1 ? 24 : 2), y + 8, 8, 4);
}

function drawHudBanner(level) {
  ctx.fillStyle = "rgba(7, 15, 10, 0.35)";
  ctx.fillRect(16, 16, 240, 36);
  ctx.fillStyle = "#f4ffe2";
  ctx.font = "bold 18px Verdana";
  ctx.fillText(`Stage ${state.currentLevelIndex + 1} / ${TOTAL_LEVELS}`, 30, 40);

  ctx.fillStyle = "rgba(7, 15, 10, 0.28)";
  ctx.fillRect(GAME_WIDTH - 230, 16, 200, 36);
  ctx.fillStyle = "#ffe36f";
  ctx.fillText(
    `Portal: ${Math.max(0, Math.ceil((level.portal.x - player.x) / TILE))} tiles`,
    GAME_WIDTH - 214,
    40
  );
}

function draw() {
  const level = levels[state.currentLevelIndex];
  drawBackground();
  drawTiles(level);
  drawCheckpoints(level);
  drawPortal(level);
  drawGems(level);
  drawSpikes(level);
  drawEnemies(level);
  drawPlayer();
  drawHudBanner(level);
}

let lastTime = 0;
function gameLoop(timestamp) {
  const delta = Math.min(0.033, (timestamp - lastTime) / 1000 || 0);
  lastTime = timestamp;

  if (state.mode === "playing" && !state.paused) {
    updatePlayer(delta);
    updateWorld(delta);
  }

  draw();
  window.requestAnimationFrame(gameLoop);
}

function handlePrimaryAction() {
  if (state.mode === "menu") {
    startNewGame();
    return;
  }

  if (state.mode === "paused") {
    togglePause();
    return;
  }

  if (state.mode === "levelComplete") {
    nextLevel();
    return;
  }

  if (state.mode === "gameOver") {
    restartRun();
    return;
  }

  if (state.showInstructions) {
    startNewGame();
  }
}

function handleSecondaryAction() {
  if (state.mode === "menu") {
    state.showInstructions = true;
    showOverlay("instructions");
    return;
  }

  if (state.showInstructions) {
    state.showInstructions = false;
    showOverlay("menu");
    return;
  }

  if (state.mode === "paused" || state.mode === "levelComplete") {
    restartRun();
    hideOverlay();
    return;
  }

  if (state.mode === "gameOver") {
    returnToMenu();
  }
}

function togglePause() {
  if (state.mode !== "playing" && state.mode !== "paused") return;

  state.paused = !state.paused;
  state.mode = state.paused ? "paused" : "playing";
  if (state.paused) {
    showOverlay("paused");
  } else {
    hideOverlay();
  }
  updateHud();
}

function handleKeyChange(event, isPressed) {
  const key = event.key.toLowerCase();
  if (["a", "arrowleft"].includes(key)) input.left = isPressed;
  if (["d", "arrowright"].includes(key)) input.right = isPressed;
  if ([" ", "w", "arrowup"].includes(key)) input.jump = isPressed;

  if (isPressed && key === "p") togglePause();
  if (isPressed && key === "r") restartRun();

  if ([" ", "arrowup", "arrowleft", "arrowright"].includes(key)) {
    event.preventDefault();
  }
}

window.addEventListener("keydown", (event) => handleKeyChange(event, true));
window.addEventListener("keyup", (event) => handleKeyChange(event, false));
primaryAction.addEventListener("click", handlePrimaryAction);
secondaryAction.addEventListener("click", handleSecondaryAction);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", restartRun);

showOverlay("menu");
loadLevel(0, false);
window.requestAnimationFrame(gameLoop);
