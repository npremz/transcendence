export function renderAuthControls(): string {
	return `
		<div class="flex items-center justify-end" data-auth-container>
			
			<a 
				href="/login"
				class="hidden relative group px-6 py-2 overflow-hidden rounded bg-blue-600 font-bold text-white transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 neon-border"
				data-auth-guest
			>
				<span class="relative z-10 pixel-font text-xs tracking-widest">LOGIN</span>
			</a>

			<div 
				class="hidden flex items-center gap-4"
				data-auth-user
			>
				<a 
					href="/dashboard" 
					class="flex items-center gap-3 bg-[#0a0a1f]/60 hover:bg-[#1a1a3f]/80 border border-blue-500/30 px-3 py-1.5 rounded-lg transition-all group backdrop-blur-sm"
					title="Mon Dashboard"
				>
					<div class="relative w-8 h-8">
						<img 
							src="/sprites/cat.gif" 
							alt="Avatar"
							class="w-full h-full rounded-full object-cover border border-blue-400/50 group-hover:border-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.2)] transition-all"
							style="image-rendering: pixelated;"
							data-auth-avatar
						/>
					</div>
					
					<div 
						class="pixel-font text-xs text-blue-200 group-hover:text-white transition-colors tracking-wide max-w-[120px] truncate" 
						data-auth-username
					>
						PLAYER
					</div>
				</a>

				<button 
					type="button"
					class="pixel-font text-[10px] tracking-wider text-red-400 hover:text-white bg-red-950/30 hover:bg-red-600/80 border border-red-500/30 hover:border-red-500 px-3 py-2 rounded transition-all shadow-sm hover:shadow-[0_0_10px_rgba(239,68,68,0.4)]"
					data-auth-logout
				>
					LOGOUT
				</button>
			</div>
		</div>
	`;
}
