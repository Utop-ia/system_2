// ---------------------
// Parametri Principali
// ---------------------
const config = {
  bgOpacity: 1.0,
  bgFillBlur: false,
  bgBlurPx: 12,
  bgBlurOpacity: 0.6,
  bgAnchor: "center",
  bgOffsetX: 0,
  bgOffsetY: 0,
  bgFit: "contain", // contain | cover | stretch | center | tile
  bgLockCanvas: false,
  bgTileScale: 1.0,
  bgMode: "color", // "color" | "image"
  
  speedPrimary: 30,
  intervalPrimary: 0.3,
  strokePrimary: 80,
  alphaPrimary: 0.8,
  decayFactorPrimary: 1.5,
  heartSizePrimary: 1,
  maxWavesPrimary: 5,

  speedSecondary: 30,
  intervalSecondary: 0.2,
  strokeSecondary: 20,
  alphaSecondary: 0.8,
  decayFactorSecondary: 1.5,
  heartSizeSecondary: 1,
  maxWavesSecondary: 5,

  maxReflections: 2,
  alphaThreshold: 0.005,
  maxSources: 5,
  enableClipping: true,
  saveBackground: true,
  waveDisplayMode: "both",
  zoomSelection: "1",
};

const pal = {
  bg: "#ffffff",
  stroke: "#385a3e",
  stroke2: "#acab6b",
};

const defaultConfig = JSON.parse(JSON.stringify(config));
const defaultPal = JSON.parse(JSON.stringify(pal));

// ---- Export deterministico + parametri coda/hold
const TARGET_FPS = 60;
const FRAME_DT = 1 / TARGET_FPS;
const MAX_TAIL_SECONDS = 6; // limite massimo per la coda
const EXTRA_HOLD_SECONDS = 0.5; // piccolo fermo immagine finale

let t = 0;
let paused = false;
let sources = [];
const stats = { fps: 0, sourcesCount: 0, wavesDrawn: 0 };
let maxR;
let waveLayer;
let bgImage = null; let bgImageMeta = null; let bgBlurBuffer = null; let bgBlurDirty = true;
const vectorPool = [];
let p5Canvas; // riferimento al canvas principale

let isPlayingAnimation = false;
let animationTime = 0;
let currentSequence = null;
let nextEventIndex = 0;

let isRecordingAnimation = false;
let recordingStartTime = 0;
let recordedEvents = [];
let savedAnimationCount = 0;
const userAnimationPresets = {};

let capturer; // istanziato al momento dell’export
let isExporting = false; // stato export (webm o png)

const getPooledVector = (x, y) => {
  if (vectorPool.length > 0) {
    const v = vectorPool.pop();
    v.set(x, y);
    return v;
  }
  return createVector(x, y);
};
const returnToPool = (v) => {
  if (vectorPool.length < 500) vectorPool.push(v);
};

// ===================================================================
// PRESET DEGLI STATI DEL BRAND
// ===================================================================
const brandPresets = {
  "Flusso Armonico (Default)": {
    config: {
      speedPrimary: 50,
      intervalPrimary: 0.4,
      strokePrimary: 50,
      alphaPrimary: 0.8,
      decayFactorPrimary: 2.0,
      heartSizePrimary: 1,
      maxWavesPrimary: 3,

      speedSecondary: 50,
      intervalSecondary: 0.4,
      strokeSecondary: 25,
      alphaSecondary: 0.8,
      decayFactorSecondary: 2.0,
      heartSizeSecondary: 1,
      maxWavesSecondary: 3,

      maxReflections: 2,
    },
  },
  "Eco Vitale": {
    config: {
      speedPrimary: 120,
      intervalPrimary: 0.1,
      strokePrimary: 40,
      alphaPrimary: 0.9,
      decayFactorPrimary: 0.8,
      heartSizePrimary: 0.8,
      maxWavesPrimary: 5,

      speedSecondary: 120,
      intervalSecondary: 0.1,
      strokeSecondary: 15,
      alphaSecondary: 0.9,
      decayFactorSecondary: 0.8,
      heartSizeSecondary: 0.8,
      maxWavesSecondary: 5,

      maxReflections: 1,
    },
  },
  "Trama Storica": {
    config: {
      speedPrimary: 20,
      intervalPrimary: 0.8,
      strokePrimary: 60,
      alphaPrimary: 0.4,
      decayFactorPrimary: 3.0,
      heartSizePrimary: 1.2,
      maxWavesPrimary: 10,

      speedSecondary: 20,
      intervalSecondary: 0.8,
      strokeSecondary: 30,
      alphaSecondary: 0.4,
      decayFactorSecondary: 3.0,
      heartSizeSecondary: 1.2,
      maxWavesSecondary: 10,

      maxReflections: 4,
    },
  },
  "Sapore Pieno": {
    config: {
      speedPrimary: 40,
      intervalPrimary: 0.4,
      strokePrimary: 120,
      alphaPrimary: 0.85,
      decayFactorPrimary: 2.5,
      heartSizePrimary: 1.5,
      maxWavesPrimary: 5,

      speedSecondary: 40,
      intervalSecondary: 0.4,
      strokeSecondary: 60,
      alphaSecondary: 0.85,
      decayFactorSecondary: 2.5,
      heartSizeSecondary: 1.5,
      maxWavesSecondary: 5,

      maxReflections: 2,
    },
  },
  "Respiro Calmo": {
    config: {
      speedPrimary: 15,
      intervalPrimary: 1.5,
      strokePrimary: 10,
      alphaPrimary: 0.2,
      decayFactorPrimary: 4.0,
      heartSizePrimary: 1,
      maxWavesPrimary: 5,

      speedSecondary: 15,
      intervalSecondary: 1.5,
      strokeSecondary: 5,
      alphaSecondary: 0.2,
      decayFactorSecondary: 4.0,
      heartSizeSecondary: 1,
      maxWavesSecondary: 5,

      maxReflections: 1,
    },
  },
  "Gesto Creativo": {
    config: {
      speedPrimary: 80,
      intervalPrimary: 0.15,
      strokePrimary: 10,
      alphaPrimary: 0.9,
      decayFactorPrimary: 1.5,
      heartSizePrimary: 0.5,
      maxWavesPrimary: 7,

      speedSecondary: 25,
      intervalSecondary: 0.6,
      strokeSecondary: 90,
      alphaSecondary: 0.7,
      decayFactorSecondary: 2.5,
      heartSizeSecondary: 2,
      maxWavesSecondary: 7,

      maxReflections: 3,
    },
  },
};

// ===================================================================
// DATABASE DELLE ANIMAZIONI
// ===================================================================
const animationPresets = {
  "Battito Umbro (Default)": {
    duration: 8,
    events: [
      {
        time: 0.5,
        x: 0.5,
        y: 0.5,
        override: {
          heartSizePrimary: 1.2,
          speedPrimary: 50,
          strokePrimary: 60,
          maxWavesPrimary: 2,
          heartSizeSecondary: 0.8,
          speedSecondary: 40,
          strokeSecondary: 20,
          maxWavesSecondary: 1,
        },
      },
      {
        time: 1.2,
        x: 0.5,
        y: 0.5,
        override: {
          heartSizePrimary: 0.7,
          speedPrimary: 150,
          strokePrimary: 15,
          maxWavesPrimary: 1,
          waveDisplayMode: "primary",
        },
      },
      {
        time: 4.0,
        x: 0.5,
        y: 0.5,
        override: {
          heartSizePrimary: 1.2,
          speedPrimary: 50,
          strokePrimary: 60,
          maxWavesPrimary: 2,
          heartSizeSecondary: 0.8,
          speedSecondary: 40,
          strokeSecondary: 20,
          maxWavesSecondary: 1,
        },
      },
      {
        time: 4.7,
        x: 0.5,
        y: 0.5,
        override: {
          heartSizePrimary: 0.7,
          speedPrimary: 150,
          strokePrimary: 15,
          maxWavesPrimary: 1,
          waveDisplayMode: "primary",
        },
      },
    ],
  },
  "Centro Pulsante": {
    duration: 3,
    events: [{ time: 0.5, x: 0.5, y: 0.5 }],
  },
  "Pioggia Lenta": {
    duration: 5,
    events: [
      { time: 0.2, x: 0.25, y: 0.2 },
      { time: 0.9, x: 0.7, y: 0.4 },
      { time: 1.5, x: 0.4, y: 0.8 },
      { time: 2.3, x: 0.8, y: 0.7 },
      { time: 3.0, x: 0.15, y: 0.6 },
    ],
  },
  "Onda Orizzontale": {
    duration: 4,
    events: [
      { time: 0.1, x: 0.1, y: 0.5 },
      { time: 0.3, x: 0.2, y: 0.5 },
      { time: 0.5, x: 0.3, y: 0.5 },
      { time: 0.7, x: 0.4, y: 0.5 },
      { time: 0.9, x: 0.5, y: 0.5 },
      { time: 1.1, x: 0.6, y: 0.5 },
      { time: 1.3, x: 0.7, y: 0.5 },
      { time: 1.5, x: 0.8, y: 0.5 },
      { time: 1.7, x: 0.9, y: 0.5 },
    ],
  },
  Fioritura: {
    duration: 6,
    events: [
      { time: 0.1, x: 0.5, y: 0.5 },
      { time: 0.5, x: 0.5, y: 0.3 },
      { time: 0.7, x: 0.7, y: 0.5 },
      { time: 0.9, x: 0.5, y: 0.7 },
      { time: 1.1, x: 0.3, y: 0.5 },
      { time: 1.5, x: 0.78, y: 0.22 },
      { time: 1.7, x: 0.9, y: 0.5 },
      { time: 1.9, x: 0.78, y: 0.78 },
      { time: 2.1, x: 0.5, y: 0.9 },
      { time: 2.3, x: 0.22, y: 0.78 },
      { time: 2.5, x: 0.1, y: 0.5 },
      { time: 2.7, x: 0.22, y: 0.22 },
      { time: 2.9, x: 0.5, y: 0.1 },
    ],
  },
  "Le Colline Umbre": {
    duration: 6,
    events: [
      { time: 0.2, x: 0.2, y: 0.85 },
      { time: 0.5, x: 0.5, y: 0.9 },
      { time: 0.8, x: 0.8, y: 0.8 },
      { time: 1.5, x: 0.35, y: 0.75 },
      { time: 1.9, x: 0.65, y: 0.8 },
    ],
  },
  "Echi dal Borgo": {
    duration: 4,
    events: [
      { time: 0.3, x: 0.2, y: 0.25 },
      { time: 1.0, x: 0.8, y: 0.75 },
    ],
  },
  "Spirale Spirituale": {
    duration: 5,
    events: [
      { time: 0.1, x: 0.5, y: 0.5 },
      { time: 0.4, x: 0.65, y: 0.4 },
      { time: 0.8, x: 0.6, y: 0.65 },
      { time: 1.3, x: 0.35, y: 0.6 },
      { time: 1.9, x: 0.25, y: 0.3 },
      { time: 2.5, x: 0.75, y: 0.25 },
    ],
  },
};

// ===================================================================
// Disegna il cuore
// ===================================================================
function drawHeartShapeUniversal(c, x, y, size) {
  c.push();
  c.translate(x, y);
  c.scale(size / 100.25);
  c.translate(-50.125, -39.795);
  c.noFill();
  c.beginShape();
  c.vertex(64.77, 6.19);
  c.vertex(50.13, 20.83);
  c.vertex(35.49, 6.19);
  c.bezierVertex(27.4, -1.9, 14.29, -1.9, 6.2, 6.19);
  c.bezierVertex(-2.29, 14.28, -2.29, 27.39, 6.2, 35.48);
  c.vertex(20.84, 50.12);
  c.vertex(50.13, 79.41);
  c.vertex(79.42, 50.12);
  c.vertex(94.06, 35.48);
  c.bezierVertex(102.15, 27.39, 102.15, 14.28, 94.06, 6.19);
  c.bezierVertex(85.97, -1.9, 72.86, -1.9, 64.77, 6.19);
  c.endShape(c.CLOSE);
  c.pop();
}

// ===================================================================
// Setup
// ===================================================================
function setup() {
  const canvasContainer = document.getElementById("canvas-container");
  p5Canvas = createCanvas(
    canvasContainer.clientWidth,
    canvasContainer.clientHeight
  );
  p5Canvas.parent(canvasContainer);

  pixelDensity(1);
  frameRate(60);
  maxR = Math.hypot(width, height);

  waveLayer = createGraphics(width, height);
  waveLayer.noFill();
  waveLayer.strokeCap(SQUARE);

  initializeUI();
  updateUIFromState();
}

// ===================================================================
// Funzione Applica Zoom
// ===================================================================
function applyCanvasZoom() {
  const canvasEl = document.querySelector("#canvas-container canvas");
  if (!canvasEl) return;

  const zoomValue = document.getElementById("zoom-select").value;
  config.zoomSelection = zoomValue;

  if (zoomValue === "fit") {
    const container = document.getElementById("canvas-container");
    const containerW = container.clientWidth - 40;
    const containerH = container.clientHeight - 40;

    const canvasAspectRatio = width / height;
    const containerAspectRatio = containerW / containerH;

    let newWidth, newHeight;

    if (canvasAspectRatio > containerAspectRatio) {
      newWidth = containerW;
      newHeight = containerW / canvasAspectRatio;
    } else {
      newHeight = containerH;
      newWidth = containerH * canvasAspectRatio;
    }

    canvasEl.style.width = newWidth + "px";
    canvasEl.style.height = newHeight + "px";
  } else {
    const zoomFactor = Number(zoomValue);
    canvasEl.style.width = width * zoomFactor + "px";
    canvasEl.style.height = height * zoomFactor + "px";
  }
}

// ===================================================================
// Disegno interattivo (runtime)
// ===================================================================
function draw() {
  if (isExporting) return; // durante export usiamo il loop deterministico

  const dt = paused ? 0 : deltaTime / 1000;
  updateSimulation(dt);
  renderCanvas();
}

// ===================================================================
// Aggiorna simulazione
// ===================================================================
function updateSimulation(dt) {
  t += dt;

  if (isPlayingAnimation && !paused) {
    animationTime += dt;
    while (
      currentSequence &&
      nextEventIndex < currentSequence.events.length &&
      animationTime >= currentSequence.events[nextEventIndex].time
    ) {
      const event = currentSequence.events[nextEventIndex];
      sources.unshift(
        new WaveSource(event.x * width, event.y * height, event.override)
      );
      nextEventIndex++;
    }
    if (currentSequence && animationTime >= currentSequence.duration) {
      isPlayingAnimation = false;
      currentSequence = null;
      document.getElementById("play-animation-btn").textContent = "Avvia";
    }
  }

  for (let i = sources.length - 1; i >= 0; i--) {
    const src = sources[i];
    src.update(dt);
    if (!src.isAlive()) {
      src.destroy();
      sources.splice(i, 1);
    }
  }
}

// ===================================================================
// Render canvas (layering: nuovi sopra)
// ===================================================================
function renderCanvas() {
  if (config.saveBackground) {
    if (config.bgMode === "image" && bgImage) { waveLayer.clear(); drawBackgroundImage(waveLayer, bgImage); }
    else { waveLayer.background(pal.bg); }
  } else {
    waveLayer.clear();
  }

  stats.wavesDrawn = 0;

  // Disegna sorgenti dalla più vecchia alla più recente (nuove sopra)
  for (let i = sources.length - 1; i >= 0; i--) {
    const src = sources[i];
    stats.wavesDrawn += src.drawWaveLayer(waveLayer);
  }

  if (config.bgMode === "image" && bgImage) { drawBackgroundImage(window, bgImage); }
  else { background(pal.bg); }
  image(waveLayer, 0, 0);

  if (paused) {
    fill(0, 0, 0, 100);
    noStroke();
    rect(0, 0, width, height);
    fill(255, 255, 255, 200);
    textSize(Math.min(width, height) * 0.1);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("PAUSA", width / 2, height / 2);
  }

  updateStats();
}

// ===================================================================
// WaveSource
// ===================================================================
class WaveSource {
  constructor(x, y, override = null) {
    this.pos = getPooledVector(x, y);
    this.t = 0;
    this.imageSources = [];
    this.override = override;
    this.calculateImageSources();
  }

  calculateImageSources() {
    this.imageSources.forEach((s) => returnToPool(s.pos));
    this.imageSources = [];
    const r = this.override?.maxReflections ?? config.maxReflections;
    for (let ix = -r; ix <= r; ix++) {
      for (let iy = -r; iy <= r; iy++) {
        const sx =
          ix % 2 === 0
            ? this.pos.x + ix * width
            : width - this.pos.x + ix * width;
        const sy =
          iy % 2 === 0
            ? this.pos.y + iy * height
            : height - this.pos.y + iy * height;
        this.imageSources.push({
          pos: getPooledVector(sx, sy),
          scaleX: ix % 2 === 0 ? 1 : -1,
          scaleY: iy % 2 === 0 ? 1 : -1,
        });
      }
    }
  }

  update(dt) {
    this.t += dt;
  }

  drawWaveLayer(c) {
    let total = 0;
    const waveDisplayMode =
      this.override?.waveDisplayMode ?? config.waveDisplayMode;
    if (waveDisplayMode === "both" || waveDisplayMode === "primary") {
      total += this.drawWave("primary", c);
    }
    if (waveDisplayMode === "both" || waveDisplayMode === "secondary") {
      total += this.drawWave("secondary", c);
    }
    return total;
  }

  drawWave(type, c) {
    const suffix = type === "primary" ? "Primary" : "Secondary";
    const o = this.override;

    const speed = o?.["speed" + suffix] ?? config["speed" + suffix];
    const interval = o?.["interval" + suffix] ?? config["interval" + suffix];
    const strokeW = o?.["stroke" + suffix] ?? config["stroke" + suffix];
    const alphaBase = o?.["alpha" + suffix] ?? config["alpha" + suffix];
    const color =
      o?.["stroke" + (type === "primary" ? "" : "2")] ??
      pal["stroke" + (type === "primary" ? "" : "2")];
    const decayFactor =
      o?.["decayFactor" + suffix] ?? config["decayFactor" + suffix];
    const heartSize = o?.["heartSize" + suffix] ?? config["heartSize" + suffix];
    const maxWaves = o?.["maxWaves" + suffix] ?? config["maxWaves" + suffix];

    let wavesDrawn = 0;
    c.strokeWeight(strokeW);

    // Disegna onde dalla più vecchia alla più recente (recenti in primo piano)
    for (const imgSrc of this.imageSources) {
      for (let i = maxWaves - 1; i >= 0; i--) {
        const r = speed * (this.t - i * interval);
        if (r < 0 || r > maxR) continue;
        if (!isHeartVisible(imgSrc.pos.x, imgSrc.pos.y, r * 2 * heartSize))
          continue;
        const alpha = calcAlpha(alphaBase, r, maxR, decayFactor);
        if (alpha < config.alphaThreshold) continue;

        const hexAlpha = Math.floor(alpha * 255)
          .toString(16)
          .padStart(2, "0");
        c.stroke(`${color}${hexAlpha}`);

        c.push();
        c.translate(imgSrc.pos.x, imgSrc.pos.y);
        c.scale(imgSrc.scaleX, imgSrc.scaleY);
        drawHeartShapeUniversal(c, 0, 0, r * 2 * heartSize);
        c.pop();

        wavesDrawn++;
      }
    }
    return wavesDrawn;
  }

  isAlive() {
    const maxWaves = Math.max(
      this.override?.maxWavesPrimary ?? config.maxWavesPrimary,
      this.override?.maxWavesSecondary ?? config.maxWavesSecondary
    );
    const interval = Math.max(
      this.override?.intervalPrimary ?? config.intervalPrimary,
      this.override?.intervalSecondary ?? config.intervalSecondary
    );
    const speed = Math.max(
      this.override?.speedPrimary ?? config.speedPrimary,
      this.override?.speedSecondary ?? config.speedSecondary
    );
    const decay = Math.max(
      this.override?.decayFactorPrimary ?? config.decayFactorPrimary,
      this.override?.decayFactorSecondary ?? config.decayFactorSecondary
    );
    const oldestWaveTime = this.t - (maxWaves - 1) * interval;
    if (oldestWaveTime < 0) return true;
    const r_max = speed * oldestWaveTime;
    return calcAlpha(1.0, r_max, maxR, decay) > config.alphaThreshold;
  }

  destroy() {
    this.imageSources.forEach((s) => returnToPool(s.pos));
    this.imageSources = [];
  }
}

// ===================================================================
// Supporto
// ===================================================================
function calcAlpha(base, r, maxR, decayFactor) {
  if (r <= 0) return 0;
  const nR = r / maxR;
  if (nR > 1) return 0;
  return base * Math.pow(1 - nR, 2) * Math.exp(-r / (maxR * decayFactor));
}

function isHeartVisible(x, y, size) {
  if (!config.enableClipping) return true;
  const halfSize = size / 2;
  return (
    x + halfSize >= 0 &&
    x - halfSize <= width &&
    y + halfSize >= 0 &&
    y - halfSize <= height
  );
}

function anySourceAlive() {
  return sources.length > 0 && sources.some((s) => s.isAlive());
}

// ===================================================================
// UI
// ===================================================================

// ================= Background Image Helpers =================
// ============== Background fit helpers ==============
function computeDrawRect(imgW, imgH, canvasW, canvasH, mode, anchor="center", offX=0, offY=0) {
  if (mode === 'stretch') return { x:Math.round(offX), y:Math.round(offY), w:canvasW, h:canvasH };
  // anchor fractions
  const map = {
    'top-left':[0,0],'top':[0.5,0],'top-right':[1,0],
    'left':[0,0.5],'center':[0.5,0.5],'right':[1,0.5],
    'bottom-left':[0,1],'bottom':[0.5,1],'bottom-right':[1,1]
  };
  const a = map[anchor] || [0.5,0.5];
  const imgAR = imgW / imgH;
  const canAR = canvasW / canvasH;
  let w, h;
  if (mode === 'cover') {
    if (imgAR > canAR) { h = canvasH; w = Math.ceil(h * imgAR); }
    else { w = canvasW; h = Math.ceil(w / imgAR); }
  } else if (mode === 'contain' || mode === 'center') {
    if (mode === 'center') { w = imgW; h = imgH; }
    else {
      if (imgAR > canAR) { w = canvasW; h = Math.ceil(w / imgAR); }
      else { h = canvasH; w = Math.ceil(h * imgAR); }
    }
  } else { // default to contain
    if (imgAR > canAR) { w = canvasW; h = Math.ceil(w / imgAR); }
    else { h = canvasH; w = Math.ceil(h * imgAR); }
  }
  const x = Math.round((canvasW - w) * a[0] + offX - (a[0] * (canvasW - w)));
  const y = Math.round((canvasH - h) * a[1] + offY - (a[1] * (canvasH - h)));
  return { x, y, w, h };
}

function drawBackgroundImage(p5ctx, img) {
  const mode = config.bgFit || 'contain';
  const anchor = config.bgAnchor || 'center';
  const offX = parseInt(config.bgOffsetX || 0, 10);
  const offY = parseInt(config.bgOffsetY || 0, 10);
  const opacity = Math.max(0, Math.min(1, config.bgOpacity || 1));

  // Optional blurred fill layer
  if (config.bgFillBlur && img) {
    if (!bgBlurBuffer || bgBlurBuffer.width !== width || bgBlurBuffer.height !== height) {
      bgBlurBuffer = createGraphics(width, height);
      bgBlurDirty = true;
    }
    if (bgBlurDirty) {
      bgBlurBuffer.clear();
      // Always cover for blur fill
      const rCover = computeDrawRect(img.width, img.height, width, height, 'cover', 'center', 0, 0);
      bgBlurBuffer.image(img, rCover.x, rCover.y, rCover.w, rCover.h);
      try { bgBlurBuffer.filter(BLUR, Math.max(0, config.bgBlurPx || 0)); } catch(e){}
      bgBlurDirty = false;
    }
    const blurOpacity = Math.max(0, Math.min(1, config.bgBlurOpacity ?? 0.6));
    p5ctx.push();
    p5ctx.tint(255, Math.round(blurOpacity * 255));
    p5ctx.image(bgBlurBuffer, 0, 0);
    p5ctx.pop();
  }

  if (mode === 'tile') {
    const scale = Math.max(0.1, config.bgTileScale || 1.0);
    const w = Math.max(1, Math.floor(img.width * scale));
    const h = Math.max(1, Math.floor(img.height * scale));
    p5ctx.push();
    p5ctx.tint(255, Math.round(opacity * 255));
    for (let y = -((offY%h+h)%h); y < height; y += h) {
      for (let x = -((offX%w+w)%w); x < width; x += w) {
        p5ctx.image(img, x, y, w, h);
      }
    }
    p5ctx.pop();
    return;
  }

  const r = computeDrawRect(img.width, img.height, width, height, mode, anchor, offX, offY);
  p5ctx.push();
  p5ctx.tint(255, Math.round(opacity * 255));
  p5ctx.image(img, r.x, r.y, r.w, r.h);
  p5ctx.pop();
}

// ============== URL loader ==============
async function loadBackgroundFromUrl(url) {
  return new Promise((resolve, reject) => {
    loadImage(url, (img) => resolve(img), (err) => reject(err));
  });
}

// ============== Presets (LocalStorage) ==============
const BG_PRESETS_KEY = "bg_presets_v1";

function loadBgPresets() {
  try {
    const raw = localStorage.getItem(BG_PRESETS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch(e) {
    console.warn("Preset sfondo: parse error", e);
    return [];
  }
}

function saveBgPresets(list) {
  try {
    localStorage.setItem(BG_PRESETS_KEY, JSON.stringify(list));
  } catch(e) {
    console.warn("Preset sfondo: save error", e);
  }
}

function renderBgPresetsList() {
  const el = document.getElementById('bg-presets-list');
  if (!el) return;
  const list = loadBgPresets();
  el.innerHTML = '';
  list.forEach((p, idx) => {
    const item = document.createElement('div');
    item.className = 'bg-preset-item';
    const name = document.createElement('div');
    name.className = 'name';
    name.textContent = p.name || `Preset ${idx+1}`;
    const actions = document.createElement('div');
    actions.className = 'actions';
    const applyBtn = document.createElement('button');
    applyBtn.textContent = 'Applica';
    const renameBtn = document.createElement('button');
    renameBtn.textContent = 'Rinomina';
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Elimina';

    applyBtn.addEventListener('click', async () => {
      try {
        config.bgFit = p.bgFit || 'contain';
        config.bgOpacity = (typeof p.bgOpacity === 'number') ? p.bgOpacity : (config.bgOpacity || 1.0);
        config.bgBlurOpacity = (typeof p.bgBlurOpacity === 'number') ? p.bgBlurOpacity : (config.bgBlurOpacity ?? 0.6);
        config.bgFillBlur = !!p.bgFillBlur;
        config.bgBlurPx = (typeof p.bgBlurPx === 'number') ? p.bgBlurPx : (config.bgBlurPx || 0);
        config.bgAnchor = p.bgAnchor || 'center';
        config.bgOffsetX = p.bgOffsetX || 0;
        config.bgOffsetY = p.bgOffsetY || 0;
        config.bgLockCanvas = !!p.bgLockCanvas;
        config.bgTileScale = p.bgTileScale || 1.0;
        document.getElementById('bg-fit').value = config.bgFit;
        document.getElementById('bg-lock-canvas').checked = config.bgLockCanvas;
        const op = document.getElementById('bg-opacity'); const opn = document.getElementById('bg-opacity-num'); if (op && opn) { op.value = Math.round((config.bgOpacity||1)*100); opn.value = Math.round((config.bgOpacity||1)*100);} 
        const bop = document.getElementById('bg-blur-opacity'); const bopn = document.getElementById('bg-blur-opacity-num'); if (bop && bopn) { bop.value = Math.round((config.bgBlurOpacity??0.6)*100); bopn.value = Math.round((config.bgBlurOpacity??0.6)*100);} 
        document.getElementById('bg-fill-blur').checked = !!config.bgFillBlur; const br = document.getElementById('bg-blur-row'); if (br) br.style.display = config.bgFillBlur ? 'grid' : 'none'; 
        const bp = document.getElementById('bg-blur'); if (bp) bp.value = String(config.bgBlurPx||0);
        const ba = document.getElementById('bg-anchor'); if (ba) ba.value = config.bgAnchor || 'center';
        const bxx = document.getElementById('bg-offset-x'); if (bxx) bxx.value = String(config.bgOffsetX||0);
        const bxy = document.getElementById('bg-offset-y'); if (bxy) bxy.value = String(config.bgOffsetY||0);
        document.getElementById('bg-tile-scale').value = Math.round(config.bgTileScale * 100);
        document.getElementById('bg-tile-scale-row').style.display = (config.bgFit==='tile') ? 'grid' : 'none';
        if (p.embed && p.dataUrl) {
          loadImage(p.dataUrl, (img) => {
            applyBackgroundImage(img, { name: p.name, source: 'embed' }, false);
            setBackgroundMode('image');
          });
        } else if (p.url) {
          const img = await loadBackgroundFromUrl(p.url);
          applyBackgroundImage(img, { name: p.name, source: 'url', url: p.url }, false);
          setBackgroundMode('image');
          const urlInput = document.getElementById('bg-url'); if (urlInput) urlInput.value = p.url;
        } else {
          // Nessuna immagine salvata: solo impostazioni
          setBackgroundMode('color');
        }
      } catch(e) {
        alert('Impossibile applicare il preset: ' + (e?.message || e));
      }
    });

    renameBtn.addEventListener('click', () => {
      const nv = prompt('Nuovo nome preset:', p.name || '');
      if (!nv) return;
      p.name = nv;
      saveBgPresets(list);
      renderBgPresetsList();
    });

    delBtn.addEventListener('click', () => {
      list.splice(idx, 1);
      saveBgPresets(list);
      renderBgPresetsList();
    });

    actions.appendChild(applyBtn);
    actions.appendChild(renameBtn);
    actions.appendChild(delBtn);
    item.appendChild(name);
    item.appendChild(actions);
    el.appendChild(item);
  });
}

async function setBackgroundMode(mode) {
  config.bgMode = mode === 'image' ? 'image' : 'color';
  const fileGroup = document.getElementById('bg-file-group');
  if (fileGroup) fileGroup.style.display = config.bgMode === 'image' ? 'block' : 'none';
}

function updateBgInfo(text) {
  const el = document.getElementById('bg-info');
  if (el) el.textContent = text || '';
}

function applyBackgroundImage(img, meta, autoSize) {
  bgImage = img; bgBlurDirty = true;
  bgImageMeta = meta || null;
  updateBgInfo(meta ? `${meta.name || 'immagine'} — ${img.width}×${img.height}px` : `${img.width}×${img.height}px`);
  if (autoSize && !config.bgLockCanvas) { bgBlurDirty = true;
    // Aggiorna anche il pannello Formato se presente
    const wEl = document.getElementById('custom-width');
    const hEl = document.getElementById('custom-height');
    const wEl2 = document.getElementById('custom-w') || wEl; // compat
    const hEl2 = document.getElementById('custom-h') || hEl; // compat
    try { if (wEl2) wEl2.value = img.width; if (hEl2) hEl2.value = img.height; } catch(e){}
    resizeCanvas(width, height); // ensure p5 internal consistency first
    resizeCanvas(img.width, img.height);
    waveLayer.resizeCanvas(img.width, img.height);
    maxR = Math.hypot(width, height);
    sources.forEach((src) => src.calculateImageSources());
    applyCanvasZoom && applyCanvasZoom();
  }
}

function clearBackgroundImage() {
  bgImage = null;
  bgImageMeta = null;
  updateBgInfo('');
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Impossibile leggere il file'));
    fr.onload = () => {
      loadImage(fr.result, (img) => resolve(img), (err) => reject(err));
    };
    fr.readAsDataURL(file);
  });
}

async function loadPdfFirstPageAsImage(file, targetWidth) {
  if (!window.pdfjsLib) throw new Error('pdf.js non caricato');
  const arrayBuf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuf }).promise;
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale: 1.0 });
  const scale = Math.max(1, (targetWidth || width) / viewport.width);
  const vp = page.getViewport({ scale });
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = Math.floor(vp.width);
  tmpCanvas.height = Math.floor(vp.height);
  const ctx = tmpCanvas.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  return new Promise((resolve) => {
    loadImage(tmpCanvas.toDataURL('image/png'), (img) => resolve(img));
  });
}

async function handleBackgroundFile(file) {
  const auto = !!document.getElementById('bg-autosize')?.checked;
  const name = file.name || '';
  const type = file.type || '';
  try {
    if (type === 'application/pdf' || name.toLowerCase().endsWith('.pdf')) {
      const img = await loadPdfFirstPageAsImage(file, width);
      applyBackgroundImage(img, { name }, auto);
      setBackgroundMode('image');
      return;
    }
    // immagini raster / svg
    const img = await loadImageFromFile(file);
    applyBackgroundImage(img, { name }, auto);
    setBackgroundMode('image');
  } catch (e) {
    console.error(e);
    alert('Errore nel caricamento dello sfondo: ' + (e?.message || e));
  }
}

function initializeUI() {
  document.querySelectorAll(".panel-header").forEach((header) => {
    header.addEventListener("click", () => {
      header.classList.toggle("active");
      const content = header.nextElementSibling;
      content.classList.toggle("show");
    });
  });

  document.querySelectorAll(".slider-group").forEach((group) => {
    const slider = group.querySelector('input[type="range"]');
    const numberInput = group.querySelector('input[type="number"]');
    const key = group.dataset.key;
    const target = group.dataset.target === "config" ? config : pal;
    const step = Number(slider.step);
    const decimals =
      step < 1 ? (step.toString().split(".")[1] || "").length : 0;

    const updateValue = (val) => {
      const numVal = Number(val);
      target[key] = numVal;
      slider.value = numVal;
      numberInput.value = numVal.toFixed(decimals);
    };

    slider.addEventListener("input", () => updateValue(slider.value));
    numberInput.addEventListener("change", () =>
      updateValue(numberInput.value)
    );
  });

  document.querySelectorAll(".color-input-wrapper").forEach((wrapper) => {
    const picker = wrapper.querySelector('input[type="color"]');
    const hexInput = wrapper.querySelector('input[type="text"]');
    const key = picker.dataset.key;

    picker.addEventListener("input", () => {
      pal[key] = picker.value;
      hexInput.value = picker.value;
    });

    hexInput.addEventListener("change", () => {
      let value = hexInput.value;
      if (!value.startsWith("#")) {
        value = "#" + value;
      }
      if (/^#([0-9A-F]{3}){1,2}$/i.test(value)) {
        pal[key] = value;
        picker.value = value;
      } else {
        hexInput.value = pal[key];
      }
    });
  });

  document.querySelectorAll(".checkbox-group").forEach((group) => {
    const checkbox = group.querySelector('input[type="checkbox"]');
    const key = group.dataset.key;
    checkbox.addEventListener("change", () => {
      config[key] = checkbox.checked;
    });
  });

  const waveDisplaySelect = document.getElementById("wave-display-select");
  waveDisplaySelect.addEventListener("change", () => {
    config.waveDisplayMode = waveDisplaySelect.value;
  });

  const applyZoomBtn = document.getElementById("apply-zoom-btn");
  applyZoomBtn.addEventListener("click", applyCanvasZoom);

  const presetSelect = document.getElementById("preset-select");
  const applyPresetBtn = document.getElementById("apply-preset-btn");

  for (const name in brandPresets) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    presetSelect.appendChild(option);
  }

  applyPresetBtn.addEventListener("click", () => {
    const presetName = presetSelect.value;
    if (brandPresets[presetName]) {
      const preset = brandPresets[presetName];
      Object.assign(config, JSON.parse(JSON.stringify(preset.config)));
      if (preset.pal) Object.assign(pal, preset.pal);
      updateUIFromState();
    }
  });

  const animPresetSelect = document.getElementById("animation-preset-select");
  const userAnimSelect = document.getElementById("user-animation-select");
  const playAnimBtn = document.getElementById("play-animation-btn");
  const recordAnimBtn = document.getElementById("record-animation-btn");
  const renameAnimBtn = document.getElementById("rename-animation-btn");
  const deleteAnimBtn = document.getElementById("delete-animation-btn");

  function populateAnimationPresets() {
    animPresetSelect.innerHTML = '<option value="">-- Predefinite --</option>';
    for (const name in animationPresets) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      animPresetSelect.appendChild(option);
    }
  }
  populateAnimationPresets();

  function populateUserAnimationPresets() {
    const currentVal = userAnimSelect.value;
    userAnimSelect.innerHTML = '<option value="">-- Salvate --</option>';
    for (const name in userAnimationPresets) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      userAnimSelect.appendChild(option);
    }
    if (userAnimationPresets[currentVal]) {
      userAnimSelect.value = currentVal;
    }
  }
  populateUserAnimationPresets();

  function updateManageButtons() {
    const selectedAnim = userAnimSelect.value;
    const isUserSaved = selectedAnim && userAnimationPresets[selectedAnim];
    renameAnimBtn.disabled = !isUserSaved;
    deleteAnimBtn.disabled = !isUserSaved;
  }

  animPresetSelect.addEventListener("change", () => {
    if (animPresetSelect.value !== "") userAnimSelect.value = "";
    updateManageButtons();
  });
  userAnimSelect.addEventListener("change", () => {
    if (userAnimSelect.value !== "") animPresetSelect.value = "";
    updateManageButtons();
  });
  updateManageButtons();

  playAnimBtn.addEventListener("click", () => {
    if (isExporting || isPlayingAnimation) return;
    const anim = getSelectedAnimation();
    if (anim) {
      playAnimation(anim.name, anim.isUser);
    } else {
      alert("Per favore, seleziona un'animazione da avviare.");
    }
  });

  recordAnimBtn.addEventListener("click", toggleAnimationRecording);

  renameAnimBtn.addEventListener("click", () => {
    const oldName = userAnimSelect.value;
    const newName = prompt(
      "Inserisci il nuovo nome per l'animazione:",
      oldName
    );

    if (newName && newName.trim() !== "" && newName !== oldName) {
      if (userAnimationPresets[newName] || animationPresets[newName]) {
        alert("Esiste già un'animazione con questo nome.");
        return;
      }
      Object.defineProperty(
        userAnimationPresets,
        newName,
        Object.getOwnPropertyDescriptor(userAnimationPresets, oldName)
      );
      delete userAnimationPresets[oldName];

      populateUserAnimationPresets();
      userAnimSelect.value = newName;
      updateManageButtons();
    }
  });

  deleteAnimBtn.addEventListener("click", () => {
    const animToDelete = userAnimSelect.value;
    if (confirm(`Sei sicuro di voler eliminare "${animToDelete}"?`)) {
      delete userAnimationPresets[animToDelete];
      populateUserAnimationPresets();
      updateManageButtons();
    }
  });

  document
    .getElementById("save-png-btn")
    .addEventListener("click", saveSinglePNG);
  document
    .getElementById("record-video-btn")
    .addEventListener("click", toggleRecording);
  document
    .getElementById("save-sequence-btn")
    .addEventListener("click", () => startExport("png"));

  document.getElementById("pause-btn").addEventListener("click", togglePause);
  document.getElementById("clear-btn").addEventListener("click", () => {
    isPlayingAnimation = false;
    currentSequence = null;
    document.getElementById("play-animation-btn").textContent = "Avvia";
    clearSources();
  });
  document
    .getElementById("reset-btn")
    .addEventListener("click", resetSimulation);

  const formatSelect = document.getElementById("format-select");
  const customInputs = document.getElementById("custom-format-inputs");
  const applyFormatBtn = document.getElementById("apply-format-btn");
  const customWidthInput = document.getElementById("custom-width");
  const customHeightInput = document.getElementById("custom-height");

  formatSelect.addEventListener("change", () => {
    if (formatSelect.value === "custom")
      customInputs.classList.remove("hidden");
    else customInputs.classList.add("hidden");
  });

  applyFormatBtn.addEventListener("click", () => {
    let newWidth, newHeight;
    const selectedValue = formatSelect.value;
    const canvasContainer = document.getElementById("canvas-container");

    if (selectedValue === "viewport") {
      newWidth = canvasContainer.clientWidth;
      newHeight = canvasContainer.clientHeight;
    } else if (selectedValue === "custom") {
      newWidth = customWidthInput.value;
      newHeight = customHeightInput.value;
    } else {
      [newWidth, newHeight] = selectedValue.split("x");
    }
    resizeCanvasAndContent(newWidth, newHeight);
  });
}

function updateUIFromState() {
  try{ const bgMode = config.bgMode || "color"; document.getElementById("bg-mode-color").checked = bgMode==="color"; document.getElementById("bg-mode-image").checked = bgMode==="image"; const fileGroup=document.getElementById("bg-file-group"); if(fileGroup) fileGroup.style.display = bgMode==="image" ? "block" : "none"; }catch(e){}
  document.querySelectorAll(".slider-group").forEach((group) => {
    const slider = group.querySelector('input[type="range"]');
    const numberInput = group.querySelector('input[type="number"]');
    const key = group.dataset.key;
    const target = group.dataset.target === "config" ? config : pal;
    const val = target[key];

    if (val !== undefined) {
      const step = Number(slider.step);
      const decimals =
        step < 1 ? (step.toString().split(".")[1] || "").length : 0;
      slider.value = val;
      numberInput.value = Number(val).toFixed(decimals);
    }
  });

  document.querySelectorAll(".color-input-wrapper").forEach((wrapper) => {
    const picker = wrapper.querySelector('input[type="color"]');
    const hexInput = wrapper.querySelector('input[type="text"]');
    const key = picker.dataset.key;
    picker.value = pal[key];
    hexInput.value = pal[key];
  });

  document.querySelector(".checkbox-group input").checked =
    config.saveBackground;

  document.getElementById("wave-display-select").value =
    config.waveDisplayMode || "both";

  document.getElementById("zoom-select").value = config.zoomSelection || "1";

  document.getElementById("pause-btn").textContent = paused
    ? "Riprendi"
    : "Pausa";
}

// ===================================================================
// Eventi e Azioni
// ===================================================================
function mousePressed(event) {
  if (isExporting || (isPlayingAnimation && !isRecordingAnimation)) return;
  if (event.target.classList.contains("p5Canvas")) {
    if (isRecordingAnimation) {
      const t = (millis() - recordingStartTime) / 1000;
      recordedEvents.push({ time: t, x: mouseX / width, y: mouseY / height });
      sources.unshift(new WaveSource(mouseX, mouseY));
      return;
    }
    if (mouseX >= 0 && mouseX <= width && mouseY >= 0 && mouseY <= height) {
      if (sources.length < config.maxSources)
        sources.unshift(new WaveSource(mouseX, mouseY));
    }
  }
}

function keyPressed() {
  if (document.activeElement.tagName === "INPUT") return;
  if (key === " ") togglePause();
  if (key === "s" || key === "S") saveSinglePNG();
  if (key === "c" || key === "C") {
    isPlayingAnimation = false;
    currentSequence = null;
    document.getElementById("play-animation-btn").textContent = "Avvia";
    clearSources();
  }
  if (key === "r" || key === "R") resetSimulation();
}

function togglePause() {
  paused = !paused;
  updateUIFromState();
}

function clearSources() {
  sources.forEach((src) => src.destroy());
  sources = [];
  t = 0;
  if (config.saveBackground) waveLayer.background(pal.bg);
  else waveLayer.clear();
}

function resetSimulation() {
  isPlayingAnimation = false;
  currentSequence = null;
  document.getElementById("play-animation-btn").textContent = "Avvia";
  clearSources();
  paused = false;

  Object.assign(config, defaultConfig);
  Object.assign(pal, defaultPal);

  document.getElementById("format-select").value = "viewport";
  document.getElementById("custom-format-inputs").classList.add("hidden");
  const canvasContainer = document.getElementById("canvas-container");
  resizeCanvasAndContent(
    canvasContainer.clientWidth,
    canvasContainer.clientHeight
  );

  updateUIFromState();
}

function playAnimation(name, isUser) {
  const preset = isUser ? userAnimationPresets[name] : animationPresets[name];
  if (preset) {
    isPlayingAnimation = false;
    currentSequence = null;
    clearSources();
    document.getElementById("play-animation-btn").textContent = "Avvia";
    if (paused) togglePause();
    currentSequence = JSON.parse(JSON.stringify(preset));
    currentSequence.events.sort((a, b) => a.time - b.time);
    animationTime = 0;
    nextEventIndex = 0;
    isPlayingAnimation = true;
    document.getElementById("play-animation-btn").textContent =
      "In Esecuzione...";
  }
}

function toggleAnimationRecording() {
  isRecordingAnimation = !isRecordingAnimation;
  const btn = document.getElementById("record-animation-btn");
  const status = document.getElementById("record-status");
  const userAnimSelect = document.getElementById("user-animation-select");

  if (isRecordingAnimation) {
    clearSources();
    recordedEvents = [];
    recordingStartTime = millis();
    btn.textContent = "Ferma Registrazione";
    btn.classList.add("recording");
    status.textContent = "REC ●";
  } else {
    btn.textContent = "Registra Nuova Animazione";
    btn.classList.remove("recording");
    status.textContent = "";

    if (recordedEvents.length > 0) {
      savedAnimationCount++;
      const newAnimationName = `Animazione Salvata ${savedAnimationCount}`;
      const duration = (millis() - recordingStartTime) / 1000 + 3;

      userAnimationPresets[newAnimationName] = {
        duration: duration,
        events: recordedEvents,
      };

      const option = document.createElement("option");
      option.value = newAnimationName;
      option.textContent = newAnimationName;
      userAnimSelect.appendChild(option);
      userAnimSelect.value = newAnimationName;

      document.getElementById("animation-preset-select").value = "";

      document.getElementById("rename-animation-btn").disabled = false;
      document.getElementById("delete-animation-btn").disabled = false;
    }
  }
}

function resizeCanvasAndContent(w, h) {
  const newWidth = parseInt(w, 10);
  const newHeight = parseInt(h, 10);
  if (isNaN(newWidth) || isNaN(newHeight) || newWidth <= 0 || newHeight <= 0) {
    alert("Per favore, inserisci dimensioni valide.");
    return;
  }
  resizeCanvas(newWidth, newHeight);
  waveLayer.resizeCanvas(newWidth, newHeight);
  maxR = Math.hypot(width, height);
  sources.forEach((src) => src.calculateImageSources());
  applyCanvasZoom();
}

// ===================================================================
// EXPORT (deterministico + coda + PNG sequence)
// ===================================================================
function saveSinglePNG() {
  if (isExporting) return;
  const g = createGraphics(width, height);
  if (config.saveBackground) g.background(pal.bg);
  g.image(waveLayer, 0, 0);
  try {
    saveCanvas(g, "onda_singola", "png");
  } catch (e) {
    const temp = document.createElement("canvas");
    temp.width = g.width;
    temp.height = g.height;
    const ctx = temp.getContext("2d");
    const srcCanvas = g.elt || g.canvas;
    ctx.drawImage(srcCanvas, 0, 0);
    const a = document.createElement("a");
    a.href = temp.toDataURL("image/png");
    a.download = "onda_singola.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  g.remove();
}

function updateExportStatus(message) {
  document.getElementById("export-status").textContent = message;
}

function toggleUIAccess(enabled) {
  document
    .querySelectorAll(
      "#ui-sidebar button, #ui-sidebar input, #ui-sidebar select"
    )
    .forEach((el) => {
      if (el.id === "record-video-btn" && isExporting) {
        el.disabled = false;
      } else {
        el.disabled = !enabled;
      }
    });
}

function getSelectedAnimation() {
  const selectedDefault = document.getElementById(
    "animation-preset-select"
  ).value;
  const selectedUser = document.getElementById("user-animation-select").value;
  if (selectedUser) {
    return {
      name: selectedUser,
      isUser: true,
      ...userAnimationPresets[selectedUser],
    };
  } else if (selectedDefault) {
    return {
      name: selectedDefault,
      isUser: false,
      ...animationPresets[selectedDefault],
    };
  }
  return null;
}

// Avvio/stop export video (usa il motore generico)
function toggleRecording() {
  if (!isExporting) {
    const anim = getSelectedAnimation();
    if (!anim) {
      alert("Per favore, seleziona un'animazione da registrare.");
      return;
    }
    startExport("webm", anim);
  } else {
    isExporting = false;
    updateExportStatus("Finalizzazione richiesta dall'utente...");
  }
}

// Motore export generico: format = "webm" o "png"
function startExport(format = "webm", animOpt = null) {
  if (isExporting) return;

  const anim = animOpt || getSelectedAnimation();
  if (!anim) {
    alert("Per favore, seleziona un'animazione da esportare.");
    return;
  }

  capturer = new CCapture({
    format, // "webm" o "png" (png = sequenza zippata)
    framerate: TARGET_FPS,
    verbose: false,
    name: format === "png" ? "sequenza-onde" : "animazione-onde",
    quality: 98,
  });

  isExporting = true;
  toggleUIAccess(false);
  updateExportStatus("Preparazione rendering...");
  const btn = document.getElementById("record-video-btn");
  if (format === "webm") {
    btn.textContent = "Ferma e Salva";
    btn.classList.add("recording");
  }

  // Reset simulazione e pre-elaborazione eventi
  clearSources();
  const sequence = JSON.parse(JSON.stringify(anim));
  sequence.events.sort((a, b) => a.time - b.time);

  let nextEventIndex = 0;
  const totalFrames = Math.round(sequence.duration * TARGET_FPS);
  const maxTailFrames = Math.round(MAX_TAIL_SECONDS * TARGET_FPS);
  const holdFrames = Math.round(EXTRA_HOLD_SECONDS * TARGET_FPS);

  let frameIndex = 0;
  let tailFrameIndex = 0;
  let holdFrameIndex = 0;
  let phase = "events"; // events -> tail -> hold -> done

  capturer.start();

  (function step() {
    if (!isExporting) {
      finishRecording();
      return;
    }

    if (phase === "events") {
      const tNow = frameIndex * FRAME_DT;
      // Emetti eventi fino a tNow
      while (
        nextEventIndex < sequence.events.length &&
        sequence.events[nextEventIndex].time <= tNow
      ) {
        const ev = sequence.events[nextEventIndex++];
        sources.unshift(
          new WaveSource(ev.x * width, ev.y * height, ev.override)
        );
      }
      updateSimulation(FRAME_DT);
      renderCanvas();
      capturer.capture(p5Canvas.elt);

      frameIndex++;
      const progress = Math.min(
        100,
        Math.round((frameIndex / totalFrames) * 100)
      );
      updateExportStatus(`Rendering... ${progress}%`);

      if (frameIndex < totalFrames) {
        setTimeout(step, 0);
        return;
      }
      // Passa alla coda (nessun nuovo evento)
      phase = "tail";
    }

    if (phase === "tail") {
      const alive = anySourceAlive();
      updateSimulation(FRAME_DT);
      renderCanvas();
      capturer.capture(p5Canvas.elt);
      tailFrameIndex++;

      if (!alive || tailFrameIndex >= maxTailFrames) {
        phase = "hold";
      }
      updateExportStatus(
        `Coda... ${Math.round((tailFrameIndex / maxTailFrames) * 100)}%`
      );
      setTimeout(step, 0);
      return;
    }

    if (phase === "hold") {
      renderCanvas();
      capturer.capture(p5Canvas.elt);
      holdFrameIndex++;
      if (holdFrameIndex < holdFrames) {
        setTimeout(step, 0);
        return;
      }
      phase = "done";
    }

    if (phase === "done") {
      isExporting = false;
      finishRecording();
    }
  })();
}

function finishRecording() {
  updateExportStatus("Elaborazione video... Attendere.");
  capturer.stop();
  capturer.save();

  const btn = document.getElementById("record-video-btn");
  btn.textContent = "Registra Video (.webm)";
  btn.classList.remove("recording");
  toggleUIAccess(true);
  isExporting = false;
  clearSources();
  renderCanvas();
  updateExportStatus("Video salvato!");
}

// ===================================================================
// Finali
// ===================================================================
function windowResized() {
  if (isExporting) return;
  const canvasContainer = document.getElementById("canvas-container");
  if (document.getElementById("format-select").value === "viewport") {
    resizeCanvas(canvasContainer.clientWidth, canvasContainer.clientHeight);
    waveLayer.resizeCanvas(width, height); bgBlurBuffer = null; bgBlurDirty = true;
    maxR = Math.hypot(width, height);
    sources.forEach((src) => src.calculateImageSources());
  }
  applyCanvasZoom();
}

function updateStats() {
  stats.fps = frameRate();
  stats.sourcesCount = sources.length;
  const statsDisplay = document.getElementById("stats-display");
  if (statsDisplay) {
    statsDisplay.children[0].textContent = `FPS: ${stats.fps.toFixed(1)}`;
    statsDisplay.children[1].textContent = `Sorgenti: ${stats.sourcesCount}`;
    statsDisplay.children[2].textContent = `Onde: ${stats.wavesDrawn}`;
  }
}
