import type { ViewFunction } from "../router/types";
import { 
	Button,
	BackButton
 } from "../components/Button";

export const GameView: ViewFunction = () => {
	return `
		${BackButton()}
		<div class="container ml-auto mr-auto flex flex-col items-center">
			<canvas id="pong-canvas"></canvas>
			${Button({
				children: "Start",
				variant: "danger",
				size: "lg",
				className: "font-bold ",
				id: "startBtn",
			})}
		</div>
	`;
};

export const gameLogic = () => {
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;
	const startBtn = document.getElementById('startBtn') as HTMLButtonElement;

	if (!canvas)
	{
		console.log('Canvas not found');
		return () => {};
	}
	const ctx = canvas.getContext('2d');
	if (!ctx)
	{
		console.error('No 2d ctx');
		return () => {};
	}

	console.log("Canvas loaded");
	
	//taille du jeu
	const WORLD_WIDTH = 1920;
    const WORLD_HEIGHT = 1080;

	//params des barres
	const PADDLE_WIDTH = 10;
    const PADDLE_HEIGHT = 100;
    const PADDLE_SPEED = 400;
    const PADDLE_MARGIN = 30;

	//params balle
	const BALL_RADIUS = 100;
    const BALL_INITIAL_SPEED = 300;
	const BALL_SPEED_INCREASE = 1.1;
	const BALL_MAX_SPEED = 10000000;

	const SCORE_TO_WIN = 11;

	const gameState = {

		leftPaddle: {
			y: WORLD_HEIGHT / 2,
			intention: 0
		},
		
		rightPaddle: {
			y: WORLD_HEIGHT / 2,
			intention: 0
		},
		
		ball: {
			x: WORLD_WIDTH / 2,
			y: WORLD_HEIGHT / 2,
			vx: BALL_INITIAL_SPEED,
			vy: 0
		},

		score: {
			left: 0,
			right: 0
		},

		isPlaying: false,
		isPaused: false
	};

	const setupCanvas = () => {
		const container = canvas.parentElement;
		if (!container) return;

		const containerWidth = container.clientWidth * 0.9;
		const containerHeight = window.innerHeight * 0.8;

		const scaleX = containerWidth / WORLD_WIDTH;
		const scaleY = containerHeight / WORLD_HEIGHT;
		const scale = Math.min(scaleX, scaleY);

		const displayWidth = Math.floor(WORLD_WIDTH * scale);
		const displayHeight = Math.floor(WORLD_HEIGHT * scale);

		const dpr = window.devicePixelRatio || 1;
		canvas.width = WORLD_WIDTH * dpr;
		canvas.height = WORLD_HEIGHT * dpr;

		ctx.resetTransform();
		ctx.scale(dpr, dpr);

		canvas.style.width = displayWidth + 'px';
		canvas.style.height = displayHeight + 'px';

		canvas.style.display = 'block';
		canvas.style.margin = '20px auto';
		canvas.style.border = '2px solid #333';
	};

	setupCanvas();

	const handleResize = () => {
        setupCanvas();
		render();
    };
    window.addEventListener('resize', handleResize);

	const keys = {
		w: false,
		s: false,
		arrowUp: false,
		arrowDown: false,
	};

	const handleKeyDown = (e: KeyboardEvent) => {
		switch(e.key) {
			case 'w':
			case 'W':
				keys.w = true;
				break;
			case 's':
			case 'S':
				keys.s = true;
				break;
			case 'ArrowUp':
				keys.arrowUp = true;
				e.preventDefault();
				break;
			case 'ArrowDown':
				keys.arrowDown = true;
				e.preventDefault();
				break;
			case 'p':
			case 'P':
			case ' ':
				gameState.isPaused = !gameState.isPaused;
				e.preventDefault();
				break;
			case 'Escape':
				gameState.isPaused = !gameState.isPaused;
		}

		updateIntentions();
	};

	const handleKeyUp = (e: KeyboardEvent) => {
		switch(e.key) {
			case 'w':
			case 'W':
				keys.w = false;
				break;
			case 's':
			case 'S':
				keys.s = false;
				break;
			case 'ArrowUp':
				keys.arrowUp = false;
				break;
			case 'ArrowDown':
				keys.arrowDown = false;
				break;
		}

		updateIntentions();
	};

	const updateIntentions = () => {
		//barre gauche
		if (keys.w && !keys.s)
		{
			gameState.leftPaddle.intention = -1;
		}
		else if (keys.s && !keys.w)
		{
			gameState.leftPaddle.intention = 1;
		}
		else
		{
			gameState.leftPaddle.intention = 0;
		}

		//barre droite
		if (keys.arrowUp && !keys.arrowDown)
		{
			gameState.rightPaddle.intention = -1;
		}
		else if (keys.arrowDown && !keys.arrowUp)
		{
			gameState.rightPaddle.intention = 1;
		}
		else
		{
			gameState.rightPaddle.intention = 0;
		}
	};

	window.addEventListener('keydown', handleKeyDown);
	window.addEventListener('keyup', handleKeyUp);

	let animationId: number;

	const render = () => {
		ctx.fillStyle = '#000';
		ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

		//ligne delimitatrice
		ctx.strokeStyle = '#fff';
		ctx.setLineDash([10, 10]);
		ctx.beginPath();
		ctx.moveTo(WORLD_WIDTH / 2, 0);
		ctx.lineTo(WORLD_WIDTH / 2, WORLD_HEIGHT);
		ctx.stroke();
		ctx.setLineDash([]);

		ctx.fillStyle = '#fff';
		
		//barre gauche
		ctx.fillRect(
			PADDLE_MARGIN,
			gameState.leftPaddle.y - PADDLE_HEIGHT / 2,
			PADDLE_WIDTH,
			PADDLE_HEIGHT
		);

		//barre droite
		ctx.fillRect(
			WORLD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
			gameState.rightPaddle.y - PADDLE_HEIGHT / 2,
			PADDLE_WIDTH,
			PADDLE_HEIGHT
		);

		//balle
		ctx.beginPath();
		ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
		ctx.fill();

		//score
		ctx.font = '48px monospace';
		ctx.textAlign = 'center';
		//gauche
		ctx.fillText(
			gameState.score.left.toString(),
			WORLD_WIDTH / 2 - 100,
			60
		);
		//droite
		ctx.fillText(
			gameState.score.right.toString(),
			WORLD_WIDTH / 2 + 100,
			60
		);

		if (gameState.isPaused) 
		{
			ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
			ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
			
			ctx.fillStyle = '#fff';
			ctx.font = '72px monospace';
			ctx.textAlign = 'center';
			ctx.fillText('PAUSED', WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
			
			ctx.font = '24px monospace';
			ctx.fillText('Press P, SPACE or ESC to resume', WORLD_WIDTH / 2, WORLD_HEIGHT / 2 + 60);
    	}
	};

	const update = (deltaTime: number) => {

		deltaTime = Math.min(deltaTime, 1/30);

		if (gameState.isPaused)
		{
			return;
		}

		gameState.leftPaddle.y += gameState.leftPaddle.intention * PADDLE_SPEED * deltaTime;
		gameState.rightPaddle.y += gameState.rightPaddle.intention * PADDLE_SPEED * deltaTime;

		const halfPaddle = PADDLE_HEIGHT / 2;
		gameState.leftPaddle.y = Math.max(halfPaddle, Math.min(WORLD_HEIGHT - halfPaddle, gameState.leftPaddle.y));
        gameState.rightPaddle.y = Math.max(halfPaddle, Math.min(WORLD_HEIGHT - halfPaddle, gameState.rightPaddle.y));

		gameState.ball.x += gameState.ball.vx * deltaTime;
		gameState.ball.y += gameState.ball.vy * deltaTime;

		//collision mur haut et bas
		if (gameState.ball.y - BALL_RADIUS <= 0) {
			gameState.ball.y = BALL_RADIUS;
			gameState.ball.vy = Math.abs(gameState.ball.vy);
		}
		if (gameState.ball.y + BALL_RADIUS >= WORLD_HEIGHT) {
			gameState.ball.y = WORLD_HEIGHT - BALL_RADIUS;
			gameState.ball.vy = -Math.abs(gameState.ball.vy);
		}

		const checkPaddleCollision = (paddleX: number, paddleY: number, isLeftPaddle: boolean) => {
			const prevX = gameState.ball.x - gameState.ball.vx * deltaTime;
			const prevY = gameState.ball.y - gameState.ball.vy * deltaTime;

			const paddleLeft = paddleX;
			const paddleRight = paddleX + PADDLE_WIDTH;
			const paddleTop = paddleY - PADDLE_HEIGHT / 2;
			const paddleBottom = paddleY + PADDLE_HEIGHT / 2;

			let collision = false;
			let collisionY = gameState.ball.y;
			//gauche
			if (isLeftPaddle) 
			{
				if (gameState.ball.vx < 0 && prevX - BALL_RADIUS > paddleRight && gameState.ball.x - BALL_RADIUS <= paddleRight)
				{
					const t = (paddleRight + BALL_RADIUS - prevX) / (gameState.ball.x - prevX);
					collisionY = prevY + t * (gameState.ball.y - prevY);
					if (collisionY >= paddleTop - BALL_RADIUS && collisionY <= paddleBottom + BALL_RADIUS)
					{
						collision = true;
					}
				}
			}
			//droite
			else
			{
				if (gameState.ball.vx > 0 && prevX + BALL_RADIUS < paddleLeft && gameState.ball.x + BALL_RADIUS >= paddleLeft)
				{
					const t = (paddleLeft - BALL_RADIUS - prevX) / (gameState.ball.x - prevX);
					collisionY = prevY + t * (gameState.ball.y - prevY);
					if (collisionY >= paddleTop - BALL_RADIUS && collisionY <= paddleBottom + BALL_RADIUS)
					{
						collision = true;
					}
				}
			}

			if (collision)
			{
				const relativeIntersectY = paddleY - collisionY;
				const normalizedRelativeIntersection = Math.max(-1, Math.min(1, relativeIntersectY / (PADDLE_HEIGHT / 2)));
				const bounceAngle = normalizedRelativeIntersection * Math.PI / 4;

				const currentSpeed = Math.sqrt(gameState.ball.vx * gameState.ball.vx + gameState.ball.vy * gameState.ball.vy);
				const newSpeed = Math.min(currentSpeed * BALL_SPEED_INCREASE, BALL_MAX_SPEED);

				if (isLeftPaddle) 
				{
					gameState.ball.vx = Math.abs(newSpeed * Math.cos(bounceAngle));
					gameState.ball.vy = newSpeed * -Math.sin(bounceAngle);
					gameState.ball.x = paddleRight + BALL_RADIUS + 2;
				}
				else
				{
					gameState.ball.vx = -Math.abs(newSpeed * Math.cos(bounceAngle));
					gameState.ball.vy = newSpeed * -Math.sin(bounceAngle);
					gameState.ball.x = paddleLeft - BALL_RADIUS - 2;
				}
				gameState.ball.y = collisionY;

				return (true);
			}
			return (false);
		};

		const leftPaddleX = PADDLE_MARGIN;
		const rightPaddleX = WORLD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;

		checkPaddleCollision(leftPaddleX, gameState.leftPaddle.y, true);
		checkPaddleCollision(rightPaddleX, gameState.rightPaddle.y, false);

		//score
		if (gameState.ball.x - BALL_RADIUS <= 0) {
			gameState.score.right++;
			resetBall(true);
		}
		if (gameState.ball.x + BALL_RADIUS >= WORLD_WIDTH) {
			gameState.score.left++;
			resetBall(false);
		}
		
		if (gameState.score.left >= SCORE_TO_WIN || gameState.score.right >= SCORE_TO_WIN)
		{
			gameState.score.left = 0;
			gameState.score.right = 0;
			resetBall(true);
		}

	};

	const resetBall = (serveToLeft: boolean = Math.random() > 0.5) => {
		gameState.ball.x = WORLD_WIDTH / 2;
		gameState.ball.y = WORLD_HEIGHT / 2;

		const direction = serveToLeft ? -1 : 1;
		gameState.ball.vx = direction * BALL_INITIAL_SPEED;
		gameState.ball.vy = 0
	}

	let lastTime = performance.now();

	const gameLoop = (currentTime: number) => {
		const deltaTime = (currentTime - lastTime) / 30;
		lastTime = currentTime;

		update(deltaTime);
		render();

		animationId = requestAnimationFrame(gameLoop);
	}

	render();

	startBtn.addEventListener("click", () => {
			gameState.isPlaying = true;
			startBtn.classList.add("hidden");
			gameLoop(performance.now());
	})


	return () => {
		console.log("Cleanup");
		if (animationId) {
			cancelAnimationFrame(animationId);
		}
		window.removeEventListener('resize', handleResize);
		window.removeEventListener('keyup', handleKeyUp);
		window.removeEventListener('keydown', handleKeyDown);
	};
}
