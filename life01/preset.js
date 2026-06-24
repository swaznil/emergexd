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

    rebuildMatrix();
}

function presetPredators(){

    clearWorld();

    makeGroup("prey", 1600, "lime");
    makeGroup("predator", 250, "red");

    setRule("prey", "prey", 2.5);
    setRule("predator", "predator", -5);
    setRule("predator", "prey", 5);
    setRule("prey", "predator", -5);

    rebuildMatrix();
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

    rebuildMatrix();
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

    rebuildMatrix();
}

const interactions = {};

function toggleHelp(){
    document.getElementById("helpPanel").classList.toggle("hidden");
}

function updateGroupCount(){
    const names = Object.keys(groups);
    document.getElementById("groupCountLabel").textContent = 
    `${names.length} group${names.length !== 1 ? "s" : ""}`;
}

function rebuildMatrix(){
    const container = document.getElementById("matrixContainer");
    if(!container) return;
    container.innerHTML = "";
    const names = Object.keys(groups);
    if(names.length === 0) return;
    const grid = document.createElement("div");
    grid.className = "matrix-grid";
    grid.style.gridTemplateColumns = `70px repeat(${names.length}, 58px)`;
    const empty = document.createElement("div");
    empty.className = "matrix-corner";
    grid.appendChild(empty);

    for(const name of names){
        const label = document.createElement("div");
        label.className = "matrix-label";
        label.textContent = name;
        const p = groups[name].particles?.[0];
        if(p) label.style.color = p.color;
        grid.appendChild(label);
    }

    for(const row of names){
        const rowLabel = document.createElement("div");
        rowLabel.className = "matrix-label";
        rowLabel.textContent = row;
        const rp = groups[row].particles?.[0];
        if(rp) rowLabel.style.color = rp.color;
        grid.appendChild(rowLabel);
        for(const col of names){
            const existing = rules.find(r=>r.a===row&&r.b===col);
            const value = existing ? existing.g : 0;
            const input = document.createElement("input");
            input.type = "number";
            input.step = "0.1";
            input.min = "-8";
            input.max = "8";
            input.value = value;
            input.className = "matrix-input";
            input.oninput = ()=>{
                const v = parseFloat(input.value) || 0;
                setRule(row,col,v);
            };
            grid.appendChild(input);
        }
    }
    container.appendChild(grid);
    updateGroupCount();
}

function toggleHelp(){
    document
        .getElementById("helpPanel")
        .classList
        .toggle("hidden");
}