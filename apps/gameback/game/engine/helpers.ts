export const clamp = (v: number, min: number, max: number) =>
	Math.max(min, Math.min(max, v));
export const length2 = (x: number, y: number) => Math.sqrt(x * x + y * y);
export const scheduleAfter = (now: number, min: number, rand: number) =>
	now + min + Math.random() * rand;