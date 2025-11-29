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
				<div class="pixel-font text-xs md:text-sm text-blue-200 uppercase tracking-wide" data-auth-username>
					Anon
				</div>
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
