const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];

// Some obvious comments are kept for learning and understading

for (let i = 0; i < 200; i++){
    particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,

        vx: (Math.random() - 0.5) * 2, // range -1 to 1
        vy: (Math.random() - 0.5) * 2, 
        
        /* 
        vx < 0 = right, vx > 0 = left
        vy < 0 = up, vy > 0 = down 
        because screens are stored row-by-row 
        from the top-left corner.
        */

        color: "white"
    })
}

function update() {
    for (const p of particles){
        p.x += p.vx;
        p.y += p.vy;
        // Bounce off of borders (It changes direction due to * -1)
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1
    }
}

function draw() {
    ctx.clearRect(0,0,canvas.width, canvas.height)

    for (const p of particles){
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x,p.y,3,0,Math.PI * 2)
        ctx.fill()
    }
}

function loop () {
    update()
    draw()

    requestAnimationFrame(loop)
}

loop()