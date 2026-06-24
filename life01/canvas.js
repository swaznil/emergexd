const canvas=document.getElementById("life01");
const m=canvas.getContext("2d");

let particles=[];
let groups={};
let rules=[];

let cameraX=1500;
let cameraY=1500;
let zoom=1;

let dragging=false;
let lastX=0;
let lastY=0;

let fps=0;
let last=performance.now();

const WORLD_WIDTH=3000;
const WORLD_HEIGHT=3000;
const MAX_SPEED=6;
const INTERACTION_RADIUS=120;
const COLLISION_RADIUS=8;

resizeCanvas();

function resizeCanvas(){
    canvas.width=window.innerWidth*0.8;
    canvas.height=window.innerHeight*0.8;
}

function clamp(v,min,max){
    return Math.max(min,Math.min(max,v));
}

function particle(x,y,c){
    return{x,y,vx:0,vy:0,color:c};
}

function randomW(){
    return Math.random()*WORLD_WIDTH;
}

function randomH(){
    return Math.random()*WORLD_HEIGHT;
}

function draw(x,y,c,s){
    const sx=(x-cameraX)*zoom+canvas.width/2;
    const sy=(y-cameraY)*zoom+canvas.height/2;

    if(sx<-50||sy<-50||sx>canvas.width+50||sy>canvas.height+50)return;

    m.globalAlpha=.12;
    m.fillStyle=c;
    m.beginPath();
    m.arc(sx,sy,s*4*zoom,0,Math.PI*2);
    m.fill();

    m.globalAlpha=.35;
    m.beginPath();
    m.arc(sx,sy,s*2.2*zoom,0,Math.PI*2);
    m.fill();

    m.globalAlpha=1;
    m.beginPath();
    m.arc(sx,sy,s*zoom,0,Math.PI*2);
    m.fill();
}

function create(number,color){
    const group=[];
    for(let i=0;i<number;i++){
        const p=particle(randomW(),randomH(),color);
        group.push(p);
        particles.push(p);
    }
    return group;
}

function rule(g1,g2,strength){
    for(let i=0;i<g1.length;i++){
    const a=g1[i];
    let fx=0;
    let fy=0;

        for(let j=0;j<g2.length;j++){
            const b=g2[j];
            if(a===b)continue;

            let dx=b.x-a.x;
            let dy=b.y-a.y;

            if(dx>WORLD_WIDTH/2)dx-=WORLD_WIDTH;
            if(dx<-WORLD_WIDTH/2)dx+=WORLD_WIDTH;
            if(dy>WORLD_HEIGHT/2)dy-=WORLD_HEIGHT;
            if(dy<-WORLD_HEIGHT/2)dy+=WORLD_HEIGHT;

            const d2=dx*dx+dy*dy;
            if(d2<1)continue;

            const d=Math.sqrt(d2);

            if(d<COLLISION_RADIUS){
                const push=(COLLISION_RADIUS-d)*0.3;
                fx-=dx/d*push;
                fy-=dy/d*push;
                continue;
            }

            if(d<INTERACTION_RADIUS){
                const t=1-d/INTERACTION_RADIUS;
                const f=strength*t*t*0.08;
                fx+=dx*f;
                fy+=dy*f;
            }
        }

        a.vx=(a.vx+fx)*0.94;
        a.vy=(a.vy+fy)*0.94;

        const speed=Math.sqrt(a.vx*a.vx+a.vy*a.vy);

        if(speed>MAX_SPEED){
            a.vx=a.vx/speed*MAX_SPEED;
            a.vy=a.vy/speed*MAX_SPEED;
        }

    a.x+=a.vx;
    a.y+=a.vy;

    if(a.x<0)a.x+=WORLD_WIDTH;
    if(a.x>=WORLD_WIDTH)a.x-=WORLD_WIDTH;
    if(a.y<0)a.y+=WORLD_HEIGHT;
    if(a.y>=WORLD_HEIGHT)a.y-=WORLD_HEIGHT;
    }
}

    window.addEventListener("resize",resizeCanvas);
    canvas.addEventListener("contextmenu",e=>e.preventDefault());

canvas.addEventListener("mousedown",e=>{
    if(e.button!==2)return;
    dragging=true;
    lastX=e.clientX;
    lastY=e.clientY;
});

    window.addEventListener("mouseup",()=>{dragging=false;});

window.addEventListener("mousemove",e=>{
    if(!dragging)return;

    cameraX-=(e.clientX-lastX)/zoom;
    cameraY-=(e.clientY-lastY)/zoom;

    lastX=e.clientX;
    lastY=e.clientY;
});

canvas.addEventListener("wheel",e=>{e.preventDefault();

    const mx=e.offsetX;
    const my=e.offsetY;

    const wx=cameraX+(mx-canvas.width/2)/zoom;
    const wy=cameraY+(my-canvas.height/2)/zoom;

    zoom*=e.deltaY>0?0.9:1.1;
    zoom=clamp(zoom,0.1,8);

    cameraX=wx-(mx-canvas.width/2)/zoom;
    cameraY=wy-(my-canvas.height/2)/zoom;
},{passive:false});

function setRule(a,b,g){
    const existing=rules.find(r=>r.a===a&&r.b===b);
    if(existing)existing.g=g;
    else rules.push({a,b,g});
}

function addGroup(){
    const name=document.getElementById("groupName").value;
    const color=document.getElementById("groupColor").value;
    const count=parseInt(document.getElementById("groupCount").value);

    if(!name)return;

    groups[name]=create(count,color);
    updateRuleEditor();
}

function updateRuleEditor(){
    const container=document.getElementById("groupContainer");
    container.innerHTML="";

    const names=Object.keys(groups);

    for(const a of names){
        for(const b of names){

            const existing=rules.find(r=>r.a===a&&r.b===b);
            const currentValue=existing?existing.g:0;

            const div=document.createElement("div");
            div.className="group";

            div.innerHTML=`
            <strong>${a} → ${b}</strong>
            <input type="range" min="-5" max="5" step="0.01" value="${currentValue}" id="rule-${a}-${b}">
            <span id="value-${a}-${b}">${currentValue}</span>`;

            container.appendChild(div);

            const slider=document.getElementById(`rule-${a}-${b}`);

            slider.oninput=()=>{
                document.getElementById(`value-${a}-${b}`).innerText=slider.value;
                setRule(a,b,parseFloat(slider.value));
            };
        }
    }
}

function update(){
    const now=performance.now();
    fps=1000/(now-last);
    last=now;

    document.getElementById("fps").textContent=`FPS: ${fps.toFixed(1)}`;

    for(let i=0;i<rules.length;i++){
        const r=rules[i];
        if(groups[r.a]&&groups[r.b])rule(groups[r.a],groups[r.b],r.g);
    }

    m.fillStyle="black";
    m.fillRect(0,0,canvas.width,canvas.height);

    for(let i=0;i<particles.length;i++){
        const p=particles[i];
        draw(p.x,p.y,p.color,4);
    }
    requestAnimationFrame(update);
}

function resetParticles(){
    const newGroups={};
    particles=[];

    for(const key in groups){
        const oldGroup=groups[key];
        if(oldGroup.length===0)continue;
        newGroups[key]=create(oldGroup.length,oldGroup[0].color);
    }
    groups=newGroups;
}
update();