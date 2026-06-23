const canvas = document.getElementById("life01");
const m = canvas.getContext("2d");

resizeCanvas();

function resizeCanvas() {
    canvas.width = window.innerWidth * 0.8;
    canvas.height = window.innerHeight * 0.8;
}

window.addEventListener("resize", resizeCanvas);

function draw(x, y, c, s) {
    m.fillStyle = c;
    m.beginPath();
    m.arc(x, y, s, 0, Math.PI * 2);
    m.fill();
}

particles = []

function particle(x,y,c){
    return{"x":x, "y":y, "vx":0, "vy":0, "color":c}
}

function randomW(){
    return Math.random() * canvas.width
}

function randomH(){
    return Math.random() * canvas.height
}

function create(number,color){
    let group=[]
    for(let i = 0; i < number; i++){
        group.push(particle(randomW(), randomH(), color))
        particles.push(group[i])
    }
    return group
}

function rule(particles1, particles2, g){
    for(let i=0; i < particles1.length; i++){

        let fx = 0;
        let fy = 0;
        let a = particles1[i];

        for(let j =0; j<particles2.length; j++){

            let b = particles2[j];
            let dx = a.x - b.x;
            let dy = a.y - b.y;

            if (dx > canvas.width / 2) dx -= canvas.width;
            if (dx < -canvas.width / 2) dx += canvas.width;
            if (dy > canvas.height / 2) dy -= canvas.height;
            if (dy < -canvas.height / 2) dy += canvas.height;

            let d2 = dx*dx + dy*dy;

            if(d2 > 9 && d2 < 2500 ){
                let d = Math.sqrt(d2);
                let F = g /d;
                fx += F*dx/d;
                fy += F*dy/d;
            }
        }
            
        a.vx = (a.vx + fx) * 0.4;
        a.vy = (a.vy + fy) * 0.4;

        const maxSpeed = 10;

        a.vx = Math.max(-maxSpeed, Math.min(maxSpeed, a.vx));
        a.vy = Math.max(-maxSpeed, Math.min(maxSpeed, a.vy));

        a.x += a.vx;
        a.y += a.vy;

        if (a.x < 0) a.x += canvas.width;
        if (a.x > canvas.width) a.x -= canvas.width;

        if (a.y < 0) a.y += canvas.height;
        if (a.y > canvas.height) a.y -= canvas.height;

    }
}

let groups = {};
let rules = [];

function addGroup(){

    const name = document.getElementById("groupName").value;
    const color =  document.getElementById("groupColor").value;
    const count =  parseInt(document.getElementById("groupCount").value);
    if(!name) return;
    groups[name] = create(count, color);
    updateRuleEditor();
}

function updateRuleEditor(){

    const container = document.getElementById("groupContainer");
    container.innerHTML = "";
    const names = Object.keys(groups);

    for(let a of names){
        for(let b of names){

            const existing = rules.find(r => r.a === a && r.b === b);
            const currentValue = existing ? existing.g : 0;
            const div = document.createElement("div");
            div.className = "group";
            div.innerHTML = `
                <strong>${a} → ${b}</strong>
                <input
                    type="range"
                    min="-1"
                    max="1"
                    step="0.01"
                    value="${currentValue}"
                    id="rule-${a}-${b}"
                >
                <span id="value-${a}-${b}">
                    ${currentValue}
                </span>
            `;

            container.appendChild(div);
            const slider = document.getElementById(`rule-${a}-${b}`);

            slider.oninput = () => {
                document.getElementById(`value-${a}-${b}`)
                .innerText = slider.value;
                setRule(a,b,parseFloat(slider.value));
            };
        }
    }
}

function setRule(a,b,g){
    const existing = rules.find(
        r => r.a === a && r.b === b
    );
    if(existing){
        existing.g = g;
    } else {
        rules.push({a,b,g});
    }
}

function presetChaos(){

    particles = [];
    groups = {};
    rules = [];

    groups.red = create(300,"red");
    groups.blue = create(300,"blue");
    groups.green = create(300,"lime");

    setRule("red","red",-0.5);
    setRule("red","blue",0.7);
    setRule("red","green",-0.3);

    setRule("blue","red",-0.6);
    setRule("blue","blue",0.2);
    setRule("blue","green",0.8);

    setRule("green","red",0.5);
    setRule("green","blue",-0.7);
    setRule("green","green",-0.2);

    updateRuleEditor();
}

function presetNotChaos(){

    particles = [];
    groups = {};
    rules = [];

    groups.red = create(500,"red");
    groups.green = create(500,"lime");
    groups.blue = create(500,"cyan");

    setRule("red","red",-0.1);
    setRule("green","green",-0.1);
    setRule("blue","blue",-0.1);

    setRule("red","green",0.3);
    setRule("green","blue",0.3);
    setRule("blue","red",0.3);

    updateRuleEditor();
}

let last = performance.now();
let fps = 0;

function update(){

    const now = performance.now();
    fps = 1000 / (now - last);
    last = now;

    document.getElementById("fps").textContent = `FPS: ${fps.toFixed(1)}`;

    for(let r of rules){
        if(groups[r.a] && groups[r.b]){
            rule(groups[r.a], groups[r.b], r.g);
        }
    }
    
    m.clearRect(0,0,canvas.width,canvas.height)
    m.fillStyle = "black";
    m.fillRect(0,0,canvas.width,canvas.height);
    for(let i=0; i<particles.length; i++){
        draw(
        particles[i].x, 
        particles[i].y,
        particles[i].color, 
        2.5); 
    }
    requestAnimationFrame(update);
}

update();

function resetParticles(){
    const newGroups = {};
    particles = [];

    for(let key in groups){
        const oldGroup = groups[key];
    if(oldGroup.length === 0) continue;
        newGroups[key] = create(oldGroup.length,oldGroup[0].color);
    }
    groups = newGroups;
}