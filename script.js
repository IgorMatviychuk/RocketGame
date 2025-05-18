document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!canvas || !ctx) {
        console.error("Canvas or context not initialized!");
        return;
    }

    // Ініціалізація змінних
    let rocket = { x: canvas.width / 2 - 40, y: canvas.height - 100, width: 80, height: 100 };
    let planet = { x: canvas.width / 2 - 100, y: canvas.height - 200, width: 200, height: 200, visible: true };
    let planet2 = { x: canvas.width / 2 - 100, y: canvas.height, width: 200, height: 200, visible: false };
    let asteroids = [];
    let score = 0;
    let gameRunning = false;
    let animationFrame = null;
    let departureStarted = false;
    let arrivalStarted = false;
    let isExploding = false;
    let planetRotation = 0;
    let healPoints = 3;
    let scoreScale = 1;
    let scoreScaleTimer = 0;
    let flameParticles = [];
    let asteroidTrails = [];
    let scaleFactor = 1;
    let lastTime = performance.now();
    let departureFrameCount = 0;

    // Спрощений фон
    let backgroundLayers = [
        { stars: [], speed: 0.5, radius: 1, brightness: 0.3 },
        { stars: [], speed: 1, radius: 1.5, brightness: 0.5 }
    ];

    const rocketImage = new Image();
    const explosionImage = new Image();
    const asteroidImage = new Image();
    const planetImage = new Image();
    const planet2Image = new Image();
    const healPointImage = new Image();
    let imagesLoaded = 0;
    const totalImages = 6;

    const startSound = new Audio('audio/Select1.mp3');
    const deathSound = new Audio('audio/death.mp3');
    const backgroundSound = new Audio('audio/space_ambient.mp3');
    backgroundSound.loop = true;
    backgroundSound.volume = 0.03;

    // Адаптивний розмір канвасу
    function resizeCanvas() {
        const aspectRatio = 412 / 915;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let newWidth, newHeight;
        if (windowWidth / windowHeight > aspectRatio) {
            newHeight = windowHeight;
            newWidth = windowHeight * aspectRatio;
        } else {
            newWidth = windowWidth;
            newHeight = windowWidth / aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;

        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.style.width = `${newWidth}px`;
            overlay.style.height = `${newHeight}px`;
        }

        scaleFactor = canvas.width / 412;
        updateGameElements();
        initStars();
    }

    function updateGameElements() {
        rocket.width = 80 * scaleFactor;
        rocket.height = 100 * scaleFactor;
        rocket.x = canvas.width / 2 - rocket.width / 2;
        rocket.y = canvas.height - rocket.height - 20 * scaleFactor;

        planet.width = 200 * scaleFactor;
        planet.height = 200 * scaleFactor;
        planet.x = canvas.width / 2 - planet.width / 2;
        planet.y = canvas.height - planet.height - 50 * scaleFactor;

        planet2.width = 200 * scaleFactor;
        planet2.height = 200 * scaleFactor;
        planet2.x = canvas.width / 2 - planet2.width / 2;
        planet2.y = canvas.height;

        asteroids.forEach(asteroid => {
            asteroid.width = 40 * scaleFactor;
            asteroid.height = 40 * scaleFactor;
            asteroid.x = (asteroid.x / canvas.width) * canvas.width;
            asteroid.y = (asteroid.y / canvas.height) * canvas.height;
        });

        flameParticles.forEach(p => {
            p.x = (p.x / canvas.width) * canvas.width;
            p.y = (p.y / canvas.height) * canvas.height;
            p.radius = p.radius * scaleFactor;
            p.speedY = p.speedY * scaleFactor;
        });

        asteroidTrails.forEach(t => {
            t.x = (t.x / canvas.width) * canvas.width;
            t.y = (t.y / canvas.height) * canvas.height;
            t.radius = t.radius * scaleFactor;
            t.speedY = t.speedY * scaleFactor;
        });
    }

    function onImageLoad() {
        if (++imagesLoaded === totalImages) {
            console.log("All images loaded");
        }
    }

    rocketImage.src = 'img/Rocket.png';
    explosionImage.src = 'img/explosion.png';
    asteroidImage.src = 'img/Asteroid.png';
    planetImage.src = 'img/Planet.png';
    planet2Image.src = 'img/Planet2.png';
    healPointImage.src = 'img/healpoint.png';

    rocketImage.onload = onImageLoad;
    explosionImage.onload = onImageLoad;
    asteroidImage.onload = onImageLoad;
    planetImage.onload = onImageLoad;
    planet2Image.onload = onImageLoad;
    healPointImage.onload = onImageLoad;

    function initStars() {
        backgroundLayers.forEach(layer => {
            layer.stars = [];
            for (let i = 0; i < 30; i++) {
                layer.stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * layer.radius + 0.5,
                    speed: layer.speed,
                    brightness: layer.brightness
                });
            }
        });
    }

    function drawBackground() {
        ctx.fillStyle = '#0a0a23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        backgroundLayers.forEach(layer => {
            layer.stars.forEach(star => {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius * scaleFactor, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
                ctx.fill();

                star.y += star.speed * scaleFactor;
                if (star.y > canvas.height) {
                    star.y = -star.radius;
                    star.x = Math.random() * canvas.width;
                }
            });
        });
    }

    function drawFlame(x, y, rocketSpeedY, isDepartureStart = false) {
        let particleCount = isDepartureStart ? 5 : 2;
        if (flameParticles.length < 20) {
            for (let i = 0; i < particleCount; i++) {
                flameParticles.push({
                    x: x + (Math.random() - 0.5) * 20 * scaleFactor,
                    y: y + rocket.height / 2,
                    radius: (Math.random() * 4 + 2) * scaleFactor,
                    speedY: ((Math.random() * 2 + 2) + (rocketSpeedY || 0)) * scaleFactor,
                    opacity: 1
                });
            }
        }

        flameParticles.forEach((particle, index) => {
            particle.y += particle.speedY;
            particle.opacity -= 0.03;
            particle.radius *= 0.95;

            if (particle.opacity <= 0 || particle.radius <= 0.1) {
                flameParticles.splice(index, 1);
                return;
            }

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 204, 255, ${particle.opacity})`;
            ctx.fill();
        });
    }

    function drawAsteroidTrail(asteroid) {
        if (asteroidTrails.length < 20) {
            asteroidTrails.push({
                x: asteroid.x + asteroid.width / 2,
                y: asteroid.y,
                radius: (Math.random() * 2 + 2) * scaleFactor,
                opacity: 1,
                speedY: -2 * scaleFactor
            });
        }

        asteroidTrails.forEach((trail, index) => {
            trail.y += trail.speedY;
            trail.opacity -= 0.03;
            trail.radius *= 0.95;

            if (trail.opacity <= 0 || trail.radius <= 0.1) {
                asteroidTrails.splice(index, 1);
                return;
            }

            ctx.beginPath();
            ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 255, 255, ${trail.opacity})`;
            ctx.fill();
        });
    }

    function drawHealPoints() {
        for (let i = 0; i < healPoints; i++) {
            if (healPointImage.complete) {
                ctx.drawImage(healPointImage, canvas.width - 40 * scaleFactor * (i + 1), 20 * scaleFactor, 30 * scaleFactor, 30 * scaleFactor);
            }
        }
    }

    function drawPlanet() {
        if (planet.visible && planetImage.complete) {
            ctx.save();
            ctx.translate(planet.x + planet.width / 2, planet.y + planet.height / 2);
            ctx.rotate(planetRotation);
            ctx.drawImage(planetImage, -planet.width / 2, -planet.height / 2, planet.width, planet.height);
            ctx.restore();
        }
    }

    function drawPlanet2() {
        if (planet2.visible && planet2Image.complete) {
            ctx.save();
            ctx.translate(planet2.x + planet2.width / 2, planet2.y + planet2.height / 2);
            ctx.rotate(planetRotation);
            ctx.drawImage(planet2Image, -planet2.width / 2, -planet.height / 2, planet2.width, planet2.height);
            ctx.restore();
        }
    }

    function startDeparture() {
        if (!rocketImage.complete || !planetImage.complete) {
            setTimeout(startDeparture, 100);
            return;
        }
        const overlay = document.getElementById('overlay');
        const startScreen = document.getElementById('start-screen');
        if (overlay && startScreen) {
            overlay.style.display = 'none';
            startScreen.style.display = 'none';
        }
        canvas.style.display = 'block';
        rocket.y = canvas.height - rocket.height - 20 * scaleFactor;
        planet.visible = true;
        gameRunning = false;
        departureStarted = true;
        planetRotation = 0;
        departureFrameCount = 0;
        lastTime = performance.now();
        animateDeparture();
    }

    function animateDeparture() {
        if (!departureStarted) return;

        const now = performance.now();
        const delta = Math.min(now - lastTime, 33.33);
        lastTime = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPlanet();

        if (rocketImage.complete) {
            drawFlame(rocket.x + rocket.width / 2, rocket.y, -5, departureFrameCount < 30);
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        rocket.y -= 5 * scaleFactor * (delta / 16.67);
        planetRotation += 0.01 * (delta / 16.67);
        departureFrameCount++;

        if (rocket.y < -rocket.height) {
            departureStarted = false;
            planet.visible = false;
            rocket.y = canvas.height - 200 * scaleFactor;
            startGame();
        } else {
            animationFrame = requestAnimationFrame(animateDeparture);
        }
    }

    function startArrival() {
        gameRunning = false;
        arrivalStarted = true;
        planet2.visible = true;
        planet2.y = canvas.height;
        planet2.width = 100 * scaleFactor;
        planet2.height = 100 * scaleFactor;
        rocket.y = 100 * scaleFactor;
        rocket.width = 80 * scaleFactor;
        rocket.height = 100 * scaleFactor;
        lastTime = performance.now();
        animateArrival();
    }

    function animateArrival() {
        if (!arrivalStarted) return;

        const now = performance.now();
        const delta = Math.min(now - lastTime, 33.33);
        lastTime = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPlanet2();

        if (rocket.y < planet2.y - rocket.height) {
            drawFlame(rocket.x + rocket.width / 2, rocket.y, 1);
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        rocket.y += 1 * scaleFactor * (delta / 16.67);
        if (rocket.y < planet2.y) {
            rocket.width *= 0.995;
            rocket.height *= 0.995;
            rocket.x += (planet2.x + planet2.width / 2 - rocket.x - rocket.width / 2) * 0.02;
        }

        if (planet2.y > canvas.height - 400 * scaleFactor) {
            planet2.y -= 2 * scaleFactor * (delta / 16.67);
            planet2.width += 0.8 * scaleFactor * (delta / 16.67);
            planet2.height += 0.8 * scaleFactor * (delta / 16.67);
        }
        planetRotation += 0.005 * (delta / 16.67);

        if (rocket.y >= planet2.y) {
            arrivalStarted = false;
            setTimeout(() => {
                planet2.visible = false;
                backgroundSound.pause();
                showSuccessScreen();
            }, 1500);
        } else {
            animationFrame = requestAnimationFrame(animateArrival);
        }
    }

    function showSuccessScreen() {
        const overlay = document.getElementById('overlay');
        const startScreen = document.getElementById('start-screen');
        const endScreen = document.getElementById('end-screen');
        const successScreen = document.getElementById('success-screen');
        const successScore = document.getElementById('successScore');
        if (overlay && startScreen && endScreen && successScreen && successScore) {
            overlay.style.display = 'flex';
            startScreen.style.display = 'none';
            endScreen.style.display = 'none';
            successScreen.style.display = 'block';
            successScore.textContent = score;
        }
    }

    function startGame() {
        gameRunning = true;
        isExploding = false;
        asteroids = [];
        score = 0;
        healPoints = 3;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        lastTime = performance.now();
        requestAnimationFrame(updateGame);
    }

    function updateGame() {
        if (!gameRunning) return;

        const now = performance.now();
        const delta = Math.min(now - lastTime, 33.33);
        lastTime = now;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawHealPoints();

        if (isExploding && explosionImage.complete) {
            ctx.drawImage(explosionImage, rocket.x, rocket.y, rocket.width, rocket.height);
        } else if (rocketImage.complete) {
            drawFlame(rocket.x + rocket.width / 2, rocket.y, 0);
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        ctx.save();
        ctx.font = `${25 * scaleFactor}px Orbitron, sans-serif`;
        ctx.fillStyle = '#00ffcc';

        if (scoreScaleTimer > 0) {
            scoreScale = 1 + 0.2 * (scoreScaleTimer / 20);
            scoreScaleTimer -= delta / 16.67;
        } else {
            scoreScale = 1;
        }

        ctx.translate(20 * scaleFactor, 40 * scaleFactor);
        ctx.scale(scoreScale, scoreScale);
        ctx.fillText(`Score: ${score}`, 0, 0);
        ctx.restore();

        moveAsteroids(delta);

        if (gameRunning) {
            animationFrame = requestAnimationFrame(updateGame);
        }
    }

    function moveAsteroids(delta) {
        if (Math.random() < 0.01 * (delta / 16.67)) {
            asteroids.push({
                x: Math.random() * (canvas.width - 60 * scaleFactor),
                y: -60 * scaleFactor,
                width: 40 * scaleFactor,
                height: 40 * scaleFactor,
                angle: 0,
                rotationSpeed: (Math.random() * 0.05) - 0.025,
                sway: Math.random() * 0.03 + 0.02,
                swayDirection: Math.random() > 0.5 ? 1 : -1
            });
        }

        asteroids.forEach((asteroid, index) => {
            asteroid.y += 5 * scaleFactor * (delta / 16.67);
            asteroid.angle += asteroid.rotationSpeed * (delta / 16.67);
            asteroid.x += Math.sin(asteroid.y * asteroid.sway) * asteroid.swayDirection;

            drawAsteroidTrail(asteroid);

            if (asteroidImage.complete) {
                ctx.save();
                ctx.translate(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
                ctx.rotate(asteroid.angle);
                ctx.drawImage(asteroidImage, -asteroid.width / 2, -asteroid.height / 2, asteroid.width, asteroid.height);
                ctx.restore();
            }

            if (
                asteroid.x < rocket.x + rocket.width &&
                asteroid.x + asteroid.width > rocket.x &&
                asteroid.y < rocket.y + rocket.height &&
                asteroid.y + asteroid.height > rocket.y
            ) {
                asteroids.splice(index, 1);
                healPoints--;

                if (healPoints <= 0) {
                    isExploding = true;
                    gameRunning = false;
                    deathSound.currentTime = 0;
                    deathSound.play().catch(console.error);
                    backgroundSound.pause();

                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    drawBackground();
                    drawHealPoints();
                    if (explosionImage.complete) {
                        ctx.drawImage(explosionImage, rocket.x, rocket.y, rocket.width, rocket.height);
                    }

                    setTimeout(() => {
                        const overlay = document.getElementById('overlay');
                        const startScreen = document.getElementById('start-screen');
                        const endScreen = document.getElementById('end-screen');
                        const finalScore = document.getElementById('finalScore');
                        if (overlay && startScreen && endScreen && finalScore) {
                            overlay.style.display = 'flex';
                            startScreen.style.display = 'none';
                            endScreen.style.display = 'block';
                            finalScore.textContent = score;
                        }
                    }, 500);
                }
                return;
            }

            if (asteroid.y > canvas.height) {
                asteroids.splice(index, 1);
                score++;
                scoreScaleTimer = 20;
                if (score >= 10) {
                    startArrival();
                }
            }
        });
    }

    function endGame() {
        gameRunning = false;
        const overlay = document.getElementById('overlay');
        const startScreen = document.getElementById('start-screen');
        const endScreen = document.getElementById('end-screen');
        const finalScore = document.getElementById('finalScore');
        if (overlay && startScreen && endScreen && finalScore) {
            overlay.style.display = 'flex';
            startScreen.style.display = 'none';
            endScreen.style.display = 'block';
            finalScore.textContent = score;
        }
    }

    function restartGame() {
        const endScreen = document.getElementById('end-screen');
        const successScreen = document.getElementById('success-screen');
        const overlay = document.getElementById('overlay');
        const startScreen = document.getElementById('start-screen');
        if (endScreen && successScreen && overlay && startScreen) {
            endScreen.style.display = 'none';
            successScreen.style.display = 'none';
            overlay.style.display = 'none';
            startScreen.style.display = 'none';
        }
        canvas.style.display = 'block';
        rocket.y = canvas.height - rocket.height - 20 * scaleFactor;
        rocket.x = canvas.width / 2 - rocket.width / 2;
        rocket.width = 80 * scaleFactor;
        rocket.height = 100 * scaleFactor;
        planet.visible = true;
        planet2.visible = false;
        gameRunning = false;
        departureStarted = true;
        arrivalStarted = false;
        planetRotation = 0;
        healPoints = 3;
        score = 0;
        asteroids = [];
        flameParticles = [];
        asteroidTrails = [];
        initStars();
        lastTime = performance.now();
        animateDeparture();
    }

    function updateBackgroundOnMove(deltaX) {
        console.log(`Parallax triggered with deltaX: ${deltaX}`);
        backgroundLayers.forEach(layer => {
            layer.stars.forEach(star => {
                star.x -= deltaX * (layer.speed / 10);
                if (star.x < 0) star.x += canvas.width;
                if (star.x > canvas.width) star.x -= canvas.width;
            });
        });
    }

    // Ініціалізація кнопок
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const successRestartButton = document.getElementById('successRestartButton');

    if (!startButton || !restartButton || !successRestartButton) {
        console.error("One or more button elements not found!");
        return;
    }

    function addButtonListeners(button, handler) {
        button.addEventListener('click', handler);
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handler();
        });
    }

    addButtonListeners(startButton, () => {
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        startDeparture();
    });

    addButtonListeners(restartButton, () => {
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    addButtonListeners(successRestartButton, () => {
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    // Сенсорне керування з паралаксом
    let touchActive = false;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchActive = true;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        const prevX = rocket.x;
        rocket.x = Math.max(0, Math.min(touchX - rocket.width / 2, canvas.width - rocket.width));
        updateBackgroundOnMove(rocket.x - prevX);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (touchActive && gameRunning) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
            const prevX = rocket.x;
            rocket.x = Math.max(0, Math.min(touchX - rocket.width / 2, canvas.width - rocket.width));
            updateBackgroundOnMove(rocket.x - prevX);
        }
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
        touchActive = false;
    });

    // Керування клавіатурою з паралаксом
    window.addEventListener('keydown', (e) => {
        if (gameRunning) {
            const prevX = rocket.x;
            if (e.key === 'ArrowLeft' && rocket.x > 0) rocket.x -= 20 * scaleFactor;
            if (e.key === 'ArrowRight' && rocket.x < canvas.width - rocket.width) rocket.x += 20 * scaleFactor;
            updateBackgroundOnMove(rocket.x - prevX);
        }
    });

    // Ініціалізація
    initStars();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
});