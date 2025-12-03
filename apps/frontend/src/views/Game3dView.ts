import type { ViewFunction } from "../router/types";

export const Game3dView: ViewFunction = () => {

	return `
		<div class="fixed inset-0 w-full h-full" data-component="game3d">
			<!-- Header HUD -->
			<div class="game-hud border-b border-white/10">
				<div class="container mx-auto px-4 py-4">
					<div class="flex items-center justify-between gap-4">

						<!-- Player 1 -->
						<div class="flex items-center gap-3">
							<div class="w-10 h-10 rounded-full overflow-hidden border-2 border-blue-500/50">
								<img 
									src="/sprites/cat.gif" 
									alt="Player 1" 
									class="w-full h-full object-cover"
									style="image-rendering: pixelated;"
									id="player-left-avatar"
								/>
							</div>
							<div id="player-left-name" class="text-xl font-bold text-white drop-shadow-lg">Player 1</div>
						</div>

						<!-- Center: Status indicator -->
						<div class="flex items-center gap-3">
							<div id="connection-indicator" class="status-indicator w-3 h-3 bg-green-400 rounded-full"></div>
							<span class="pixel-font text-sm text-blue-300">
								LIVE MATCH
							</span>
						</div>

						<!-- Player 2 -->
						<div class="flex items-center gap-3">
							<div id="player-right-name" class="text-xl font-bold text-white drop-shadow-lg">Player 2</div>
							<div class="w-10 h-10 rounded-full overflow-hidden border-2 border-red-500/50">
								<img 
									src="/sprites/cat.gif" 
									alt="Player 2" 
									class="w-full h-full object-cover"
									style="image-rendering: pixelated;"
									id="player-right-avatar"
								/>
							</div>
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

			<!-- Camera View Indicator -->
			<div class="absolute bottom-4 right-4 px-3 py-2 bg-black/50 text-white text-sm rounded pointer-events-none">
				Press <span class="font-bold text-cyan-400">V</span> to toggle camera view
			</div>
		</div>
	`;
}
