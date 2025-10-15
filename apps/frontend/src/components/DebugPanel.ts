import type { Component } from "./types";
import type { PublicState } from "../net/wsClient";

export interface DebugPanelCallbacks {
    onActivatePowerUp: (type: 'split' | 'blackout' | 'blackhole' | 'random') => void;
    onClearPowerUps: () => void;
    onScoreChange: (side: 'left' | 'right', amount: number) => void;
    onResetScore: () => void;
    onSetScore: (left: number, right: number) => void;
    onBallControl: (action: 'add' | 'remove' | 'reset') => void;
    onBallSpeedControl: (action: 'multiply' | 'divide' | 'freeze') => void;
    onTimeControl: (action: 'slow' | 'fast' | 'normal') => void;
    onToggleOverlay: () => void;
    onChangeSkill: (side: 'left' | 'right', skill: 'smash' | 'dash') => void;
}

export class DebugPanel implements Component {
    private element: HTMLElement;
    private isOpen: boolean = false;
    private callbacks: DebugPanelCallbacks;
    private overlayVisible: boolean = false;
    private isFrozen: boolean = false;
    private timeScale: number = 1;

    private fps: number = 0;
    private particleCount: number = 0;
    private ballsData: Array<{ x: number; y: number; vx: number; vy: number }> = [];
    private activePowerUps: string[] = [];
    private skillCooldowns: { 
        left: number;
        right: number;
    } = { 
        left: 0,
        right: 0
    };
    private selectedSkills: {
        left: 'smash' | 'dash';
        right: 'smash' | 'dash';
    } = {
        left: 'smash',
        right: 'smash'
    };

    private listeners: Array<{ el: Element; handler: EventListener }> = [];
    private closeBtn?: Element;
    private closeHandler?: EventListener;
    private boundKeydown?: (e: KeyboardEvent) => void;
    private destroyed = false;

    private isDragging = false;
    private dragOffsetX = 0;
    private dragOffsetY = 0;
    private posX = 20;
    private posY = 20;

    constructor(element: HTMLElement, callbacks: DebugPanelCallbacks) {
        this.element = element;
        this.callbacks = callbacks;
        this.init();
    }

    private init(): void {
        this.render();
        this.attachEventListeners();
        this.startFPSCounter();
        this.setupDragging();

        this.boundKeydown = (e: KeyboardEvent) => {
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                this.toggle();
            }
        };
        window.addEventListener('keydown', this.boundKeydown);
    }

    private toggle(): void {
        this.isOpen = !this.isOpen;
        const panel = this.element.querySelector('.debug-panel') as HTMLElement;
        if (panel) {
            if (this.isOpen) {
                panel.classList.add('open');
            } else {
                panel.classList.remove('open');
            }
        }
    }

    public open(): void {
        this.isOpen = true;
        const panel = this.element.querySelector('.debug-panel') as HTMLElement;
        if (panel) {
            panel.classList.add('open');
        }
    }

    public close(): void {
        this.isOpen = false;
        const panel = this.element.querySelector('.debug-panel') as HTMLElement;
        if (panel) {
            panel.classList.remove('open');
        }
    }

    private startFPSCounter(): void {
        let lastTime = performance.now();
        let frames = 0;

        const updateFPS = () => {
            if (this.destroyed) return;
            frames++;
            const now = performance.now();

            if (now >= lastTime + 1000) {
                this.fps = Math.round((frames * 1000) / (now - lastTime));
                frames = 0;
                lastTime = now;
                this.updateOverlay();
            }
            requestAnimationFrame(updateFPS);
        };

        requestAnimationFrame(updateFPS);
    }

    public updateStats(state: PublicState, particleCount: number): void {
        this.particleCount = particleCount;
        this.ballsData = state.balls.map(b => ({
            x: Math.round(b.x),
            y: Math.round(b.y),
            vx: Math.round(b.vx),
            vy: Math.round(b.vy)
        }));

        this.activePowerUps = [];
        if (state.splitActive) this.activePowerUps.push('Split');
        if (state.blackoutLeft) this.activePowerUps.push('Blackout Left');
        if (state.blackoutRight) this.activePowerUps.push('Blackout Right');
        if (state.blackholeActive) this.activePowerUps.push('Blackhole');

        this.selectedSkills = {
            left: state.selectedSkills.left,
            right: state.selectedSkills.right
        };
        this.skillCooldowns = {
            left: state.skillStates.left.cooldownRemaining,
            right: state.skillStates.right.cooldownRemaining
        };

        this.updateOverlay();
    }

    private updateOverlay(): void {
        if (!this.overlayVisible) return;

        const overlay = this.element.querySelector('.debug-overlay') as HTMLElement;
        if (!overlay) return;

        const estimatedDrawCalls = this.ballsData.length * 3 +
            this.particleCount +
            this.activePowerUps.length * 10 +
            50; // Base UI elements

        overlay.innerHTML = `
            <div class="stat-line">FPS: <span class="stat-value">${this.fps}</span></div>
            <div class="stat-line">Particles: <span class="stat-value">${this.particleCount}</span></div>
            <div class="stat-line">Draw Calls: <span class="stat-value">~${estimatedDrawCalls}</span></div>
            <div class="stat-line">Time Scale: <span class="stat-value">${this.timeScale}x</span></div>
            
            <div class="stat-section">Balls (${this.ballsData.length}):</div>
            ${this.ballsData.map((b, i) => `
                <div class="stat-line small">
                    #${i + 1}: pos(${b.x}, ${b.y}) vel(${b.vx}, ${b.vy})
                </div>
            `).join('')}
            
            <div class="stat-section">Active Power-Ups:</div>
            ${this.activePowerUps.length > 0
                ? this.activePowerUps.map(p => `<div class="stat-line small">• ${p}</div>`).join('')
                : '<div class="stat-line small">None</div>'
            }
            
            <div class="stat-section">Skill Cooldowns:</div>
            <div class="stat-line small">Left (${this.selectedSkills.left}): ${this.skillCooldowns.left.toFixed(1)}s</div>
            <div class="stat-line small">Right (${this.selectedSkills.right}): ${this.skillCooldowns.right.toFixed(1)}s</div>
        `;
    }

    private render(): void {
        this.element.innerHTML = `
        <style>
            .debug-panel {
                position: fixed;
                top: 20px;
                left: 20px;
                width: 400px;
                max-height: 80vh;
                overflow-y: auto;
                background: rgba(10, 10, 30, 0.95);
                backdrop-filter: blur(10px);
                border: 2px solid rgba(100, 150, 255, 0.3);
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                z-index: 9999;
                display: none;
            }
            .debug-panel.open {
                display: block;
            }
            .debug-header {
                background: rgba(100, 150, 255, 0.2);
                padding: 12px 16px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: move;
                user-select: none;
            }
            .debug-title { font-size: 16px; font-weight: bold; color: #64B5F6; }
            .debug-close {
                background: rgba(255, 100, 100, 0.3);
                border: 1px solid rgba(255, 100, 100, 0.5);
                color: #fff;
                padding: 4px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                transition: all 0.2s;
            }
            .debug-section { padding: 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
            .debug-section:last-child { border-bottom: none; }
            .section-title { font-size: 14px; font-weight: bold; color: #90CAF9; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
            .debug-btn {
                background: rgba(100, 150, 255, 0.2);
                border: 1px solid rgba(100, 150, 255, 0.4);
                color: #fff;
                padding: 8px 14px;
                border-radius: 6px;
                cursor: pointer;
                font-size: 12px;
                font-family: 'Courier New', monospace;
                transition: all 0.2s;
                margin: 4px;
                display: inline-block;
            }
            .debug-btn:hover { background: rgba(100, 150, 255, 0.4); transform: translateY(-2px); box-shadow: 0 4px 12px rgba(100, 150, 255, 0.4); }
            .debug-btn:active { transform: translateY(0); }
            .debug-btn.danger { background: rgba(255, 100, 100, 0.2); border-color: rgba(255, 100, 100, 0.4); }
            .debug-btn.danger:hover { background: rgba(255, 100, 100, 0.4); box-shadow: 0 4px 12px rgba(255, 100, 100, 0.4); }
            .debug-btn.success { background: rgba(100, 255, 100, 0.2); border-color: rgba(100, 255, 100, 0.4); }
            .debug-btn.success:hover { background: rgba(100, 255, 100, 0.4); box-shadow: 0 4px 12px rgba(100, 255, 100, 0.4); }
            .debug-btn.small { padding: 6px 10px; font-size: 11px; }
            .debug-btn.active { background: rgba(100, 200, 255, 0.5); border-color: rgba(100, 200, 255, 0.8); box-shadow: 0 0 8px rgba(100, 200, 255, 0.6); }
            .btn-row { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
            .score-control { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
            .score-label { min-width: 50px; color: #90CAF9; }
            .skill-control { display: flex; align-items: center; gap: 8px; margin: 8px 0; }
            .skill-label { min-width: 80px; color: #90CAF9; font-weight: bold; }
            .debug-overlay {
                position: fixed;
                top: 20px;
                left: 20px;
                background: rgba(10, 10, 30, 0.9);
                backdrop-filter: blur(8px);
                border: 1px solid rgba(100, 150, 255, 0.3);
                border-radius: 8px;
                padding: 12px 16px;
                color: #fff;
                font-family: 'Courier New', monospace;
                font-size: 12px;
                z-index: 9998;
                display: none;
            }
            .stat-line { margin: 4px 0; color: #B0BEC5; }
            .stat-line.small { font-size: 11px; margin-left: 12px; color: #78909C; }
            .stat-value { color: #64B5F6; font-weight: bold; }
            .stat-section { margin-top: 12px; margin-bottom: 4px; color: #90CAF9; font-weight: bold; border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 8px; }
            .status-indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
            .status-indicator.active { background: #4CAF50; box-shadow: 0 0 8px #4CAF50; }
            .status-indicator.inactive { background: #666; }
        </style>

        <div class="debug-panel">
            <div class="debug-header">
                <div class="debug-title">DEBUG PANEL</div>
                <button class="debug-close" data-action="close">Close [M]</button>
            </div>

            <div class="debug-section">
                <div class="section-title">Power-Ups</div>
                <div class="btn-row">
                    <button class="debug-btn" data-action="activate-split">Activate Split</button>
                    <button class="debug-btn" data-action="activate-blackout">Activate Blackout</button>
                    <button class="debug-btn" data-action="activate-blackhole">Activate Blackhole</button>
                    <button class="debug-btn" data-action="activate-random">Activate Random</button>
                    <button class="debug-btn danger" data-action="clear-powerups">Clear All</button>
                </div>
            </div>

            <div class="debug-section">
                <div class="section-title">Score Control</div>
                <div class="score-control">
                    <span class="score-label">Left:</span>
                    <button class="debug-btn small" data-action="score-left-plus">+1</button>
                    <button class="debug-btn small" data-action="score-left-minus">-1</button>
                </div>
                <div class="score-control">
                    <span class="score-label">Right:</span>
                    <button class="debug-btn small" data-action="score-right-plus">+1</button>
                    <button class="debug-btn small" data-action="score-right-minus">-1</button>
                </div>
                <div class="btn-row">
                    <button class="debug-btn" data-action="reset-score">Reset (0-0)</button>
                    <button class="debug-btn" data-action="set-score-10">Set 10-10</button>
                </div>
            </div>

            <div class="debug-section">
                <div class="section-title">Ball Control</div>
                <div class="btn-row">
                    <button class="debug-btn success" data-action="ball-add">Add Ball</button>
                    <button class="debug-btn danger" data-action="ball-remove">Remove Ball</button>
                    <button class="debug-btn" data-action="ball-reset">Reset to 1</button>
                </div>
                <div class="btn-row" style="margin-top: 8px;">
                    <button class="debug-btn" data-action="ball-speed-multiply">Speed x2</button>
                    <button class="debug-btn" data-action="ball-speed-divide">Speed /2</button>
                    <button class="debug-btn" data-action="ball-freeze">
                        <span class="status-indicator inactive" data-freeze-indicator></span>
                        Freeze
                    </button>
                </div>
            </div>

            <div class="debug-section">
                <div class="section-title">Time Control</div>
                <div class="btn-row">
                    <button class="debug-btn" data-action="time-slow">Slow (0.5x)</button>
                    <button class="debug-btn" data-action="time-fast">Fast (2x)</button>
                    <button class="debug-btn success" data-action="time-normal">Normal (1x)</button>
                </div>
            </div>

            <div class="debug-section">
                <div class="section-title">Skills</div>
                <div class="skill-control">
                    <span class="skill-label">Left Player:</span>
                    <button class="debug-btn small" data-action="skill-left-smash" data-skill-left-smash>Smash</button>
                    <button class="debug-btn small" data-action="skill-left-dash" data-skill-left-dash>Dash</button>
                </div>
                <div class="skill-control">
                    <span class="skill-label">Right Player:</span>
                    <button class="debug-btn small" data-action="skill-right-smash" data-skill-right-smash>Smash</button>
                    <button class="debug-btn small" data-action="skill-right-dash" data-skill-right-dash>Dash</button>
                </div>
            </div>

            <div class="debug-section">
                <div class="section-title">Debug Overlay</div>
                <button class="debug-btn" data-action="toggle-overlay">
                    <span class="status-indicator inactive" data-overlay-indicator></span>
                    Toggle Stats HUD
                </button>
            </div>
        </div>

        <div class="debug-overlay"></div>
        `;
    }


    private attachEventListeners(): void {
        // Fermeture du panel
        const closeBtn = this.element.querySelector('[data-action="close"]');
        closeBtn?.addEventListener('click', () => this.toggle());

        // Power-Ups
        this.addListener('activate-split', () => this.callbacks.onActivatePowerUp('split'));
        this.addListener('activate-blackout', () => this.callbacks.onActivatePowerUp('blackout'));
        this.addListener('activate-blackhole', () => this.callbacks.onActivatePowerUp('blackhole'));
        this.addListener('activate-random', () => this.callbacks.onActivatePowerUp('random'));
        this.addListener('clear-powerups', () => this.callbacks.onClearPowerUps());

        // Score
        this.addListener('score-left-plus', () => this.callbacks.onScoreChange('left', 1));
        this.addListener('score-left-minus', () => this.callbacks.onScoreChange('left', -1));
        this.addListener('score-right-plus', () => this.callbacks.onScoreChange('right', 1));
        this.addListener('score-right-minus', () => this.callbacks.onScoreChange('right', -1));
        this.addListener('reset-score', () => this.callbacks.onResetScore());
        this.addListener('set-score-10', () => this.callbacks.onSetScore(10, 10));

        // Balls
        this.addListener('ball-add', () => this.callbacks.onBallControl('add'));
        this.addListener('ball-remove', () => this.callbacks.onBallControl('remove'));
        this.addListener('ball-reset', () => this.callbacks.onBallControl('reset'));
        this.addListener('ball-speed-multiply', () => this.callbacks.onBallSpeedControl('multiply'));
        this.addListener('ball-speed-divide', () => this.callbacks.onBallSpeedControl('divide'));
        this.addListener('ball-freeze', () => {
            this.callbacks.onBallSpeedControl('freeze');
            this.isFrozen = !this.isFrozen;
            this.updateFreezeIndicator();
        });

        // Time
        this.addListener('time-slow', () => {
            this.callbacks.onTimeControl('slow');
            this.timeScale = 0.5;
        });
        this.addListener('time-fast', () => {
            this.callbacks.onTimeControl('fast');
            this.timeScale = 2;
        });
        this.addListener('time-normal', () => {
            this.callbacks.onTimeControl('normal');
            this.timeScale = 1;
        });

        // Overlay
        this.addListener('toggle-overlay', () => {
            this.callbacks.onToggleOverlay();
            this.overlayVisible = !this.overlayVisible;
            this.updateOverlayIndicator();

            const overlay = this.element.querySelector('.debug-overlay') as HTMLElement;
            if (overlay) {
                overlay.style.display = this.overlayVisible ? 'block' : 'none';
            }
        });

        // Skills
        this.addListener('skill-left-smash', () => {
            this.callbacks.onChangeSkill('left', 'smash');
            this.updateSkillButtons();
        });
        this.addListener('skill-left-dash', () => {
            this.callbacks.onChangeSkill('left', 'dash');
            this.updateSkillButtons();
        });
        this.addListener('skill-right-smash', () => {
            this.callbacks.onChangeSkill('right', 'smash');
            this.updateSkillButtons();
        });
        this.addListener('skill-right-dash', () => {
            this.callbacks.onChangeSkill('right', 'dash');
            this.updateSkillButtons();
        });

        this.updateSkillButtons();
    }

    private addListener(action: string, callback: () => void): void {
        const el = this.element.querySelector(`[data-action="${action}"]`);
        if (!el) return;

        const handler = (() => callback()) as EventListener;
        el.addEventListener('click', handler);
        this.listeners.push({ el, handler });
    }

    private updateFreezeIndicator(): void {
        const indicator = this.element.querySelector('[data-freeze-indicator]');
        if (indicator) {
            indicator.className = `status-indicator ${this.isFrozen ? 'active' : 'inactive'}`;
        }
    }

    private updateOverlayIndicator(): void {
        const indicator = this.element.querySelector('[data-overlay-indicator]');
        if (indicator) {
            indicator.className = `status-indicator ${this.overlayVisible ? 'active' : 'inactive'}`;
        }
    }

    private updateSkillButtons(): void {
        const leftSmash = this.element.querySelector('[data-skill-left-smash]');
        const leftDash = this.element.querySelector('[data-skill-left-dash]');
        const rightSmash = this.element.querySelector('[data-skill-right-smash]');
        const rightDash = this.element.querySelector('[data-skill-right-dash]');

        if (leftSmash && leftDash) {
            leftSmash.classList.toggle('active', this.selectedSkills.left === 'smash');
            leftDash.classList.toggle('active', this.selectedSkills.left === 'dash');
        }

        if (rightSmash && rightDash) {
            rightSmash.classList.toggle('active', this.selectedSkills.right === 'smash');
            rightDash.classList.toggle('active', this.selectedSkills.right === 'dash');
        }
    }

    private setupDragging(): void {
        const header = this.element.querySelector('.debug-header') as HTMLElement;
        const panel = this.element.querySelector('.debug-panel') as HTMLElement;
        if (!header || !panel) return;

        const onMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).classList.contains('debug-close')) return;
            
            this.isDragging = true;
            const rect = panel.getBoundingClientRect();
            this.dragOffsetX = e.clientX - rect.left;
            this.dragOffsetY = e.clientY - rect.top;
            
            header.style.cursor = 'grabbing';
        };

        const onMouseMove = (e: MouseEvent) => {
            if (!this.isDragging) return;

            this.posX = e.clientX - this.dragOffsetX;
            this.posY = e.clientY - this.dragOffsetY;

            this.posX = Math.max(0, Math.min(window.innerWidth - panel.offsetWidth, this.posX));
            this.posY = Math.max(0, Math.min(window.innerHeight - 100, this.posY));

            panel.style.left = `${this.posX}px`;
            panel.style.top = `${this.posY}px`;
        };

        const onMouseUp = () => {
            this.isDragging = false;
            header.style.cursor = 'move';
        };

        header.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);

        this.listeners.push(
            { el: header, handler: onMouseDown as EventListener },
            { el: window as any, handler: onMouseMove as EventListener },
            { el: window as any, handler: onMouseUp as EventListener }
        );
    }

    cleanup(): void {
        this.destroyed = true;

        for (const { el, handler } of this.listeners) {
            el.removeEventListener('click', handler);
        }
        this.listeners = [];

        if (this.closeBtn && this.closeHandler) {
            this.closeBtn.removeEventListener('click', this.closeHandler);
            this.closeBtn = undefined;
            this.closeHandler = undefined;
        }

        if (this.boundKeydown) {
            window.removeEventListener('keydown', this.boundKeydown);
            this.boundKeydown = undefined;
        }

        this.element.innerHTML = '';
    }
}
