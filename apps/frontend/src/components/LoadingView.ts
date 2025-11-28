import { Layout } from "./Layout";

/**
 * Vue de chargement affichée pendant le lazy loading des chunks
 */
export const LoadingView = (): string => {
	const content = `
		<style>
			@keyframes spin {
				0% { transform: rotate(0deg); }
				100% { transform: rotate(360deg); }
			}

			@keyframes pulse-slow {
				0%, 100% { opacity: 0.4; }
				50% { opacity: 1; }
			}

			.loading-spinner {
				width: 80px;
				height: 80px;
				border: 4px solid rgba(59, 130, 246, 0.1);
				border-top: 4px solid rgba(59, 130, 246, 1);
				border-radius: 50%;
				animation: spin 1s linear infinite;
			}

			.loading-dots span {
				animation: pulse-slow 1.4s ease-in-out infinite;
			}

			.loading-dots span:nth-child(2) {
				animation-delay: 0.2s;
			}

			.loading-dots span:nth-child(3) {
				animation-delay: 0.4s;
			}
		</style>

		<div class="flex-1 flex flex-col items-center justify-center px-4 py-12">
			<div class="text-center">
				<!-- Spinner -->
				<div class="loading-spinner mx-auto mb-8"></div>

				<!-- Texte de chargement -->
				<div class="pixel-font text-2xl text-blue-400 mb-4 loading-dots">
					LOADING<span>.</span><span>.</span><span>.</span>
				</div>

				<!-- Message optionnel -->
				<p class="pixel-font text-sm text-blue-300 opacity-60">
					Preparing your experience
				</p>
			</div>
		</div>
	`;

	return Layout.render(content, {
		showBackButton: false,
		showFooter: false
	});
};
