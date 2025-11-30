export function renderAuthControls(): string {
	return `
		<div class="flex items-center gap-3" data-auth-container>
			<a 
				href="/login"
				class="pixel-font bg-blue-500 opacity-80 text-black px-6 py-3 text-xs md:text-sm hover:bg-blue-400 transition-all neon-border flex items-center gap-2"
				data-auth-guest
			>
				<span>SIGN IN</span>
			</a>

			<div 
				class="hidden items-center gap-3 neon-border bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2"
				data-auth-user
			>
				<a href="/dashboard" class="flex items-center gap-3 group">
					<div class="w-12 h-12 rounded-full overflow-hidden border border-blue-500/60 bg-blue-900/60 shadow-lg group-hover:scale-105 transition-transform">
						<img 
							src="/sprites/cat.gif" 
							alt="Avatar"
							class="w-full h-full object-cover"
							style="image-rendering: pixelated;"
							data-auth-avatar
						/>
					</div>
					<div class="flex flex-col justify-center">
						<div class="pixel-font text-xs md:text-sm text-blue-200 uppercase tracking-wide group-hover:text-white transition-colors" data-auth-username>
							Anon
						</div>
						<div class="pixel-font text-[10px] text-blue-300/80 group-hover:text-blue-200 transition-colors">
							Voir le profil →
						</div>
					</div>
				</a>

				<button 
					type="button"
					class="pixel-font text-[10px] md:text-xs text-rose-200 hover:text-white px-4 py-2 bg-rose-500/20 hover:bg-rose-500/40 rounded transition-all"
					data-auth-logout
				>
					LOG OUT
				</button>
			</div>
		</div>
	`;
}
