const canvas = document.getElementById("gravity01");
const ctx = canvas.getContext("2d");

let bodies = [];
let mass = 60;
let gravity = 500;

let anchored = false;
let paused = false;

let cameraX = 0;
let cameraY = 0;

let panning = false;
let panX = 0;
let panY = 0;

let last = performance.now();
let fps = 60;

function resize() {
  canvas.width = innerWidth * devicePixelRatio;
  canvas.height = innerHeight * devicePixelRatio;

  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

resize();
addEventListener("resize", resize);

function radius(m) {
  return Math.max(3, Math.cbrt(m) * 2.8);
}

function color(m) {
  if (m < 20) return "#eff0e2";
  if (m < 150) return "#c1f26e";
  if (m < 600) return "#83acf0";
  if (m < 1200) return "#f09c65";
  return "#eade9c";
}

function spawn(x, y) {
  bodies.push({
    x: x + cameraX,
    y: y + cameraY,
    vx: 0,
    vy: 0,
    mass,
    r: radius(mass),
    fixed: anchored,
  });
  stats();
}

function update(dt) {
  for (let i = 0; i < bodies.length; i++) {
    const a = bodies[i];
    if (a.fixed) continue;

    let ax = 0;
    let ay = 0;

    for (let j = 0; j < bodies.length; j++) {
      if (i === j) continue;

      const b = bodies[j];

      const dx = b.x - a.x;
      const dy = b.y - a.y;

      const d2 = dx * dx + dy * dy + 100;
      const d = Math.sqrt(d2);
      const force = (gravity * b.mass) / d2;

      ax += (dx / d) * force;
      ay += (dy / d) * force;
    }

    a.vx += ax * dt;
    a.vy += ay * dt;

    a.x += a.vx * dt;
    a.y += a.vy * dt;
  }
}

function draw() {
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  ctx.fillStyle = "#050705";
  ctx.fillRect(0, 0, innerWidth, innerHeight);

  for (const b of bodies) {
    const x = b.x - cameraX;
    const y = b.y - cameraY;

    ctx.beginPath();
    ctx.arc(x, y, b.r, 0, Math.PI * 2);
    ctx.fillStyle = color(b.mass);
    ctx.fill();

    if (b.fixed) {
      ctx.beginPath();
      ctx.arc(x, y, b.r + 4, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(255,255,255,.4)";
      ctx.stroke();
    }
  }
}

function stats() {
  bodyCount.textContent = bodies.length;

  massCount.textContent = Math.round(bodies.reduce((n, b) => n + b.mass, 0));
}

canvas.addEventListener("mousedown", (e) => {
  if (e.button === 0) spawn(e.clientX, e.clientY);

  if (e.button === 1) {
    e.preventDefault();

    panning = true;
    panX = e.clientX;
    panY = e.clientY;

    canvas.classList.add("panning");
  }
});

addEventListener("mousemove", (e) => {
  if (!panning) return;

  cameraX -= e.clientX - panX;
  cameraY -= e.clientY - panY;

  panX = e.clientX;
  panY = e.clientY;
});

addEventListener("mouseup", (e) => {
  if (e.button !== 1) return;
  panning = false;
  canvas.classList.remove("panning");
});

canvas.addEventListener("auxclick", (e) => {
  if (e.button === 1) e.preventDefault();
});

function setMass(value) {
  mass = +value;
  massControl.value = Math.min(mass, 2000);
  massValue.textContent = mass;

  document.querySelectorAll("[data-mass]").forEach((btn) => {
    btn.classList.toggle("active", +btn.dataset.mass === mass);
  });
}

massControl.addEventListener("input", (e) => setMass(e.target.value));

document.querySelectorAll("[data-mass]").forEach((btn) => {
  btn.onclick = () => setMass(btn.dataset.mass);
});

anchorControl.onchange = (e) => (anchored = e.target.checked);

gravityControl.oninput = (e) => {
  gravity = +e.target.value;
  gravityValue.textContent = gravity;
};

pauseBtn.onclick = () => {
  paused = !paused;
  pauseBtn.textContent = paused ? "Resume" : "Pause";
};

clearBtn.onclick = () => {
  bodies = [];
  stats();
};

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.03);

  fps = fps * 0.9 + (1 / dt) * 0.1;
  last = now;

  if (!paused) update(dt);
  
  draw();

  document.getElementById("fps").textContent = Math.round(fps);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
