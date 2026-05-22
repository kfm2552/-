// Game variables
const canvas = document.getElementById('pongGame');
const playerPaddle = document.getElementById('playerPaddle');
const computerPaddle = document.getElementById('computerPaddle');
const ball = document.getElementById('ball');
const playerScoreDisplay = document.getElementById('playerScore');
const computerScoreDisplay = document.getElementById('computerScore');

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const PADDLE_HEIGHT = 60;
const PADDLE_WIDTH = 10;
const BALL_SIZE = 6;
const PADDLE_SPEED = 6;
const COMPUTER_SPEED = 5;
const INITIAL_BALL_SPEED = 4;

// Game state
let gameState = {
    playerScore: 0,
    computerScore: 0,
    ball: {
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        vx: INITIAL_BALL_SPEED,
        vy: INITIAL_BALL_SPEED,
        speed: INITIAL_BALL_SPEED
    },
    playerPaddle: {
        y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
        velocity: 0
    },
    computerPaddle: {
        y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
        velocity: 0
    },
    mouseY: CANVAS_HEIGHT / 2,
    keys: {}
};

// Mouse movement control
document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleY = CANVAS_HEIGHT / rect.height;
    gameState.mouseY = (e.clientY - rect.top) * scaleY;
});

// Keyboard controls
document.addEventListener('keydown', (e) => {
    gameState.keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    gameState.keys[e.key] = false;
});

// Update player paddle position (mouse control)
function updatePlayerPaddle() {
    let targetY = gameState.mouseY - PADDLE_HEIGHT / 2;

    // Also allow arrow key control
    if (gameState.keys['ArrowUp']) {
        targetY -= PADDLE_SPEED;
    }
    if (gameState.keys['ArrowDown']) {
        targetY += PADDLE_SPEED;
    }

    // Smooth movement towards target
    targetY = Math.max(0, Math.min(targetY, CANVAS_HEIGHT - PADDLE_HEIGHT));
    gameState.playerPaddle.y = targetY;
    playerPaddle.setAttribute('y', gameState.playerPaddle.y);
}

// Update computer AI paddle
function updateComputerPaddle() {
    const computerCenter = gameState.computerPaddle.y + PADDLE_HEIGHT / 2;
    const ballCenter = gameState.ball.y;

    // AI difficulty: aim for the ball with slight imperfection
    const difficulty = 0.8; // 0.5 = easy, 1.0 = hard
    const targetY = ballCenter - PADDLE_HEIGHT / 2;

    if (computerCenter < ballCenter - 15) {
        gameState.computerPaddle.y = Math.min(
            gameState.computerPaddle.y + COMPUTER_SPEED * difficulty,
            CANVAS_HEIGHT - PADDLE_HEIGHT
        );
    } else if (computerCenter > ballCenter + 15) {
        gameState.computerPaddle.y = Math.max(
            gameState.computerPaddle.y - COMPUTER_SPEED * difficulty,
            0
        );
    }

    computerPaddle.setAttribute('y', gameState.computerPaddle.y);
}

// Update ball position and physics
function updateBall() {
    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;

    // Wall collision (top and bottom)
    if (gameState.ball.y - BALL_SIZE <= 0 || gameState.ball.y + BALL_SIZE >= CANVAS_HEIGHT) {
        gameState.ball.vy *= -1;
        gameState.ball.y = Math.max(BALL_SIZE, Math.min(gameState.ball.y, CANVAS_HEIGHT - BALL_SIZE));
    }

    // Player paddle collision (left)
    if (gameState.ball.x - BALL_SIZE <= 10 + PADDLE_WIDTH &&
        gameState.ball.y >= gameState.playerPaddle.y &&
        gameState.ball.y <= gameState.playerPaddle.y + PADDLE_HEIGHT) {
        
        gameState.ball.vx *= -1.05; // Slightly increase speed
        gameState.ball.x = 10 + PADDLE_WIDTH + BALL_SIZE;

        // Add spin based on where ball hits paddle
        const hitPos = (gameState.ball.y - gameState.playerPaddle.y) / PADDLE_HEIGHT;
        gameState.ball.vy += (hitPos - 0.5) * 4;
    }

    // Computer paddle collision (right)
    if (gameState.ball.x + BALL_SIZE >= CANVAS_WIDTH - 10 - PADDLE_WIDTH &&
        gameState.ball.y >= gameState.computerPaddle.y &&
        gameState.ball.y <= gameState.computerPaddle.y + PADDLE_HEIGHT) {
        
        gameState.ball.vx *= -1.05; // Slightly increase speed
        gameState.ball.x = CANVAS_WIDTH - 10 - PADDLE_WIDTH - BALL_SIZE;

        // Add spin based on where ball hits paddle
        const hitPos = (gameState.ball.y - gameState.computerPaddle.y) / PADDLE_HEIGHT;
        gameState.ball.vy += (hitPos - 0.5) * 4;
    }

    // Scoring (ball out of bounds)
    if (gameState.ball.x < 0) {
        gameState.computerScore++;
        computerScoreDisplay.textContent = gameState.computerScore;
        resetBall();
        checkGameOver();
    } else if (gameState.ball.x > CANVAS_WIDTH) {
        gameState.playerScore++;
        playerScoreDisplay.textContent = gameState.playerScore;
        resetBall();
        checkGameOver();
    }

    // Cap ball speed
    const maxSpeed = INITIAL_BALL_SPEED * 2;
    const currentSpeed = Math.sqrt(gameState.ball.vx ** 2 + gameState.ball.vy ** 2);
    if (currentSpeed > maxSpeed) {
        const scale = maxSpeed / currentSpeed;
        gameState.ball.vx *= scale;
        gameState.ball.vy *= scale;
    }

    ball.setAttribute('cx', gameState.ball.x);
    ball.setAttribute('cy', gameState.ball.y);
}

// Reset ball to center
function resetBall() {
    gameState.ball.x = CANVAS_WIDTH / 2;
    gameState.ball.y = CANVAS_HEIGHT / 2;
    gameState.ball.vx = INITIAL_BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    gameState.ball.vy = INITIAL_BALL_SPEED * (Math.random() - 0.5);
    ball.setAttribute('cx', gameState.ball.x);
    ball.setAttribute('cy', gameState.ball.y);
}

// Check if game is over
function checkGameOver() {
    if (gameState.playerScore >= 11 || gameState.computerScore >= 11) {
        const winner = gameState.playerScore >= 11 ? 'You' : 'Computer';
        alert(`Game Over! ${winner} wins!\n\nPlayer: ${gameState.playerScore}\nComputer: ${gameState.computerScore}\n\nRefresh to play again.`);
        resetGame();
    }
}

// Reset game
function resetGame() {
    gameState.playerScore = 0;
    gameState.computerScore = 0;
    playerScoreDisplay.textContent = 0;
    computerScoreDisplay.textContent = 0;
    resetBall();
}

// Main game loop
function gameLoop() {
    updatePlayerPaddle();
    updateComputerPaddle();
    updateBall();
    requestAnimationFrame(gameLoop);
}

// Start the game
resetBall();
gameLoop();
