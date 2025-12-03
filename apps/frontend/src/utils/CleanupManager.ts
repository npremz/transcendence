/**
 * Gestionnaire de cleanup pour éviter les fuites mémoire
 * Gère automatiquement les timeouts, intervals, event listeners et animations GSAP
 */
export class CleanupManager {
	private timeouts: Set<number> = new Set();
	private intervals: Set<number> = new Set();
	private gsapTargets: Set<string | Element> = new Set();
	private cleanupCallbacks: Array<() => void> = [];

	/**
	 * Enregistre un setTimeout et retourne son ID
	 */
	setTimeout(callback: () => void, delay: number): number {
		const id = window.setTimeout(() => {
			this.timeouts.delete(id);
			callback();
		}, delay);
		this.timeouts.add(id);
		return id;
	}

	/**
	 * Enregistre un setInterval et retourne son ID
	 */
	setInterval(callback: () => void, delay: number): number {
		const id = window.setInterval(callback, delay);
		this.intervals.add(id);
		return id;
	}

	/**
	 * Enregistre une cible GSAP pour cleanup automatique
	 */
	registerGsapTarget(target: string | Element): void {
		this.gsapTargets.add(target);
	}

	/**
	 * Enregistre un callback de cleanup personnalisé
	 */
	onCleanup(callback: () => void): void {
		this.cleanupCallbacks.push(callback);
	}

	/**
	 * Nettoie tous les timeouts enregistrés
	 */
	private clearTimeouts(): void {
		this.timeouts.forEach(id => window.clearTimeout(id));
		this.timeouts.clear();
	}

	/**
	 * Nettoie tous les intervals enregistrés
	 */
	private clearIntervals(): void {
		this.intervals.forEach(id => window.clearInterval(id));
		this.intervals.clear();
	}

	/**
	 * Tue toutes les animations GSAP enregistrées
	 */
	private killGsapAnimations(): void {
		if (typeof window !== 'undefined' && (window as any).gsap) {
			const gsap = (window as any).gsap;
			this.gsapTargets.forEach(target => {
				gsap.killTweensOf(target);
			});
		}
		this.gsapTargets.clear();
	}

	/**
	 * Exécute tous les callbacks de cleanup
	 */
	private runCallbacks(): void {
		this.cleanupCallbacks.forEach(callback => {
			try {
				callback();
			} catch (error) {
				console.error('Error in cleanup callback:', error);
			}
		});
		this.cleanupCallbacks = [];
	}

	/**
	 * Nettoie tout
	 */
	cleanup(): void {
		this.clearTimeouts();
		this.clearIntervals();
		this.killGsapAnimations();
		this.runCallbacks();
	}

	/**
	 * Crée une fonction de cleanup pour le router
	 */
	getCleanupFunction(): () => void {
		return () => this.cleanup();
	}
}

/**
 * Helper pour créer un CleanupManager dans les vues
 */
export function createCleanupManager(): CleanupManager {
	return new CleanupManager();
}
