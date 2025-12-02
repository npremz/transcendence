import type { ComponentProps } from './types';
import { renderAuthControls } from './AuthControls';

export function Header({ className = '' }: ComponentProps): string {
	return `
		<header class="flex justify-between items-center px-8 py-6 ${className}">
            <div class="flex items-center gap-4">
                <a href="/" class="pixel-font text-2xl text-blue-400 hover:text-white transition-colors">PONG</a>
            </div>
			${renderAuthControls()}
		</header>
	`;
}
