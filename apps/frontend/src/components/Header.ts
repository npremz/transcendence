import type { ComponentProps } from './types';
import { Button } from './Button';

interface HeaderProps extends ComponentProps {
    isLogged?: boolean
}

export function Header({ 
	className = '',
	isLogged = false
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
			${isLogged ? 
				Button({
					children: "Profile",
					id: "profileBtn",
					variant: "secondary",
					size: "md",
					href: ""
				})
					:
				Button({
					children: "Login",
					id: "loginBtn",
					variant: "secondary",
					size: "md",
					href: "/login"
				})
			}
		</header>
	`;
}
