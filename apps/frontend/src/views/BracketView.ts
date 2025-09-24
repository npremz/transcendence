import type { ViewFunction } from "../router/types"
import { Header } from "../components/Header";

export const BracketView: ViewFunction = () => {
	return `
		${Header({isLogged: false})}
		<div class="relative">

		</div>
	`
}

export const bracketLogic = (): (() => void) => {

	
	// === FONCTION DE CLEANUP ===
	return (): void => {

	};
};
