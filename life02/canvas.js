const canvas = document.getElementById("life02");

if (!canvas) {
  throw new Error("Could not find canvas #life02");
}

if (typeof PIXI === "undefined") {
  throw new Error("PIXI.js must be loaded before life02.js");
}

const app = new PIXI.Application({
  view: canvas,
  resizeTo: window,
  background: "#03040a",
  antialias: false,
  resolution: Math.min(window.devicePixelRatio || 1, 2),
  autoDensity: true,
});

const stage = new PIXI.ParticleContainer(20000, {
  position: true,
  scale: true,
  tint: true,
  alpha: true,
});

app.stage.addChild(stage);

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

const FIXED_STEP_MS = 1000 / 60;
const MAX_SUB_STEPS = 3;
const MAX_SPEED = 1.35;
const INTERACTION_RADIUS = 155;
const COLLISION_RADIUS = 17;
const FORCE_SCALE = 0.047;
const FRICTION = 0.982;

let particles = [];
let groups = {};
let interactionMatrix = [];
let spatialGrid = new Map();
let nextGroupId = 0;
let particleTexture;

let cameraX = WORLD_WIDTH / 2;
let cameraY = WORLD_HEIGHT / 2;
let zoom = 0.55;
let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

let accumulator = 0;
let lastFrameTime = performance.now();

const gridColumns = Math.max(1, Math.floor(WORLD_WIDTH / INTERACTION_RADIUS));
const gridRows = Math.max(1, Math.floor(WORLD_HEIGHT / INTERACTION_RADIUS));
const gridCellWidth = WORLD_WIDTH / gridColumns;
const gridCellHeight = WORLD_HEIGHT / gridRows;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrap(value, size) {
  if (value < 0) return value + size;
  if (value >= size) return value - size;
  return value;
}

function gridKey(column, row) {
  return `${column},${row}`;
}

function createParticleTexture() {
  const graphic = new PIXI.Graphics();

  graphic.beginFill(0xffffff, 0.12);
  graphic.drawCircle(12, 12, 6);
  graphic.endFill();

  graphic.beginFill(0xffffff, 0.95);
  graphic.drawCircle(12, 12, 2.2);
  graphic.endFill();

  particleTexture = app.renderer.generateTexture(graphic);
  graphic.destroy();
}

function createParticle(x, y, color, groupId) {
  const sprite = new PIXI.Sprite(particleTexture);

  sprite.anchor.set(0.5);
  sprite.tint = PIXI.utils.string2hex(color);
  sprite.scale.set(0.8);
  sprite.x = x;
  sprite.y = y;

  stage.addChild(sprite);

  const particle = {
    x,
    y,
    vx: 0,
    vy: 0,
    fx: 0,
    fy: 0,
    groupId,
    sprite,
  };

  particles.push(particle);
  return particle;
}

function makeGroup(name, count, color) {
  if (!name || groups[name]) return null;

  const id = nextGroupId++;
  const groupParticles = [];

  for (let index = 0; index < count; index++) {
    groupParticles.push(
      createParticle(
        Math.random() * WORLD_WIDTH,
        Math.random() * WORLD_HEIGHT,
        color,
        id,
      ),
    );
  }

  groups[name] = { id, name, color, particles: groupParticles };
  interactionMatrix[id] = interactionMatrix[id] || [];

  return groups[name];
}

function setRule(groupAName, groupBName, strength) {
  const groupA = groups[groupAName];
  const groupB = groups[groupBName];

  if (!groupA || !groupB) return;

  interactionMatrix[groupA.id] = interactionMatrix[groupA.id] || [];
  interactionMatrix[groupA.id][groupB.id] = clamp(
    Number(strength) || 0,
    -10,
    10,
  );
}

function buildSpatialGrid() {
  spatialGrid.clear();

  for (const particle of particles) {
    const column = Math.floor(particle.x / gridCellWidth);
    const row = Math.floor(particle.y / gridCellHeight);
    const key = gridKey(column, row);

    if (!spatialGrid.has(key)) {
      spatialGrid.set(key, []);
    }

    spatialGrid.get(key).push(particle);
  }
}

function calculateForces() {
  const radiusSquared = INTERACTION_RADIUS * INTERACTION_RADIUS;

  for (const particleA of particles) {
    const column = Math.floor(particleA.x / gridCellWidth);
    const row = Math.floor(particleA.y / gridCellHeight);
    const interactionRow = interactionMatrix[particleA.groupId] || [];

    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const neighborColumn = (column + offsetX + gridColumns) % gridColumns;
        const neighborRow = (row + offsetY + gridRows) % gridRows;
        const bucket = spatialGrid.get(gridKey(neighborColumn, neighborRow));

        if (!bucket) continue;

        for (const particleB of bucket) {
          if (particleA === particleB) continue;

          let dx = particleB.x - particleA.x;
          let dy = particleB.y - particleA.y;

          if (dx > WORLD_WIDTH / 2) dx -= WORLD_WIDTH;
          if (dx < -WORLD_WIDTH / 2) dx += WORLD_WIDTH;
          if (dy > WORLD_HEIGHT / 2) dy -= WORLD_HEIGHT;
          if (dy < -WORLD_HEIGHT / 2) dy += WORLD_HEIGHT;

          const distanceSquared = dx * dx + dy * dy;

          if (distanceSquared < 0.0001 || distanceSquared >= radiusSquared) {
            continue;
          }

          const distance = Math.sqrt(distanceSquared);
          const normalizedDistance = distance / INTERACTION_RADIUS;
          let force;

          if (distance < COLLISION_RADIUS) {
            force = -9 * (1 - distance / COLLISION_RADIUS);
          } else {
            const strength = interactionRow[particleB.groupId] || 0;
            const band = 1 - Math.abs(2 * normalizedDistance - 1);
            force = strength * band;
          }

          particleA.fx += (dx / distance) * force * FORCE_SCALE;
          particleA.fy += (dy / distance) * force * FORCE_SCALE;
        }
      }
    }
  }
}

function integrateParticles() {
  for (const particle of particles) {
    particle.vx = (particle.vx + particle.fx) * FRICTION;
    particle.vy = (particle.vy + particle.fy) * FRICTION;

    const speed = Math.hypot(particle.vx, particle.vy);

    if (speed > MAX_SPEED) {
      particle.vx = (particle.vx / speed) * MAX_SPEED;
      particle.vy = (particle.vy / speed) * MAX_SPEED;
    }

    particle.x = wrap(particle.x + particle.vx, WORLD_WIDTH);
    particle.y = wrap(particle.y + particle.vy, WORLD_HEIGHT);

    particle.fx = 0;
    particle.fy = 0;

    particle.sprite.x = particle.x;
    particle.sprite.y = particle.y;
  }
}

function simulateStep() {
  buildSpatialGrid();
  calculateForces();
  integrateParticles();
}

function applyCameraTransform() {
  stage.scale.set(zoom);
  stage.position.set(
    canvas.clientWidth / 2 - cameraX * zoom,
    canvas.clientHeight / 2 - cameraY * zoom,
  );
}

function startDragging(event) {
  if (event.button !== 2) return;

  dragging = true;
  lastPointerX = event.clientX;
  lastPointerY = event.clientY;
}

function dragCamera(event) {
  if (!dragging) return;

  cameraX -= (event.clientX - lastPointerX) / zoom;
  cameraY -= (event.clientY - lastPointerY) / zoom;

  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  applyCameraTransform();
}

function zoomCamera(event) {
  event.preventDefault();

  const mouseX = event.offsetX;
  const mouseY = event.offsetY;
  const worldX = cameraX + (mouseX - canvas.clientWidth / 2) / zoom;
  const worldY = cameraY + (mouseY - canvas.clientHeight / 2) / zoom;

  zoom = clamp(zoom * (event.deltaY > 0 ? 0.9 : 1.1), 0.28, 3.5);

  cameraX = worldX - (mouseX - canvas.clientWidth / 2) / zoom;
  cameraY = worldY - (mouseY - canvas.clientHeight / 2) / zoom;

  applyCameraTransform();
}

function setupWorld() {
  makeGroup("cyan", 500, "#58d8ff");
  makeGroup("pink", 500, "#ff6fae");
  makeGroup("gold", 500, "#ffd166");

  setRule("cyan", "cyan", -2.5);
  setRule("cyan", "pink", 6);
  setRule("cyan", "gold", -3);
  setRule("pink", "cyan", -4);
  setRule("pink", "pink", -2);
  setRule("pink", "gold", 7);
  setRule("gold", "cyan", 5);
  setRule("gold", "pink", -3);
  setRule("gold", "gold", -2.5);
}

function update(now = performance.now()) {
  const elapsed = Math.min(now - lastFrameTime, 50);
  lastFrameTime = now;
  accumulator += elapsed;

  let completedSteps = 0;

  while (accumulator >= FIXED_STEP_MS && completedSteps < MAX_SUB_STEPS) {
    simulateStep();
    accumulator -= FIXED_STEP_MS;
    completedSteps++;
  }

  if (completedSteps === MAX_SUB_STEPS) {
    accumulator = 0;
  }

  requestAnimationFrame(update);
}

window.addEventListener("mouseup", () => {
  dragging = false;
});

window.addEventListener("mousemove", dragCamera);
window.addEventListener("resize", applyCameraTransform);

canvas.addEventListener("mousedown", startDragging);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", zoomCamera, { passive: false });

createParticleTexture();
setupWorld();
applyCameraTransform();
requestAnimationFrame(update);
