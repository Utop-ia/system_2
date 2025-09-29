let logoGraphic;
let animType = "pulse";
let playing = true;
let angle = 0;
let alpha = 255;
let grow = true;

function preload() {
  // Carica il tuo SVG (in locale o percorso relativo)
  logoGraphic = loadImage("CONFCOM_MARCHIO.svg");
}

function setup() {
  const container = document.getElementById("canvas-container");
  let cnv = createCanvas(container.clientWidth, container.clientHeight);
  cnv.parent("canvas-container");
}

function windowResized() {
  const container = document.getElementById("canvas-container");
  resizeCanvas(container.clientWidth, container.clientHeight);
}

function draw() {
  background(255);
  if (!logoGraphic) return;

  push();
  translate(width / 2, height / 2);

  if (playing) {
    if (animType === "pulse") {
      let s = 1 + 0.05 * sin(frameCount * 0.1);
      scale(s);
    } else if (animType === "rotate") {
      angle += 0.01;
      rotate(angle);
    } else if (animType === "fade") {
      if (grow) alpha -= 2;
      else alpha += 2;
      if (alpha < 50) grow = false;
      if (alpha > 255) grow = true;
      tint(255, alpha);
    }
  }

  imageMode(CENTER);
  image(logoGraphic, 0, 0, width / 2, height / 2);
  pop();
}

// ===== CONTROLLI =====
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("play-btn").addEventListener("click", () => {
    playing = true;
  });
  document.getElementById("pause-btn").addEventListener("click", () => {
    playing = false;
  });
  document.getElementById("anim-select").addEventListener("change", (e) => {
    animType = e.target.value;
  });
});
