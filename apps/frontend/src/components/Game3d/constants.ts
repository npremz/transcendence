/**
 * Game3d Constants
 * 
 * These constants define the dimensions and properties of the 3D game world
 */

// Stadium dimensions (should match your stadium.gltf model)
export const STADIUM_WIDTH = 1920;
export const STADIUM_HEIGHT = 1080;

// Paddle dimensions
export const PADDLE_DEPTH = 100; // Z-axis size
export const PADDLE_WIDTH = 15;  // X-axis thickness

// Ball properties
export const BALL_DIAMETER = 30;
export const BALL_Y_POSITION = 15; // Height above ground

// Camera settings
export const CAMERA_INTRO_DURATION = 180; // frames at 60fps = 3 seconds
export const CAMERA_DEFAULT_ALPHA = Math.PI / 2;
export const CAMERA_DEFAULT_BETA = Math.PI / 3;
export const CAMERA_DEFAULT_RADIUS = 30;

// Positions
export const PADDLE_DISTANCE_FROM_CENTER = STADIUM_WIDTH / 2 - 50;


export const WORLD_3D = {
	WIDTH: 1920,
	HEIGHT: 1080,
	DEPTH: 500,
	CAMERA_DISTANCE: 1500
} as const;

export const PADDLE_3D = {
	START_POSX: 900,
	START_POSY: 15,
	START_POSZ: 0,
	X: 15,
	Y: 15,
	Z: 100,
	MARGIN: 30,
	SPEED: 800,
	SCALE_3D: 0.01
} as const;

export const BALL_3D = {
	START_POSX: 0,
	START_POSY: 15,
	START_POSZ: 0,
	DIAMETER: 30,
	SCALE_3D: 0.01,
} as const;

export const POWERUP_3D = {
	// cylinder
	RADIUS: 10,
	HEIGHT: 5,
} as const;

export const MATERIALS = {
	PADDLE_COLOR: '#5a5a5a',
	BALL_COLOR: '#FFFFFF',
	POWERUP_SPLIT: '#FFD700',
	POWERUP_BLACKOUT: '#1522da',
	POWERUP_BLACKHOLE: '#12012e',
	BORDER: '#3CFFE2',
	CABLE: '#ADFFE6',
	poleCylinder:'#2E2E2E',
	poleTop:'#00FFBC',
	poleMid:'#2E2E2E',
	poleBot:'#2E2E2E'
} as const;

export const CAMERA = {
	INITIAL_ALPHA: -Math.PI / 2,
	INITIAL_BETA: Math.PI / 3,
	INITIAL_RADIUS: 30,
	TARGET: {
		x: 0,
		y: 0,
		z: 0
	},
	MIN_RADIUS: 10,
	MAX_RADIUS: 400,
	ANIMATION : {
		START_ALPHA: Math.PI / 2,
		END_ALPHA: -Math.PI / 2,
		START_BETA: Math.PI / 6,
		END_BETA: Math.PI / 3,
		START_RADIUS: 80,
		END_RADIUS: 30,
		DURATION_FRAMES: 180
	},
	FPS_ALPHA: 0,
	FPS_BETA: Math.PI / 2.5,
	FPS_RADIUS: 20
} as const;
