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

// WORLD CONSTANTS

const WORLD_WIDTH = 3000;
const WORLD_HEIGHT = 3000;

const FIXED_STEP_MS = 1000 / 60;
const MAX_SUB_STEPS = 3;

const MAX_SPEED = 1.35;
const COLLISION_RADIUS = 17;
const BASE_REPULSION = 9;

// SIMULATION STATE

let particles = [];
let groups = {};
let rules = [];
let interactionMatrix = [];
let spatialGrid = new Map();
let nextGroupId = 0;

let interactionRadius = 155;
let forceScale = 0.047;
let friction = 0.982;
let noiseStrength = 0.0025;

let gridColumns = 1;
let gridRows = 1;
let gridCellWidth = WORLD_WIDTH;
let gridCellHeight = WORLD_HEIGHT;

let paused = false;
let stepFrame = false;
let simulationSpeed = 1;

let currentSeed = 6969;
let random = mulberry32(currentSeed);

let particleTexture;

// CAMERA AND FRAME STATE

let cameraX = WORLD_WIDTH / 2;
let cameraY = WORLD_HEIGHT / 2;
let zoom = 0.55;

let dragging = false;
let lastPointerX = 0;
let lastPointerY = 0;

let fps = 0;
let lastFrameTime = performance.now();
let accumulator = 0;
let lastStatsUpdate = 0;

// CAMERA

function clampCamera() {
  const visibleHalfWidth = canvas.clientWidth / (2 * zoom);
  const visibleHalfHeight = canvas.clientHeight / (2 * zoom);

  if (visibleHalfWidth * 2 >= WORLD_WIDTH) {
    cameraX = WORLD_WIDTH / 2;
  } else {
    cameraX = clamp(cameraX, visibleHalfWidth, WORLD_WIDTH - visibleHalfWidth);
  }

  if (visibleHalfHeight * 2 >= WORLD_HEIGHT) {
    cameraY = WORLD_HEIGHT / 2;
  } else {
    cameraY = clamp(
      cameraY,
      visibleHalfHeight,
      WORLD_HEIGHT - visibleHalfHeight,
    );
  }
}

function applyCameraTransform() {
  stage.scale.set(zoom);

  stage.position.set(
    canvas.clientWidth / 2 - cameraX * zoom,
    canvas.clientHeight / 2 - cameraY * zoom,
  );
}

function handleResize() {
  clampCamera();
  applyCameraTransform();
}

function startDragging(event) {
  if (event.button !== 2) return;

  dragging = true;

  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  canvas.classList.add("dragging");
}

function stopDragging() {
  dragging = false;
  canvas.classList.remove("dragging");
}

function dragCamera(event) {
  if (!dragging) return;

  cameraX -= (event.clientX - lastPointerX) / zoom;
  cameraY -= (event.clientY - lastPointerY) / zoom;

  lastPointerX = event.clientX;
  lastPointerY = event.clientY;

  clampCamera();
  applyCameraTransform();
}

function zoomCamera(event) {
  event.preventDefault();

  const mouseX = event.offsetX;
  const mouseY = event.offsetY;

  const worldX = cameraX + (mouseX - canvas.clientWidth / 2) / zoom;
  const worldY = cameraY + (mouseY - canvas.clientHeight / 2) / zoom;

  zoom *= event.deltaY > 0 ? 0.9 : 1.1;
  zoom = clamp(zoom, 0.28, 3.5);

  cameraX = worldX - (mouseX - canvas.clientWidth / 2) / zoom;
  cameraY = worldY - (mouseY - canvas.clientHeight / 2) / zoom;

  clampCamera();
  applyCameraTransform();
}

// GENERAL HELPERS

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function callIfAvailable(functionName, ...args) {
  const callback = window[functionName];

  if (typeof callback === "function") {
    return callback(...args);
  }

  return undefined;
}

function createGridKey(column, row) {
  return `${column},${row}`;
}

function rebuildGridDimensions() {
  gridColumns = Math.max(1, Math.floor(WORLD_WIDTH / interactionRadius));
  gridRows = Math.max(1, Math.floor(WORLD_HEIGHT / interactionRadius));

  gridCellWidth = WORLD_WIDTH / gridColumns;
  gridCellHeight = WORLD_HEIGHT / gridRows;
}

function wrapCoordinate(value, size) {
  if (value < 0) return value + size;
  if (value >= size) return value - size;

  return value;
}

// SEEDED RANDOM NUMBER GENERATOR

function mulberry32(seed) {
  return function seededRandom() {
    let value = (seed += 0x6d2b79f5);

    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function setSeed(seed) {
  const numericSeed = Number(seed);

  const normalizedSeed = Number.isFinite(numericSeed)
    ? Math.abs(Math.trunc(numericSeed)) >>> 0
    : 6969;

  currentSeed = normalizedSeed || 1;
  random = mulberry32(currentSeed);

  const seedInput = document.getElementById("seedInput");

  if (seedInput) {
    seedInput.value = currentSeed;
  }
}

function randomWorldX() {
  return random() * WORLD_WIDTH;
}

function randomWorldY() {
  return random() * WORLD_HEIGHT;
}

// PARTICLE CREATION

function createParticleTexture() {
  const graphic = new PIXI.Graphics();

  graphic.beginFill(0xffffff, 0.025);
  graphic.drawCircle(12, 12, 12);
  graphic.endFill();

  graphic.beginFill(0xffffff, 0.12);
  graphic.drawCircle(12, 12, 6);
  graphic.endFill();

  graphic.beginFill(0xffffff, 0.95);
  graphic.drawCircle(12, 12, 2.2);
  graphic.endFill();

  particleTexture = app.renderer.generateTexture(graphic);

  graphic.destroy();
}

function createParticle(x, y, color, groupId, velocity = {}) {
  const sprite = new PIXI.Sprite(particleTexture);

  sprite.anchor.set(0.5);
  sprite.tint = PIXI.utils.string2hex(color);
  sprite.alpha = 1;

  sprite.x = x;
  sprite.y = y;

  sprite.scale.set(0.8);

  stage.addChild(sprite);

  return {
    x,
    y,

    vx: velocity.vx ?? 0,
    vy: velocity.vy ?? 0,

    fx: 0,
    fy: 0,

    color,
    groupId,
    sprite,
  };
}

function createParticles(count, color, groupId, spawn) {
  const createdParticles = [];

  for (let index = 0; index < count; index++) {
    const startingState =
      typeof spawn === "function"
        ? spawn(index, count, random)
        : {
            x: randomWorldX(),
            y: randomWorldY(),
            vx: 0,
            vy: 0,
          };

    const current = createParticle(
      startingState.x,
      startingState.y,
      color,
      groupId,
      startingState,
    );

    createdParticles.push(current);
    particles.push(current);
  }

  return createdParticles;
}

function makeGroup(name, count, color, spawn) {
  if (!name || groups[name]) {
    return null;
  }

  const id = nextGroupId++;
  const groupParticles = createParticles(count, color, id, spawn);

  groups[name] = {
    id,
    name,
    color,
    particles: groupParticles,
  };

  interactionMatrix[id] = interactionMatrix[id] || [];

  return groups[name];
}

// INTERACTION RULES

function setRule(groupAName, groupBName, strength) {
  const groupA = groups[groupAName];
  const groupB = groups[groupBName];

  if (!groupA || !groupB) return;

  const value = clamp(Number(strength) || 0, -10, 10);

  interactionMatrix[groupA.id] = interactionMatrix[groupA.id] || [];
  interactionMatrix[groupA.id][groupB.id] = value;

  const existingRule = rules.find(
    (rule) => rule.a === groupAName && rule.b === groupBName,
  );

  if (existingRule) {
    existingRule.g = value;
    return;
  }

  rules.push({
    a: groupAName,
    b: groupBName,
    g: value,
  });
}

function addInteraction(groupAName, groupBName, strength) {
  setRule(groupAName, groupBName, strength);
}

function randomizeMatrix() {
  const groupNames = Object.keys(groups);

  for (const rowName of groupNames) {
    for (const columnName of groupNames) {
      const randomStrength =
        rowName === columnName ? -4 + random() * 5 : -6 + random() * 13;

      setRule(rowName, columnName, Number(randomStrength.toFixed(1)));
    }
  }

  callIfAvailable("markCustomWorld");
  callIfAvailable("rebuildMatrix");
}

// SPATIAL GRID

function buildSpatialGrid() {
  spatialGrid.clear();

  for (const current of particles) {
    const gridX = Math.floor(current.x / gridCellWidth);
    const gridY = Math.floor(current.y / gridCellHeight);
    const key = createGridKey(gridX, gridY);

    let bucket = spatialGrid.get(key);

    if (!bucket) {
      bucket = [];
      spatialGrid.set(key, bucket);
    }

    bucket.push(current);
  }
}

// PARTICLE PHYSICS

function calculateForces() {
  const radiusSquared = interactionRadius * interactionRadius;
  const minimumDistance = COLLISION_RADIUS / interactionRadius;

  for (const particleA of particles) {
    const gridX = Math.floor(particleA.x / gridCellWidth);
    const gridY = Math.floor(particleA.y / gridCellHeight);

    const interactionRow = interactionMatrix[particleA.groupId] || [];

    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetY = -1; offsetY <= 1; offsetY++) {
        const neighborX = (gridX + offsetX + gridColumns) % gridColumns;
        const neighborY = (gridY + offsetY + gridRows) % gridRows;
        const neighborKey = createGridKey(neighborX, neighborY);
        const bucket = spatialGrid.get(neighborKey);

        if (!bucket) continue;

        for (const particleB of bucket) {
          if (particleA === particleB) {
            continue;
          }

          let deltaX = particleB.x - particleA.x;
          let deltaY = particleB.y - particleA.y;

          if (deltaX > WORLD_WIDTH / 2) {
            deltaX -= WORLD_WIDTH;
          }

          if (deltaX < -WORLD_WIDTH / 2) {
            deltaX += WORLD_WIDTH;
          }

          if (deltaY > WORLD_HEIGHT / 2) {
            deltaY -= WORLD_HEIGHT;
          }

          if (deltaY < -WORLD_HEIGHT / 2) {
            deltaY += WORLD_HEIGHT;
          }

          const distanceSquared = deltaX * deltaX + deltaY * deltaY;

          if (distanceSquared < 0.0001 || distanceSquared >= radiusSquared) {
            continue;
          }

          const distance = Math.sqrt(distanceSquared);
          const normalizedDistance = distance / interactionRadius;

          let force;

          if (normalizedDistance < minimumDistance) {
            force =
              -BASE_REPULSION * (1 - normalizedDistance / minimumDistance);
          } else {
            const strength = interactionRow[particleB.groupId] || 0;

            if (strength === 0) {
              continue;
            }

            const bandPosition =
              (normalizedDistance - minimumDistance) / (1 - minimumDistance);

            const smoothBand = 1 - Math.abs(2 * bandPosition - 1);

            force = strength * smoothBand;
          }

          const scaledForce = force * forceScale;

          particleA.fx += (deltaX / distance) * scaledForce;
          particleA.fy += (deltaY / distance) * scaledForce;
        }
      }
    }
  }
}

function integrateParticles() {
  for (const current of particles) {
    current.fx += (random() - 0.5) * noiseStrength;
    current.fy += (random() - 0.5) * noiseStrength;
    current.vx = (current.vx + current.fx) * friction;
    current.vy = (current.vy + current.fy) * friction;

    const speed = Math.hypot(current.vx, current.vy);

    if (speed > MAX_SPEED) {
      current.vx = (current.vx / speed) * MAX_SPEED;

      current.vy = (current.vy / speed) * MAX_SPEED;
    }

    current.x += current.vx;
    current.y += current.vy;

    current.fx = 0;
    current.fy = 0;

    current.x = wrapCoordinate(current.x, WORLD_WIDTH);
    current.y = wrapCoordinate(current.y, WORLD_HEIGHT);

    current.sprite.x = current.x;
    current.sprite.y = current.y;
  }
}

function simulateStep() {
  buildSpatialGrid();
  calculateForces();
  integrateParticles();
}

// WORLD CONTROLS

function addGroup() {
  const nameInput = document.getElementById("groupName");
  const colorInput = document.getElementById("groupColor");
  const countInput = document.getElementById("groupCount");

  if (!nameInput || !colorInput || !countInput) {
    return;
  }

  const name = nameInput.value.trim();
  const color = colorInput.value;
  const count = clamp(parseInt(countInput.value, 10) || 0, 1, 3000);

  if (!name || groups[name]) {
    return;
  }

  makeGroup(name, count, color);

  callIfAvailable("markCustomWorld");
  callIfAvailable("rebuildMatrix");

  nameInput.value = "";
}

function clearWorld() {
  for (const current of particles) {
    stage.removeChild(current.sprite);

    current.sprite.destroy();
  }

  particles.length = 0;
  rules.length = 0;

  groups = {};
  interactionMatrix = [];

  spatialGrid.clear();

  nextGroupId = 0;
  accumulator = 0;
}

function resetParticles() {
  const presetWasRebuilt = callIfAvailable("rebuildActivePreset");

  if (presetWasRebuilt) {
    return;
  }

  const groupBlueprints = Object.values(groups).map((group) => ({
    name: group.name,
    count: group.particles.length,
    color: group.color,
  }));

  const savedRules = rules.map((rule) => ({
    ...rule,
  }));

  setSeed(currentSeed);
  clearWorld();

  for (const blueprint of groupBlueprints) {
    makeGroup(blueprint.name, blueprint.count, blueprint.color);
  }

  for (const savedRule of savedRules) {
    setRule(savedRule.a, savedRule.b, savedRule.g);
  }

  callIfAvailable("rebuildMatrix");
}

function togglePause() {
  paused = !paused;
  accumulator = 0;

  const button = document.getElementById("pauseBtn");

  if (button) {
    button.textContent = paused ? "▶" : "⏸";
    button.title = paused ? "Resume (Space)" : "Pause (Space)";
  }
}

function stepSimulation() {
  paused = true;
  stepFrame = true;
  accumulator = 0;

  const button = document.getElementById("pauseBtn");

  if (button) {
    button.textContent = "▶";
    button.title = "Resume (Space)";
  }
}

function setInteractionRadius(value) {
  interactionRadius = clamp(Number(value) || 155, 90, 230);

  rebuildGridDimensions();

  const output = document.getElementById("radiusValue");

  if (output) {
    output.textContent = Math.round(interactionRadius);
  }
}

function setSimulationSpeed(value) {
  simulationSpeed = clamp(Number(value) || 1, 0.25, 2);

  const output = document.getElementById("speedValue");

  if (output) {
    output.textContent = `${simulationSpeed.toFixed(2)}×`;
  }
}

// INPUT EVENTS

function handleKeyDown(event) {
  const target = event.target;

  if (
    target instanceof Element &&
    target.matches("input, select, textarea, button")
  ) {
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
    return;
  }

  if (event.key.toLowerCase() === "r" && !event.ctrlKey && !event.metaKey) {
    resetParticles();
  }
}

window.addEventListener("resize", handleResize);
window.addEventListener("mouseup", stopDragging);
window.addEventListener("mousemove", dragCamera);
window.addEventListener("keydown", handleKeyDown);

canvas.addEventListener("mousedown", startDragging);
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("wheel", zoomCamera, {
  passive: false,
});

// ANIMATION LOOP

function update(now = performance.now()) {
  const elapsed = Math.min(now - lastFrameTime, 50);
  const currentFps = elapsed > 0 ? 1000 / elapsed : 60;

  fps = fps * 0.9 + currentFps * 0.1;

  lastFrameTime = now;

  if (!paused) {
    accumulator += elapsed * simulationSpeed;
  }

  if (stepFrame) {
    simulateStep();
    stepFrame = false;
  } else {
    let completedSteps = 0;

    while (
      !paused &&
      accumulator >= FIXED_STEP_MS &&
      completedSteps < MAX_SUB_STEPS
    ) {
      simulateStep();

      accumulator -= FIXED_STEP_MS;

      completedSteps++;
    }

    if (completedSteps === MAX_SUB_STEPS) {
      accumulator = 0;
    }
  }

  if (now - lastStatsUpdate > 250) {
    callIfAvailable("updateStats");

    lastStatsUpdate = now;
  }

  requestAnimationFrame(update);
}

// STARTUP

rebuildGridDimensions();
createParticleTexture();
setSeed(currentSeed);
clampCamera();
applyCameraTransform();
requestAnimationFrame(update);
