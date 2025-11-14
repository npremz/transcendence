import { BALL_3D } from "../constants";

export function ballConverter2DXto3DX(x2d: number): number {
	return (x2d - 1920 / 2) * BALL_3D.SCALE_3D;
}

export function ballConverter2DYto3DZ (y2d: number): number {
	return -(y2d - 1080 / 2) * BALL_3D.SCALE_3D;
}

// could change later
export function powerUpConverter2DXto3DX(x2d: number): number {
	return (x2d - 1920 / 2) * BALL_3D.SCALE_3D;
}

export function powerUpConverter2DYto3DZ (y2d: number): number {
	return -(y2d - 1080 / 2) * BALL_3D.SCALE_3D;
}
