document.addEventListener("DOMContentLoaded", () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    canvas.width = 412;
    canvas.height = 915;

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

    const rocketImage = new Image();
    rocketImage.src = 'img/Rocket.png';

    const explosionImage = new Image();
    explosionImage.src = 'img/explosion.png';

    const asteroidImage = new Image();
    asteroidImage.src = 'img/Asteroid.png';

    const planetImage = new Image();
    planetImage.src = 'img/Planet.png';

    const planet2Image = new Image();
    planet2Image.src = 'img/Planet2.png';

    const healPointImage = new Image();
    healPointImage.src = 'img/healpoint.png';

    const startSound = new Audio('audio/Select1.mp3');
    const deathSound = new Audio('audio/death.mp3');
    const backgroundSound = new Audio('audio/space_ambient.mp3');
    backgroundSound.loop = true;
    backgroundSound.volume = 0.03; 

    let stars = [];

    function initStars() {
        stars = [];
        for (let i = 0; i < 100; i++) {
            stars.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: Math.random() * 2 + 1,
                speed: Math.random() * 2 + 1,
                brightness: Math.random() * 0.5 + 0.5
            });
        }
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

        stars.forEach(star => {
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
            ctx.fill();

            star.y += star.speed;
            if (star.y > canvas.height) {
                star.y = -star.radius;
                star.x = Math.random() * canvas.width;
            }
        });
    }

    initStars();

    document.getElementById('startButton').addEventListener('click', () => {
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        startDeparture();
    });

    document.getElementById('restartButton').addEventListener('click', () => {
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    document.getElementById('successRestartButton').addEventListener('click', () => {
        startSound.currentTime = 0;
        startSound.play().catch(console.error);
        backgroundSound.play().catch(console.error);
        restartGame();
    });

    function drawHealPoints() {
        for (let i = 0; i < healPoints; i++) {
            ctx.drawImage(healPointImage, canvas.width - 40 * (i + 1), 20, 30, 30);
        }
    }

    function drawPlanet() {
        if (planet.visible) {
            ctx.save();
            ctx.translate(planet.x + planet.width / 2, planet.y + planet.height / 2);
            ctx.rotate(planetRotation);
            ctx.drawImage(planetImage, -planet.width / 2, -planet.height / 2, planet.width, planet.height);
            ctx.restore();
        }
    }

    function drawPlanet2() {
        if (planet2.visible) {
            ctx.save();
            ctx.translate(planet2.x + planet2.width / 2, planet2.y + planet2.height / 2);
            ctx.rotate(planetRotation);
            ctx.drawImage(planet2Image, -planet2.width / 2, -planet2.height / 2, planet2.width, planet2.height);
            ctx.restore();
        }
    }

    function drawFlame(x, y) {
        for (let i = 0; i < 3; i++) {
            const offsetX = (Math.random() - 0.5) * 10;
            const flameHeight = 15 + Math.random() * 10;
            const flameWidth = 8 + Math.random() * 5;

            const gradient = ctx.createRadialGradient(x + offsetX, y, 2, x + offsetX, y + flameHeight, 10);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(0.3, 'yellow');
            gradient.addColorStop(0.6, 'orange');
            gradient.addColorStop(1, 'red');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.ellipse(x + offsetX, y + flameHeight / 2, flameWidth / 2, flameHeight / 2, 0, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    function startDeparture() {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('start-screen').style.display = 'none';
        canvas.style.display = 'block';
        rocket.y = canvas.height - 100;
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

        drawFlame(rocket.x + rocket.width / 2, rocket.y + rocket.height);
        ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);

        rocket.y -= 5;
        planetRotation += 0.01;

        if (rocket.y < -rocket.height) {
            departureStarted = false;
            planet.visible = false;
            rocket.y = canvas.height - 200;
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
        planet2.width = 100;
        planet2.height = 100;
        rocket.y = 100;
        rocket.width = 80;
        rocket.height = 100;
        animateArrival();
    }

    function animateArrival() {
        if (!arrivalStarted) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawPlanet2();

        if (rocket.y < planet2.y - rocket.height) {
            drawFlame(rocket.x + rocket.width / 2, rocket.y + rocket.height);
        }

        if (rocket.y < planet2.y) {
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        rocket.y += 1;
        if (rocket.y < planet2.y) {
            rocket.width *= 0.995;
            rocket.height *= 0.995;
            rocket.x += (planet2.x + planet2.width / 2 - rocket.x - rocket.width / 2) * 0.02;
        }

        if (planet2.y > canvas.height - 400) {
            planet2.y -= 2;
            planet2.width += 0.8;
            planet2.height += 0.8;
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
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('end-screen').style.display = 'none';
        document.getElementById('success-screen').style.display = 'block';
        document.getElementById('successScore').textContent = score;
    }

    function startGame() {
        gameRunning = true;
        isExploding = false;
        asteroids = [];
        score = 0;
        healPoints = 3;
        cancelAnimationFrame(animationFrame);
        requestAnimationFrame(updateGame);
    }

    function updateGame() {
        if (!gameRunning) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawBackground();
        drawHealPoints();

        if (isExploding) {
            ctx.drawImage(explosionImage, rocket.x, rocket.y, rocket.width, rocket.height);
        } else {
            drawFlame(rocket.x + rocket.width / 2, rocket.y + rocket.height);
            ctx.drawImage(rocketImage, rocket.x, rocket.y, rocket.width, rocket.height);
        }

        ctx.save();
        ctx.font = '25px Orbitron'; 
        const gradient = ctx.createLinearGradient(20, 20, 100, 40);
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

        ctx.translate(20, 40);
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
                x: Math.random() * (canvas.width - 60),
                y: -60,
                width: 40,
                height: 40,
                angle: 0,
                rotationSpeed: (Math.random() * 0.1) - 0.05
            });
        }

        asteroids.forEach((asteroid, index) => {
            asteroid.y += 5;
            asteroid.angle += asteroid.rotationSpeed;

            ctx.save();
            ctx.translate(asteroid.x + asteroid.width / 2, asteroid.y + asteroid.height / 2);
            ctx.rotate(asteroid.angle);

            ctx.shadowBlur = 15;
            ctx.shadowColor = "white";
            ctx.drawImage(asteroidImage, -asteroid.width / 2, -asteroid.height / 2, asteroid.width, asteroid.height);
            ctx.restore();

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
                    ctx.drawImage(explosionImage, rocket.x, rocket.y, rocket.width, rocket.height);

                    setTimeout(() => {
                        document.getElementById('overlay').style.display = 'flex';
                        document.getElementById('start-screen').style.display = 'none';
                        document.getElementById('end-screen').style.display = 'block';
                        document.getElementById('finalScore').textContent = score;
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
        document.getElementById('overlay').style.display = 'flex';
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('end-screen').style.display = 'block';
        document.getElementById('finalScore').textContent = score;
    }

    function restartGame() {
        document.getElementById('end-screen').style.display = 'none';
        document.getElementById('success-screen').style.display = 'none';
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('start-screen').style.display = 'none';
        canvas.style.display = 'block';
        rocket.y = canvas.height - 100;
        planet.visible = true;
        planet2.visible = false;
        gameRunning = false;
        departureStarted = true;
        arrivalStarted = false;
        planetRotation = 0;
        healPoints = 3;
        initStars();
        animateDeparture();
    }

    window.addEventListener('keydown', (e) => {
        if (gameRunning) {
            if (e.key === 'ArrowLeft' && rocket.x > 0) rocket.x -= 20;
            if (e.key === 'ArrowRight' && rocket.x < canvas.width - rocket.width) rocket.x += 20;
        }
    });
});