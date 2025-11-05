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
