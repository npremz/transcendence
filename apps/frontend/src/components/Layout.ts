export interface LayoutOptions {
	/** Afficher le bouton Back dans le header */
	showBackButton?: boolean;
	/** Afficher le bouton Sign In dans le header */
	showSignInButton?: boolean;
	/** Contenu personnalisé pour le header (remplace le header par défaut si fourni) */
	customHeader?: string;
	/** Afficher le footer */
	showFooter?: boolean;
	/** Texte personnalisé pour le footer */
	footerText?: string;
	/** Afficher les particules flottantes */
	showParticles?: boolean;
	/** Nombre de particules à afficher */
	particleCount?: number;
	/** Classes CSS additionnelles pour le conteneur principal */
	containerClass?: string;
}

/**
 * Composant Layout qui centralise les éléments communs à toutes les pages
 * - Fond avec grille animée
 * - Effet scanline
 * - Header (configurable)
 * - Footer (configurable)
 * - Particules flottantes (optionnel)
 */
export class Layout {
	/**
	 * Génère le HTML du layout avec le contenu fourni
	 * @param content - Contenu HTML à insérer dans le layout
	 * @param options - Options de configuration du layout
	 * @returns HTML complet du layout
	 */
	static render(content: string, options: LayoutOptions = {}): string {
		const {
			showBackButton = true,
			showSignInButton = false,
			customHeader = null,
			showFooter = true,
			footerText = '© 2025 PONG - SKILL ISSUE',
			showParticles = false,
			particleCount = 30,
			containerClass = ''
		} = options;

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

				<!-- Scanline effect -->
				<div class="absolute inset-0 pointer-events-none opacity-10">
					<div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
				</div>

				${showParticles ? this.renderParticles(particleCount) : ''}
			</div>

			<!-- Contenu principal -->
			<div class="relative z-10 min-h-screen flex flex-col ${containerClass}">
				${customHeader !== null ? customHeader : this.renderDefaultHeader(showBackButton, showSignInButton)}

				<!-- Zone centrale -->
				<div class="flex-1 flex flex-col">
					${content}
				</div>

				${showFooter ? this.renderFooter(footerText) : ''}
			</div>
		`;
	}

	/**
	 * Génère le header par défaut
	 */
	private static renderDefaultHeader(showBackButton: boolean, showSignInButton: boolean): string {
		if (!showBackButton && !showSignInButton) {
			return '';
		}

		return `
			<header class="flex justify-between items-center px-8 py-6">
				${showBackButton ? `
					<button
						onclick="window.router.goBack()"
						class="pixel-font px-6 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
						id="back-button"
					>
						← BACK
					</button>
				` : '<div></div>'}

				${showSignInButton ? `
					<a href="/login"
					   class="pixel-font bg-blue-500 opacity-80 text-black px-6 py-3 text-sm md:text-base hover:bg-blue-400 transition-all neon-border flex items-center gap-2">
						<span>SIGN IN</span>
					</a>
				` : ''}
			</header>
		`;
	}

	/**
	 * Génère le footer
	 */
	private static renderFooter(text: string): string {
		return `
			<footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
				<p>${text}</p>
			</footer>
		`;
	}

	/**
	 * Génère les particules flottantes
	 */
	private static renderParticles(count: number): string {
		const particles: string[] = [];

		for (let i = 0; i < count; i++) {
			const size = 2 + Math.random() * 3;
			const left = Math.random() * 100;
			const top = Math.random() * 100;
			const duration = 10 + Math.random() * 20;
			const delay = Math.random() * 5;

			particles.push(`
				<div
					class="absolute bg-blue-400 rounded-full opacity-20"
					style="
						width: ${size}px;
						height: ${size}px;
						left: ${left}%;
						top: ${top}%;
						animation: float ${duration}s ease-in-out ${delay}s infinite;
					"
				></div>
			`);
		}

		return particles.join('');
	}

	/**
	 * Helper pour créer un header personnalisé type HomeView
	 */
	static renderHomeHeader(): string {
		return `
			<header class="flex justify-between items-center px-8 py-6">
				<!-- Logo PONG -->
				<div class="pixel-font text-4xl md:text-5xl text-blue-400" style="animation: neonPulse 2s ease-in-out infinite;">
					PONG
				</div>

				<!-- Bouton Connexion -->
				<a href="/login"
				   class="pixel-font bg-blue-500 opacity-80 text-black px-6 py-3 text-sm md:text-base hover:bg-blue-400 transition-all neon-border flex items-center gap-2">
					<span>SIGN IN</span>
				</a>
			</header>

			<!-- Ligne horizontale néon -->
			<div class="w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50"></div>
		`;
	}

	/**
	 * Helper pour créer un header avec status indicator (WaitingRoom)
	 */
	static renderWaitingRoomHeader(): string {
		return `
			<header class="flex justify-between items-center px-8 py-6">
				<button
					onclick="window.router.goBack()"
					class="pixel-font px-6 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
					id="back-button"
				>
					← BACK
				</button>

				<!-- Status indicator -->
				<div class="flex items-center gap-3 neon-border bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2">
					<div class="status-indicator"></div>
					<span class="pixel-font text-sm text-blue-300">SEARCHING</span>
				</div>
			</header>
		`;
	}
}
