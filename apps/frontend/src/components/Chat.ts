import type { ComponentProps } from "./types";

interface GlobalChatProps extends ComponentProps
{
	type: 'global' | 'game' | 'private'
}

export function Chat({
	className,
	type
} : GlobalChatProps) {
	const chatClasses = `${className}
	${type == 'global' ? `` : ``}
	`;


	return `
		<div class=${chatClasses}>
		
		<div>
	`
}
