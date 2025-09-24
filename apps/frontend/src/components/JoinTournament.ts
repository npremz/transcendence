import type { ComponentProps, Component } from "./types";

interface JoinTournamentProps extends ComponentProps
{
	slots: number
}

export class JoinTournamentComponent implements Component
{
	private element: HTMLElement
	private slots: string | null

	constructor(element: HTMLElement)
	{

		this.element = element;
		this.slots = element.getAttribute('data-slots')
		this.init();
	}

	private init(): void
	{

	}
	
	cleanup(): void
	{

	}
}

export function JoinTournament({
	className = 'px-32 py-16 border-2 border-red-400 rounded-2xl cursor-pointer',
	slots
} : JoinTournamentProps) {
	const chatClasses = `${className}`

	return `
		<button class="${chatClasses}"
			data-component="joinTournament"
			data-slots=${slots}	
		>
			${slots} Players
			<span></span>
		<button>
	`
}
