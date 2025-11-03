import { Engine, Scene, ArcRotateCamera, Vector3, HemisphericLight, MeshBuilder } from '@babylonjs/core';

export function initGame3d() {
    const canvas = document.getElementById('game3d-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const engine = new Engine(canvas, true);
    const scene = new Scene(engine);

    // Camera
    const camera = new ArcRotateCamera('camera', 0, 0, 10, Vector3.Zero(), scene);
    camera.attachControl(canvas, true);

    // Light
    new HemisphericLight('light', new Vector3(0, 1, 0), scene);

    // Create a sphere (example)
    const sphere = MeshBuilder.CreateSphere('sphere', { diameter: 2 }, scene);

    // Render loop
    engine.runRenderLoop(() => {
        scene.render();
    });

    // Handle resize
    window.addEventListener('resize', () => {
        engine.resize();
    });
}

export function Game3d(): string {
	
	return `
		<div class="container ml-auto mr-auto flex flex-col items-center" data-component="game3d">
			<div class="w-full flex justify-between items-center px-8 mb-4">
				<div id="player-left-name" class="text-xl font-bold">Player 1</div>
				<button id="forfeit-btn" class="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed">
					Surrender
				</button>
				<div id="player-right-name" class="text-xl font-bold">Player 2</div>
			</div>
			<canvas id="game3d-canvas" class="w-full h-[600px] border border-gray-300"></canvas>
		</div>
	`;
}
