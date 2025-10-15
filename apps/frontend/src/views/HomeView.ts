import type { ViewFunction, CleanupFunction } from "../router/types";
import { Header } from "../components/Header";
import { VolumeControl } from "../components/VolumeControl";

export const HomeView: ViewFunction = () => {
    return `
		${Header({ isLogged: false })}
        <div class="container mx-auto p-6">
            <h1 class="text-5xl font-bold text-center mb-8">Pong</h1>
			
			<div class="flex gap-4 justify-center mb-8">
				<a href="/quickplay" class="px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700">
					QuickPlay
				</a>
				<a href="/tournament" class="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700">
					Tournois
				</a>
			</div>

			<div class="max-w-2xl mx-auto">
				<h2 class="text-2xl font-bold mb-4">Leaderboard</h2>
				<div id="leaderboard-container" class="bg-white rounded shadow">
					<p class="p-4 text-gray-500">Chargement...</p>
				</div>
			</div>

			<div class="fixed bottom-4 right-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg">
				${VolumeControl({ 
					initialVolume: 0,
					className: "w-32"
				})}
			</div>
        </div>
    `;
};

export const homeLogic = (): CleanupFunction => {
	const loadLeaderboard = async () => {
		try {
			const response = await fetch('/gamedb/users/leaderboard');
			const data = await response.json();
			
			if (data.success && data.leaderboard) {
				const container = document.getElementById('leaderboard-container');
				if (container) {
					const rows = data.leaderboard.slice(0, 10).map((user: any, index: number) => `
						<tr class="${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
							<td class="px-4 py-2">${index + 1}</td>
							<td class="px-4 py-2 font-semibold">${user.username}</td>
							<td class="px-4 py-2 text-center">${user.total_games || 0}</td>
							<td class="px-4 py-2 text-center">${user.total_wins || 0}</td>
							<td class="px-4 py-2 text-center">${user.win_rate || 0}%</td>
						</tr>
					`).join('');
					
					container.innerHTML = `
						<table class="w-full">
							<thead class="bg-gray-200">
								<tr>
									<th class="px-4 py-2 text-left">#</th>
									<th class="px-4 py-2 text-left">Joueur</th>
									<th class="px-4 py-2 text-center">Parties</th>
									<th class="px-4 py-2 text-center">Victoires</th>
									<th class="px-4 py-2 text-center">Winrate</th>
								</tr>
							</thead>
							<tbody>
								${rows}
							</tbody>
						</table>
					`;
				}
			}
		} catch (err) {
			console.error('Error loading leaderboard:', err);
			const container = document.getElementById('leaderboard-container');
			if (container) {
				container.innerHTML = '<p class="p-4 text-red-500">Erreur de chargement</p>';
			}
		}
	};

	loadLeaderboard();

	return () => {
		// Cleanup if needed
	};
};
