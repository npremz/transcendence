import type { ViewFunction } from "../router/types";
import { Game3dComponent, Game3D } from "../components/Game3d/Game3d";

 export const Game3dView: ViewFunction = () => {
	setTimeout(() => {
		const gameContainer = document.getElementById('game-content');
		if (gameContainer) {
			new Game3D(gameContainer);
		} else
			console.error('Game container not found');
	}, 100);
	
	return `
		<div id="game-content">
			${Game3dComponent()}
		</div>
	`
};
