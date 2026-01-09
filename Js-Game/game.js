// ========================
// CANVAS SETUP
// ========================
const canvas = document.querySelector("canvas");
const c = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const stars = [];

for (let i = 0; i < 80; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.2 + 0.5,
        speed: Math.random() * 2 + 0.5
    });
}

function drawStars() {
    c.fillStyle = "white";
    stars.forEach(s => {
        c.beginPath();
        c.arc(s.x, s.y, s.size, 0, Math.PI * 2);
        c.fill();

        s.y += s.speed;

        if (s.y > canvas.height) {
            s.y = 0;
            s.x = Math.random() * canvas.width;
        }
    });
}


// ========================
// Sound
// ========================

const sounds = {};

function loadSound(name, src, volume = 1) {
    const audio = new Audio(src);
    audio.volume = volume;
    sounds[name] = audio;
}

loadSound("shoot", "sounds/shoot.wav", 0.4);
loadSound("explode", "sounds/explode.mp3", 0.6);
loadSound("explode", "sounds/explode2.mp3", 0.6);
loadSound("powerup", "sounds/powerup.mp3", 0.5);
loadSound("laser", "sounds/laser.wav", 0.7);

function playExplosionSound() {
    const sound = Math.random() < 0.5 ? "explode" : "explode2";
    playSound(sound);
}

// UI
const scoreEl = document.getElementById("score");
const livesEl = document.getElementById("lives");

let score = 0;
let gameStarted = false;
let shakeTime = 0;
let shakeStrength = 0;

function startShake(strength = 10, duration = 10) {
    shakeStrength = strength;
    shakeTime = duration;
    }

let gameOver = false;
let startTime = Date.now();
let stats = {
    enemiesKilled: 0,
    bossesKilled: 0
};

const sprites = {};

function loadSprite(name, src) {
    const img = new Image();
    img.src = src;
    sprites[name] = img;
}

loadSprite("player", "sprites/player.png");
loadSprite("enemy", "sprites/enemy.png");
loadSprite("boss", "sprites/boss.png");
loadSprite("bullet", "sprites/bullet.png");
loadSprite("enemyBullet", "sprites/enemyBullet.png");
loadSprite("orangePU", "sprites/orangePU.png");
loadSprite("greenPU", "sprites/greenPU.png");
loadSprite("purplePU", "sprites/purplePU.png");
loadSprite("bluePU", "sprites/bluePU.png");
loadSprite("yellowPU", "sprites/yellowPU.png");
loadSprite("rock", "sprites/rock.png");


// ========================
// INPUT
// ========================
const keys = {
    w: false,
    a: false,
    s: false,
    d: false
};

let mouse = {
    x: canvas.width / 2,
    y: canvas.height / 2
};

addEventListener("keydown", e => {
    if (keys[e.key] !== undefined) keys[e.key] = true;
});

addEventListener("keyup", e => {
    if (keys[e.key] !== undefined) keys[e.key] = false;
});

addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

addEventListener("mousedown", () => {
    player.shoot();
});

addEventListener("keydown", e => {
    if (e.key === "Shift" && player && player.dashCooldown <= 0) {
        player.startDash();
    }
});

addEventListener("keydown", e => {
    if (e.key.toLowerCase() === "f") {
        toggleFullscreen();
    }
});

addEventListener("fullscreenchange", () => {
    resizeCanvas();
});

addEventListener("resize", resizeCanvas);

addEventListener("keydown", e => {
    if (e.key === "Enter" && !gameStarted) {
        gameStarted = true;
        const screen = document.getElementById("startScreen");
        if (screen) screen.remove();
        startTime = Date.now();
        animate();
    }
});

// ========================
// Hilfsfunktionen
// ========================

function createExplosion(x, y, size = 20, color = "orange") {
    for (let i = 0; i < size; i++) {
        particles.push(new Particle(x, y, color, 4));
    }
}

function playSound(name) {
    if (!sounds[name]) return;
    const s = sounds[name].cloneNode();
    s.volume = sounds[name].volume;
    s.play();
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}


// ========================
// SIMPLE PIXEL SPRITES
// ========================
function drawShip(x, y, size, color) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, y - size);
    c.lineTo(x - size, y + size);
    c.lineTo(x + size, y + size);
    c.closePath();
    c.fill();
}

// ========================
// PLAYER
// ========================
class Player {
    constructor(config) {
        this.width = config.width;
        this.height = config.height;
        this.speed = config.speed;
        this.lives = config.lives;
        this.fireRate = 300;        // Zeit zwischen Schüssen
        this.lastShot = 0;
        this.bulletSize = 5;
        this.spread = false;
        this.enemySlow = false;
        this.shield = 0;      // aktuelle Schildenergie
        this.maxShield = 100;
        this.dashCooldown = 0;
        this.isDashing = false;
        this.dashTime = 0;




        this.position = {
            x: canvas.width / 2,
            y: canvas.height - 80
        };
    }

    draw() {
        c.drawImage(
            sprites.player,
            this.position.x - this.width / 2,
            this.position.y - this.height / 2,
            this.width,
            this.height
        );
        // Schild anzeigen
        if (this.shield > 0) {
            c.strokeStyle = "rgba(0,200,255,0.7)";
            c.lineWidth = 4;
            c.beginPath();
            c.arc(this.position.x, this.position.y, 30, 0, Math.PI * 2);
            c.stroke();
        }
        if (this.isDashing) {
        c.strokeStyle = "rgba(255,255,255,0.8)";
        c.lineWidth = 6;
        c.beginPath();
        c.arc(this.position.x, this.position.y, 35, 0, Math.PI * 2);
        c.stroke();
        }


    }

    update() {

        this.updateDash();

        // Movement WASD
       const margin = this.width / 2;

        // Nur bewegen, wenn noch Platz ist
        if (keys.a && this.position.x > margin) this.position.x -= this.speed;
        if (keys.d && this.position.x < canvas.width - margin) this.position.x += this.speed;
        if (keys.w && this.position.y > margin) this.position.y -= this.speed;
        if (keys.s && this.position.y < canvas.height - margin) this.position.y += this.speed;


        this.draw();
    }

    startDash() {
    this.isDashing = true;
    this.dashTime = 10;     // Frames
    this.dashCooldown = 120; // 2 Sekunden Cooldown
}

    updateDash() {
        if (this.dashCooldown > 0) this.dashCooldown--;

        if (this.isDashing) {
            this.dashTime--;

            const speed = 20;

            if (keys.a) this.position.x -= speed;
            if (keys.d) this.position.x += speed;
            if (keys.w) this.position.y -= speed;
            if (keys.s) this.position.y += speed;

            if (this.dashTime <= 0) {
                this.isDashing = false;
        }
    }
}


    shoot() {
        const now = Date.now();
        if (now - this.lastShot < this.fireRate) return;
        this.lastShot = now;
        playSound("shoot");
        const angle = Math.atan2(
            mouse.y - this.position.y,
            mouse.x - this.position.x
        );

        const speed = 12;

        // Normaler Schuss
        projectiles.push(
            new Projectile({
                x: this.position.x,
                y: this.position.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                fromEnemy: false,
                radius: this.bulletSize,
                damage: this.bulletSize > 5 ? 15 : 5
            })
        );


        // Spread Shot
        if (this.spread) {
            for (let offset of [-0.3, 0.3]) {
                projectiles.push(
                    new Projectile({
                        x: this.position.x,
                        y: this.position.y,
                        vx: Math.cos(angle + offset) * speed,
                        vy: Math.sin(angle + offset) * speed,
                        fromEnemy: false,
                        radius: this.bulletSize,
                        damage: this.bulletSize > 5 ? 15 : 5
                    })
                );
            }
        }
    }

}

// ========================
// PROJECTILES
// ========================
class Projectile {
    constructor({ x, y, vx, vy, fromEnemy, radius = 5, damage = 5 }) {
        this.position = { x, y };
        this.velocity = { x: vx, y: vy };
        this.radius = radius;
        this.fromEnemy = fromEnemy;
        this.damage = damage;
    }



    draw() {
        c.beginPath();
        c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.fromEnemy ? "red" : "yellow";
        c.fill();

        }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.draw();
    }
}

// ========================
// ENEMIES
// ========================
class Enemy {
    constructor(x, y) {
        this.position = { x, y };
        this.size = 20;
    }

    draw() {
        if (sprites.enemy && sprites.enemy.complete) {
            c.drawImage(
                sprites.enemy,
                this.position.x - 30,
                this.position.y - 30,
                60,
                60
            );
        } else {
            // Fallback falls Bild noch nicht geladen ist
            drawShip(this.position.x, this.position.y, 15, "orange");
        }
    }


    update() {
    let speed = player.enemySlow ? 0.2 : 0.6;
    this.position.y += speed;
    this.draw();
    }


    shoot() {
        if (Math.random() < 0.005) {
            const angle = Math.atan2(
                player.position.y - this.position.y,
                player.position.x - this.position.x
            );

            projectiles.push(
                new Projectile({
                    x: this.position.x,
                    y: this.position.y,
                    vx: Math.cos(angle) * 4,
                    vy: Math.sin(angle) * 4,
                    fromEnemy: true
                })
            );
        }
    }
}

// ========================
// BOSS
// ========================

class Boss {
    constructor() {
        this.width = 180;
        this.height = 100;
        this.position = {
        x: canvas.width / 2 - this.width / 2,
        y: 120 - this.height / 2
        };


        this.speed = 2;      // Wie schnell
        this.direction = 1; // 1 = rechts, -1 = links

        this.health = 600;
        this.maxHealth = 600;
        this.lastShot = 0;
        this.phase = 1;

        this.laserCharge = 0;
        this.laserActive = false;
        this.laserAngle = 0;

    }

    updatePhase() {
        const hp = this.health / this.maxHealth;

        if (hp < 0.33) {
            this.phase = 3; // Rage
            this.speed = 5;
        } else if (hp < 0.66) {
            this.phase = 2; // Aggressiv
            this.speed = 3.5;
        } else {
            this.phase = 1; // Normal
            this.speed = 2;
        }
    }

    draw() {
        // Farbe je nach Phase
        if (this.phase === 1) c.fillStyle = "darkred";
        if (this.phase === 2) c.fillStyle = "orangered";
        if (this.phase === 3) c.fillStyle = "magenta";

       c.drawImage(
            sprites.boss,
            this.position.x,
            this.position.y,
            this.width,
            this.height
        );


        // Lebensbalken
        const barWidth = 300;
        const hpPercent = this.health / this.maxHealth;

        c.fillStyle = "red";
        c.fillRect(canvas.width / 2 - barWidth / 2, 20, barWidth, 15);

        c.fillStyle = "lime";
        c.fillRect(canvas.width / 2 - barWidth / 2, 20, barWidth * hpPercent, 15);
    }

    shoot() {
        const now = Date.now();

        // Laser nur in Phase 2 und 3
        if (!this.laserActive && this.phase >= 2 && Math.random() < 0.01) {
        this.startLaser();
        }

        if (now - this.lastShot < (this.phase === 3 ? 400 : this.phase === 2 ? 700 : 1000)) return;
        this.lastShot = now;

        

        if (this.phase === 1) {
            // Einfache 3er Salve
            for (let a of [-0.2, 0, 0.2]) {
                projectiles.push(
                    new Projectile({
                        x: this.centerX,
                        y: this.centerY + this.height / 2,

                        vx: Math.sin(a) * 4,
                        vy: 4,
                        fromEnemy: true
                    })
                );
            }
        }

        if (this.phase === 2) {
            // 7er Fächer
            for (let a of [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6]) {
                projectiles.push(
                    new Projectile({
                       x: this.centerX,
                        y: this.centerY + this.height / 2,

                        vx: Math.sin(a) * 5,
                        vy: 5,
                        fromEnemy: true
                    })
                );
            }
        }

        if (this.phase === 3) {
            // Rage: Kreisschuss
            for (let i = 0; i < 16; i++) {
                const angle = (Math.PI * 2 / 16) * i;
                projectiles.push(
                    new Projectile({
                        x: this.centerX,
                        y: this.centerY,
                        vx: Math.cos(angle) * 5,
                        vy: Math.sin(angle) * 5,
                        fromEnemy: true
                    })
                );
            }
        }
    }

    update() {
        this.updatePhase();

        // Links-Rechts Pendeln
        this.position.x += this.speed * this.direction;


        // Kollision mit Bildschirmrändern
        if (this.position.x <= 0) {
            this.position.x = 0;
            this.direction = 1;   // nach rechts
        }

        if (this.position.x + this.width >= canvas.width) {
            this.position.x = canvas.width - this.width;
            this.direction = -1; // nach links
        }


        this.shoot();
        this.updateLaser();
        this.draw();
    }


    startLaser() {
        playSound("laser");
        this.laserCharge = 60; // Frames aufladen
        this.laserActive = true;

        // Zielrichtung zum Spieler
        this.laserAngle = Math.atan2(
            player.position.y - this.position.y,
            player.position.x - this.position.x
        );
    }

    updateLaser() {
        if (!this.laserActive) return;

        this.laserCharge--;

        // Warnstrahl (gelb)
        if (this.laserCharge > 20) {
            this.drawLaser("rgba(255,255,0,0.4)", 4);
        } 
        // Echter Laser (rot)
        else {
            this.drawLaser("red", 10);
            this.checkLaserHit();
        }

        if (this.laserCharge <= 0) {
            this.laserActive = false;
        }
    }

    drawLaser(color, width) {
        c.strokeStyle = color;
        c.lineWidth = width;
        c.beginPath();
        c.moveTo(this.centerX, this.centerY);
        c.lineTo(
            this.centerX + Math.cos(this.laserAngle) * 2000,
            this.centerY + Math.sin(this.laserAngle) * 2000
        );
        c.stroke();
    }

    checkLaserHit() {
        const dx = player.position.x - this.centerX;
        const dy = player.position.y - this.centerY;

        const dist = Math.abs(
            Math.sin(this.laserAngle) * dx - Math.cos(this.laserAngle) * dy
        );

        if (dist < 20) {
            if (player.isDashing) return; // während Dash kein Schaden

            if (player.shield > 0) {
            player.shield -= 25;
            if (player.shield < 0) player.shield = 0;
            } else {
                startShake(12, 12);
                player.lives--;
                livesEl.textContent = player.lives;
                if (player.lives <= 0) endGame(false);

            }

    
        }
    }

    get centerX() {
    return this.position.x + this.width / 2;
    }

    get centerY() {
    return this.position.y + this.height / 2;
    }


}

// ========================
// Rock
// ========================

class Rock {
    constructor() {
        this.size = 64; // Größe des Sprites
        this.position = {
            x: Math.random() * (canvas.width - this.size),
            y: -this.size
        };
        this.speed = 2 + Math.random() * 3;
    }

    draw() {
        if (sprites.rock && sprites.rock.complete) {
            c.drawImage(
                sprites.rock,
                this.position.x,
                this.position.y,
                this.size,
                this.size
            );
        } else {
            // Fallback, falls Sprite noch nicht geladen
            c.fillStyle = "gray";
            c.fillRect(this.position.x, this.position.y, this.size, this.size);
        }
    }

    update() {
        this.position.y += this.speed;
        this.draw();
    }
}

// ========================
// Particles (Explosion)
// ========================

class Particle {
    constructor(x, y, color, size) {
        this.position = { x, y };
        this.velocity = {
            x: (Math.random() - 0.5) * 6,
            y: (Math.random() - 0.5) * 6
        };
        this.life = 30;
        this.size = size;
        this.color = color;
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        this.life--;
    }

    draw() {
        c.fillStyle = this.color;
        c.globalAlpha = this.life / 30;
        c.beginPath();
        c.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
    }
}



// ========================
// POWERUPS
// ========================
class PowerUp {
    constructor(x, y) {
        this.position = { x, y };
        this.size = 24;

        // Zufälliger Typ
        const types = ["life", "rapid", "big", "spread", "shield"];

        this.type = types[Math.floor(Math.random() * types.length)];

        this.spriteMap = {
            life: sprites.greenPU,
            rapid: sprites.yellowPU,
            big: sprites.orangePU,
            spread: sprites.purplePU,
            shield: sprites.bluePU
        };
    }

    draw() {
        const img = this.spriteMap[this.type];

        if (img && img.complete) {
            c.drawImage(
                img,
                this.position.x - this.size,
                this.position.y - this.size,
                this.size * 2,
                this.size * 2
            );
        } else {
            // Fallback falls Bild noch lädt
            c.fillStyle = "white";
            c.beginPath();
            c.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
            c.fill();
        }
    }


    update() {
        this.position.y += 1;
        this.draw();
    }
}


// ========================
// GAME OBJECTS
// ========================
let boss = null;
let player;
const projectiles = [];
const enemies = [];
const powerUps = [];
const rocks = [];
const particles = [];


// ========================
// SPAWN ENEMIES & POWERUPS
// ========================
setInterval(() => {
    enemies.push(new Enemy(Math.random() * canvas.width, -20));
}, 500);

setInterval(() => {
    rocks.push(new Rock());
}, 3000); // alle 3 Sekunden ein Felsen

setInterval(() => {
    powerUps.push(new PowerUp(Math.random() * canvas.width, -20));
}, 8000);

let bossSpawned = false;

setTimeout(() => {
    if (!bossSpawned) {
        boss = new Boss();
        bossSpawned = true;
    }
}, 30000);



// ========================
// COLLISION
// ========================
function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

// ========================
// MAIN LOOP
// ========================
function animate() {
    if (!gameStarted || gameOver) return;

    let offsetX = 0;
    let offsetY = 0;

    if (shakeTime > 0) {
        shakeTime--;
        offsetX = (Math.random() - 0.5) * shakeStrength;
        offsetY = (Math.random() - 0.5) * shakeStrength;
    }

    c.setTransform(1, 0, 0, 1, offsetX, offsetY);
    c.fillStyle = "rgba(0,0,0,0.4)";
    c.fillRect(-offsetX, -offsetY, canvas.width, canvas.height);
    drawStars();
    player.update();

    rocks.forEach((r, ri) => {
            r.update();

            // Wenn unten raus → löschen
            if (r.position.y - r.radius > canvas.height) {
                rocks.splice(ri, 1);
                return; // wichtig, damit kein weiterer Code auf diesem Rock läuft
            }

            // Spieler trifft Felsen → sofort tot
            const playerRadius = 20;

            if (
                player.position.x > r.position.x - playerRadius &&
                player.position.x < r.position.x + r.size + playerRadius &&
                player.position.y > r.position.y - playerRadius &&
                player.position.y < r.position.y + r.size + playerRadius
            ) {
            endGame(false);
            }

        });

    // Projectiles
    projectiles.forEach((p, pi) => {
        p.update();

        // Remove if outside
        if (
            p.position.x < 0 || p.position.x > canvas.width ||
            p.position.y < 0 || p.position.y > canvas.height
        ) {
            projectiles.splice(pi, 1);
        }

        // Player hit
        if (p.fromEnemy && distance(p.position, player.position) < 20) {
            if (player.isDashing) return; // während Dash kein Schaden

            projectiles.splice(pi, 1);
            if (player.shield > 0) {
            player.shield -= 25;
            if (player.shield < 0) player.shield = 0;
            } else {
                startShake(12, 12);
                player.lives--;
                livesEl.textContent = player.lives;
                if (player.lives <= 0) endGame(false);
            }
            if (player.lives <= 0) endGame(false);
        }
    });

    particles.forEach((p, i) => {
        p.update();
        p.draw();
        if (p.life <= 0) particles.splice(i, 1);
    });


    // Enemies
    enemies.forEach((e, ei) => {
        e.update();
        e.shoot();

        projectiles.forEach((p, pi) => {
            if (!p.fromEnemy && distance(p.position, e.position) < 40) {
                enemies.splice(ei, 1);
                projectiles.splice(pi, 1);
                playExplosionSound();
                createExplosion(e.position.x, e.position.y, 20, "orange");
                score += 100;
                stats.enemiesKilled++;
                scoreEl.textContent = score;

            }
        });
    });

   if (boss) {
    boss.update();

    projectiles.forEach((p, pi) => {
        if (!p.fromEnemy) {

            const bx = boss.position.x;
            const by = boss.position.y;
            const bw = boss.width;
            const bh = boss.height;

            const closestX = Math.max(bx, Math.min(p.position.x, bx + bw));
            const closestY = Math.max(by, Math.min(p.position.y, by + bh));

            const dx = p.position.x - closestX;
            const dy = p.position.y - closestY;

            if (dx * dx + dy * dy < (p.radius + 4) * (p.radius + 4)) {
                projectiles.splice(pi, 1);
                boss.health -= p.damage;

                if (boss.health <= 0) {
                    boss = null;
                    score += 5000;
                    stats.bossesKilled++;
                    scoreEl.textContent = score;
                    playExplosionSound();
                    createExplosion(boss.centerX, boss.centerY, 80, "red");
                    endGame(true);
                }
            }
        }
    });
}

    // PowerUps
   powerUps.forEach((p, pi) => {
    p.update();

    projectiles.forEach((proj, pj) => {
        if (distance(p.position, proj.position) < 20) {
            powerUps.splice(pi, 1);
            projectiles.splice(pj, 1);

            activatePowerUp(p.type);
            playSound("powerup");
        }
    });
});

function activatePowerUp(type) {
    switch (type) {

        case "life":
            player.lives++;
            livesEl.textContent = player.lives;
            break;

        case "rapid":
            player.fireRate = 80;
            setTimeout(() => player.fireRate = 300, 10000);
            break;

        case "big":
            player.bulletSize = 12;
            setTimeout(() => player.bulletSize = 5, 10000);
            break;

        case "spread":
            player.spread = true;
            setTimeout(() => player.spread = false, 10000);
            break;

        case "shield":
            player.shield = player.maxShield;
            break;
    }
}
c.setTransform(1, 0, 0, 1, 0, 0); // Reset

requestAnimationFrame(animate);
}

// ========================
// LOAD PLAYER VIA FETCH
// ========================
function showStartScreen() {
    const screen = document.createElement("div");
    screen.id = "startScreen";
    screen.style.position = "fixed";
    screen.style.top = 0;
    screen.style.left = 0;
    screen.style.width = "100%";
    screen.style.height = "100%";
    screen.style.background = "black";
    screen.style.color = "white";
    screen.style.display = "flex";
    screen.style.flexDirection = "column";
    screen.style.alignItems = "center";
    screen.style.justifyContent = "center";
    screen.style.fontFamily = "Arial";
    screen.style.zIndex = 2000;

    screen.innerHTML = `
        <h1 style="font-size:72px; margin-bottom:20px;">🚀 SPACE VIBES</h1>
        <p style="font-size:22px; line-height:1.8; text-align:center;">
            WASD – Move<br>
            Left Mouse – Shoot<br>
            Shift – Dash<br>
            F – Fullscreen
        </p>
        <br>
        <p style="font-size:26px;">Press ENTER to Start</p>
    `;

    document.body.appendChild(screen);
}

function endGame(victory) {
    
    gameOver = true;

    if (document.fullscreenElement) {
    document.exitFullscreen();
    }
    const timeSurvived = Math.floor((Date.now() - startTime) / 1000);
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = 0;
    overlay.style.left = 0;
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.background = "rgba(0,0,0,0.9)";
    overlay.style.color = "white";
    overlay.style.display = "flex";
    overlay.style.flexDirection = "column";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.fontSize = "26px";
    overlay.style.zIndex = 1000;

    overlay.innerHTML = `
        <h1>${victory ? "YOU WIN 🚀" : "GAME OVER 💀"}</h1>
        <p>Score: ${score}</p>
        <p>Zeit überlebt: ${timeSurvived}s</p>
        <p>Gegner zerstört: ${stats.enemiesKilled}</p>
        <p>Bosse besiegt: ${stats.bossesKilled}</p>
        <br>
        <p>Drücke [R] für Neustart</p>
    `;

    const target = document.fullscreenElement || document.body;
    target.appendChild(overlay);

    addEventListener("keydown", e => {
        if (e.key.toLowerCase() === "r") location.reload();
    });
}


fetch("player.json")
    .then(res => res.json())
    .then(data => {
    player = new Player(data);
    livesEl.textContent = player.lives;
    showStartScreen();
});
