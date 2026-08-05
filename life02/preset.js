let activePresetName = "";
let activePresetBuilder = null;

const PRESET_SEEDS = {
  Bloom: 6969,
  Coral: 7319,
  Weave: 4242,
};

const PRESET_DESCRIPTIONS = {
  Bloom: "Color cycles fold into bright, flower-like cells.",
  Coral: "Paired forces grow curved chains and branching beads.",
  Weave: "Three groups stitch themselves into traveling ribbons.",
};

function usePreset(name, builder, options = {}) {
  activePresetName = name;
  activePresetBuilder = builder;

  const seedInput = document.getElementById("seedInput");
  const inputSeed = Number(seedInput?.value);

  const requestedSeed =
    options.seed ??
    (Number.isFinite(inputSeed) && inputSeed > 0
      ? inputSeed
      : PRESET_SEEDS[name]);

  setSeed(requestedSeed || PRESET_SEEDS[name]);

  clearWorld();
  builder();

  rebuildMatrix();
  updatePresetButtons();

  cameraX = WORLD_WIDTH / 2;
  cameraY = WORLD_HEIGHT / 2;
  zoom = options.zoom ?? 0.55;

  clampCamera();
  applyCameraTransform();
}

function rebuildActivePreset() {
  if (!activePresetBuilder) {
    return false;
  }

  usePreset(activePresetName, activePresetBuilder, {
    seed: currentSeed,
    zoom,
  });

  return true;
}

function markCustomWorld() {
  activePresetName = "";
  activePresetBuilder = null;

  updatePresetButtons();
}

function applySeed() {
  const seedInput = document.getElementById("seedInput");
  const seed = Number(seedInput?.value);

  setSeed(seed);
  resetParticles();
}

function diskSpawn(centerX, centerY, radius, drift = 0) {
  return (_index, _count, seededRandom) => {
    const angle = seededRandom() * Math.PI * 2;
    const distance = Math.sqrt(seededRandom()) * radius;

    return {
      x: centerX + Math.cos(angle) * distance,
      y: centerY + Math.sin(angle) * distance,
      vx: Math.cos(angle + Math.PI / 2) * drift,
      vy: Math.sin(angle + Math.PI / 2) * drift,
    };
  };
}

function stripeSpawn(axis, offset, spread) {
  return (_index, _count, seededRandom) => {
    const along = seededRandom() * (axis === "x" ? WORLD_WIDTH : WORLD_HEIGHT);

    const across = offset + (seededRandom() - 0.5) * spread;

    if (axis === "x") {
      return {
        x: along,
        y: across,
        vx: 0,
        vy: 0,
      };
    }

    return {
      x: across,
      y: along,
      vx: 0,
      vy: 0,
    };
  };
}

function setSelfRepulsion(names, strength) {
  for (const name of names) {
    addInteraction(name, name, strength);
  }
}

function presetBloom(options) {
  usePreset(
    "Bloom",
    () => {
      const names = ["rose", "gold", "mint", "sky", "violet"];

      const colors = ["#ff4d8d", "#ffd166", "#56f39a", "#4cc9f0", "#b07cff"];

      names.forEach((name, index) => {
        makeGroup(name, 400, colors[index]);
      });

      setSelfRepulsion(names, -2.8);

      names.forEach((name, index) => {
        const next = names[(index + 1) % names.length];
        const previous = names[(index - 1 + names.length) % names.length];
        const opposite = names[(index + 2) % names.length];

        addInteraction(name, next, 7.2);
        addInteraction(name, previous, 2.4);
        addInteraction(name, opposite, -2.1);
      });
    },
    options,
  );
}

function presetCoral(options) {
  usePreset(
    "Coral",
    () => {
      const names = ["ember", "peach", "foam", "teal"];

      const colors = ["#ff5d73", "#ffad69", "#8affc1", "#22d3c5"];

      names.forEach((name, index) => {
        makeGroup(
          name,
          460,
          colors[index],
          diskSpawn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2, 1180 - index * 90),
        );
      });

      setSelfRepulsion(names, -4.4);

      addInteraction("ember", "peach", 8.2);
      addInteraction("peach", "ember", 5.2);

      addInteraction("peach", "foam", 7.4);
      addInteraction("foam", "peach", 3.8);

      addInteraction("foam", "teal", 7.8);
      addInteraction("teal", "foam", 4.6);

      addInteraction("teal", "ember", 6.4);
      addInteraction("ember", "teal", 2.2);

      addInteraction("ember", "foam", -3.4);
      addInteraction("foam", "ember", -2.7);

      addInteraction("peach", "teal", -3.1);
      addInteraction("teal", "peach", -2.5);
    },
    options,
  );
}

function presetWeave(options) {
  usePreset(
    "Weave",
    () => {
      makeGroup("horizontal", 600, "#ff4fa3", stripeSpawn("x", 1050, 520));

      makeGroup("vertical", 600, "#49d6ff", stripeSpawn("y", 1950, 520));

      makeGroup("stitch", 450, "#ffe66d");

      setSelfRepulsion(["horizontal", "vertical", "stitch"], -3.8);

      addInteraction("horizontal", "vertical", 6.8);
      addInteraction("vertical", "horizontal", 6.8);

      addInteraction("stitch", "horizontal", 7.6);
      addInteraction("stitch", "vertical", 7.6);

      addInteraction("horizontal", "stitch", -1.8);
      addInteraction("vertical", "stitch", -1.8);
    },
    options,
  );
}

function toggleHelp() {
  document.getElementById("helpPanel")?.classList.toggle("hidden");
}

function updatePresetButtons() {
  document.querySelectorAll("[data-preset]").forEach((button) => {
    const isActive = button.dataset.preset === activePresetName;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  const label = document.getElementById("presetName");

  if (label) {
    label.textContent = activePresetName || "Custom";
  }

  const description = document.getElementById("presetDescription");

  if (description) {
    description.textContent = activePresetName
      ? PRESET_DESCRIPTIONS[activePresetName]
      : "Tune the force matrix to make a pattern of your own.";
  }
}

function updateGroupCount() {
  const label = document.getElementById("groupCountLabel");

  if (!label) {
    return;
  }

  const count = Object.keys(groups).length;

  label.textContent = `${count} group${count !== 1 ? "s" : ""}`;
}

function rebuildMatrix() {
  updateGroupCount();
}

function updateStats() {
  const stats = document.getElementById("stats");

  if (!stats) {
    return;
  }

  stats.innerHTML = `
    <span><b>${fps.toFixed(0)}</b> FPS</span>
    <span><b>${particles.length.toLocaleString()}</b> particles</span>
    <span><b>${Object.keys(groups).length}</b> groups</span>
  `;
}

presetBloom({
  seed: PRESET_SEEDS.Bloom,
});
