export const WORLD_WIDTH = 1920
export const WORLD_HEIGHT = 1080;

export const PADDLE_WIDTH = 15;
export const PADDLE_HEIGHT = 100;
export const PADDLE_MARGIN = 30;
export const PADDLE_SPEED = 400;
export const PADDLE_SPEED_INCREASE = 1.05;
export const PADDLE_MAX_SPEED = 1600;
export const PADDLE_TO_BALL_SPEED_RATIO = 0.6;


export const BALL_RADIUS = 15;
export const BALL_INITIAL_SPEED = 600;
export const BALL_SPEED_INCREASE = 1.05;
export const BALL_MAX_SPEED = 1500;
export const MAX_BOUNCE_DEG = 45;

export const SCORE_TO_WIN = 11;

export const POWERUP_RADIUS = 55;
// export const POWERUP_MIN_DELAY_SEC = 6;
// export const POWERUP_EXTRA_RANDOM_SEC = 6;
export const POWERUP_MIN_DELAY_SEC = 2; // DEV
export const POWERUP_EXTRA_RANDOM_SEC = 2; // DEV
export const POWERUP_LIFETIME_SEC = 9;
export const POWERUP_MAX_ON_SCREEN = 5;

export const MAX_BALLS_ON_FIELD = 10;
export const SPLIT_DURATION_SEC = 10;
export const SPLIT_SPAWN_PER_PICKUP = 1;
export const SPLIT_SPREAD_DEG = 20;

export const BLACKOUT_DURATION_SEC = 5;
export const BLACKOUT_FADE_DURATION_SEC = 0.5;

export const BLACKHOLE_DURATION_SEC = 8;
export const BLACKHOLE_PULL = 400;
export const BLACKHOLE_SWIRL = 1;

export const SMASH_COOLDOWN = 3;
export const SMASH_TIMING_WINDOW = 0.2;
export const SMASH_SPEED_MULTIPLIER = 1.2;
export const SMASH_ANIM_DURATION = 0.12;

export const DASH_COOLDOWN = 5;
export const DASH_DURATION = 0.3;
export const DASH_SPEED = 2000;

export const SERVER_TICK_HZ = 240;
export const SERVER_DT = 1 / SERVER_TICK_HZ;
export const BROADCAST_HZ = 60;
export const TIMEOUT_MS = 30000;
