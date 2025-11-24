import { Game3DEngine } from './core/game3DEngine';

interface Game3DConfig {
	wsURL?: string;
	roomId?: string;
}

export class Game3D {
	private canvas: HTMLCanvasElement;
	private gameEngine?: Game3DEngine;
	private config: Game3DConfig;

	constructor(element: HTMLElement) {
		console.log('[game3d] initializing...');

		//CANVAS
		const canvasElem = element.querySelector('#game3d-canvas') as HTMLCanvasElement;
		if (!canvasElem) throw new Error('[game3d] error: canvas not found');
		this.canvas = canvasElem;
		this.config = this.getConfiguration();
		this.initalizeEngine();
	}

	private initalizeEngine(): void {
		try {
			this.gameEngine = new Game3DEngine(this.canvas);
			this.gameEngine.start();
		} catch (error) {
			this.showError('Failed to initialize 3D game. Please refresh the page.');
		}

	}

	private getConfiguration(): Game3DConfig {
		const storedUrl = sessionStorage.getItem('gameWsURL');
		let findRoomId = null;
		if (!storedUrl) {
			const host = import.meta.env.VITE_HOST;
			const endpoint = import.meta.env.VITE_GAME_ENDPOINT;
			findRoomId = window.location.pathname.split('/').pop();
			const fallbackUrl = host && endpoint && findRoomId ? `wss://${host}${endpoint}/${findRoomId}` : undefined;
			return {
				wsURL: fallbackUrl || undefined,
				roomId: findRoomId || undefined
			};
		}
		return {
			wsURL: storedUrl ? storedUrl : undefined,
			roomId: findRoomId || undefined
		};
	}
	
	//todo verify if its ok to use the innerHtml
	private showError(message: string): void {
		const overlay = document.createElement('div');
		overlay.className = 'fixed inset-0 bg-black/80 flex items-center justify-center z-50';
		overlay.innerHTML = `
			<div class="bg-red-900/50 border-2 border-red-500 rounded-lg p-8 text-center max-w-md">
				<h2 class="text-2xl font-bold text-red-400 mb-4">Error</h2>
				<p class="text-white mb-6">${message}</p>
				<button 
					onclick="window.location.reload()" 
					class="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold"
				>
					Reload Page
				</button>
			</div>
		`;
		document.body.appendChild(overlay);
	}

	public cleanup(): void {
		console.log('[game3d] disposing...');
		if (this.gameEngine) {
			this.gameEngine.dispose();
			this.gameEngine = null as any;
		}
		sessionStorage.removeItem('gameWsURL');
	}
}


export function Game3dComponent(): string {
	
	return `
		<style>
			@keyframes gridMove {
				0% { transform: translateY(0); }
				100% { transform: translateY(50px); }
			}
			
			@keyframes neonPulse {
				0%, 100% { 
					text-shadow: 
						0 0 10px rgba(59, 130, 246, 0.8),
						0 0 20px rgba(59, 130, 246, 0.6),
						0 0 30px rgba(59, 130, 246, 0.4);
				}
				50% { 
					text-shadow: 
						0 0 20px rgba(59, 130, 246, 1),
						0 0 30px rgba(59, 130, 246, 0.8),
						0 0 40px rgba(59, 130, 246, 0.6);
				}
			}
			
			@keyframes scanline {
				0% { transform: translateY(-100%); }
				100% { transform: translateY(100vh); }
			}

			@keyframes glitch {
				0%, 100% { transform: translate(0); }
				20% { transform: translate(-2px, 2px); }
				40% { transform: translate(-2px, -2px); }
				60% { transform: translate(2px, 2px); }
				80% { transform: translate(2px, -2px); }
			}
			
			.pixel-font {
				font-family: 'Courier New', monospace;
				font-weight: bold;
				letter-spacing: 0.1em;
			}
			
			.neon-border {
				box-shadow: 
					0 0 10px rgba(59, 130, 246, 0.5),
					inset 0 0 10px rgba(59, 130, 246, 0.2);
				border: 3px solid rgba(59, 130, 246, 0.8);
			}

			.neon-border-green {
				box-shadow: 
					0 0 10px rgba(34, 197, 94, 0.5),
					inset 0 0 10px rgba(34, 197, 94, 0.2);
				border: 3px solid rgba(34, 197, 94, 0.8);
			}

			.neon-border-red {
				box-shadow: 
					0 0 10px rgba(239, 68, 68, 0.5),
					inset 0 0 10px rgba(239, 68, 68, 0.2);
				border: 3px solid rgba(239, 68, 68, 0.8);
			}

			.game-hud {
				background: rgba(4, 7, 26, 0.85);
				backdrop-filter: blur(10px);
			}

			.player-info {
				transition: all 0.3s ease;
			}

			.player-info:hover {
				transform: translateY(-2px);
			}

			#pong-canvas {
				box-shadow: 
					0 0 30px rgba(59, 130, 246, 0.4),
					0 0 60px rgba(59, 130, 246, 0.2),
					inset 0 0 30px rgba(59, 130, 246, 0.1);
				border: 3px solid rgba(59, 130, 246, 0.6);
			}

			.action-button {
				transition: all 0.2s ease;
				position: relative;
				overflow: hidden;
			}

			.action-button::before {
				content: '';
				position: absolute;
				top: 50%;
				left: 50%;
				width: 0;
				height: 0;
				border-radius: 50%;
				background: rgba(255, 255, 255, 0.1);
				transform: translate(-50%, -50%);
				transition: width 0.6s, height 0.6s;
			}

			.action-button:hover::before {
				width: 300px;
				height: 300px;
			}

			.action-button:active {
				transform: scale(0.95);
			}

			.forfeit-button:hover {
				box-shadow: 
					0 0 20px rgba(239, 68, 68, 0.6),
					inset 0 0 20px rgba(239, 68, 68, 0.3);
			}

			.status-indicator {
				animation: neonPulse 2s ease-in-out infinite;
			}

			.game-container {
				animation: fadeIn 0.8s ease-out;
			}

			@keyframes fadeIn {
				from { opacity: 0; transform: scale(0.95); }
				to { opacity: 1; transform: scale(1); }
			}

			.corner-decoration {
				position: absolute;
				width: 20px;
				height: 20px;
			}

			.corner-decoration-blue {
				border: 2px solid rgba(59, 130, 246, 0.5);
			}

			.corner-decoration-green {
				border: 2px solid rgba(34, 197, 94, 0.5);
			}

			.corner-decoration-red {
				border: 2px solid rgba(239, 68, 68, 0.5);
			}

			.corner-tl { top: -2px; left: -2px; border-right: none; border-bottom: none; }
			.corner-tr { top: -2px; right: -2px; border-left: none; border-bottom: none; }
			.corner-bl { bottom: -2px; left: -2px; border-right: none; border-top: none; }
			.corner-br { bottom: -2px; right: -2px; border-left: none; border-top: none; }

			.stat-good { color: #4ade80; }
			.stat-medium { color: #fbbf24; }
			.stat-bad { color: #ef4444; }
		</style>
		<div class="fixed inset-0 w-full h-full" data-component="game3d">

			<!-- Header HUD -->
			<div class="game-hud border-b border-white/10">
				<div class="container mx-auto px-4 py-4">
					<div class="flex items-center justify-between gap-4">
						<!-- Left: Back button -->
						<button 
							onclick="history.back()" 
							class="action-button pixel-font px-4 py-2 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all text-sm"
							id="back-button"
						>
							<span class="relative z-10">← EXIT</span>
						</button>

							<!-- Player 1 Name -->
						<div id="player-left-name" class="text-xl font-bold text-white drop-shadow-lg mx-4">Player 1</div>

						<!-- Center: Status indicator -->
						<div class="flex items-center gap-3">
							<div id="connection-indicator" class="status-indicator w-3 h-3 bg-green-400 rounded-full"></div>
							<span class="pixel-font text-sm text-blue-300">
								LIVE MATCH
							</span>
						</div>

							<!-- Player 2 Name -->
						<div id="player-right-name" class="text-xl font-bold text-white drop-shadow-lg mx-4">Player 2</div>

						<!-- Right: Forfeit button (si pas mode local) -->
						<button 
							id="forfeit-btn"
							class="action-button forfeit-button pixel-font px-4 py-2 neon-border-red bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all text-sm relative z-10"
						>
							<span class="relative z-10">🏳️ SURRENDER</span>
						</button>
					</div>
				</div>
			</div>

			<canvas id="game3d-canvas" class="w-full h-full block"></canvas>
			
				<!-- skill indicator -->
			<div id="game3d-ui-skill">
				<div id="game3d-skill-container" class="fixed left-1/2 bottom-6 transform -translate-x-1/2 z-50 pointer-events-none">
					<div class="flex flex-col items-center">
						<div id="skill-wrapper" class="skillLoader" aria-hidden="true"></div>
						<div id="skill-cooldown" class="mt-2 text-white/90 text-sm select-none">Skill cooldown</div>
					</div>
				</div>
			</div>
			<style id="game3d-ui-styles">
				:root {
					--skill-gradient-color: #00e676;
				}

				.skillLoader {
					width: 120px;
					height: 60px;
					border-radius: 200px 200px 0 0;
					-webkit-mask: repeating-radial-gradient(farthest-side at bottom ,#0000 0,#000 1px 12%,#0000 calc(12% + 1px) 20%);
					background: radial-gradient(farthest-side at bottom, var(--skill-gradient-color) 0 95%,#0000 0) bottom/0% 0% no-repeat #ddd;
					background-size: 100% 100%;
				}
			</style>

			<!-- Camera View Indicator -->
			<div class="absolute bottom-4 right-4 px-3 py-2 bg-black/50 text-white text-sm rounded pointer-events-none">
				Press <span class="font-bold text-cyan-400">V</span> to toggle camera view
			</div>
			<!-- Global Css -->
			<style>
				@keyframes fadeIn {
				from {
					opacity: 0;
					transform: scale(0.9);
				}
				to {
					opacity: 1;
					transform: scale(1);
				}
				}
				.animate-fade-in {
					animation: fadeIn 0.3s ease-out;
				}
			</style>
		</div>
	`;
}
