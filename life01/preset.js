function clearWorld(){

    particles = [];
    groups = {};
    rules = [];
    spatialGrid = {};
}

function makeGroup(name, count, color){

    const newParticles = create(count, color);

    groups[name] = {
        particles: newParticles,
        set: new Set(newParticles)
    };
}

function presetChaos(){

    clearWorld();

    makeGroup("red", 600, "red");
    makeGroup("green", 600, "lime");
    makeGroup("blue", 600, "cyan");

    setRule("red", "red", -4);
    setRule("green", "green", -4);
    setRule("blue", "blue", -4);

    setRule("red", "green", 5);
    setRule("green", "blue", 5);
    setRule("blue", "red", 5);

    setRule("green", "red", -5);
    setRule("blue", "green", -5);
    setRule("red", "blue", -5);

    updateRuleEditor();
}

function presetPredators(){

    clearWorld();

    makeGroup("prey", 1600, "lime");
    makeGroup("predator", 250, "red");

    setRule("prey", "prey", 2.5);
    setRule("predator", "predator", -5);
    setRule("predator", "prey", 5);
    setRule("prey", "predator", -5);

    updateRuleEditor();
}

function presetOrbit(){

    clearWorld();

    makeGroup("core", 250, "white");
    makeGroup("red", 900, "red");
    makeGroup("blue", 900, "cyan");

    setRule("core", "core", 4);

    setRule("red", "core", 5);
    setRule("blue", "core", 5);

    setRule("core", "red", -1);
    setRule("core", "blue", -1);

    setRule("red", "red", -4);
    setRule("blue", "blue", -4);

    setRule("red", "blue", 2);
    setRule("blue", "red", 2);

    updateRuleEditor();
}

function presetGalaxy(){

    clearWorld();

    makeGroup("core", 400, "white");

    makeGroup("arm1", 1200, "cyan");
    makeGroup("arm2", 1200, "magenta");
    makeGroup("arm3", 1200, "yellow");

    setRule("core", "core", 5);

    setRule("arm1", "core", 5);
    setRule("arm2", "core", 5);
    setRule("arm3", "core", 5);

    setRule("core", "arm1", -1);
    setRule("core", "arm2", -1);
    setRule("core", "arm3", -1);

    setRule("arm1", "arm1", -3);
    setRule("arm2", "arm2", -3);
    setRule("arm3", "arm3", -3);

    setRule("arm1", "arm2", 1);
    setRule("arm2", "arm3", 1);
    setRule("arm3", "arm1", 1);

    updateRuleEditor();
}