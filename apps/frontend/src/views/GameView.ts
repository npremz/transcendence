import type { ViewFunction } from "../router/types";

export const GameView: ViewFunction = () => {
	return `
		<div class="container ml-auto mr-auto">
			<canvas></canvas>
		</div>
	`;
};

export const gameLogic = () => {
	return ""
}
