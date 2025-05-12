document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error("Canvas element not found!");
        return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("Failed to get 2D context for canvas!");
        return;
    }

    // Ініціалізація змінних на початку
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
    let flameSparks = [];
    let asteroidTrails = [];
    let asteroidSparks = [];
    let scaleFactor = 1;

    let backgroundLayers = [
        { stars: [], speed: 0.5, radius: 1, brightness: 0.3 },
        { stars: [], speed: 1, radius: 1.5, brightness: 0.5 },
        { stars: [], speed: 2, radius: 2, brightness: 0.8 }
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

    // Адаптивний розмір канвасу та оверлею
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

        // Оновлюємо розміри #overlay
        const overlay = document.getElementById('overlay');
        if (overlay) {
            overlay.style.width = `${newWidth}px`;
            overlay.style.height = `${newHeight}px`;
        } else {
            console.error("Overlay element not found!");
        }

        scaleFactor = canvas.width / 412;
        updateGameElements();
        initStars(); // Реініціалізуємо зірки при зміні розміру
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
            // Масштабуємо позиції астероїдів пропорційно новому розміру канвасу
            asteroid.x = (asteroid.x / canvas.width) * canvas.width;
            asteroid.y = (asteroid.y / canvas.height) * canvas.height;
        });

        flameParticles.forEach(particle => {
            particle.x = (particle.x / canvas.width) * canvas.width;
            particle.y = (particle.y / canvas.height) * canvas.height;
            particle.radius = particle.radius * scaleFactor;
            particle.speedY = particle.speedY * scaleFactor;
        });

        flameSparks.forEach(spark => {
            spark.x = (spark.x / canvas.width) * canvas.width;
            spark.y = (spark.y / canvas.height) * canvas.height;
            spark.radius = spark.radius * scaleFactor;
            spark.speedX = spark.speedX * scaleFactor;
            spark.speedY = spark.speedY * scaleFactor;
        });

        asteroidTrails.forEach(trail => {
            trail.x = (trail.x / canvas.width) * canvas.width;
            trail.y = (trail.y / canvas.height) * canvas.height;
            trail.radius = trail.radius * scaleFactor;
            trail.speedY = trail.speedY * scaleFactor;
        });

        asteroidSparks.forEach(spark => {
            spark.x = (spark.x / canvas.width) * canvas.width;
            spark.y = (spark.y / canvas.height) * canvas.height;
            spark.radius = spark.radius * scaleFactor;
            spark.speedX = spark.speedX * scaleFactor;
            spark.speedY = spark.speedY * scaleFactor;
        });
    }

    function onImageLoad() {
        imagesLoaded++;
        console.log(`Image loaded: ${imagesLoaded}/${totalImages}`);
        if (imagesLoaded === totalImages) {
            console.log("All images loaded");
        }
    }

    function onImageError(e) {
        console.error("Error loading an image:", e.target.src);
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

    rocketImage.onerror = onImageError;
    explosionImage.onerror = onImageError;
    asteroidImage.onerror = onImageError;
    planetImage.onerror = onImageError;
    planet2Image.onerror = onImageError;
    healPointImage.onerror = onImageError;

    function initStars() {
        backgroundLayers.forEach(layer => {
            layer.stars = [];
            for (let i = 0; i < 50; i++) {
                layer.stars.push({
                    x: Math.random() * canvas.width,
                    y: Math.random() * canvas.height,
                    radius: Math.random() * layer.radius + 0.5,
                    speed: layer.speed,
                    brightness: Math.random() * layer.brightness + 0.2
                });
            }
        });
    }

    function drawBackground() {
        ctx.fillStyle = '#0a0a23';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const nebulaGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        nebulaGradient.addColorStop(0, 'rgba(0, 255, 255, 0.1)');
        nebulaGradient.addColorStop(0.5, 'rgba(255, 0, 255, 0.05)');
        nebulaGradient.addColorStop(1, 'rgba(0, 255, 255, 0.1)');
        ctx.fillStyle = nebulaGradient;
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

    function drawFlame(x, y, rocketSpeedY) {
        for (let i = 0; i < 5; i++) {
            flameParticles.push({
                x: x + (Math.random() - 0.5) * 20 * scaleFactor,
                y: y + rocket.height / 2,
                radius: (Math.random() * 5 + 2) * scaleFactor,
                speedY: ((Math.random() * 3 + 2) + (rocketSpeedY || 0)) * scaleFactor,
                opacity: 1,
                color: Math.random() > 0.5 ? 'rgba(0, 204, 255, 0.8)' : 'rgba(147, 112, 219, 0.8)'
            });
        }

        if (Math.random() < 0.3) {
            flameSparks.push({
                x: x + (Math.random() - 0.5) * 20 * scaleFactor,
                y: y + rocket.height / 2,
                radius: (Math.random() * 2 + 1) * scaleFactor,
                speedX: (Math.random() - 0.5) * 4 * scaleFactor,
                speedY: ((Math.random() * 2 + 1) + (rocketSpeedY || 0)) * scaleFactor,
                opacity: 1
            });
        }

        flameParticles.forEach((particle, index) => {
            particle.y += particle.speedY;
            particle.opacity -= 0.02;
            particle.radius *= 0.95;

            if (particle.opacity <= 0 || particle.radius <= 0.1) {
                flameParticles.splice(index, 1);
                return;
            }

            const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, particle.radius);
            gradient.addColorStop(0, particle.color);
            gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.5)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.globalAlpha = particle.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        flameSparks.forEach((spark, index) => {
            spark.x += spark.speedX;
            spark.y += spark.speedY;
            spark.opacity -= 0.03;
            spark.radius *= 0.9;

            if (spark.opacity <= 0 || spark.radius <= 0.1) {
                flameSparks.splice(index, 1);
                return;
            }

            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + spark.opacity + ')';
            ctx.fill();
        });
    }

    function drawAsteroidTrail(asteroid) {
        asteroidTrails.push({
            x: asteroid.x + asteroid.width / 2,
            y: asteroid.y,
            radius: (Math.random() * 3 + 2) * scaleFactor,
            opacity: 1,
            speedY: -2 * scaleFactor
        });

        if (Math.random() < 0.3) {
            asteroidSparks.push({
                x: asteroid.x + asteroid.width / 2,
                y: asteroid.y,
                radius: (Math.random() * 2 + 1) * scaleFactor,
                speedX: (Math.random() - 0.5) * 3 * scaleFactor,
                speedY: -1 * scaleFactor,
                opacity: 1
            });
        }

        asteroidTrails.forEach((trail, index) => {
            trail.y += trail.speedY;
            trail.opacity -= 0.02;
            trail.radius *= 0.95;

            if (trail.opacity <= 0 || trail.radius <= 0.1) {
                asteroidTrails.splice(index, 1);
                return;
            }

            const trailGradient = ctx.createLinearGradient(trail.x - trail.radius, trail.y, trail.x + trail.radius, trail.y);
            trailGradient.addColorStop(0, 'rgba(0, 255, 255, ' + trail.opacity + ')');
            trailGradient.addColorStop(0.5, 'rgba(173, 216, 230, ' + trail.opacity / 1.5 + ')');
            trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

            ctx.beginPath();
            ctx.arc(trail.x, trail.y, trail.radius, 0, Math.PI * 2);
            ctx.fillStyle = trailGradient;
            ctx.globalAlpha = trail.opacity;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        asteroidSparks.forEach((spark, index) => {
            spark.x += spark.speedX;
            spark.y += spark.speedY;
            spark.opacity -= 0.03;
            spark.radius *= 0.9;

            if (spark.opacity <= 0 || spark.radius <= 0.1) {
                asteroidSparks.splice(index, 1);
                return;
            }

            ctx.beginPath();
            ctx.arc(spark.x, spark.y, spark.radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, ' + spark.opacity + ')';
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
            ctx.drawImage(planet2Image, -planet2.width / 2, -planet2.height / 2, planet2.width, planet2.height);
            ctx.restore();
        }
    }

    function startDeparture() {
        if (!rocketImage.complete || !planetImage.complete) {
            console.error("Images not loaded yet!");
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
        animateDeparture();
    }

    function animateDeparture() {
        if (!departureStarted) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPlanet();

        if (rocketImage.complete) {
            drawFlame(rocket.x + rocket.width / 2, rocket.y, -5);
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        rocket.y -= 5 * scaleFactor;
        planetRotation += 0.01;

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
        animateArrival();
    }

    function animateArrival() {
        if (!arrivalStarted) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPlanet2();

        if (rocket.y < planet2.y - rocket.height) {
            drawFlame(rocket.x + rocket.width / 2, rocket.y, 1);
        }

        if (rocket.y < planet2.y && rocketImage.complete) {
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        rocket.y += 1 * scaleFactor;
        if (rocket.y < planet2.y) {
            rocket.width *= 0.995;
            rocket.height *= 0.995;
            rocket.x += (planet2.x + planet2.width / 2 - rocket.x - rocket.width / 2) * 0.02;
        }

        if (planet2.y > canvas.height - 400 * scaleFactor) {
            planet2.y -= 2 * scaleFactor;
            planet2.width += 0.8 * scaleFactor;
            planet2.height += 0.8 * scaleFactor;
        }
        planetRotation += 0.005;

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
        } else {
            console.error("Success screen elements not found!");
        }
    }

    function startGame() {
        gameRunning = true;
        isExploding = false;
        asteroids = [];
        score = 0;
        healPoints = 3;
        if (animationFrame) cancelAnimationFrame(animationFrame);
        requestAnimationFrame(updateGame);
    }

    function updateGame() {
        if (!gameRunning) return;

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
        const gradient = ctx.createLinearGradient(20 * scaleFactor, 20 * scaleFactor, 100 * scaleFactor, 40 * scaleFactor);
        gradient.addColorStop(0, '#00ffcc');
        gradient.addColorStop(1, '#ff00ff');
        ctx.fillStyle = gradient;

        const glowIntensity = 10 + Math.sin(Date.now() * 0.002) * 5;
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';

        if (scoreScaleTimer > 0) {
            scoreScale = 1 + 0.2 * (scoreScaleTimer / 20);
            scoreScaleTimer--;
        } else {
            scoreScale = 1;
        }

        ctx.translate(20 * scaleFactor, 40 * scaleFactor);
        ctx.scale(scoreScale, scoreScale);
        ctx.fillText(`Score: ${score}`, 0, 0);
        ctx.restore();

        moveAsteroids();

        if (gameRunning) {
            animationFrame = requestAnimationFrame(updateGame);
        }
    }

    function moveAsteroids() {
        if (Math.random() < 0.01) {
            asteroids.push({
                x: Math.random() * (canvas.width - 60 * scaleFactor),
                y: -60 * scaleFactor,
                width: 40 * scaleFactor,
                height: 40 * scaleFactor,
                angle: 0,
                rotationSpeed: (Math.random() * 0.1) - 0.05,
                sway: Math.random() * 0.05 + 0.02,
                swayDirection: Math.random() > 0.5 ? 1 : -1
            });
        }

        asteroids.forEach((asteroid, index) => {
            asteroid.y += 5 * scaleFactor;
            asteroid.angle += asteroid.rotationSpeed;
            asteroid.x += Math.sin(asteroid.y * asteroid.sway) * asteroid.swayDirection;

            drawAsteroidTrail(asteroid);

            if (asteroidImage.complete) {
                ctx.save();
                ctx.translate(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
                ctx.rotate(asteroid.angle);

                const electricLines = 10;
                for (let i = 0; i < electricLines; i++) {
                    const angle = (i / electricLines) * Math.PI * 2;
                    const length = Math.random() * 15 + 10;
                    const gradient = ctx.createLinearGradient(
                        Math.cos(angle) * asteroid.width / 2,
                        Math.sin(angle) * asteroid.width / 2,
                        Math.cos(angle) * (asteroid.width / 2 + length * scaleFactor),
                        Math.sin(angle) * (asteroid.width / 2 + length * scaleFactor)
                    );
                    gradient.addColorStop(0, 'rgba(0, 255, 255, 1)');
                    gradient.addColorStop(0.5, 'rgba(173, 216, 230, 0.8)');
                    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

                    ctx.beginPath();
                    ctx.moveTo(Math.cos(angle) * asteroid.width / 2, Math.sin(angle) * asteroid.width / 2);
                    ctx.lineTo(Math.cos(angle) * (asteroid.width / 2 + length * scaleFactor), Math.sin(angle) * (asteroid.width / 2 + length * scaleFactor));
                    ctx.lineWidth = (1.5 + Math.random() * 0.5) * scaleFactor;
                    ctx.strokeStyle = gradient;
                    ctx.stroke();
                }

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
                        } else {
                            console.error("End screen elements not found!");
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
        } else {
            console.error("End screen elements not found!");
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
        } else {
            console.error("Restart screen elements not found!");
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
        flameSparks = [];
        asteroidTrails = [];
        asteroidSparks = [];
        initStars();
        animateDeparture();
    }

    // Ініціалізація кнопок
    const startButton = document.getElementById('startButton');
    const restartButton = document.getElementById('restartButton');
    const successRestartButton = document.getElementById('successRestartButton');

    if (!startButton || !restartButton || !successRestartButton) {
        console.error("One or more button elements not found!");
        return;
    }

    startButton.addEventListener('click', () => {
        console.log("Start button clicked!");
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        startDeparture();
    });

    startButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log("Start button touched!");
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        startDeparture();
    });

    restartButton.addEventListener('click', () => {
        console.log("Restart button clicked!");
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    restartButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log("Restart button touched!");
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    successRestartButton.addEventListener('click', () => {
        console.log("Success restart button clicked!");
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    successRestartButton.addEventListener('touchstart', (e) => {
        e.preventDefault();
        console.log("Success restart button touched!");
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    // Сенсорне керування ракетою
    let touchActive = false;
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchActive = true;
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
        rocket.x = touchX - rocket.width / 2;
        updateBackgroundOnMove(touchX);
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (touchActive && gameRunning) {
            const touch = e.touches[0];
            const rect = canvas.getBoundingClientRect();
            const touchX = (touch.clientX - rect.left) * (canvas.width / rect.width);
            rocket.x = touchX - rocket.width / 2;

            if (rocket.x < 0) rocket.x = 0;
            if (rocket.x > canvas.width - rocket.width) rocket.x = canvas.width - rocket.width;

            updateBackgroundOnMove(touchX);
        }
    });

    canvas.addEventListener('touchend', () => {
        touchActive = false;
    });

    // Керування клавіатурою
    window.addEventListener('keydown', (e) => {
        if (gameRunning) {
            let prevX = rocket.x;
            if (e.key === 'ArrowLeft' && rocket.x > 0) rocket.x -= 20 * scaleFactor;
            if (e.key === 'ArrowRight' && rocket.x < canvas.width - rocket.width) rocket.x += 20 * scaleFactor;

            let deltaX = rocket.x - prevX;
            backgroundLayers.forEach(layer => {
                layer.stars.forEach(star => {
                    star.x -= deltaX * (layer.speed / 10);
                    if (star.x < 0) star.x += canvas.width;
                    if (star.x > canvas.width) star.x -= canvas.width;
                });
            });
        }
    });

    function updateBackgroundOnMove(touchX) {
        const prevX = rocket.x;
        rocket.x = touchX - rocket.width / 2;

        if (rocket.x < 0) rocket.x = 0;
        if (rocket.x > canvas.width - rocket.width) rocket.x = canvas.width - rocket.width;

        const deltaX = rocket.x - prevX;
        backgroundLayers.forEach(layer => {
            layer.stars.forEach(star => {
                star.x -= deltaX * (layer.speed / 10);
                if (star.x < 0) star.x += canvas.width;
                if (star.x > canvas.width) star.x -= canvas.width;
            });
        });
    }

    // Ініціалізація зірок та виклик resizeCanvas
    initStars();
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
});