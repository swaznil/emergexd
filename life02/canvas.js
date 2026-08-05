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
const MAX_SPEED = 1.35;
const INTERACTION_RADIUS = 155;
const COLLISION_RADIUS = 17;
const FORCE_SCALE = 0.047;
const FRICTION = 0.982;

let particles = [];
let groups = {};
let interactionMatrix = [];
let nextGroupId = 0;
let particleTexture;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function wrap(value, size) {
  if (value < 0) return value + size;
  if (value >= size) return value - size;
  return value;
}

function createParticleTexture() {
  const graphic = new PIXI.Graphics();

  graphic.beginFill(0xffffff);
  graphic.drawCircle(6, 6, 3);
  graphic.endFill();

  particleTexture = app.renderer.generateTexture(graphic);
  graphic.destroy();
}

function createParticle(x, y, color, groupId) {
  const sprite = new PIXI.Sprite(particleTexture);

  sprite.anchor.set(0.5);
  sprite.tint = PIXI.utils.string2hex(color);
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

  groups[name] = {
    id,
    name,
    color,
    particles: groupParticles,
  };

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

function simulate() {
  for (const particleA of particles) {
    const row = interactionMatrix[particleA.groupId] || [];

    for (const particleB of particles) {
      if (particleA === particleB) continue;

      let dx = particleB.x - particleA.x;
      let dy = particleB.y - particleA.y;

      if (dx > WORLD_WIDTH / 2) dx -= WORLD_WIDTH;
      if (dx < -WORLD_WIDTH / 2) dx += WORLD_WIDTH;
      if (dy > WORLD_HEIGHT / 2) dy -= WORLD_HEIGHT;
      if (dy < -WORLD_HEIGHT / 2) dy += WORLD_HEIGHT;

      const distanceSquared = dx * dx + dy * dy;

      if (
        distanceSquared < 0.0001 ||
        distanceSquared >= INTERACTION_RADIUS * INTERACTION_RADIUS
      ) {
        continue;
      }

      const distance = Math.sqrt(distanceSquared);
      const normalizedDistance = distance / INTERACTION_RADIUS;
      let force;

      if (distance < COLLISION_RADIUS) {
        force = -9 * (1 - distance / COLLISION_RADIUS);
      } else {
        const strength = row[particleB.groupId] || 0;
        const band = 1 - Math.abs(2 * normalizedDistance - 1);
        force = strength * band;
      }

      particleA.fx += (dx / distance) * force * FORCE_SCALE;
      particleA.fy += (dy / distance) * force * FORCE_SCALE;
    }
  }

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

function setupWorld() {
  makeGroup("cyan", 350, "#58d8ff");
  makeGroup("pink", 350, "#ff6fae");
  makeGroup("gold", 350, "#ffd166");

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

createParticleTexture();
setupWorld();

app.ticker.add(simulate);
