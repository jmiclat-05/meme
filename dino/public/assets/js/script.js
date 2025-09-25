import { initFirebase, createPlayer, getPlayer, saveScore, getTopScores } from "./firebase.js";

await initFirebase();

const dino = document.getElementById("dino");
const obstaclesContainer = document.getElementById("obstacles");
const scoreEl = document.getElementById("score");
const menu = document.getElementById("menu");
const menuForm = document.getElementById("menu-form");
const submitUserBtn = menuForm.querySelector("button");
const startBtn = document.getElementById("play");
const accChangeBtn = document.getElementById("acc--change");
const scoreboard = document.getElementById("scoreboard");
const game = document.getElementById("game");

let isJumping = false;
let jumpHeight = 0;
let gravity = 4;
let score = 0;
let obstacles = [];
let spawnTimer = 0;
let nextSpawnIn = 60 + Math.floor(Math.random() * 60); // frames
let gameRunning = true;
let speed = 7;

document.addEventListener("keydown", (e) => {
    if ((e.code === "Space" || e.code === "ArrowUp") && !isJumping && jumpHeight === 0 && gameRunning) {
    isJumping = true;
    }
});

submitUserBtn.addEventListener("click", () => {
    submitUser();
});

startBtn.addEventListener("click", () => {
    startGame();
});

accChangeBtn.addEventListener("click", () => {
    const h2El = menu.querySelector('h2');
    h2El.textContent = "Jump Over!";
    const h3 = document.querySelector('#menu h3');
    if (h3) h3.remove();
    startBtn.style.display = "none";
    accChangeBtn.style.display = "none";
    menuForm.style.display = "flex";
});

function jump() {
    if (isJumping) {
    if (jumpHeight < 150) {
        jumpHeight += 10;
    } else {
        isJumping = false;
    }
    } else if (jumpHeight > 0) {
    jumpHeight -= gravity;
    if (jumpHeight < 0) jumpHeight = 0;
    }
    dino.style.bottom = jumpHeight + "px";
}

function spawnRock() {
    const rock = document.createElement('div');
    const variants = ['rock', 'rock rock--dark', 'rock rock--light'];
    const shapes = ['rock--wide', 'rock--tall', 'rock--round', ''];
    const variant = variants[Math.floor(Math.random() * variants.length)];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    rock.className = [variant, shape].filter(Boolean).join(' ');
    // random vertical offset to feel like varied terrain bumps (but keep on ground)
    const baseMargin = 110; // baseline moon floor offset
    const variance = Math.floor(Math.random() * 28) - 12; // -12..+15px
    rock.style.marginBottom = (baseMargin + variance) + 'px';
    rock.style.right = '-60px';
    rock.style.bottom = '0';
    obstaclesContainer.appendChild(rock);
    obstacles.push({ el: rock, x: game.clientWidth + Math.random() * 100, passed: false });
}

function moveObstacles() {
    // spawn timing
    spawnTimer++;
    if (spawnTimer >= nextSpawnIn) {
    spawnRock();
    spawnTimer = 0;
    nextSpawnIn = Math.max(35, 60 - Math.floor(score / 3)) + Math.floor(Math.random() * 40);
    }

    const dinoRect = dino.getBoundingClientRect();
    obstacles = obstacles.filter((obj) => {
    obj.x -= speed;
    obj.el.style.right = (game.clientWidth - obj.x) + 'px';

    const rect = obj.el.getBoundingClientRect();
    if (
        dinoRect.left < rect.right &&
        dinoRect.right > rect.left &&
        dinoRect.bottom > rect.top
    ) {
        endGame();
    }

    if (!obj.passed && rect.right < dinoRect.left) {
        obj.passed = true;
        score++;
        scoreEl.textContent = score;
        if (score % 5 === 0) speed += 0.5;
    }

    // remove offscreen
    const offscreen = obj.x < -120;
    if (offscreen) {
        obj.el.remove();
    }
    return !offscreen;
    });
}

function endGame() {
    gameRunning = false;
    const h2El = menu.querySelector('h2');
    h2El.textContent = "Game Over!";
    const h3El = document.createElement("h3");
    h3El.textContent = scoreEl.textContent;
    h2El.insertAdjacentElement('afterend', h3El);
    startBtn.style.display = "block";
    accChangeBtn.style.display = "block";
    menu.style.display = "block";
    const t = document.querySelector('.trex');
    if (t) t.classList.add('is-dead');
    submitScore(scoreEl.textContent);
}

function startGame() {
    score = 0;
    speed = 7;
    scoreEl.textContent = 0;
    gameRunning = true;
    isJumping = false;
    jumpHeight = 0;
    dino.style.bottom = "0px";
    dino.style.display = "block";
    const t = document.querySelector('.trex');
    if (t) t.classList.remove('is-dead');
    // clear obstacles and reset spawner
    obstacles.forEach(o => o.el.remove());
    obstacles = [];
    spawnTimer = 0;
    nextSpawnIn = 60 + Math.floor(Math.random() * 60);
    menu.style.display = "none";
    menuForm.style.display = "none";
    const h3 = document.querySelector('#menu h3');
    if (h3) h3.remove();
    loop();
}

window.addEventListener("resize", () => {
    // clear existing obstacles
    obstacles.forEach(o => o.el.remove());
    obstacles = [];
    spawnTimer = 0;
    nextSpawnIn = 60 + Math.floor(Math.random() * 60);
});

(function createStars(){
    const container = document.querySelector('.stars');
    if (!container) return;
    const starCount = Math.min(200, Math.floor((window.innerWidth * window.innerHeight) / 9000));
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < starCount; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    const size = Math.random() < 0.15 ? 3 : 2;
    s.style.width = size + 'px';
    s.style.height = size + 'px';
    s.style.top = Math.random() * 100 + 'vh';
    s.style.left = Math.random() * 100 + 'vw';
    s.style.animationDuration = (2 + Math.random() * 4).toFixed(2) + 's';
    s.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
    fragment.appendChild(s);
    }
    container.appendChild(fragment);
    window.addEventListener('resize', () => {
    // Optional: keep it simple; do not reflow stars on resize to avoid jank.
    });
})();

// Auto-detect sprite frame dimensions for convenience (skip in GIF mode)
(function autoDetectSpriteSize(){
    const el = document.querySelector('#dino .trex');
    if (!el || el.classList.contains('trex--gif')) return;
    const urlMatch = (getComputedStyle(el).backgroundImage || '').match(/url\("?(.*?)"?\)/);
    const frames = parseInt(getComputedStyle(el).getPropertyValue('--player-frames')) || 1;
    if (!urlMatch || !urlMatch[1] || frames <= 0) return;
    const img = new Image();
    img.onload = () => {
    const isHorizontal = el.classList.contains('trex--h') || (!el.classList.contains('trex--v') && img.width >= img.height);
    if (isHorizontal) {
        const frameW = Math.round(img.width / frames);
        el.style.setProperty('--player-frame-w', frameW + 'px');
        el.style.setProperty('--player-frame-h', img.height + 'px');
    } else {
        const frameH = Math.round(img.height / frames);
        el.style.setProperty('--player-frame-w', img.width + 'px');
        el.style.setProperty('--player-frame-h', frameH + 'px');
    }
    };
    img.src = urlMatch[1];
})();

function loop() {
    if (!gameRunning) return;
    jump();
    moveObstacles();
    requestAnimationFrame(loop);
}

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const [key, val] = cookie.split("=");
    if (decodeURIComponent(key) === name) {
      return decodeURIComponent(val);
    }
  }
  return null; // not found
}

function deleteCookie(name) {
  // Set expiry to the past
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

async function displayScoreboard(limit = 10) {
    const scores = await getTopScores(limit);

    if (Array.isArray(scores) && scores.length > 0) {
        const tbl = document.createElement("table");
        tbl.innerHTML = `
            <thead>
                <tr>
                    <th>No.</th>
                    <th>Name</th>
                    <th>Score</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = tbl.querySelector("tbody");

        scores.forEach((player, index) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>${player.nickname || "(no name)"}</td>
                <td>${player.score}</td>
            `;
            tbody.appendChild(tr);
        });

        scoreboard.innerHTML = "";
        scoreboard.appendChild(tbl);
    } else {
        scoreboard.innerHTML = "";
    }
}

async function submitUser() {
    const addressEl  = document.getElementById("input--address");
    const usernameEl = document.getElementById("input--username");

    const errEl = document.getElementById("err");
    errEl.textContent = "";

    const address  = addressEl.value.trim();
    const username = usernameEl.value.trim();

    if (address && username) {
        const exists = await getPlayer(address);

        if (exists) {
            setCookie("address", address, 7);
            startGame();
        } else {
            const res = await createPlayer(address, username);
    
            if (res === "Parse Error") {
                alert("Something went wrong.");
            } else {
                if (res === -1) {
                    errEl.textContent = "Username already exists.";
                } else {
                    setCookie("address", res, 7);
                    startGame();
                }
            }
        }
    } else {
        errEl.textContent = "Please provide your address and username.";
    }
}

async function submitScore(score) {
    const address = getCookie("address");

    if (address) {
        const res = await saveScore(address, score);

        if (res === "Parse Error") {
            alert("Something went wrong.");
        } else {
            displayScoreboard();
        }
    }
}

async function renderMenu() {
    const uid = getCookie("address");

    if (uid) {
        const player = await getPlayer(uid);

        if (player.nickname) {
            const h2El = menu.querySelector('h2');
            h2El.textContent = `Jump ${player.nickname}!`;
            menuForm.style.display = "none";
            startBtn.textContent = "PLAY";
            startBtn.style.display = "block";
            accChangeBtn.style.display = "block";
        } else {
            deleteCookie("address")
        }
    }

    menu.style.display = "block";
}

renderMenu();
displayScoreboard();
