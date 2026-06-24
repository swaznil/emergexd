function clearWorld(){

    for(const p of particles){
        if(p.sprite){
            stage.removeChild(p.sprite);
            p.sprite.destroy();
        }

    }
    particles.length = 0;
    for(const key in groups){
        delete groups[key];
    }
    rules.length = 0;
    spatialGrid = {};
}

function makeGroup(name,count,color){

    const created = create(count,color);

    groups[name] = {
        particles: created,
        set: new Set(created)
    };
}

function addInteraction(a,b,strength){

    setRule(a,b,strength);
}

function presetEcosystem(){

    clearWorld();

    makeGroup("plants",1800,"lime");
    makeGroup("herbivores",500,"yellow");
    makeGroup("predators",180,"red");
    makeGroup("scavengers",120,"cyan");

    addInteraction("plants","plants",2);

    addInteraction("herbivores","plants",6);
    addInteraction("plants","herbivores",-1);

    addInteraction("herbivores","herbivores",1.5);

    addInteraction("predators","herbivores",8);
    addInteraction("herbivores","predators",-8);

    addInteraction("predators","predators",-4);

    addInteraction("scavengers","predators",2);
    addInteraction("scavengers","herbivores",1);

    addInteraction("scavengers","scavengers",-1);

    rebuildMatrix();
}

function presetFlocking(){

    clearWorld();

    makeGroup("flockA",1200,"cyan");
    makeGroup("flockB",1200,"magenta");

    addInteraction("flockA","flockA",4);
    addInteraction("flockB","flockB",4);

    addInteraction("flockA","flockB",-1);
    addInteraction("flockB","flockA",-1);

    rebuildMatrix();
}

function presetHunters(){

    clearWorld();

    makeGroup("prey",1800,"lime");
    makeGroup("hunters",250,"red");

    addInteraction("prey","prey",2);

    addInteraction("hunters","prey",7);
    addInteraction("prey","hunters",-8);

    addInteraction("hunters","hunters",-4);

    rebuildMatrix();
}

function presetGalaxy(){

    clearWorld();

    makeGroup("core",600,"white");

    makeGroup("armA",1200,"cyan");
    makeGroup("armB",1200,"magenta");
    makeGroup("armC",1200,"yellow");

    addInteraction("core","core",6);

    addInteraction("armA","core",7);
    addInteraction("armB","core",7);
    addInteraction("armC","core",7);

    addInteraction("core","armA",-1);
    addInteraction("core","armB",-1);
    addInteraction("core","armC",-1);

    addInteraction("armA","armA",-2);
    addInteraction("armB","armB",-2);
    addInteraction("armC","armC",-2);

    addInteraction("armA","armB",1);
    addInteraction("armB","armC",1);
    addInteraction("armC","armA",1);

    rebuildMatrix();
}

function presetChaos(){

    clearWorld();

    const colors = [
        "red",
        "lime",
        "cyan",
        "yellow",
        "magenta",
        "white"
    ];

    for(let i=0;i<colors.length;i++){

        makeGroup(
            `group${i+1}`,
            500,
            colors[i]
        );

    }

    const names = Object.keys(groups);

    for(const a of names){

        for(const b of names){

            const value =
                a === b
                ? -2 - Math.random()*3
                : -5 + Math.random()*10;

            addInteraction(
                a,
                b,
                parseFloat(value.toFixed(1))
            );
        }
    }

    rebuildMatrix();
}

function toggleHelp(){

    document
        .getElementById("helpPanel")
        ?.classList
        .toggle("hidden");
}

function updateGroupCount(){

    const label =
        document.getElementById(
            "groupCountLabel"
        );

    if(!label) return;

    const count =
        Object.keys(groups).length;

    label.textContent =
        `${count} group${count!==1?"s":""}`;
}

function rebuildMatrix(){

    const container =
        document.getElementById(
            "matrixContainer"
        );

    if(!container) return;

    container.innerHTML = "";

    const names =
        Object.keys(groups);

    if(names.length===0){

        updateGroupCount();
        return;
    }

    const grid =
        document.createElement("div");

    grid.className =
        "matrix-grid";

    grid.style.gridTemplateColumns =
        `80px repeat(${names.length},1fr)`;

    grid.appendChild(
        document.createElement("div")
    );

    for(const name of names){

        const label =
            document.createElement("div");

        label.className =
            "matrix-label";

        label.textContent =
            name;

        const p =
            groups[name]
            .particles?.[0];

        if(p){
            label.style.color =
                p.color;
        }

        grid.appendChild(label);
    }

    for(const row of names){

        const rowLabel =
            document.createElement("div");

        rowLabel.className =
            "matrix-label";

        rowLabel.textContent =
            row;

        const p =
            groups[row]
            .particles?.[0];

        if(p){
            rowLabel.style.color =
                p.color;
        }

        grid.appendChild(rowLabel);

        for(const col of names){

            const current =
                rules.find(
                    r =>
                    r.a===row &&
                    r.b===col
                );

            const input =
                document.createElement(
                    "input"
                );

            input.type = "number";
            input.step = "0.1";
            input.min = "-10";
            input.max = "10";

            input.className =
                "matrix-input";

            input.value =
                current
                ? current.g
                : 0;

            input.addEventListener(
                "input",
                ()=>{

                    setRule(
                        row,
                        col,
                        parseFloat(
                            input.value
                        ) || 0
                    );

                }
            );

            grid.appendChild(input);
        }
    }

    container.appendChild(grid);

    updateGroupCount();
}