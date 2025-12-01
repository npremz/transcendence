import type { ViewFunction } from "../router/types";
import { Pong } from "../components/PongGame/PongGame";
import { gsap } from "gsap";

export const GameView: ViewFunction = () => {
	return `
		<!-- Fond avec grille animée -->
		<div class="fixed inset-0 bg-black overflow-hidden">
			<!-- Grille de fond -->
			<div class="absolute inset-0" style="
				background-image: 
					linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
					linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
				background-size: 50px 50px;
				animation: gridMove 20s linear infinite;
			"></div>
			
			<style>
				@keyframes glitch {
					0%, 100% { transform: translate(0); }
					20% { transform: translate(-2px, 2px); }
					40% { transform: translate(-2px, -2px); }
					60% { transform: translate(2px, 2px); }
					80% { transform: translate(2px, -2px); }
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
			
			<!-- Scanline effect -->
			<div class="absolute inset-0 pointer-events-none opacity-10">
				<div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
			</div>

			<!-- Particules flottantes -->
			${Array.from({length: 30}, (_, i) => `
				<div 
					class="absolute bg-blue-400 rounded-full opacity-20"
					style="
						width: ${2 + Math.random() * 3}px;
						height: ${2 + Math.random() * 3}px;
						left: ${Math.random() * 100}%;
						top: ${Math.random() * 100}%;
						animation: float ${10 + Math.random() * 20}s ease-in-out ${Math.random() * 5}s infinite;
					"
				></div>
			`).join('')}

			<style>
				@keyframes float {
					0%, 100% { transform: translateY(0) translateX(0); }
					25% { transform: translateY(-20px) translateX(10px); }
					50% { transform: translateY(-10px) translateX(-10px); }
					75% { transform: translateY(-30px) translateX(5px); }
				}
			</style>
		</div>

		<!-- Contenu principal -->
		<div class="relative z-10 min-h-screen flex flex-col game-container">
			
			<!-- Header HUD -->
			<div class="game-hud border-b border-white/10">
				<div class="container mx-auto px-4 py-4">
					<div class="flex items-center justify-between">

						<!-- Center: Status indicator -->
						<div class="flex items-center gap-3">
							<div id="connection-indicator" class="status-indicator w-3 h-3 bg-green-400 rounded-full"></div>
							<span class="pixel-font text-sm text-blue-300">
								LIVE MATCH
							</span>
						</div>

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

			<!-- Game Area -->
			<div class="flex-1 flex items-center justify-center px-4 py-8">
				<div class="w-full max-w-[95vw]">
					
					<!-- Players Info Bar -->
					<div class="mb-6 grid grid-cols-3 gap-4 items-center">
						
						<!-- Player Left -->
						<div class="player-info neon-border bg-blue-500/5 backdrop-blur-sm rounded-lg p-4 relative">
							<div class="corner-decoration corner-decoration-blue corner-tl"></div>
							<div class="corner-decoration corner-decoration-blue corner-bl"></div>
							
							<div class="flex items-center gap-3">
								<div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center border-2 border-blue-500/50">
									<!-- PP du player -->
								</div>
								<div class="flex-1">
									<div id="player-left-name" class="pixel-font text-lg text-blue-500 mb-1">
										Player 1
									</div>
									<div class="flex items-center gap-2">
										<div class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
										<span class="pixel-font text-xs text-blue-300/60">READY</span>
									</div>
								</div>
							</div>
						</div>

						<!-- Center: VS -->
						<div class="text-center">
							<div class="inline-block neon-border bg-blue-500/10 backdrop-blur-sm rounded-lg px-6 py-3">
								<span class="pixel-font text-3xl text-blue-400" style="animation: neonPulse 2s ease-in-out infinite;">
									VS
								</span>
							</div>
						</div>

						<!-- Player Right -->
						<div class="player-info neon-border-red bg-red-500/5 backdrop-blur-sm rounded-lg p-4 relative">
							<div class="corner-decoration corner-decoration-red corner-tr"></div>
							<div class="corner-decoration corner-decoration-red corner-br"></div>
							
							<div class="flex items-center gap-3 justify-end">
								<div class="flex-1 text-right">
									<div id="player-right-name" class="pixel-font text-lg text-red-400 mb-1">
										Player 2
									</div>
									<div class="flex items-center gap-2 justify-end">
										<span class="pixel-font text-xs text-red-300/60">READY</span>
										<div class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
									</div>
								</div>
								<div class="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50">
									<!-- PP du player -->
								</div>
							</div>
						</div>
					</div>

					<!-- Canvas Container avec decorations -->
					<div class="relative">
						<!-- Corner decorations for canvas -->
						<div class="absolute -top-3 -left-3 w-8 h-8 border-l-2 border-t-2 border-blue-400/50"></div>
						<div class="absolute -top-3 -right-3 w-8 h-8 border-r-2 border-t-2 border-blue-400/50"></div>
						<div class="absolute -bottom-3 -left-3 w-8 h-8 border-l-2 border-b-2 border-blue-400/50"></div>
						<div class="absolute -bottom-3 -right-3 w-8 h-8 border-r-2 border-b-2 border-blue-400/50"></div>

						<!-- Pong Game Component -->
						<div data-component="pong-game">
							<canvas id="pong-canvas"></canvas>
						</div>
					</div>

					<!-- Controls Info -->
					<div class="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
						
						<!-- Left Player Controls -->
						<div class="neon-border bg-blue-500/5 backdrop-blur-sm rounded-lg p-4">
							<div class="pixel-font text-sm text-blue-300 mb-3 flex items-center gap-2">
								<span>PLAYER 1 CONTROLS</span>
							</div>
							<div class="space-y-2 pixel-font text-xs text-blue-300/60">
								<div class="flex items-center gap-2">
									<kbd class="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/30">W</kbd>
									<kbd class="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/30">S</kbd>
									<span>Move paddle</span>
								</div>
								<div class="flex items-center gap-2">
									<kbd class="px-3 py-1 bg-blue-500/20 rounded border border-blue-500/30">SPACE</kbd>
									<span>Use skill</span>
								</div>
								<div class="flex items-center gap-2">
									<kbd class="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/30">P</kbd>
									<kbd class="px-2 py-1 bg-blue-500/20 rounded border border-blue-500/30">ESC</kbd>
									<span>Pause</span>
								</div>
							</div>
						</div>

						<!-- Right Player Controls -->
						<div class="neon-border bg-red-500/5 backdrop-blur-sm rounded-lg p-4">
							<div class="pixel-font text-sm text-red-300 mb-3 flex items-center gap-2 justify-end">
								<span>PLAYER 2 CONTROLS</span>
							</div>
							<div class="space-y-2 pixel-font text-xs text-red-300/60 text-right">
								<div class="flex items-center gap-2 justify-end">
									<span>Move paddle</span>
									<kbd class="px-2 py-1 bg-red-500/20 rounded border border-red-500/30">↑</kbd>
									<kbd class="px-2 py-1 bg-red-500/20 rounded border border-red-500/30">↓</kbd>
								</div>
								<div class="flex items-center gap-2 justify-end">
									<span>Use skill</span>
									<kbd class="px-3 py-1 bg-red-500/20 rounded border border-red-500/30">ENTER</kbd>
								</div>
								<div class="flex items-center gap-2 justify-end">
									<span>Pause</span>
									<kbd class="px-2 py-1 bg-red-500/20 rounded border border-red-500/30">P</kbd>
									<kbd class="px-2 py-1 bg-red-500/20 rounded border border-red-500/30">ESC</kbd>
								</div>
							</div>
						</div>
					</div>

					<!-- Power-ups Legend -->
					<div class="mt-4 neon-border bg-green-300/5 backdrop-blur-sm rounded-lg p-4">
						<div class="pixel-font text-sm text-green-300 mb-3 text-center">
							⚡ POWER-UPS LEGEND
						</div>
						<div class="grid grid-cols-3 gap-4 pixel-font text-xs text-green-300/60">
							<div class="text-center">
								<div class="text-2xl mb-1">⚡</div>
								<div>SPLIT</div>
								<div class="text-green-300/40 text-[10px]">Duplicate ball</div>
							</div>
							<div class="text-center">
								<div class="text-2xl mb-1">🌑</div>
								<div>BLACKOUT</div>
								<div class="text-green-300/40 text-[10px]">Blind opponent</div>
							</div>
							<div class="text-center">
								<div class="text-2xl mb-1">🌀</div>
								<div>BLACKHOLE</div>
								<div class="text-green-300/40 text-[10px]">Gravity pull</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Footer HUD avec vraies stats -->
			<div class="game-hud border-t border-white/10">
				<div class="container mx-auto px-4 py-3">
					<div class="flex items-center justify-center gap-8 pixel-font text-xs text-blue-300/60">
						<div class="flex items-center gap-2">
							<div id="ws-indicator" class="w-2 h-2 bg-gray-400 rounded-full"></div>
							<span id="connection-status">CONNECTION: CONNECTING...</span>
						</div>
						<div>|</div>
						<div>PING: <span id="ping-value" class="stat-medium">--ms</span></div>
						<div>|</div>
						<div>FPS: <span id="fps-value" class="stat-good">--</span></div>
					</div>
				</div>
			</div>
		</div>
	`;
};
