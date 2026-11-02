// ==========================
// CONFIG
// ==========================
const canvas = document.getElementById("game");
let ctx = canvas.getContext("2d"); // di notte draw() lo scambia per un attimo con actorCtx
ctx.imageSmoothingEnabled = false;

window.__lastErr = null;
window.onerror = (message, source, lineno, colno) => {
  window.__lastErr = `${message} (${source || "unknown"}:${lineno}:${colno})`;
};

if (canvas) {
  canvas.style.position = "relative";
  canvas.style.zIndex = "1";
  canvas.style.border = "1px solid rgba(255,255,255,0.2)";
  canvas.style.background = "transparent";
  if (canvas.width <= 0 || canvas.height <= 0) {
    canvas.width = 1024;
    canvas.height = 1024;
  }
}

const BG_PATH = "assets/background.png";
const BASE_W = 96;
const BASE_H = 96;
const DRAW_SCALE = 2.5;
const ASSET_ROOT = "./";
const ENEMY_SIZE_TWEAK = 1.0;
const ENEMY_RENDER_SCALE = 2.14;
const HERO_MAX_HP = 120;
const HERO_DMG = 15;
const ENEMY_DMG = 10;
const DESIRED_HITS = 7;
const KILL_TARGET = 30;
const WIN_KILLS = 15;           // mostri SCELTI da sconfiggere per vincere
const PIAZZA_CHANCE = 0.25;     // probabilità che compaia una creatura della piazza
const PIAZZA_HP = 10;
const PIAZZA_ARMOR = 10;
const MISS_TIME = 0.6;          // secondi in cui resta visibile la scritta "MISS"
const HERO_DEATH_FPS = 8;
const HERO_DEATH_HOLD_LAST = true;
const ENEMY_SPEED_MULT = 0.75;
const GOBLIN_RENDER_SCALE = 1.2;
const MUSHROOM_KEYS = new Set(["mushroom", "mushroom_2"]);
const MUSHROOM_HEADBUTT_MAX_LUNGE = 110;
const MUSHROOM_HEADBUTT_LEAD = 0.08;
const MUSHROOM_HIT_WINDOW_START = 0.80;
const MUSHROOM_HIT_WINDOW_END = 1.00;
const MAX_ENEMIES_ALIVE = 5;
const SPAWN_BURST_MAX = 2;
const RAMP_TIME = 90.0;
const HERO_RENDER_SCALE = 0.44;
const SHOOT_COOLDOWN = 0.22;
const ARROW_SPEED = 320;
const ARROW_RENDER_SCALE = 1.50;
const ARROW_SPAWN_OFFSET = 28;
const ARROW_ARM_TIME = 0.02;

const DEBUG = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  || new URLSearchParams(location.search).has("debug");

const UI = {
  margin: 18,
  barW: 18,
  barH: 220,
  barGap: 10,
  font: "16px Arial",
  winFont: "80px Arial",
};

const CFG = {
  debugEnemyFrames: false,
  debugEnemyAI: false,
  debugEnemyMove: false,
  debugHitboxes: false,
};

// Sprite sheet settings (MODIFICA QUI se necessario)
// Misurati sui file in assets/hero/: tutti i fotogrammi dell'eroe sono larghi 64px,
// ma i file sono tagliati male (es. hero_death.png è largo 426px = 6 fotogrammi + 42px vuoti),
// quindi NON si può dividere la larghezza del file per il numero di fotogrammi.
const FRAME_W = 64;        // larghezza di 1 frame nello sprite sheet
const FRAME_H = 64;        // altezza di 1 frame nello sprite sheet
const IDLE_FRAMES = 5;     // hero_idle.png       313x61
const WALK_FRAMES = 8;     // hero_walk.png       504x69
const ATTACK_FRAMES = 9;   // hero_attack_bow.png 569x64
const DEATH_FRAMES = 6;    // hero_death.png      426x43

// Riga dei piedi in ogni foglio: serve a disegnare i piedi sempre nello stesso punto
const HERO_FEET_ROW = { idle: 51, walk: 61, attack: 55, dead: 43 };
const HERO_IDLE_SHEET_H = 61; // l'idle resta della stessa altezza di prima

// ==========================
// ASSETS
// ==========================
const bg = new Image();
bg.src = BG_PATH;

// Stessa piazza di notte (lampioni accesi). Se non si carica: sfondo di giorno + tinta blu
const BG_NIGHT_PATH = "assets/background_night.png";
const bgNight = new Image();
bgNight.onerror = () => {
  console.warn(`Non trovo ${BG_NIGHT_PATH}: di notte uso ${BG_PATH} con la tinta blu.`);
};
bgNight.src = BG_NIGHT_PATH;

function nightImageReady() {
  return bgNight.complete && bgNight.naturalWidth > 0;
}

// Livello dove di notte si disegnano eroe, nemici e frecce, per velarli di scuro
const actorLayer = document.createElement("canvas");
actorLayer.width = canvas.width;
actorLayer.height = canvas.height;
const actorCtx = actorLayer.getContext("2d");
actorCtx.imageSmoothingEnabled = false;

const heroSprites = {
  idle: new Image(),
  walk: new Image(),
  attack: new Image(),
  dead: new Image(),
};

const heroSpritesKeyed = {
  idle: null,
  walk: null,
  attack: null,
  dead: null,
};

let heroWalkLeftImg = null;

const HERO_BASE = "./assets/hero/";
heroSprites.idle.src = `${HERO_BASE}hero_idle.png`;
heroSprites.walk.src = `${HERO_BASE}hero_walk.png`;
heroSprites.attack.src = `${HERO_BASE}hero_attack_bow.png`;
heroSprites.dead.src = `${HERO_BASE}hero_death.png`;

const arrowImg = new Image();
arrowImg.src = `${HERO_BASE}arrow.png`;
arrowImg.onerror = () => console.error("FAILED HERO", "arrow", arrowImg.src);

for (const [key, img] of Object.entries(heroSprites)) {
  img.onerror = () => console.error("FAILED HERO", key, img.src);
}

const SKELETON_BASE = "./assets/enemies/skeleton/";
const GOBLIN_BASE = "./assets/enemies/goblin/";
const FLYING_EYE_BASE = "./assets/enemies/flying_eye/";
const MUSHROOM_BASE = "./assets/enemies/mushroom/";
const MUSHROOM2_KEY = "mushroom_2";
const MUSHROOM2_BASE = "./assets/enemies/mushroom_2/";
const MUSHROOM2_RENDER_SCALE = 0.4;
const MUSHROOM2_META = {
  frameW: 80,
  frameH: 64,
  renderScale: MUSHROOM2_RENDER_SCALE,
  facesRightByDefault: false,
  anim: {
    idle: { file: "enemy_idle.png", frames: 7, fps: 6, loop: true },
    walk: { file: "enemy_walk.png", frames: 8, fps: 8, loop: true },
    attack: { file: "enemy_attack.png", frames: 10, fps: 9, loop: false },
    takeHit: { file: "enemy_take_hit.png", frames: 5, fps: 10, loop: false },
    death: { file: "enemy_death.png", frames: 15, fps: 10, loop: false, holdLast: true },
  },
};

const enemySheetWarned = {};

const ENEMY_FRAME_W = 150;
const ENEMY_FRAME_H = 150;

function loadEnemySprite(type, key, base, filename, fps, frameW = ENEMY_FRAME_W, framesOverride = null) {
  const img = new Image();
  const spr = { img, frames: 1, fps };
  img.onload = () => {
    spr.frames = framesOverride ?? Math.max(1, Math.round(img.width / frameW));
  };
  img.onerror = () => {
    console.error("FAILED ENEMY", type, key, img.src);
  };
  img.src = `${base}${filename}`;
  return spr;
}

const skeletonSprites = {
  idle: loadEnemySprite("skeleton", "idle", SKELETON_BASE, "enemy_idle.png", 6),
  walk: loadEnemySprite("skeleton", "walk", SKELETON_BASE, "enemy_walk.png", 8),
  attack: loadEnemySprite("skeleton", "attack", SKELETON_BASE, "enemy_attack.png", 10),
  takeHit: loadEnemySprite("skeleton", "takeHit", SKELETON_BASE, "enemy_take_hit.png", 10),
  death: loadEnemySprite("skeleton", "death", SKELETON_BASE, "enemy_death.png", 8),
  shield: loadEnemySprite("skeleton", "shield", SKELETON_BASE, "enemy_shield.png", 6),
};

const goblinSprites = {
  idle: loadEnemySprite("goblin", "idle", GOBLIN_BASE, "enemy_idle.png", 6),
  walk: loadEnemySprite("goblin", "walk", GOBLIN_BASE, "enemy_walk.png", 10),
  attack: loadEnemySprite("goblin", "attack", GOBLIN_BASE, "enemy_attack.png", 10),
  takeHit: loadEnemySprite("goblin", "takeHit", GOBLIN_BASE, "enemy_take_hit.png", 10),
  death: loadEnemySprite("goblin", "death", GOBLIN_BASE, "enemy_death.png", 8),
  shield: null,
};

goblinSprites.shield = goblinSprites.idle;

const flyingEyeSprites = {
  idle: loadEnemySprite("flying_eye", "idle", FLYING_EYE_BASE, "enemy_walk.png", 6),
  walk: loadEnemySprite("flying_eye", "walk", FLYING_EYE_BASE, "enemy_walk.png", 10),
  attack: loadEnemySprite("flying_eye", "attack", FLYING_EYE_BASE, "enemy_attack.png", 12),
  takeHit: loadEnemySprite("flying_eye", "takeHit", FLYING_EYE_BASE, "enemy_take_hit.png", 10),
  death: loadEnemySprite("flying_eye", "death", FLYING_EYE_BASE, "enemy_death.png", 8),
  shield: null,
};

flyingEyeSprites.shield = flyingEyeSprites.idle;

const mushroomSprites = {
  idle: loadEnemySprite("mushroom", "idle", MUSHROOM_BASE, "enemy_idle.png", 6),
  walk: loadEnemySprite("mushroom", "walk", MUSHROOM_BASE, "enemy_walk.png", 10),
  attack: loadEnemySprite("mushroom", "attack", MUSHROOM_BASE, "enemy_attack.png", 12),
  takeHit: loadEnemySprite("mushroom", "takeHit", MUSHROOM_BASE, "enemy_take_hit.png", 10),
  death: loadEnemySprite("mushroom", "death", MUSHROOM_BASE, "enemy_death.png", 8),
  shield: null,
};

mushroomSprites.meta = { facesRightByDefault: false };

const mushroom2Sprites = {
  idle: loadEnemySprite(MUSHROOM2_KEY, "idle", MUSHROOM2_BASE, MUSHROOM2_META.anim.idle.file, MUSHROOM2_META.anim.idle.fps, MUSHROOM2_META.frameW, MUSHROOM2_META.anim.idle.frames),
  walk: loadEnemySprite(MUSHROOM2_KEY, "walk", MUSHROOM2_BASE, MUSHROOM2_META.anim.walk.file, MUSHROOM2_META.anim.walk.fps, MUSHROOM2_META.frameW, MUSHROOM2_META.anim.walk.frames),
  attack: loadEnemySprite(MUSHROOM2_KEY, "attack", MUSHROOM2_BASE, MUSHROOM2_META.anim.attack.file, MUSHROOM2_META.anim.attack.fps, MUSHROOM2_META.frameW, MUSHROOM2_META.anim.attack.frames),
  takeHit: loadEnemySprite(MUSHROOM2_KEY, "takeHit", MUSHROOM2_BASE, MUSHROOM2_META.anim.takeHit.file, MUSHROOM2_META.anim.takeHit.fps, MUSHROOM2_META.frameW, MUSHROOM2_META.anim.takeHit.frames),
  death: loadEnemySprite(MUSHROOM2_KEY, "death", MUSHROOM2_BASE, MUSHROOM2_META.anim.death.file, MUSHROOM2_META.anim.death.fps, MUSHROOM2_META.frameW, MUSHROOM2_META.anim.death.frames),
  shield: null,
};

// Nuovi sprite (dati da assets/enemies/SPRITES.md).
// renderScale: proporzioni rispetto all'eroe (alto circa 74px sul canvas)
// body: riquadro del corpo nel fotogramma [sinistra, testa, destra, piedi], per appoggiare
// il mostro sul suo punto dei piedi e mettere la barra della vita sopra la testa.
const NEW_ENEMY_META = {
  warrior: {
    frameW: 184, frameH: 137, renderScale: 0.60, body: [71, 44, 115, 125],
    anim: {
      idle: { file: "Idle.png", frames: 6, fps: 8, loop: true },
      walk: { file: "Run.png", frames: 8, fps: 10, loop: true },
      attack: { file: "Attack1.png", frames: 4, fps: 8, loop: false },
      takeHit: { file: "Hit.png", frames: 3, fps: 10, loop: false },
      death: { file: "Death.png", frames: 9, fps: 10, loop: false, holdLast: true },
    },
  },
  wizard: {
    frameW: 150, frameH: 150, renderScale: 0.95, body: [57, 45, 89, 100],
    anim: {
      idle: { file: "Idle.png", frames: 8, fps: 8, loop: true },
      walk: { file: "Move.png", frames: 8, fps: 10, loop: true },
      attack: { file: "Attack.png", frames: 8, fps: 10, loop: false },
      takeHit: { file: "Take Hit.png", frames: 4, fps: 10, loop: false },
      death: { file: "Death.png", frames: 5, fps: 8, loop: false, holdLast: true },
    },
  },
  bat: {
    frameW: 87, frameH: 87, renderScale: 0.45, body: [20, 29, 74, 62],
    anim: {
      idle: { file: "fly.png", frames: 11, fps: 12, loop: true },
      walk: { file: "fly.png", frames: 11, fps: 12, loop: true },
      attack: { file: "attack.png", frames: 11, fps: 14, loop: false },
      takeHit: { file: "hurt.png", frames: 3, fps: 10, loop: false },
      death: { file: "death.png", frames: 4, fps: 8, loop: false, holdLast: true },
    },
  },
  rat: {
    frameW: 70, frameH: 70, renderScale: 0.46, body: [15, 25, 55, 45],
    anim: {
      idle: { file: "idle.png", frames: 10, fps: 8, loop: true },
      walk: { file: "run.png", frames: 8, fps: 12, loop: true },
      attack: { file: "attack_bite.png", frames: 12, fps: 14, loop: false },
      takeHit: { file: "hurt.png", frames: 3, fps: 10, loop: false },
      death: { file: "rat-death.png", frames: 6, fps: 10, loop: false, holdLast: true },
    },
  },
  slime: {
    frameW: 156, frameH: 156, renderScale: 1.10, body: [56, 69, 100, 87],
    anim: {
      idle: { file: "idle.png", frames: 14, fps: 10, loop: true },
      walk: { file: "walk.png", frames: 6, fps: 8, loop: true },
      attack: { file: "attack.png", frames: 19, fps: 14, loop: false },
      takeHit: { file: "hurt.png", frames: 3, fps: 10, loop: false },
      death: { file: "death.png", frames: 11, fps: 10, loop: false, holdLast: true },
    },
  },
  // Il mimic usa solo le animazioni della forma trasformata
  mimic: {
    frameW: 146, frameH: 146, renderScale: 1.70, body: [56, 53, 98, 83],
    anim: {
      idle: { file: "idle_transformed.png", frames: 9, fps: 8, loop: true },
      walk: { file: "walk.png", frames: 6, fps: 8, loop: true },
      attack: { file: "attack_1.png", frames: 14, fps: 14, loop: false },
      takeHit: { file: "hurt.png", frames: 3, fps: 10, loop: false },
      death: { file: "death.png", frames: 6, fps: 8, loop: false, holdLast: true },
    },
  },
};

function loadNewEnemySprites(type, meta) {
  const base = `./assets/enemies/${type}/`;
  const sprites = { shield: null };
  for (const [key, a] of Object.entries(meta.anim)) {
    sprites[key] = loadEnemySprite(type, key, base, a.file, a.fps, meta.frameW, a.frames);
  }
  return sprites;
}

const newEnemySprites = {};
for (const [type, meta] of Object.entries(NEW_ENEMY_META)) {
  newEnemySprites[type] = loadNewEnemySprites(type, meta);
}

// Fotogrammi attesi (da SPRITES.md); le animazioni non elencate ne hanno 4
const EXPECTED_ENEMY_FRAMES = {
  skeleton: { attack: 8 },
  goblin: { attack: 8, walk: 8 },
};

for (const [type, sprites] of [["skeleton", skeletonSprites], ["goblin", goblinSprites]]) {
  for (const key of Object.keys(sprites)) {
    const spr = sprites[key];
    const img = spriteImage(spr);
    if (!img) continue;
    img.addEventListener("load", () => {
      const w = img.naturalWidth;
      const expectedFrames = EXPECTED_ENEMY_FRAMES[type][key] ?? 4;
      const expectedW = ENEMY_FRAME_W * expectedFrames;
      const expectedH = ENEMY_FRAME_H;
      const warnKey = `${img.src}`;
      if (!enemySheetWarned[warnKey] && (w !== expectedW || img.naturalHeight !== expectedH)) {
        console.warn("Enemy sheet size unexpected:", img.src, w, img.naturalHeight);
        enemySheetWarned[warnKey] = true;
      }
    });
  }
}

function applyChromaKey(img, tolerance = 10) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return null;

  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  offCtx.drawImage(img, 0, 0);

  const imageData = offCtx.getImageData(0, 0, w, h);
  const data = imageData.data;

  const keyR = data[0];
  const keyG = data[1];
  const keyB = data[2];

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (
      Math.abs(r - keyR) <= tolerance &&
      Math.abs(g - keyG) <= tolerance &&
      Math.abs(b - keyB) <= tolerance
    ) {
      data[i + 3] = 0;
    }
  }

  offCtx.putImageData(imageData, 0, 0);
  return off;
}

function createMirroredWalkSheet(source, frames, frameW = FRAME_W) {
  const srcW = source.naturalWidth || source.width;
  const srcH = source.naturalHeight || source.height;
  if (!srcW || !srcH) return null;
  const out = document.createElement("canvas");
  out.width = frames * frameW; // anche l'ultimo fotogramma, che nel file è tagliato
  out.height = srcH;
  const outCtx = out.getContext("2d");
  for (let i = 0; i < frames; i++) {
    outCtx.save();
    outCtx.translate(i * frameW + frameW, 0);
    outCtx.scale(-1, 1);
    outCtx.drawImage(source, i * frameW, 0, frameW, srcH, 0, 0, frameW, srcH);
    outCtx.restore();
  }
  return out;
}

function imageHasAlpha(img) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) return false;
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const offCtx = off.getContext("2d");
  offCtx.drawImage(img, 0, 0);
  const data = offCtx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true;
  }
  return false;
}

// Fotogramma i di un foglio dell'eroe: passo fisso di FRAME_W pixel.
// L'ultimo fotogramma può essere più stretto, perché il file è tagliato.
function heroSlice(img, i) {
  const imgW = img.naturalWidth || img.width;
  const imgH = img.naturalHeight || img.height;
  const sx = i * FRAME_W;
  return { sx, sy: 0, sw: Math.max(1, Math.min(FRAME_W, imgW - sx)), sh: imgH };
}

// Numero di fotogrammi reale di ogni animazione dell'eroe (niente più stime dalla larghezza)
const heroFrameCounts = {
  idle: IDLE_FRAMES,
  walk: WALK_FRAMES,
  attack: ATTACK_FRAMES,
  dead: DEATH_FRAMES,
};

for (const key of ["idle", "walk", "attack", "dead"]) {
  heroSprites[key].addEventListener("load", () => {
    heroSpritesKeyed[key] = applyChromaKey(heroSprites[key], 12);
    if (key === "walk") {
      const base = heroSpritesKeyed.walk || heroSprites.walk;
      heroWalkLeftImg = createMirroredWalkSheet(base, WALK_FRAMES);
    }
  });
}

// ==========================
// WALKABLE AREA (mappa 1024x1024)
// ==========================
const walkablePolygon = [
  { x: 129, y: 891 },
  { x: 10, y: 1021 },
  { x: 1016, y: 1022 },
  { x: 763, y: 892 },
  { x: 712, y: 781 },
  { x: 891, y: 656 },
  { x: 995, y: 498 },
  { x: 849, y: 488 },
  { x: 452, y: 358 },
  { x: 311, y: 158 },
  { x: 345, y: 352 },
  { x: 9, y: 481 },
  { x: 214, y: 632 },
  { x: 218, y: 728 },
  { x: 216, y: 736 },
  { x: 36, y: 819 },
  { x: 210, y: 886 },
  { x: 150, y: 903 },
];

const well = { x: 512, y: 512, r: 48 };

// Basi dei lampioni che cadono dentro la zona calpestabile: nessuno ci passa attraverso
// (gli altri due lampioni, in alto al centro e a destra, sono già fuori dal poligono)
const lampObstacles = [
  { id: "lampione-sinistra", x: 82, y: 463, r: 10 },
  { id: "lampione-basso-sinistra", x: 267, y: 743, r: 10 },
  { id: "lampione-basso-centro", x: 692, y: 898, r: 10 },
  { id: "lampione-basso-destra", x: 907, y: 1001, r: 10 },
];

// ==========================
// PLAYER
// ==========================
const player = {
  x: 220,
  y: 640,
  w: BASE_W, // grandezza disegno sul canvas (non deve = FRAME_W)
  h: BASE_H,
  speed: 230,

  state: "idle", // "idle" | "walk" | "attack"
  facing: 1, // 1 -> right, -1 -> left
  hp: HERO_MAX_HP,
  maxHp: HERO_MAX_HP,
  iFrameTimer: 0,
  shootCd: 0,
  isDead: false,
  deadTime: 0,
  deadFrame: 0,

  frameIndex: 0,
  frameTimer: 0,
  frameDuration: 0.10, // velocità animazione (più basso = più veloce)

  animations: {
    idle: { frames: IDLE_FRAMES },
    walk: { frames: WALK_FRAMES },
    attack: { frames: ATTACK_FRAMES },
    dead: { frames: DEATH_FRAMES },
  },
};

const footY = player.y + BASE_H;
player.w = Math.round(BASE_W * DRAW_SCALE);
player.h = Math.round(BASE_H * DRAW_SCALE);
player.y = footY - player.h;

const skeleton = {
  type: "skeleton",
  x: player.x + 180,
  y: player.y + 60,
  w: player.w,
  h: player.h,
  speed: 150,
  state: "walk", // "idle" | "walk" | "attack" | "takeHit" | "death"
  facing: 1, // 1 -> right, -1 -> left
  frameIndex: 0,
  frameTimer: 0,
  attackCooldown: 0,
  sprites: skeletonSprites,
  moveState: "walk",
  idleState: "idle",
  animations: {
    idle: { frames: 4, fps: 6, loop: true },
    walk: { frames: 4, fps: 8, loop: true },
    attack: { frames: 8, fps: 10, loop: false },
    takeHit: { frames: 4, fps: 10, loop: false },
    death: { frames: 4, fps: 8, loop: false, holdLast: true },
  },
  vx: 0,
  vy: 0,
};

const goblin = {
  type: "goblin",
  x: player.x + 140,
  y: player.y + 60,
  w: player.w,
  h: player.h,
  speed: 170,
  renderScale: GOBLIN_RENDER_SCALE,
  state: "walk", // "idle" | "walk" | "attack" | "takeHit" | "death"
  facing: 1,
  frameIndex: 0,
  frameTimer: 0,
  attackCooldown: 0,
  sprites: goblinSprites,
  moveState: "walk",
  idleState: "idle",
  animations: {
    idle: { frames: 4, fps: 6, loop: true },
    walk: { frames: 8, fps: 10, loop: true },
    attack: { frames: 8, fps: 10, loop: false },
    takeHit: { frames: 4, fps: 10, loop: false },
    death: { frames: 4, fps: 8, loop: false, holdLast: true },
  },
  vx: 0,
  vy: 0,
};

const flyingEye = {
  type: "flying_eye",
  x: player.x + 260,
  y: player.y - 30,
  w: player.w,
  h: player.h,
  speed: 160,
  state: "idle", // "idle" | "walk" | "attack" | "takeHit" | "death"
  facing: 1,
  frameIndex: 0,
  frameTimer: 0,
  attackCooldown: 0,
  sprites: flyingEyeSprites,
  moveState: "walk",
  idleState: "idle",
  renderYOffset: 30,
  animations: {
    idle: { frames: 8, fps: 6, loop: true },
    walk: { frames: 8, fps: 10, loop: true },
    attack: { frames: 8, fps: 12, loop: false },
    takeHit: { frames: 4, fps: 10, loop: false },
    death: { frames: 4, fps: 8, loop: false, holdLast: true },
  },
  vx: 0,
  vy: 0,
};

const mushroom = {
  type: "mushroom",
  x: player.x - 260,
  y: player.y + 20,
  w: player.w,
  h: player.h,
  speed: 150,
  state: "idle",
  facing: 1,
  frameIndex: 0,
  frameTimer: 0,
  attackCooldown: 0,
  sprites: mushroomSprites,
  meta: mushroomSprites.meta,
  moveState: "walk",
  idleState: "idle",
  animations: {
    idle: { frames: 4, fps: 6, loop: true },
    walk: { frames: 4, fps: 10, loop: true },
    attack: { frames: 4, fps: 12, loop: false },
    takeHit: { frames: 4, fps: 10, loop: false },
    death: { frames: 4, fps: 8, loop: false, holdLast: true },
  },
  vx: 0,
  vy: 0,
};

const mushroom2 = {
  type: MUSHROOM2_KEY,
  x: player.x - 220,
  y: player.y + 20,
  w: player.w,
  h: player.h,
  speed: 150,
  state: "idle",
  facing: 1,
  frameIndex: 0,
  frameTimer: 0,
  attackCooldown: 0,
  sprites: mushroom2Sprites,
  moveState: "walk",
  idleState: "idle",
  animations: {
    idle: { frames: MUSHROOM2_META.anim.idle.frames, fps: MUSHROOM2_META.anim.idle.fps, loop: true },
    walk: { frames: MUSHROOM2_META.anim.walk.frames, fps: MUSHROOM2_META.anim.walk.fps, loop: true },
    attack: { frames: MUSHROOM2_META.anim.attack.frames, fps: MUSHROOM2_META.anim.attack.fps, loop: false },
    takeHit: { frames: MUSHROOM2_META.anim.takeHit.frames, fps: MUSHROOM2_META.anim.takeHit.fps, loop: false },
    death: { frames: MUSHROOM2_META.anim.death.frames, fps: MUSHROOM2_META.anim.death.fps, loop: false, holdLast: true },
  },
  meta: MUSHROOM2_META,
  vx: 0,
  vy: 0,
};

// Riquadro del corpo nel fotogramma degli sprite già esistenti [sinistra, testa, destra, piedi]
skeleton.body = [60, 50, 105, 101];
goblin.body = [58, 65, 91, 101];
flyingEye.body = [57, 61, 98, 92];
mushroom.body = [64, 64, 87, 101];
mushroom2.body = [25, 31, 55, 64];

function makeNewEnemyTemplate(type) {
  const meta = NEW_ENEMY_META[type];
  const animations = {};
  for (const [key, a] of Object.entries(meta.anim)) {
    animations[key] = { frames: a.frames, fps: a.fps, loop: a.loop };
    if (a.holdLast) animations[key].holdLast = true;
  }
  return {
    type,
    x: player.x,
    y: player.y,
    w: player.w,
    h: player.h,
    speed: 150,
    state: "idle",
    facing: 1,
    frameIndex: 0,
    frameTimer: 0,
    attackCooldown: 0,
    sprites: newEnemySprites[type],
    meta: { ...meta, facesRightByDefault: true },
    body: meta.body,
    moveState: "walk",
    idleState: "idle",
    animations,
    vx: 0,
    vy: 0,
  };
}

const newEnemyTemplates = {};
for (const type of Object.keys(NEW_ENEMY_META)) {
  newEnemyTemplates[type] = makeNewEnemyTemplate(type);
}
// Il pipistrello vola: lo disegno un po' sollevato da terra
newEnemyTemplates.bat.renderYOffset = 30;

const ENEMY_TEMPLATES = {
  skeleton,
  goblin,
  flying_eye: flyingEye,
  mushroom,
  [MUSHROOM2_KEY]: mushroom2,
  ...newEnemyTemplates,
};

// Creature della piazza: compaiono ogni tanto per l'atmosfera, con valori fissi
const PIAZZA_TYPES = ["flying_eye", MUSHROOM2_KEY];
const PIAZZA_NAMES = { flying_eye: "Flying Eye", [MUSHROOM2_KEY]: "Square Mushroom" };

let enemies = [skeleton, goblin, flyingEye, mushroom, mushroom2];

let nextEnemyId = 1;
let gameState = "attesa"; // "attesa" | "play" | "win" | "gameover"
let nemiciArena = [];     // i mostri scelti passati ad avviaArena
const missTexts = [];     // scritte "MISS" sopra i nemici
let gameWin = false;
let killCount = 0;
let gameTime = 0;
const spawnDirector = {
  startTime: 0,
  nextSpawnAt: 0,
  seededFirst: false,
  rand(min, max) { return min + Math.random() * (max - min); },
  computeInterval(elapsed) {
    const t = Math.max(0, Math.min(1, elapsed / RAMP_TIME));
    const minI = 3.4 + (1.4 - 3.4) * t;
    const maxI = 6.9 + (3.4 - 6.9) * t;
    return this.rand(minI, maxI);
  },
  computeBurst(availableSlots) {
    if (availableSlots <= 0) return 0;
    const want = (Math.random() < 0.45) ? 2 : 1;
    return Math.min(want, SPAWN_BURST_MAX, availableSlots);
  },
};

function initEnemy(enemy) {
  enemy.id = nextEnemyId++;
  enemy.speed = Number.isFinite(enemy.speed) ? enemy.speed : 110;
  enemy.attackRange = Number.isFinite(enemy.attackRange) ? enemy.attackRange : 55;
  enemy.aggroRange = Number.isFinite(enemy.aggroRange) ? enemy.aggroRange : 520;
  enemy.maxHp = enemy.maxHp || HERO_DMG * DESIRED_HITS;
  enemy.hp = enemy.maxHp;
  enemy.showHpUntil = 0;
  enemy.isDying = false;
  enemy.deathRemoveAt = null;
  enemy.attackId = 0;
  enemy.didHitThisAttack = false;
  enemy._hitThisAttack = false;
  enemy.attackTimer = 0;
  enemy._deathTimer = 0;
  enemy._remove = false;
  enemy._blocked = false;
  enemy._moved = false;
  enemy.blockedTimer = 0;
  enemy._blockedLogged = false;
  return enemy;
}

for (const e of enemies) {
  initEnemy(e);
}
enemies = []; // nessun nemico finché non viene chiamata avviaArena

function rectFromCenter(cx, cy, w, h) {
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

function getHeroHurtbox() {
  const feet = getFeetPoint(player.x, player.y, player.w, player.h);
  const w = player.w * 0.35;
  const h = player.h * 0.25;
  return { x: feet.x - w / 2, y: feet.y - h, w, h };
}

function getEnemyHurtbox(enemy) {
  const feet = getFeetPoint(enemy.x, enemy.y, enemy.w, enemy.h);
  const w = enemy.w * 0.35;
  const h = enemy.h * 0.25;
  return { x: feet.x - w / 2, y: feet.y - h, w, h };
}

// Pixel del canvas per 1 pixel del fotogramma
function getEnemyPixelScale(enemy) {
  const sh = enemy.meta?.frameH ?? ENEMY_FRAME_H;
  const targetH = window.__renderMetrics?.heroDH || getHeroRenderHeightPx();
  const perEnemyScale = (enemy.meta && typeof enemy.meta.renderScale === "number")
    ? enemy.meta.renderScale
    : (typeof enemy.renderScale === "number" ? enemy.renderScale : 1);
  return (targetH / sh) * ENEMY_SIZE_TWEAK * ENEMY_RENDER_SCALE * perEnemyScale;
}

function isEnemyFlipped(enemy) {
  const facesRightByDefault = (enemy.meta && typeof enemy.meta.facesRightByDefault === "boolean")
    ? enemy.meta.facesRightByDefault
    : true;
  let flipX = (enemy.facing >= 0) !== facesRightByDefault;
  if (enemy.type === "mushroom" && enemy.state === "walk") {
    flipX = !flipX;
  }
  return flipX;
}

// Dove si disegna il fotogramma: i piedi del corpo sul punto dei piedi
// (chi vola, flying_eye e bat, resta sollevato di renderYOffset)
function getEnemyDrawRect(enemy) {
  const s = getEnemyPixelScale(enemy);
  const frameW = enemy.meta?.frameW ?? ENEMY_FRAME_W;
  const frameH = enemy.meta?.frameH ?? ENEMY_FRAME_H;
  const feet = getFeetPoint(enemy.x, enemy.y, enemy.w, enemy.h);
  const w = frameW * s;
  const h = frameH * s;
  const y = feet.y - enemy.body[3] * s - (enemy.renderYOffset || 0);
  return { x: feet.x - w / 2, y, w, h, s };
}

// Il corpo visibile del nemico sul canvas: lo colpiscono le frecce
function getEnemyBodyBox(enemy) {
  const r = getEnemyDrawRect(enemy);
  const frameW = enemy.meta?.frameW ?? ENEMY_FRAME_W;
  let [left, top, right, bottom] = enemy.body;
  if (isEnemyFlipped(enemy)) {
    [left, right] = [frameW - right, frameW - left];
  }
  return { x: r.x + left * r.s, y: r.y + top * r.s, w: (right - left) * r.s, h: (bottom - top) * r.s };
}

function getHeroAttackBox() {
  const feet = getFeetPoint(player.x, player.y, player.w, player.h);
  const w = 70;
  const h = 55;
  const offsetX = player.facing === 1 ? 45 : -45;
  const offsetY = -40;
  return { x: feet.x + offsetX - w / 2, y: feet.y + offsetY - h, w, h };
}

function getHeroHp() {
  return { hp: player.hp, maxHp: Math.max(1, player.maxHp) };
}

function getKillCount() {
  return killCount;
}

function getEnemyAttackBox(enemy) {
  const feet = getFeetPoint(enemy.x, enemy.y, enemy.w, enemy.h);
  const w = 60;
  const h = 50;
  const offsetX = enemy.facing === 1 ? 40 : -40;
  const offsetY = -40;
  return { x: feet.x + offsetX - w / 2, y: feet.y + offsetY - h, w, h };
}

function getMushroomAttackBox(enemy) {
  const eb = getEnemyHurtbox(enemy);
  const dir = enemy.facing >= 0 ? 1 : -1;
  return {
    x: eb.x + (dir > 0 ? eb.w * 0.3 : -eb.w * 0.3),
    y: eb.y,
    w: eb.w,
    h: eb.h,
  };
}

function segmentIntersectsAABB(x1, y1, x2, y2, r) {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;

  function clip(p, q) {
    if (p === 0) return q >= 0;
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  }

  if (!clip(-dx, x1 - r.x)) return false;
  if (!clip(dx, r.x + r.w - x1)) return false;
  if (!clip(-dy, y1 - r.y)) return false;
  if (!clip(dy, r.y + r.h - y1)) return false;
  return true;
}

function resetGame() {
  player.hp = HERO_MAX_HP;
  player.iFrameTimer = 0;
  player.isDead = false;
  player.deadTime = 0;
  player.deadFrame = 0;
  player.state = "idle";
  player.frameIndex = 0;
  player.frameTimer = 0;
  killCount = 0;
  gameWin = false;
  gameState = "play";
  const now = performance.now() / 1000;
  spawnDirector.startTime = now;
  spawnDirector.nextSpawnAt = now;
  spawnDirector.seededFirst = false;
  enemies = [];
  arrows.length = 0;
  missTexts.length = 0;
}

function enterHeroDeath() {
  if (player.isDead) return;
  player.isDead = true;
  player.state = "dead";
  player.deadTime = 0;
  player.deadFrame = 0;
  gameState = "gameover";
}

// Crea un nemico a partire da un oggetto dati
// { sprite, nome, vita, armatura, velocita, danno }
function spawnEnemy(dati) {
  const template = ENEMY_TEMPLATES[dati.sprite];
  if (!template) throw new Error(`Sprite sconosciuto: ${dati.sprite}`);
  const e = { ...template };
  e.dati = dati;
  e.maxHp = dati.vita;
  e.speed = dati.velocita;
  e.vx = 0;
  e.vy = 0;
  e.frameIndex = 0;
  e.frameTimer = 0;
  e.attackCooldown = 0;
  e.attackTimer = 0;
  e.didHitThisAttack = false;
  e.state = e.idleState || "idle";
  e._remove = false;
  e._deathTimer = 0;
  initEnemy(e);
  return e;
}

function safeSpawnEnemy(dati) {
  let enemy;
  try {
    enemy = spawnEnemy(dati);
  } catch (e) {
    console.warn("SPAWN FAIL", dati, e);
    return false;
  }
  let spawned = false;
  for (let i = 0; i < 40; i++) {
    const rx = Math.random() * 1024;
    const ry = Math.random() * 1024;
    const dist = Math.hypot(rx - player.x, ry - player.y);
    if (dist >= 180 && canSpawnAt(enemy, rx, ry)) {
      enemy.x = rx;
      enemy.y = ry;
      enemies.push(enemy);
      spawned = true;
      break;
    }
  }
  if (!spawned) {
    const fx = clamp(player.x + (Math.random() > 0.5 ? 240 : -240), 0, 1024);
    const fy = clamp(player.y + (Math.random() > 0.5 ? 80 : -80), 0, 1024);
    if (canSpawnAt(enemy, fx, fy)) {
      enemy.x = fx;
      enemy.y = fy;
      enemies.push(enemy);
      spawned = true;
    }
  }
  return spawned;
}

// Dati fissi di una creatura della piazza (non conta per la vittoria)
function datiPiazza(type) {
  return {
    sprite: type,
    nome: PIAZZA_NAMES[type],
    vita: PIAZZA_HP,
    armatura: PIAZZA_ARMOR,
    velocita: ENEMY_TEMPLATES[type].speed * ENEMY_SPEED_MULT, // velocità di prima
    danno: String(ENEMY_DMG),
    piazza: true,
  };
}

function randomItem(list) {
  return list[Math.floor(Math.random() * list.length)];
}

// Fa comparire un nemico: di solito uno dei mostri scelti,
// circa 1 volta su 4 una creatura della piazza
function spawnRandomEnemy() {
  if (nemiciArena.length === 0) return false;
  const dati = Math.random() < PIAZZA_CHANCE
    ? datiPiazza(randomItem(PIAZZA_TYPES))
    : randomItem(nemiciArena);
  return safeSpawnEnemy(dati);
}

// ==========================
// REGOLE DELLO STUDENTE (js/arena.js)
// ==========================
function callRule(name, enemy, fallback) {
  if (typeof window[name] !== "function") return fallback;
  return window[name](enemy);
}

function ruleNumber(name, enemy, fallback) {
  const value = Number(callRule(name, enemy, fallback));
  if (!Number.isFinite(value)) {
    console.warn(`${name} non ha restituito un numero: uso ${fallback}`);
    return fallback;
  }
  return value;
}

// Interfaccia per lo studente: avvia la partita con i mostri scelti.
// nemiciScelti = [{ sprite, nome, vita, armatura, velocita, danno }, ...]
window.avviaArena = function (nemiciScelti) {
  const validi = (Array.isArray(nemiciScelti) ? nemiciScelti : []).filter((d) => {
    const ok = d && ENEMY_TEMPLATES[d.sprite];
    if (!ok) console.warn("avviaArena: sprite sconosciuto, salto questo mostro:", d);
    return ok;
  });
  if (validi.length === 0) {
    console.error("avviaArena: nessun mostro valido, la partita non parte.");
    return;
  }
  nemiciArena = validi;
  resetGame();
};

function getAliveEnemyCount() {
  let count = 0;
  for (const e of enemies) {
    if (e._remove || e.removeMe || e.dead) continue;
    if (e.isDying) continue;
    if (e.state === "death" || e.state === "dead" || e.state === "deathDone") continue;
    count++;
  }
  return count;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function isWalkablePoint(p) {
  return !getBlocker(p);
}

function canSpawnAt(enemy, x, y) {
  const feet = getFeetPoint(x, y, enemy.w, enemy.h);
  if (!isWalkablePoint(feet)) return false;
  const feetX = getFeetPoint(x + 1, y, enemy.w, enemy.h);
  const feetY = getFeetPoint(x, y + 1, enemy.w, enemy.h);
  return isWalkablePoint(feetX) || isWalkablePoint(feetY);
}

function getEnemyAnimDuration(enemy, state) {
  const anim = enemy.animations[state];
  if (!anim) return 0;
  const spr = resolveSpriteSafe(enemy, state);
  const img = spriteImage(spr);
  const frameW = enemy.meta?.frameW ?? ENEMY_FRAME_W;
  const frames = spr ? (spr.frames || (img && img.naturalWidth > 0 ? getEnemyFrameCount(img, frameW) : anim.frames)) : anim.frames;
  return frames / anim.fps;
}

function triggerEnemyDeath(enemy) {
  enemy.isDying = true;
  enemy.hp = 0;
  enemy.vx = 0;
  enemy.vy = 0;
  const deathKey = enemy.animations.death ? "death" : (enemy.animations.dead ? "dead" : (enemy.animations.die ? "die" : null));
  if (deathKey) {
    enemy.state = deathKey;
    enemy.frameIndex = 0;
    enemy.frameTimer = 0;
    enemy._deathTimer = 0;
  } else {
    enemy.deathRemoveAt = gameTime + 1.0;
  }
}

const arrows = [];

function spawnArrow() {
  const feet = getFeetPoint(player.x, player.y, player.w, player.h);
  const dir = player.facing === -1 ? -1 : 1;
  arrows.push({
    x: feet.x + (dir === 1 ? 22 : -22),
    y: feet.y - 38,
    vx: dir * 520,
    vy: 0,
    life: 0.9,
    ownerFacing: dir,
  });
}

function spawnArrowTowardMouse() {
  const feet = getFeetPoint(player.x, player.y, player.w, player.h);
  const x0 = feet.x + (player.facing === -1 ? -22 : 22);
  const y0 = feet.y - 38;
  const dx = mouse.worldX - x0;
  const dy = mouse.worldY - y0;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  player.facing = ux >= 0 ? 1 : -1;
  const now = performance.now() / 1000;
  arrows.push({
    x: x0 + ux * ARROW_SPAWN_OFFSET,
    y: y0 + uy * ARROW_SPAWN_OFFSET,
    prevX: x0 + ux * ARROW_SPAWN_OFFSET,
    prevY: y0 + uy * ARROW_SPAWN_OFFSET,
    vx: ux * ARROW_SPEED + weather.drift, // il vento del meteo sposta la freccia
    vy: uy * ARROW_SPEED,
    life: 1.2,
    ownerFacing: player.facing,
    ux,
    uy,
    spawnTime: now,
    _remove: false,
  });
}

// ==========================
// INPUT / DEBUG
// ==========================
let keys = new Set();
let debugOverlay = false;
let editMode = false;
let dragPointIndex = -1;
let lastCollision = null;

// ==========================
// UTILS
// ==========================
function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function aabbOverlap(a, b) {
  return rectsOverlap(a, b);
}

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY),
  };
}

const mouse = { screenX: 0, screenY: 0, worldX: 0, worldY: 0 };
let mouseDown = false;

function screenToWorld(mx, my) {
  return { x: mx, y: my };
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi + 0.00001) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function getFeetPoint(px, py, w = player.w, h = player.h) {
  return { x: px + w * 0.5, y: py + h * 0.92 };
}

function isBlockedByWell(point) {
  const dx = point.x - well.x;
  const dy = point.y - well.y;
  const r = well.r + 6;
  return (dx * dx + dy * dy) < (r * r);
}

function getBlocker(point) {
  if (!pointInPolygon(point, walkablePolygon)) {
    return { id: "walkablePolygon", type: "polygon", name: "walkable boundary" };
  }
  for (const lamp of lampObstacles) {
    const dx = point.x - lamp.x;
    const dy = point.y - lamp.y;
    if ((dx * dx + dy * dy) < (lamp.r * lamp.r)) {
      return { id: lamp.id, type: "circle", name: "lamp post" };
    }
  }
  return null;
}

function moveWithCollisions(entity, dx, dy) {
  const sizeW = entity.w;
  const sizeH = entity.h;
  const trackCollision = entity === player;
  if (trackCollision) lastCollision = null;
  // X
  if (dx !== 0) {
    const nextX = entity.x + dx;
    const nextY = entity.y;
    const nextFeet = getFeetPoint(nextX, nextY, sizeW, sizeH);
    const blocker = getBlocker(nextFeet);
    if (blocker) {
      if (trackCollision) lastCollision = { ...blocker, axis: "x" };
      dx = 0;
    }
    entity.x += dx;
  }

  // Y
  if (dy !== 0) {
    const nextX = entity.x;
    const nextY = entity.y + dy;
    const nextFeet = getFeetPoint(nextX, nextY, sizeW, sizeH);
    const blocker = getBlocker(nextFeet);
    if (blocker) {
      if (trackCollision) lastCollision = { ...blocker, axis: "y" };
      dy = 0;
    }
    entity.y += dy;
  }
}

function updateAnimation(dt) {
  if (player.isDead) {
    // morte: una sola volta a HERO_DEATH_FPS, poi resta sull'ultimo fotogramma (eroe a terra)
    const deathFrames = heroFrameCounts.dead;
    player.deadTime += dt;
    const nextFrame = Math.floor(player.deadTime * HERO_DEATH_FPS);
    player.deadFrame = Math.min(deathFrames - 1, nextFrame);
    player.frameIndex = player.deadFrame;
    player.state = "dead";
    return;
  }
  player.frameTimer += dt;

  if (player.frameTimer >= player.frameDuration) {
    player.frameTimer = 0;
    player.frameIndex++;

    const maxFrames = player.animations[player.state].frames;
    if (player.frameIndex >= maxFrames) {
      if (player.state === "attack") {
        // finito attacco: torna idle
        player.state = "idle";
      }
      player.frameIndex = 0;
    }
  }
}

function drawPlayer() {
  let sprite = heroSprites.idle;
  if (player.state === "walk") sprite = heroSprites.walk;
  if (player.state === "attack") sprite = heroSprites.attack;
  if (player.state === "dead") sprite = heroSprites.dead;
  const anim = player.animations[player.state] ?? { frames: 1 };
  const keyedSprite = heroSpritesKeyed[player.state] ?? null;
  let spriteForDraw = keyedSprite || sprite;
  if (player.state === "walk" && player.facing === -1 && heroWalkLeftImg) {
    spriteForDraw = heroWalkLeftImg;
  }

  // Se l'immagine non è ancora caricata, evita drawImage che può dare risultati strani
  const isImage = spriteForDraw instanceof HTMLImageElement;
  const isReady = spriteForDraw && (isImage
    ? (spriteForDraw._ready || (spriteForDraw.complete && spriteForDraw.naturalWidth > 0))
    : (spriteForDraw.width > 0));
  if (!isReady) {
    // fallback: rettangolo se sprite non c'è
    ctx.fillStyle = "rgba(0, 220, 255, 0.85)";
    const renderW = player.w;
    const renderH = player.h;
    ctx.fillRect(player.x, player.y, renderW, renderH);
    return;
  }

  const frameCount = heroFrameCounts[player.state] || anim.frames || 1;
  const frameIndex = Math.min(player.frameIndex, frameCount - 1);
  const slice = heroSlice(spriteForDraw, frameIndex);
  const renderW = player.w * HERO_RENDER_SCALE;
  const renderH = player.h * HERO_RENDER_SCALE;
  window.__renderMetrics = window.__renderMetrics || {};
  window.__renderMetrics.heroDW = renderW;
  window.__renderMetrics.heroDH = renderH; // misura di riferimento per i nemici, invariata

  // Stessa scala in pixel per tutti i fogli (prima ogni foglio veniva stirato a renderH,
  // e quello della morte, alto solo 43px, ingrandiva l'eroe) e piedi sempre sulla stessa riga
  const s = renderH / HERO_IDLE_SHEET_H;
  const feetY = player.y + player.h - (HERO_IDLE_SHEET_H - HERO_FEET_ROW.idle) * s;
  const frameLeft = player.x + player.w / 2 - (FRAME_W * s) / 2;
  const feetRow = HERO_FEET_ROW[player.state] ?? HERO_FEET_ROW.idle;

  ctx.drawImage(
    spriteForDraw,
    slice.sx,
    slice.sy,
    slice.sw,
    slice.sh,
    frameLeft,
    feetY - feetRow * s,
    slice.sw * s,
    slice.sh * s
  );
}

function getHeroRenderHeightPx() {
  return player.h;
}

function drawUI(ctx) {
  const { hp, maxHp } = getHeroHp();
  const kills = getKillCount();
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const x = canvas.width - UI.margin - UI.barW;
  const y = UI.margin;

  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(x - 6, y - 6, UI.barW + 12, UI.barH + 12);

  ctx.fillStyle = "red";
  ctx.fillRect(x, y, UI.barW, UI.barH);
  const greenH = Math.floor(UI.barH * ratio);
  const greenY = y + (UI.barH - greenH);
  ctx.fillStyle = "lime";
  ctx.fillRect(x, greenY, UI.barW, greenH);

  ctx.globalAlpha = 1;
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, UI.barW, UI.barH);

  ctx.font = UI.font;
  ctx.fillStyle = "white";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText(`Defeated: ${kills} / ${WIN_KILLS}`, canvas.width - UI.margin, y + UI.barH + UI.barGap);

  if (gameState === "win" || gameState === "gameover") {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    if (gameState === "win") {
      ctx.font = UI.winFont;
      ctx.fillText("WIN", canvas.width / 2, canvas.height / 2);
    } else {
      ctx.font = "28px system-ui";
      ctx.fillText("GAME OVER", canvas.width / 2, canvas.height / 2 - 5);
      ctx.font = "16px system-ui";
      ctx.fillText("Press R", canvas.width / 2, canvas.height / 2 + 22);
    }
  }
  ctx.restore();
}

function spriteImage(spriteOrNull) {
  if (!spriteOrNull) return null;
  if (spriteOrNull instanceof Image) return spriteOrNull;
  return spriteOrNull.img || null;
}

function resolveSpriteSafe(enemy, key) {
  const s = enemy?.sprites?.[key] ?? null;
  if (spriteImage(s)) return s;
  const idle = enemy?.sprites?.idle ?? null;
  if (spriteImage(idle)) return idle;
  return null;
}

function getEnemySprite(enemy, stateKey) {
  return enemy.sprites?.[stateKey] || enemy.sprites?.idle || null;
}

function getEnemyFrameCount(img, frameW = ENEMY_FRAME_W) {
  const w = img?.naturalWidth || img?.width || 0;
  return Math.max(1, Math.round(w / frameW));
}

function updateEnemyAnimation(enemy, dt) {
  const anim = enemy.animations[enemy.state];
  const spriteForAnim = resolveSpriteSafe(enemy, enemy.state);
  const animImg = spriteImage(spriteForAnim);
  const frameW = enemy.meta?.frameW ?? ENEMY_FRAME_W;
  const frames = spriteForAnim
    ? (spriteForAnim.frames || (animImg && animImg.naturalWidth > 0 ? getEnemyFrameCount(animImg, frameW) : anim.frames))
    : anim.frames;
  const frameDuration = 1 / anim.fps;
  enemy.frameTimer += dt;
  const nextFrame = Math.floor(enemy.frameTimer * anim.fps);

  if (anim.loop) {
    enemy.frameIndex = nextFrame % frames;
    return;
  }

  enemy.frameIndex = Math.min(frames - 1, nextFrame);
  if (nextFrame >= frames) {
    if (anim.holdLast) {
      enemy.frameIndex = frames - 1;
      return;
    }
    const moving = Math.hypot(enemy.vx, enemy.vy) > 1;
    enemy.state = moving ? enemy.moveState : enemy.idleState;
    enemy.frameIndex = 0;
    enemy.frameTimer = 0;
    if (enemy.isDying && enemy.state === "death") {
      enemy._remove = true;
    }
  }
}

function updateEnemy(enemy, dt) {
  if (enemy.isDying) {
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.deathRemoveAt && gameTime >= enemy.deathRemoveAt) {
      enemy._remove = true;
    }
    updateEnemyAnimation(enemy, dt);
    return;
  }
  enemy.speed = Number.isFinite(enemy.speed) ? enemy.speed : 110;
  enemy.attackRange = Number.isFinite(enemy.attackRange) ? enemy.attackRange : 55;
  enemy.aggroRange = Number.isFinite(enemy.aggroRange) ? enemy.aggroRange : 520;
  const heroFeet = getFeetPoint(player.x, player.y, player.w, player.h);
  const enemyFeet = getFeetPoint(enemy.x, enemy.y, enemy.w, enemy.h);
  const dx = heroFeet.x - enemyFeet.x;
  const dy = heroFeet.y - enemyFeet.y;
  const dist = Math.hypot(dx, dy);
  const prevX = enemy.x;
  const prevY = enemy.y;
  const attackRange = enemy.attackRange;
  const aggroRange = enemy.aggroRange;
  const attackCooldown = 0.6;
  const prevState = enemy.state;

  if (enemy.attackCooldown > 0) {
    enemy.attackCooldown = Math.max(0, enemy.attackCooldown - dt);
  }

  if (MUSHROOM_KEYS.has(enemy.type) && dist > 0.01) {
    enemy.facing = dx > 0 ? 1 : -1;
  }

  if (
    enemy.state !== "attack" &&
    enemy.state !== "takeHit" &&
    enemy.state !== "death" &&
    dist < attackRange &&
    enemy.attackCooldown === 0
  ) {
    enemy.state = "attack";
    enemy.frameIndex = 0;
    enemy.frameTimer = 0;
    enemy.attackCooldown = attackCooldown;
    enemy.attackTimer = 0;
    enemy.didHitThisAttack = false;
    enemy._hitThisAttack = false;
    enemy.attackId = (enemy.attackId || 0) + 1;
    if (MUSHROOM_KEYS.has(enemy.type)) {
      const hb = getHeroHurtbox();
      const heroCX = hb ? (hb.x + hb.w / 2) : player.x;
      const pvx = (typeof player.vx === "number") ? player.vx : 0;
      const targetCX = heroCX + pvx * MUSHROOM_HEADBUTT_LEAD;
      enemy._atkStartX = enemy.x;
      enemy._atkStartY = enemy.y;
      const desiredX = targetCX - enemy.w * 0.5;
      const dxLimit = clamp(desiredX - enemy._atkStartX, -MUSHROOM_HEADBUTT_MAX_LUNGE, MUSHROOM_HEADBUTT_MAX_LUNGE);
      enemy._atkTargetX = enemy._atkStartX + dxLimit;
      enemy._atkTargetY = enemy.y;
      enemy.facing = dxLimit >= 0 ? 1 : -1;
    }
  }

  if (enemy.state === "attack" || enemy.state === "takeHit" || enemy.state === "death") {
    enemy.vx = 0;
    enemy.vy = 0;
    if (enemy.state === "attack" && MUSHROOM_KEYS.has(enemy.type)) {
      const attackDur = getEnemyAnimDuration(enemy, "attack");
      let t = 0;
      if (attackDur > 0) {
        t = clamp(enemy.attackTimer / attackDur, 0, 1);
      } else {
        const frames = enemy.animations.attack?.frames ?? 1;
        t = clamp(enemy.frameIndex / Math.max(1, frames - 1), 0, 1);
      }
      const moveT = clamp((t - 0.35) / (1.0 - 0.35), 0, 1);
      if (typeof enemy._atkStartX === "number" && typeof enemy._atkTargetX === "number") {
        const desiredX = lerp(enemy._atkStartX, enemy._atkTargetX, moveT);
        moveWithCollisions(enemy, desiredX - enemy.x, 0);
      }
    }
  } else if (dist > attackRange && dist < aggroRange) {
    const nx = dx / dist;
    const ny = dy / dist;
    const moveSpeed = enemy.speed; // dati.velocita, già in pixel al secondo
    enemy.vx = nx * moveSpeed;
    enemy.vy = ny * moveSpeed;
    const stepX = enemy.vx * dt;
    const stepY = enemy.vy * dt;
    moveWithCollisions(enemy, stepX, stepY);
    const moved = (Math.abs(enemy.x - prevX) + Math.abs(enemy.y - prevY)) > 0.01;
    enemy._moved = moved;
    if (Math.abs(enemy.vx) > 0.1) {
      enemy.facing = enemy.vx >= 0 ? 1 : -1;
    }
    enemy.state = enemy.isDying ? "death" : enemy.moveState;
    enemy._blocked = !moved;
    if (!moved) {
      enemy.blockedTimer = (enemy.blockedTimer || 0) + dt;
      if (enemy.blockedTimer > 0.2) {
        enemy.x = prevX;
        enemy.y = prevY;
        moveWithCollisions(enemy, stepX, 0);
        if (enemy.x !== prevX) {
          enemy.blockedTimer = 0;
          enemy._blocked = false;
        } else {
          enemy.x = prevX;
          enemy.y = prevY;
          moveWithCollisions(enemy, 0, stepY);
          if (enemy.y !== prevY) {
            enemy.blockedTimer = 0;
            enemy._blocked = false;
          } else if (enemy.blockedTimer > 0.8) {
            const nxudge = prevX + (Math.random() > 0.5 ? 18 : -18);
            const nudgeY = prevY + (Math.random() > 0.5 ? 18 : -18);
            const nudgeFeet = getFeetPoint(nxudge, nudgeY, enemy.w, enemy.h);
            if (isWalkablePoint(nudgeFeet)) {
              enemy.x = nxudge;
              enemy.y = nudgeY;
              enemy.blockedTimer = 0;
              enemy._blocked = false;
            }
          }
        }
      }
    } else {
      enemy.blockedTimer = 0;
    }
  } else {
    enemy.vx = 0;
    enemy.vy = 0;
    enemy.state = enemy.isDying ? "death" : enemy.idleState;
    enemy._blocked = false;
    enemy._moved = false;
    enemy.blockedTimer = 0;
  }

  if (enemy.state === "attack") {
    enemy.attackTimer += dt;
  }

  enemy._dist = dist;
  if (enemy.type === "goblin") {
    if (enemy._blocked && !enemy._blockedLogged) {
      console.warn("Goblin blocked at", enemy.x, enemy.y);
      enemy._blockedLogged = true;
    }
    if (!enemy._blocked) enemy._blockedLogged = false;
  }

  if (enemy.isDying && enemy.state === "death") {
    enemy._deathTimer += dt;
    const deathDur = getEnemyAnimDuration(enemy, "death");
    if (deathDur > 0 && enemy._deathTimer >= deathDur + 0.2) {
      enemy._remove = true;
    }
  }

  updateEnemyAnimation(enemy, dt);
}

const enemyPlaceholderWarned = {};

function drawEnemy(enemy) {
  const stateKey = enemy.sprites[enemy.state] ? enemy.state : enemy.moveState;
  const spr = resolveSpriteSafe(enemy, stateKey);
  const spriteForDraw = spriteImage(spr);
  const anim = enemy.animations[enemy.state] ?? enemy.animations[enemy.moveState];

  const isImage = spriteForDraw instanceof HTMLImageElement;
  const isReady = spriteForDraw && (isImage
    ? (spriteForDraw.naturalWidth > 0)
    : (spriteForDraw.width > 0));
  if (!spr || !spriteForDraw || !isReady) {
    const warnKey = `${enemy.type}:${stateKey}`;
    if (!enemyPlaceholderWarned[warnKey]) {
      console.warn("PLACEHOLDER", enemy.type, "state=", enemy.state, "haveKeys=", Object.keys(enemy.sprites));
      enemyPlaceholderWarned[warnKey] = true;
    }
    ctx.fillStyle = "rgba(255, 160, 80, 0.85)";
    const renderW = enemy.w;
    const renderH = enemy.h;
    const renderX = enemy.x - (renderW - enemy.w) / 2;
    const renderY = enemy.y - (renderH - enemy.h);
    ctx.fillRect(renderX, renderY, renderW, renderH);
    return;
  }

  const spriteW = spriteForDraw.naturalWidth || spriteForDraw.width;
  const spriteH = spriteForDraw.naturalHeight || spriteForDraw.height;
  const frameW = enemy.meta?.frameW ?? ENEMY_FRAME_W;
  const frameH = enemy.meta?.frameH ?? ENEMY_FRAME_H;
  const frameCount = spr?.frames || (spriteForDraw && spriteForDraw.naturalWidth > 0 ? getEnemyFrameCount(spriteForDraw, frameW) : 1);
  const frameIndex = Math.min(enemy.frameIndex, frameCount - 1);
  const sw = frameW;
  const sh = frameH;
  const sx = frameIndex * frameW;
  const sy = 0;
  const warnKey = `${enemy.type}:${enemy.state}`;
  if (!enemySheetWarned[warnKey] && (spriteW < sw || spriteH < sh)) {
    console.warn(`Enemy ${enemy.type} ${enemy.state} sheet smaller than expected:`, spriteW, spriteH);
    enemySheetWarned[warnKey] = true;
  }

  const rect = getEnemyDrawRect(enemy);
  const scale = rect.s;
  const renderW = rect.w;
  const renderH = rect.h;
  const renderX = rect.x;
  const renderY = rect.y;
  const feetX = renderX + renderW / 2;
  const feetY = getFeetPoint(enemy.x, enemy.y, enemy.w, enemy.h).y;
  const headY = getEnemyBodyBox(enemy).y;

  ctx.save();
  const flipX = isEnemyFlipped(enemy);
  let drawX = renderX;
  if (flipX) {
    ctx.translate(renderX + renderW, 0);
    ctx.scale(-1, 1);
    drawX = 0;
  }
  ctx.drawImage(
    spriteForDraw,
    sx,
    sy,
    sw,
    sh,
    drawX,
    renderY,
    renderW,
    renderH
  );

  ctx.restore();
  ctx.save();

  if (gameTime < enemy.showHpUntil) {
    const barW = 46;
    const barH = 6;
    const barX = renderX + renderW / 2 - barW / 2;
    const barY = headY - 10;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(barX, barY, barW, barH);
    const ratio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 0;
    ctx.fillStyle = "rgba(60,220,90,0.95)";
    ctx.fillRect(barX, barY, barW * clamp(ratio, 0, 1), barH);
  }

  // Scritta "MISS": sale e sparisce in MISS_TIME secondi
  for (const m of missTexts) {
    if (m.enemy !== enemy) continue;
    const t = clamp((gameTime - m.start) / MISS_TIME, 0, 1);
    ctx.globalAlpha = 1 - t * t;
    ctx.font = '14px "Press Start 2P", monospace';
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    const textY = headY - 16 - t * 18;
    ctx.strokeText("MISS", renderX + renderW / 2, textY);
    ctx.fillText("MISS", renderX + renderW / 2, textY);
    ctx.globalAlpha = 1;
  }

  if (CFG.debugEnemyFrames) {
    ctx.strokeStyle = "rgba(0, 220, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(renderX, renderY, renderW, renderH);
    ctx.fillStyle = "rgba(0, 200, 120, 0.9)";
    ctx.beginPath();
    ctx.arc(feetX, feetY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(renderX, renderY - 32, 210, 28);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "12px system-ui";
    ctx.fillText(
      `${enemy.type} ${enemy.state} f:${enemy.frameIndex} s:${scale.toFixed(2)} ${sw}x${sh}`,
      renderX + 4,
      renderY - 12
    );
  }
  if (CFG.debugEnemyAI) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(renderX, renderY - 52, 220, 18);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "12px system-ui";
    ctx.fillText(
      `${enemy.type} ${enemy.state} vx:${enemy.vx.toFixed(1)} vy:${enemy.vy.toFixed(1)} dist:${(enemy._dist ?? 0).toFixed(1)} blocked:${!!enemy._blocked}`,
      renderX + 4,
      renderY - 39
    );
  }
  if (CFG.debugEnemyMove) {
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(renderX, renderY - 72, 240, 18);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.font = "12px system-ui";
    ctx.fillText(
      `${enemy.type} ${enemy.state} sp:${enemy.speed} dist:${(enemy._dist ?? 0).toFixed(1)} moved:${enemy._moved ? "yes" : "no"} bt:${(enemy.blockedTimer || 0).toFixed(2)}`,
      renderX + 4,
      renderY - 59
    );
    ctx.fillStyle = "rgba(0, 220, 120, 0.9)";
    ctx.beginPath();
    ctx.arc(feetX, feetY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ==========================
// METEO (impostato dallo studente con impostaMeteo)
// ==========================
const WEATHER_CATEGORIES = ["sereno", "nuvoloso", "nebbia", "pioggia", "neve", "temporale"];
const RAIN_DROPS = 200;
const STORM_DROPS = 340;
const SNOW_FLAKES = 160;
const RAIN_VX = 110;        // pioggia in diagonale (px/s), più la deriva
const PX = 2;               // griglia dei pixel degli effetti

const weather = {
  night: false,
  category: "sereno",
  drift: 0,                 // px/s aggiunti alla velocità orizzontale delle frecce
  particles: [],            // gocce o fiocchi, creati una volta sola
  fog: [],
  flashTime: 0,             // lampo in corso (secondi rimasti)
  nextFlashAt: 0,
};

function makeWeatherParticles() {
  weather.particles = [];
  const c = weather.category;
  const count = c === "pioggia" ? RAIN_DROPS : c === "temporale" ? STORM_DROPS : c === "neve" ? SNOW_FLAKES : 0;
  for (let i = 0; i < count; i++) {
    weather.particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: c === "neve" ? 28 + Math.random() * 30 : 520 + Math.random() * 160,
      size: Math.random() < 0.35 ? PX * 3 : PX * 2,
      phase: Math.random() * Math.PI * 2,
    });
  }
  weather.fog = [];
  if (c === "nebbia") {
    for (let i = 0; i < 3; i++) {
      weather.fog.push({
        x: Math.random() * canvas.width,
        y: 220 + i * 260 + Math.random() * 60,
        h: 90 + Math.random() * 50,
        speed: (12 + Math.random() * 14) * (i % 2 === 0 ? 1 : -1),
        alpha: 0.3 + Math.random() * 0.08,
      });
    }
  }
}

// Interfaccia per lo studente: si può chiamare quando si vuole, prima o dopo avviaArena.
// meteo = { notte: true/false, categoria: "sereno" | ... | "temporale", deriva: px/s }
window.impostaMeteo = function (meteo) {
  const m = meteo || {};
  let category = m.categoria ?? "sereno";
  if (!WEATHER_CATEGORIES.includes(category)) {
    console.warn("impostaMeteo: categoria sconosciuta, uso \"sereno\":", category);
    category = "sereno";
  }
  const drift = Number(m.deriva);
  weather.night = m.notte === true;
  weather.category = category;
  weather.drift = Number.isFinite(drift) ? drift : 0;
  weather.flashTime = 0;
  weather.nextFlashAt = gameTime + 4 + Math.random() * 5;
  makeWeatherParticles();
};

function updateWeather(dt) {
  dt = Math.min(dt, 0.1); // dopo una pausa della scheda non far saltare le particelle
  const c = weather.category;
  const w = canvas.width;
  const h = canvas.height;
  if (c === "pioggia" || c === "temporale") {
    const vx = RAIN_VX + weather.drift;
    for (const p of weather.particles) {
      p.y += p.speed * dt;
      p.x += vx * (p.speed / 600) * dt;
      if (p.y > h) {
        p.y -= h + 20;
        p.x = Math.random() * w;
      }
      if (p.x > w) p.x -= w;
      if (p.x < 0) p.x += w;
    }
  } else if (c === "neve") {
    for (const p of weather.particles) {
      p.y += p.speed * dt;
      p.x += (Math.sin(gameTime * 1.5 + p.phase) * 18 + weather.drift * 0.3) * dt;
      if (p.y > h) {
        p.y -= h + 10;
        p.x = Math.random() * w;
      }
      if (p.x > w) p.x -= w;
      if (p.x < 0) p.x += w;
    }
  } else if (c === "nebbia") {
    for (const f of weather.fog) {
      f.x += f.speed * dt;
      if (f.x > w) f.x -= w;
      if (f.x < 0) f.x += w;
    }
  }
  if (c === "temporale") {
    weather.flashTime = Math.max(0, weather.flashTime - dt);
    if (gameTime >= weather.nextFlashAt) {
      weather.flashTime = 0.25;
      weather.nextFlashAt = gameTime + 6 + Math.random() * 7;
    }
  }
}

// Tinta della piazza (nuvoloso, riserva notturna): solo sullo sfondo, così eroe e nemici restano ben visibili
function drawWeatherBackground() {
  // Cielo coperto, solo di giorno: meno colore ("saturation") e un po' più scuro ("multiply").
  // Nessuna delle due operazioni schiarisce; di notte lo sfondo è già scuro e resta com'è.
  if (!weather.night && (weather.category === "nuvoloso" || weather.category === "temporale")) {
    ctx.save();
    ctx.globalCompositeOperation = "saturation";
    ctx.fillStyle = "rgba(128, 128, 128, 0.35)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "multiply";
    ctx.fillStyle = "rgb(222, 224, 232)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  if (weather.night && !nightImageReady()) {
    // riserva: niente immagine notturna, scurisco lo sfondo di giorno
    ctx.fillStyle = "rgba(10, 18, 60, 0.5)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Effetti sopra la piazza e i personaggi, sotto l'interfaccia
function drawWeatherOverlay() {
  const c = weather.category;
  if (c === "nebbia") {
    // fasce con i bordi a gradini, in blocchi da 16px
    const block = 16;
    for (const f of weather.fog) {
      // di notte nebbia più tenue e più scura, per non sbiadire lo sfondo notturno
      ctx.fillStyle = weather.night
        ? `rgba(140, 150, 165, ${f.alpha * 0.5})`
        : `rgba(200, 205, 210, ${f.alpha})`;
      for (let x = 0; x < canvas.width; x += block) {
        const k = (x - f.x) / 140;
        const edge = Math.round((Math.sin(k) * 14 + Math.sin(k * 2.3) * 8) / 8) * 8;
        ctx.fillRect(x, f.y - edge, block, f.h + edge * 2);
      }
    }
  } else if (c === "pioggia" || c === "temporale") {
    // goccia = tre rettangolini a scalino, inclinati come la pioggia
    const step = (RAIN_VX + weather.drift) >= 0 ? PX : -PX;
    ctx.fillStyle = "rgba(205, 225, 255, 0.85)";
    for (const p of weather.particles) {
      const x = Math.round(p.x / PX) * PX;
      const y = Math.round(p.y / PX) * PX;
      ctx.fillRect(x, y, PX, PX * 3);
      ctx.fillRect(x + step, y + PX * 3, PX, PX * 3);
      ctx.fillRect(x + step * 2, y + PX * 6, PX, PX * 3);
    }
  } else if (c === "neve") {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    for (const p of weather.particles) {
      ctx.fillRect(Math.round(p.x / PX) * PX, Math.round(p.y / PX) * PX, p.size, p.size);
    }
  }
  if (weather.flashTime > 0) {
    // lampo breve con un doppio guizzo, mai a piena intensità
    const t = weather.flashTime;
    const alpha = (t > 0.17 || (t > 0.06 && t < 0.11)) ? 0.35 : 0.1;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

// Schermata prima di avviaArena: solo la piazza e la scritta al centro
function drawWaiting() {
  const text = "Preparing the Arena...";
  ctx.save();
  ctx.font = '24px "Press Start 2P", monospace';
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const boxW = ctx.measureText(text).width + 64;
  const boxH = 72;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
  ctx.strokeStyle = "#d4a537";
  ctx.lineWidth = 4;
  ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
  ctx.fillStyle = "white";
  ctx.fillText(text, cx, cy + 2);
  ctx.restore();
}

function draw() {
  ctx = canvas.getContext("2d"); // sempre il canvas vero, anche se un errore ha interrotto il velo notturno
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (canvas.width <= 0 || canvas.height <= 0) {
    canvas.width = 1024;
    canvas.height = 1024;
  }
  ctx.imageSmoothingEnabled = false; // cambiare la misura del canvas lo riattiva: sfondo sempre nitido
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // background (di notte la piazza con i lampioni accesi)
  const bgImg = (weather.night && nightImageReady()) ? bgNight : bg;
  if (bgImg.complete && bgImg.naturalWidth > 0) {
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#222";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#eee";
    ctx.font = "16px system-ui";
    ctx.fillText("Put the background in assets/background.png", 20, 30);
  }
  drawWeatherBackground();

  if (gameState === "attesa") {
    drawWeatherOverlay();
    drawWaiting();
    return;
  }

  // Di notte eroe, nemici e frecce si disegnano su un livello a parte,
  // che poi riceve un velo scuro leggero solo dove ci sono loro
  const mainCtx = ctx;
  if (weather.night) {
    ctx = actorCtx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, actorLayer.width, actorLayer.height);
  }

  // enemies
  for (const enemy of enemies) {
    drawEnemy(enemy);
  }

  // arrows
  for (const a of arrows) {
    // la freccia punta dove sta andando davvero (con la deriva del vento)
    const angle = (a.vx || a.vy)
      ? Math.atan2(a.vy, a.vx)
      : Math.atan2(a.uy || 0, a.ux || (a.ownerFacing === -1 ? -1 : 1));
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.rotate(angle);
    if (arrowImg.complete && arrowImg.naturalWidth > 0) {
      const baseW = arrowImg.naturalWidth || 24;
      const baseH = arrowImg.naturalHeight || 8;
      const w = baseW * ARROW_RENDER_SCALE;
      const h = baseH * ARROW_RENDER_SCALE;
      ctx.drawImage(arrowImg, -w * 0.35, -h / 2, w, h);
    } else {
      ctx.strokeStyle = "rgba(240,240,240,0.95)";
      ctx.beginPath();
      const len = 26 * ARROW_RENDER_SCALE;
      ctx.moveTo(-len * 0.35, 0);
      ctx.lineTo(len * 0.65, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  // player
  drawPlayer();

  if (ctx !== mainCtx) {
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(10, 18, 50, 0.22)";
    ctx.fillRect(0, 0, actorLayer.width, actorLayer.height);
    ctx.globalCompositeOperation = "source-over";
    ctx = mainCtx;
    ctx.drawImage(actorLayer, 0, 0);
  }

  // meteo sopra la piazza e i personaggi, sotto l'interfaccia
  drawWeatherOverlay();

  if (CFG.debugHitboxes) {
    const heroH = getHeroHurtbox();
    const heroA = getHeroAttackBox();
    ctx.save();
    ctx.strokeStyle = "rgba(80,220,255,0.9)";
    ctx.strokeRect(heroH.x, heroH.y, heroH.w, heroH.h);
    ctx.strokeStyle = "rgba(255,180,60,0.9)";
    ctx.strokeRect(heroA.x, heroA.y, heroA.w, heroA.h);
    ctx.strokeStyle = "rgba(120,255,120,0.9)";
    for (const enemy of enemies) {
      const eh = getEnemyBodyBox(enemy);
      ctx.strokeRect(eh.x, eh.y, eh.w, eh.h);
      if (enemy.state === "attack" && MUSHROOM_KEYS.has(enemy.type)) {
        const atk = getMushroomAttackBox(enemy);
        ctx.strokeStyle = "rgba(255,120,120,0.9)";
        ctx.strokeRect(atk.x, atk.y, atk.w, atk.h);
        ctx.strokeStyle = "rgba(120,255,120,0.9)";
      }
    }
    ctx.restore();
  }

  // debug overlay
  if (debugOverlay || editMode) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.font = "12px system-ui";

    // walkable polygon
    if (walkablePolygon.length > 0) {
      const polySelected = lastCollision?.id === "walkablePolygon";
      ctx.strokeStyle = polySelected ? "rgba(255, 210, 70, 0.95)" : "rgba(80, 200, 255, 0.95)";
      ctx.beginPath();
      ctx.moveTo(walkablePolygon[0].x, walkablePolygon[0].y);
      for (let i = 1; i < walkablePolygon.length; i++) {
        ctx.lineTo(walkablePolygon[i].x, walkablePolygon[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      for (let i = 0; i < walkablePolygon.length; i++) {
        const p = walkablePolygon[i];
        const isSelected = i === dragPointIndex;
        ctx.fillStyle = isSelected ? "rgba(255, 210, 70, 0.95)" : "rgba(255, 255, 255, 0.9)";
        ctx.fillRect(p.x - 3, p.y - 3, 6, 6);
      }

      const polyLabel = `id:walkablePolygon type:polygon pts:${walkablePolygon.length}`;
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(walkablePolygon[0].x, walkablePolygon[0].y - 18, 260, 18);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(polyLabel, walkablePolygon[0].x + 4, walkablePolygon[0].y - 5);
    }

    // lamp posts
    for (const lamp of lampObstacles) {
      ctx.strokeStyle = lastCollision?.id === lamp.id ? "rgba(255, 210, 70, 0.95)" : "rgba(255, 110, 110, 0.95)";
      ctx.beginPath();
      ctx.arc(lamp.x, lamp.y, lamp.r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // well
    const wellSelected = lastCollision?.id === "well";
    ctx.strokeStyle = wellSelected ? "rgba(255, 210, 70, 0.95)" : "rgba(255, 110, 110, 0.95)";
    ctx.beginPath();
    ctx.arc(well.x, well.y, well.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(well.x - well.r, well.y - well.r - 18, 220, 18);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText(`id:well type:circle x:${well.x} y:${well.y} r:${well.r}`, well.x - well.r + 4, well.y - well.r - 5);

    // foot point
    const foot = getFeetPoint(player.x, player.y);
    ctx.fillStyle = "rgba(60, 220, 90, 0.95)";
    ctx.beginPath();
    ctx.arc(foot.x, foot.y, 4, 0, Math.PI * 2);
    ctx.fill();

    if (debugOverlay) {
      const panelX = 10;
      const panelY = 10;
      const panelW = 320;
      const panelH = 128;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillText(`Debug (G): ${debugOverlay ? "ON" : "OFF"}`, panelX + 8, panelY + 18);
      ctx.fillText(`Colliders: 2`, panelX + 8, panelY + 34);
      ctx.fillText(`Player: x:${Math.round(player.x)} y:${Math.round(player.y)}`, panelX + 8, panelY + 50);
      ctx.fillText(`Feet: x:${Math.round(foot.x)} y:${Math.round(foot.y)}`, panelX + 8, panelY + 66);
      ctx.fillText(`insidePolygon: ${pointInPolygon(foot, walkablePolygon)}`, panelX + 8, panelY + 82);
      ctx.fillText(`insideWell: ${isBlockedByWell(foot)}`, panelX + 8, panelY + 98);
      if (lastCollision) {
        ctx.fillText(
          `Colliding: ${lastCollision.id} (${lastCollision.axis})`,
          panelX + 8,
          panelY + 114
        );
      }
    }

  if (debugOverlay) {
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fillText("DEBUG ON", 10, 14);
  }
    ctx.restore();
  }

  drawUI(ctx);
}

// ==========================
// MAIN LOOP
// ==========================
let last = performance.now();
let frameCount = 0;
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  frameCount++;

  try {
    gameTime += dt;
    updateWeather(dt);
    if (player.iFrameTimer > 0) {
      player.iFrameTimer = Math.max(0, player.iFrameTimer - dt);
    }

    if (gameState === "attesa") {
      // niente da aggiornare finché non viene chiamata avviaArena
    } else if (gameState === "win") {
      // freeze totale su WIN
    } else if (player.isDead) {
      player.state = "dead";
      updateAnimation(dt);
    } else {
      // Movimento solo se NON sta attaccando e non in Edit Mode
      let vx = 0, vy = 0;
      let moving = false;

      if (!editMode && player.state !== "attack") {
        if (keys.has("KeyA")) { vx -= 1; moving = true; }
        if (keys.has("KeyD")) { vx += 1; moving = true; }
        if (keys.has("KeyW")) { vy -= 1; moving = true; }
        if (keys.has("KeyS")) { vy += 1; moving = true; }

        // normalizza diagonale
        if (vx !== 0 && vy !== 0) {
          const inv = 1 / Math.sqrt(2);
          vx *= inv; vy *= inv;
        }

        // stato animazione
        player.state = moving ? "walk" : "idle";
        if (vx !== 0) player.facing = vx > 0 ? 1 : -1;

        moveWithCollisions(player, vx * player.speed * dt, vy * player.speed * dt);
      } else if (editMode && player.state !== "attack") {
        player.state = "idle";
      }

      updateAnimation(dt);

      // niente tiro continuo: si tira solo al mousedown (una freccia per clic)
      if (player.shootCd > 0) {
        player.shootCd = Math.max(0, player.shootCd - dt);
      }
    }

    if (!editMode && gameState === "play") {
      for (const enemy of enemies) {
        updateEnemy(enemy, dt);
      }
    } else {
      for (const enemy of enemies) {
        enemy.vx = 0;
        enemy.vy = 0;
      }
    }

    if (gameState === "play") {
      const heroHurt = getHeroHurtbox();

      const now = performance.now() / 1000;
      for (const arrow of arrows) {
        arrow.prevX = arrow.x;
        arrow.prevY = arrow.y;
        arrow.x += arrow.vx * dt;
        arrow.y += arrow.vy * dt;
        arrow.life -= dt;
      }
      for (let i = arrows.length - 1; i >= 0; i--) {
        const a = arrows[i];
        const age = (a.spawnTime != null) ? (now - a.spawnTime) : 999;
        const armed = age >= ARROW_ARM_TIME;
        if (a.life <= 0 || a.x < 0 || a.x > 1024 || a.y < 0 || a.y > 1024) {
          arrows.splice(i, 1);
          continue;
        }
        if (!armed) continue;
        for (const enemy of enemies) {
          if (enemy.isDying) continue;
          const eHurt = getEnemyBodyBox(enemy);
          if (segmentIntersectsAABB(a.prevX, a.prevY, a.x, a.y, eHurt)) {
            arrows.splice(i, 1);
            if (!callRule("calcolaColpo", enemy, true)) {
              missTexts.push({ enemy, start: gameTime });
              break;
            }
            enemy.hp -= ruleNumber("calcolaDannoFreccia", enemy, 1);
            enemy.showHpUntil = gameTime + 1.5;
            if (enemy.hp <= 0) {
              triggerEnemyDeath(enemy);
              if (!enemy.dati.piazza) killCount++;
            }
            break;
          }
        }
      }

      for (const enemy of enemies) {
        if (enemy.state === "attack") {
          const attackDur = getEnemyAnimDuration(enemy, "attack");
          const tNorm = attackDur > 0 ? enemy.attackTimer / attackDur : 0;
          const isMushroom = MUSHROOM_KEYS.has(enemy.type);
          const winStart = isMushroom ? MUSHROOM_HIT_WINDOW_START : 0.40;
          const winEnd = isMushroom ? MUSHROOM_HIT_WINDOW_END : 0.70;
          if (tNorm >= winStart && tNorm <= winEnd) {
            const eAttack = isMushroom ? getMushroomAttackBox(enemy) : getEnemyAttackBox(enemy);
            const alreadyHit = isMushroom ? enemy._hitThisAttack : enemy.didHitThisAttack;
            if (aabbOverlap(eAttack, heroHurt) && player.iFrameTimer === 0 && !alreadyHit) {
              player.hp -= ruleNumber("calcolaDannoMostro", enemy, ENEMY_DMG);
              player.iFrameTimer = 0.45;
              enemy.didHitThisAttack = true;
              enemy._hitThisAttack = true;
              if (player.hp <= 0) {
                player.hp = 0;
                enterHeroDeath();
              }
            }
          }
        }
      }

      // remove dead enemies (e le scritte "MISS" scadute o di nemici rimossi)
      enemies = enemies.filter((e) => !e._remove);
      for (let i = missTexts.length - 1; i >= 0; i--) {
        const m = missTexts[i];
        if (gameTime - m.start > MISS_TIME || !enemies.includes(m.enemy)) missTexts.splice(i, 1);
      }

      // spawn director
      const spawnNow = performance.now() / 1000;
      const elapsed = spawnNow - spawnDirector.startTime;
      if (gameState === "play") {
        const alive = getAliveEnemyCount();
        const slots = Math.max(0, MAX_ENEMIES_ALIVE - alive);
        if (!spawnDirector.seededFirst) {
          if (slots > 0) {
            spawnRandomEnemy();
          }
          spawnDirector.seededFirst = true;
          spawnDirector.nextSpawnAt = spawnNow + spawnDirector.computeInterval(elapsed);
        } else if (spawnNow >= spawnDirector.nextSpawnAt) {
          if (slots > 0) {
            const burst = spawnDirector.computeBurst(slots);
            for (let k = 0; k < burst; k++) {
              spawnRandomEnemy();
            }
            spawnDirector.nextSpawnAt = spawnNow + spawnDirector.computeInterval(elapsed);
          } else {
            spawnDirector.nextSpawnAt = spawnNow + spawnDirector.rand(0.8, 1.6);
          }
        }
      }

      if (!gameWin && getKillCount() >= WIN_KILLS) {
        gameWin = true;
        gameState = "win";
      }
    }
  } catch (err) {
    window.__lastErr = `${err?.message || err} (update)`;
  }

  try {
    draw();
  } catch (err) {
    window.__lastErr = `${err?.message || err} (draw)`;
  }

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ==========================
// INPUT HANDLERS
// ==========================
window.addEventListener("keydown", (e) => {
  if (!DEBUG && (
    e.code === "KeyG" ||
    e.code === "KeyM" ||
    e.code === "F2" ||
    e.code === "KeyF" ||
    e.code === "KeyH" ||
    e.code === "KeyP"
  )) {
    return;
  }
  // Debug overlay toggle
  if (DEBUG && e.code === "KeyG") {
    debugOverlay = !debugOverlay;
    e.preventDefault();
    e.stopPropagation();
    console.log("debugOverlay:", debugOverlay);
    return;
  }
  if (DEBUG && e.code === "KeyM") {
    CFG.debugEnemyMove = !CFG.debugEnemyMove;
    e.preventDefault();
    e.stopPropagation();
    console.log("debugEnemyMove:", CFG.debugEnemyMove);
    return;
  }

  // Edit Mode
  if (DEBUG && e.code === "F2") {
    editMode = !editMode;
    dragPointIndex = -1;
    if (editMode) keys.clear();
    e.preventDefault();
    return;
  }

  if (DEBUG && e.code === "Enter" && editMode) {
    editMode = false;
    dragPointIndex = -1;
    e.preventDefault();
    return;
  }

  if (DEBUG && e.code === "KeyP") {
    console.log("walkablePolygon:", JSON.stringify(walkablePolygon, null, 2));
    e.preventDefault();
    return;
  }

  if (DEBUG && e.code === "KeyF") {
    CFG.debugEnemyFrames = !CFG.debugEnemyFrames;
    e.preventDefault();
    return;
  }
  if (DEBUG && e.code === "KeyH") {
    CFG.debugHitboxes = !CFG.debugHitboxes;
    e.preventDefault();
    return;
  }
  if (e.code === "KeyR") {
    if (gameState !== "attesa") resetGame(); // ricomincia con gli stessi mostri scelti
    e.preventDefault();
    return;
  }

  if (editMode) {
    if (e.code === "Backspace") {
      walkablePolygon.pop();
      dragPointIndex = -1;
      e.preventDefault();
      return;
    }
  }

  keys.add(e.code);
});

window.addEventListener("keyup", (e) => {
  keys.delete(e.code);
});

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) mouseDown = true;
  e.preventDefault();
  if (e.button === 0 && gameState === "play" && !player.isDead) {
    if (player.shootCd <= 0) {
      player.shootCd = SHOOT_COOLDOWN;
      spawnArrowTowardMouse();
    }
  }
  if (DEBUG && debugOverlay && !editMode && e.button === 0) {
    const pos = getMousePos(e);
    const hits = [];
    if (pointInPolygon(pos, walkablePolygon)) {
      hits.push({
        id: "walkablePolygon",
        type: "polygon",
        points: walkablePolygon,
      });
    }
    if (isBlockedByWell(pos)) {
      hits.push({
        id: "well",
        type: "circle",
        x: well.x,
        y: well.y,
        r: well.r,
      });
    }
    console.log("colliders_at_point:", pos, hits);
  }

  if (!DEBUG || !editMode || e.button !== 0) return;
  const pos = getMousePos(e);
  const pickRadius = 8;

  dragPointIndex = -1;
  for (let i = walkablePolygon.length - 1; i >= 0; i--) {
    const p = walkablePolygon[i];
    const dx = pos.x - p.x;
    const dy = pos.y - p.y;
    if ((dx * dx + dy * dy) <= (pickRadius * pickRadius)) {
      dragPointIndex = i;
      return;
    }
  }

  walkablePolygon.push({ x: pos.x, y: pos.y });
  dragPointIndex = walkablePolygon.length - 1;
});

canvas.addEventListener("mousemove", (e) => {
  const pos = getMousePos(e);
  mouse.screenX = pos.x;
  mouse.screenY = pos.y;
  const w = screenToWorld(pos.x, pos.y);
  mouse.worldX = w.x;
  mouse.worldY = w.y;
  if (!DEBUG || !editMode || dragPointIndex < 0) return;
  walkablePolygon[dragPointIndex].x = pos.x;
  walkablePolygon[dragPointIndex].y = pos.y;
});

window.addEventListener("mouseup", (e) => {
  if (e.button === 0) mouseDown = false;
});

window.addEventListener("blur", () => {
  mouseDown = false;
});

canvas.addEventListener("contextmenu", (e) => e.preventDefault());

canvas.addEventListener("mouseup", () => {
  if (!editMode) return;
  dragPointIndex = -1;
});

// ==========================
// LOAD MESSAGES
// ==========================
bg.onload = () => {
  // solo messaggio, niente di più
};

bg.onerror = () => {
  console.error("ERRORE: non trovo assets/background.png (nome/cartella corretti?)");
};
