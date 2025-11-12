import type { PublicState } from "../../net/wsClient";
import type { WSClient } from "../../net/wsClient";
import { WORLD_HEIGHT, WORLD_WIDTH, PADDLE_MARGIN, PADDLE_WIDTH, PADDLE_HEIGHT } from "./constants";

type Side = 'left' | 'right';

export class PongAI {
  private getState: () => PublicState;
  private side: Side;
  private intervalMs: number;
  private timer: number | null = null;
  private ws: WSClient;
  private prev = { up: false, down: false };
  private deadZone: number; // pixels
  private hysteresis: number; // pixels beyond deadZone to reverse
  private minHoldTicks: number; // min ticks to hold direction
  private lastCmd: 'up' | 'down' | 'none' = 'none';
  private holdTicks = 0;
  private releaseTimer: number | null = null;
  private decisionSeq = 0;

  constructor(getState: () => PublicState, side: Side, ws: WSClient, options?: { hz?: number; deadZone?: number; hysteresis?: number; minHoldTicks?: number }) {
    this.getState = getState;
    this.side = side;
    this.ws = ws;
    const hz = Math.max(1, Math.min(60, Math.floor(options?.hz ?? 1)));
    this.intervalMs = Math.floor(1000 / hz);
    this.deadZone = Math.max(4, Math.floor(options?.deadZone ?? 16));
    this.hysteresis = Math.max(6, Math.floor(options?.hysteresis ?? 20));
    this.minHoldTicks = Math.max(0, Math.floor(options?.minHoldTicks ?? 1));
  }

  start(): void {
    if (this.timer !== null) return;
    this.timer = setInterval(() => this.step(), this.intervalMs) as unknown as number;
  }

  stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.send(false, false);
  }

  private step(): void {
    const state = this.getState();
    const paddleY = this.side === 'left' ? state.leftPaddle.y : state.rightPaddle.y;
    const paddleSpeed = this.side === 'left' ? state.leftPaddle.speed : state.rightPaddle.speed;

    // Choose the ball to react to: prefer one moving towards us with minimal time to intercept
    const balls = state.balls;
    if (balls.length === 0) {
      this.applyDecision('none', 0, 0);
      return;
    }

    const targetX = this.side === 'left'
      ? PADDLE_MARGIN + PADDLE_WIDTH
      : WORLD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH;

    const candidates = balls
      .map(b => {
        const dx = targetX - b.x;
        const t = b.vx !== 0 ? dx / b.vx : Number.POSITIVE_INFINITY; // time to reach our paddle x
        return { b, t };
      })
      .filter(({ b, t }) => {
        // Keep only balls moving towards our side (positive time)
        return t > 0;
      });

    const chosen = (candidates.length > 0)
      ? candidates.reduce((best, cur) => (cur.t < best.t ? cur : best))
      : null;

    // If no ball is moving towards us, drift to center
    const targetY = chosen ? this.predictYAtTime(chosen.b.y, chosen.b.vy, chosen.b.radius, chosen.t)
                           : WORLD_HEIGHT / 2;

    const diff = targetY - paddleY;
    const absDiff = Math.abs(diff);

    // Dynamic margin: wait more when intercept is far in time, avoid chasing too early.
    const t = chosen?.t ?? 0;
    const reaction = this.intervalMs / 1000; // seconds
    const guard = Math.max(this.deadZone, 0.25 * PADDLE_HEIGHT);
    const timeBand = Math.max(0, Math.min(0.4, t * 0.3));
    const distWeCanCorrectNextTick = paddleSpeed * reaction * 0.35;
    const dynamicMargin = Math.max(guard, Math.min(distWeCanCorrectNextTick, paddleSpeed * timeBand));

    const desired: 'up' | 'down' | 'none' = absDiff <= dynamicMargin
      ? 'none'
      : (diff < 0 ? 'up' : 'down');

    this.applyDecision(desired, absDiff, paddleSpeed, t);
  }

  // Predict Y coordinate after time t with wall reflections (top/bottom), given current y, vy, and radius
  private predictYAtTime(y: number, vy: number, radius: number, t: number): number {
    const top = radius;
    const bottom = WORLD_HEIGHT - radius;
    const span = bottom - top;
    if (span <= 0) return y; // degenerate

    const yRaw = y + vy * t;
    const period = 2 * span;
    let m = (yRaw - top) % period;
    if (m < 0) m += period;
    const reflected = (m <= span) ? (top + m) : (top + (period - m));
    return reflected;
  }

  private send(up: boolean, down: boolean): void {
    if (up === this.prev.up && down === this.prev.down) return;
    this.prev = { up, down };
    this.ws.sendInput(up, down);
  }

  private applyDecision(desired: 'up' | 'down' | 'none', absDiff: number, paddleSpeed: number, timeToIntercept: number = 0): void {
    let cmd: 'up' | 'down' | 'none' = desired;

    if (desired === 'none') {
      cmd = 'none';
    } else if (this.lastCmd === 'none') {
      cmd = desired;
    } else if (desired !== this.lastCmd) {
      if (absDiff < this.deadZone + this.hysteresis || this.holdTicks < this.minHoldTicks) {
        cmd = this.lastCmd; // avoid rapid reversals
      }
    } else {
      cmd = this.lastCmd;
    }

    if (cmd !== this.lastCmd) {
      this.holdTicks = 0;
      this.lastCmd = cmd;
    } else {
      this.holdTicks++;
    }

    // Cancel previous scheduled release
    if (this.releaseTimer !== null) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    // Emit command and schedule a timed release to avoid full-sweep overshoot at 1 Hz
    if (cmd === 'none') {
      this.send(false, false);
      return;
    }

    const seq = ++this.decisionSeq;
    if (cmd === 'up') {
      this.send(true, false);
    } else {
      this.send(false, true);
    }

    // Estimate hold time proportional to distance to cover, capped within the tick interval
    const estMs = paddleSpeed > 1 ? Math.round((absDiff / paddleSpeed) * 1000) : this.intervalMs;
    const holdMs = Math.max(120, Math.min(this.intervalMs - 40, Math.floor(estMs * 0.9)));
    this.releaseTimer = window.setTimeout(() => {
      if (seq === this.decisionSeq) {
        this.send(false, false);
      }
    }, holdMs) as unknown as number;
  }
}
