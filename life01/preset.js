function clearWorld(){
    for(const p of particles){
        if(p.sprite){
            stage.removeChild(p.sprite);
            p.sprite.destroy();
        }
    }

    particles.length=0;
    rules.length=0;
    spatialGrid={};

    for(const key in groups) delete groups[key];
}

function makeGroup(name,count,color){
    const created=create(count,color);

    groups[name]={
        particles:created,
        set:new Set(created)
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

    ["red","lime","cyan","yellow","magenta","white"]
        .forEach((color,i)=>makeGroup(`group${i+1}`,500,color));

    const names=Object.keys(groups);

    for(const a of names){
        for(const b of names){
            const value=
                a===b
                    ? -2-Math.random()*3
                    : -5+Math.random()*10;

            addInteraction(a,b,+value.toFixed(1));
        }
    }

    rebuildMatrix();
}

function toggleHelp(){
    document.getElementById("helpPanel")
        ?.classList.toggle("hidden");
}

function updateGroupCount(){
    const label=document.getElementById("groupCountLabel");
    if(!label) return;

    const count=Object.keys(groups).length;
    label.textContent=`${count} group${count!==1?"s":""}`;
}

function colorCell(input,value){
    const strength=Math.min(Math.abs(value)/10,1);

    if(value>0){
        input.style.background=
            `rgba(0,255,120,${0.12+strength*0.3})`;
    }else if(value<0){
        input.style.background=
            `rgba(255,60,60,${0.12+strength*0.3})`;
    }else{
        input.style.background=
            "rgba(255,255,255,.04)";
    }
}

function rebuildMatrix(){
    const container=document.getElementById("matrixContainer");
    if(!container) return;

    container.innerHTML="";

    const names=Object.keys(groups);

    if(!names.length){
        updateGroupCount();
        return;
    }

    const grid=document.createElement("div");
    grid.className="matrix-grid";
    grid.style.gridTemplateColumns=
        `140px repeat(${names.length},80px)`;

    const corner=document.createElement("div");
    corner.className="matrix-corner";
    corner.textContent="→";
    grid.appendChild(corner);

    for(const name of names){
        const label=document.createElement("div");
        label.className="matrix-label";
        label.textContent=name;

        const p=groups[name].particles[0];
        if(p) label.style.color=p.color;

        grid.appendChild(label);
    }

    for(const row of names){

        const rowLabel=document.createElement("div");
        rowLabel.className="matrix-label";
        rowLabel.textContent=row;

        const p=groups[row].particles[0];
        if(p) rowLabel.style.color=p.color;

        grid.appendChild(rowLabel);

        for(const col of names){

            const value=
                rules.find(
                    r=>r.a===row&&r.b===col
                )?.g ?? 0;

            const input=document.createElement("input");

            input.type="number";
            input.step="0.1";
            input.min="-10";
            input.max="10";
            input.value=value;
            input.className="matrix-input";

            colorCell(input,value);

            input.addEventListener("input",()=>{
                const v=parseFloat(input.value)||0;
                setRule(row,col,v);
                colorCell(input,v);
            });

            input.addEventListener("wheel",e=>{
                e.preventDefault();

                let v=parseFloat(input.value)||0;

                v+=e.deltaY<0 ? 0.1 : -0.1;
                v=Math.max(-10,Math.min(10,v));

                v=+v.toFixed(1);

                input.value=v;

                setRule(row,col,v);
                colorCell(input,v);
            });

            grid.appendChild(input);
        }
    }

    container.appendChild(grid);
    updateGroupCount();
}