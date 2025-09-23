import type { ViewFunction } from "../router/types"
import { Header } from "../components/Header";
import { JoinTournament } from "../components/JoinTournament";
import { wsTournament } from "../net/wsTournament";

export const TournamentView: ViewFunction = () => {
	return `
		${Header({isLogged: false})}
		<div class="mt-16 flex flex-col gap-4 items-center">
			<input type="text" name="username" id="usernameInput" value="Anon"
				class="px-8 py-4 border-b-cyan-300 border-2 rounded-xl"/>
			${JoinTournament({slots: 4})}
			${JoinTournament({slots: 8})}
			${JoinTournament({slots: 16})}
		</div>
	`
}

export const tournamentLogic = (): (() => void) => {
	const tournamentBtns = document.querySelectorAll('[data-component="joinTournament"]')
	const net = new wsTournament(tournamentBtns);
	const usernameInput = document.getElementById("usernameInput") as HTMLInputElement;
	
	net.connect();

	const handleJoinTournament = (e: Event) => {
		const username = usernameInput.value;
		const target = e.target as HTMLElement
		const id = target?.getAttribute('data-tournament-id')

		net.join(id, username)
	}

	tournamentBtns.forEach(tournamentBtn => {
		tournamentBtn.addEventListener("click", handleJoinTournament)
	})

	
	// === FONCTION DE CLEANUP ===
	return (): void => {
		net.close()
		tournamentBtns.forEach(tournamentBtn => {
			tournamentBtn.removeEventListener("click", handleJoinTournament)
		})
	};
};
