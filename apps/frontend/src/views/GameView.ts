import type { ViewFunction } from "../router/types";

export const GameView: ViewFunction = () => {
	return `
		<div class="container ml-auto mr-auto">
			<canvas id="pong-canvas"></canvas>
		</div>
	`;
};

export const gameLogic = () => {
	const canvas = document.getElementById('pong-canvas') as HTMLCanvasElement;

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
	const BALL_RADIUS = 10;
    const BALL_INITIAL_SPEED = 300;

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

		gameStatus: 'playing'
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
	};

	const update = (deltaTime: number) => {

		deltaTime = Math.min(deltaTime, 1/30);

		gameState.leftPaddle.y += gameState.leftPaddle.intention * PADDLE_SPEED * deltaTime;
		gameState.rightPaddle.y += gameState.rightPaddle.intention * PADDLE_SPEED * deltaTime;

		const halfPaddle = PADDLE_HEIGHT / 2;
		gameState.leftPaddle.y = Math.max(halfPaddle, Math.min(WORLD_HEIGHT - halfPaddle, gameState.leftPaddle.y));
        gameState.rightPaddle.y = Math.max(halfPaddle, Math.min(WORLD_HEIGHT - halfPaddle, gameState.rightPaddle.y));

		gameState.ball.x += gameState.ball.vx * deltaTime;
		gameState.ball.y += gameState.ball.vy * deltaTime;

		if (gameState.ball.x < 0 || gameState.ball.x > WORLD_WIDTH)
		{
			gameState.ball.x = WORLD_WIDTH / 2;
			gameState.ball.y = WORLD_HEIGHT / 2;
		}
	};

	let lastTime = performance.now();

	const gameLoop = (currentTime: number) => {
		const deltaTime = (currentTime - lastTime) / 1000;
		lastTime = currentTime;

		update(deltaTime);
		render();

		animationId = requestAnimationFrame(gameLoop);
	}

	gameLoop(performance.now());

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
