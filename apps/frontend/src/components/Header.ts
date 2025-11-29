import type { ComponentProps } from './types';
import { renderAuthControls } from './AuthControls';

interface HeaderProps extends ComponentProps {
    isLogged?: boolean
}

export function Header({ 
	className = '',
	isLogged: _isLogged = false
}: HeaderProps): string {

	const baseClass = `
		container flex justify-between
		gap-4 py-4 px-8 mt-4 ml-auto mr-auto
		rounded-xl
		bg-orange-600
		${className}
	`.replace(/\s+/g, ' ').trim();
	
	return `
		<header class="${baseClass}">
			<h1 class="text-2xl text-white">Pongers!</h1>
			${renderAuthControls()}
		</header>
	`;
}
