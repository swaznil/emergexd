const canvas=document.getElementById("life01");

const app=new PIXI.Application({
    view:canvas,
    resizeTo:window,
    background:"#000000",
    antialias:true,
    resolution:window.devicePixelRatio,
    autoDensity:true
});

const stage=new PIXI.ParticleContainer(100000,{
    position:true,
    scale:true,
    tint:true,
    alpha:true
});

app.stage.addChild(stage);

let particles=[];
let groups={};
let rules=[];
let spatialGrid={};

let cameraX=1500;
let cameraY=1500;
let zoom=1;

let dragging=false;
let lastX=0;
let lastY=0;

let fps=0;
let last=performance.now();

let particleTexture;

const WORLD_WIDTH=3000;
const WORLD_HEIGHT=3000;
const MAX_SPEED=2;
const INTERACTION_RADIUS=140;
const COLLISION_RADIUS=8;
const CELL_SIZE=INTERACTION_RADIUS;

function clamp(v,min,max){
    return Math.max(min,Math.min(max,v));
}

function clampCamera(){
    const halfW=canvas.width/(50*zoom);
    const halfH=canvas.height/(50*zoom);

    const minX=halfW;
    const maxX=WORLD_WIDTH-halfW;

    const minY=halfH;
    const maxY=WORLD_HEIGHT-halfH;

    cameraX=minX>maxX?WORLD_WIDTH/2:clamp(cameraX,minX,maxX);
    cameraY=minY>maxY?WORLD_HEIGHT/2:clamp(cameraY,minY,maxY);
}

function safeId(s){
    return String(s).replace(/[^a-zA-Z0-9_-]/g,"_");
}

function ruleId(a,b){
    return `rule-${safeId(a)}-${safeId(b)}`;
}

function valueId(a,b){
    return `value-${safeId(a)}-${safeId(b)}`;
}

function createParticleTexture(){

    const g=new PIXI.Graphics();

    g.beginFill(0xffffff,0.03);
    g.drawCircle(0,0,48);
    g.endFill();

    g.beginFill(0xffffff,0.12);
    g.drawCircle(0,0,24);
    g.endFill();

    g.beginFill(0xffffff,0.45);
    g.drawCircle(0,0,12);
    g.endFill();

    g.beginFill(0xffffff,1);
    g.drawCircle(0,0,5);
    g.endFill();

    particleTexture=app.renderer.generateTexture(g);
}

function particle(x,y,c){
    const sprite=new PIXI.Sprite(particleTexture);
    sprite.anchor.set(0.5);
    sprite.tint=PIXI.utils.string2hex(c);
    sprite.alpha=1;
    stage.addChild(sprite);
    return{
        x,
        y,
        vx:0,
        vy:0,
        fx:0,
        fy:0,
        color:c,
        sprite
    };
}

function randomW(){
    return Math.random()*WORLD_WIDTH;
}

function randomH(){
    return Math.random()*WORLD_HEIGHT;
}

function randomizeMatrix(){
    const names=Object.keys(groups);
    for(const row of names){
        for(const col of names){
            let value;
            if(row===col){
                value=-4+Math.random()*2;
            }else{
                value=-2+Math.random()*7;
            }
            setRule(
                row,
                col,
                parseFloat(value.toFixed(1))
            );
        }
    }

    rebuildMatrix();
}

function buildSpatialGrid(){
    spatialGrid={};
    for(let i=0;i<particles.length;i++){
        const p=particles[i];
        const gx=(p.x/CELL_SIZE)|0;
        const gy=(p.y/CELL_SIZE)|0;
        const key=gx+","+gy;
        let bucket=spatialGrid[key];
        if(!bucket){
            bucket=[];
            spatialGrid[key]=bucket;
        }
        bucket.push(p);
    }
}

function getNearbyParticles(p){

    const gx=Math.floor(p.x/CELL_SIZE);
    const gy=Math.floor(p.y/CELL_SIZE);
    let nearby=[];
    for(let ox=-1;ox<=1;ox++){
        for(let oy=-1;oy<=1;oy++){
            const key=`${gx+ox},${gy+oy}`;
            if(spatialGrid[key]){
                nearby.push(...spatialGrid[key]);
            }
        }
    }

    return nearby;
}

function create(number,color){
    const group=[];
    for(let i=0;i<number;i++){
        const p=particle(
            randomW(),
            randomH(),
            color
        );
        group.push(p);
        particles.push(p);
    }
    return group;
}

function rule(g1,g2,strength){

    if(!g1||!g2)return;
    const radius=INTERACTION_RADIUS;
    const radius2=radius*radius;
    const ideal=35;
    const sigma=26;
    const closeRepel=2.8;
    const forceScale=0.04;
    for(let i=0;i<g1.length;i++){
        const a=g1[i];
        const gx=(a.x/CELL_SIZE)|0;
        const gy=(a.y/CELL_SIZE)|0;
        for(let ox=-1;ox<=1;ox++){
            for(let oy=-1;oy<=1;oy++){

                const bucket=spatialGrid[(gx+ox)+","+(gy+oy)];
                if(!bucket)continue;
                for(let j=0;j<bucket.length;j++){

                    const b=bucket[j];

                    if(a===b)continue;
                    if(!g2.set.has(b))
                        continue;

                    let dx=b.x-a.x;
                    let dy=b.y-a.y;

                    if(dx>WORLD_WIDTH/2)
                        dx-=WORLD_WIDTH;
                    if(dx<-WORLD_WIDTH/2)
                        dx+=WORLD_WIDTH;
                    if(dy>WORLD_HEIGHT/2)
                        dy-=WORLD_HEIGHT;
                    if(dy<-WORLD_HEIGHT/2)
                        dy+=WORLD_HEIGHT;

                    const d2=dx*dx+dy*dy;

                    if(d2<0.0001)
                        continue;

                    if(d2>radius2)
                        continue;

                    const d=Math.sqrt(d2);
                    const nx=dx/d;
                    const ny=dy/d;
                    let f=
                        strength*
                        Math.exp(
                            -((d-ideal)*(d-ideal))/
                            (2*sigma*sigma)
                        );
                    if(d<COLLISION_RADIUS){
                        const t= 1-d/COLLISION_RADIUS;
                        f-=closeRepel*t*t;
                    }
                    f*=(1-d/radius);
                    f*=forceScale;
                    a.fx+=nx*f;
                    a.fy+=ny*f;
                }
            }
        }
    }
}

function integrate(){

    for(let i=0;i<particles.length;i++){

        const p=particles[i];

        p.fx+=(Math.random()-0.5)*0.002;
        p.fy+=(Math.random()-0.5)*0.002;

        p.vx=(p.vx+p.fx)*0.97;
        p.vy=(p.vy+p.fy)*0.97;

        const speed=Math.hypot(p.vx,p.vy);

        if(speed>MAX_SPEED){

            p.vx=p.vx/speed*MAX_SPEED;
            p.vy=p.vy/speed*MAX_SPEED;
        }

        p.x+=p.vx;
        p.y+=p.vy;

        p.fx=0;
        p.fy=0;

        if(p.x<0)p.x+=WORLD_WIDTH;
        if(p.x>=WORLD_WIDTH)p.x-=WORLD_WIDTH;

        if(p.y<0)p.y+=WORLD_HEIGHT;
        if(p.y>=WORLD_HEIGHT)p.y-=WORLD_HEIGHT;
    }
}

window.addEventListener("resize",()=>{

    clampCamera();
});

canvas.addEventListener("contextmenu",e=>e.preventDefault());

canvas.addEventListener("mousedown",e=>{

    if(e.button!==2)return;

    dragging=true;

    lastX=e.clientX;
    lastY=e.clientY;
});

window.addEventListener("mouseup",()=>{

    dragging=false;
});

window.addEventListener("mousemove",e=>{

    if(!dragging)return;

    cameraX-=(e.clientX-lastX)/zoom;
    cameraY-=(e.clientY-lastY)/zoom;

    lastX=e.clientX;
    lastY=e.clientY;

    clampCamera();
});

canvas.addEventListener("wheel",e=>{

    e.preventDefault();

    const mx=e.offsetX;
    const my=e.offsetY;

    const wx=cameraX+(mx-canvas.width/2)/zoom;
    const wy=cameraY+(my-canvas.height/2)/zoom;

    zoom*=e.deltaY>0?0.9:1.1;

    zoom=clamp(zoom,0.1,8);

    cameraX=wx-(mx-canvas.width/2)/zoom;
    cameraY=wy-(my-canvas.height/2)/zoom;

    clampCamera();

},{passive:false});

function setRule(a,b,g){

    const existing=rules.find(
        r=>r.a===a&&r.b===b
    );

    if(existing){
        existing.g=g;
    }else{
        rules.push({a,b,g});
    }
}

function addGroup(){

    const name=document
        .getElementById("groupName")
        .value
        .trim();

    const color=document
        .getElementById("groupColor")
        .value;

    const count=parseInt(
        document
        .getElementById("groupCount")
        .value
    );

    if(!name||groups[name])return;

    const newParticles=create(count,color);

    groups[name]={
        particles:newParticles,
        set:new Set(newParticles)
    };

    rebuildMatrix();
}

function update(){

    const now=performance.now();

    const currentFPS=1000/(now-last);

    fps=fps*0.9+currentFPS*0.1;

    last=now;

    const fpsEl=document.getElementById("fps");

    if(fpsEl){
        fpsEl.textContent=`FPS: ${fps.toFixed(1)}`;
    }

    buildSpatialGrid();

    for(let i=0;i<rules.length;i++){

        const r=rules[i];

        const groupA=groups[r.a];
        const groupB=groups[r.b];

        if(!groupA||!groupB)continue;

        if(!groupA.particles||!groupB.set)continue;

        rule(
            groupA.particles,
            groupB,
            r.g
        );
    }

    integrate();

    for(let i=0;i<particles.length;i++){

        const p=particles[i];

        p.sprite.x=
            (p.x-cameraX)*zoom+
            canvas.width/2;

        p.sprite.y=
            (p.y-cameraY)*zoom+
            canvas.height/2;

        const scale=Math.max(
            0.25,
            zoom*0.45
        );

        p.sprite.scale.set(scale);
    }

    requestAnimationFrame(update);
}

function resetParticles(){

    const newGroups={};

    for(const p of particles){

        stage.removeChild(p.sprite);

        p.sprite.destroy();
    }

    particles=[];

    for(const key in groups){

        const oldGroup=groups[key].particles;

        if(oldGroup.length===0)continue;

        const color=oldGroup[0].color;

        const newParticles=create(
            oldGroup.length,
            color
        );

        newGroups[key]={
            particles:newParticles,
            set:new Set(newParticles)
        };
    }

    groups=newGroups;

    rebuildMatrix();
}

createParticleTexture();

update();