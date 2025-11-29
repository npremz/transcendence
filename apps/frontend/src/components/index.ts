import { PongGame } from './PongGame/PongGame';
import { Game3D } from './Game3d/Game3d';
import { ComponentRegistry } from './ComponantManager';
import { JoinTournamentComponent } from './JoinTournament';

export function registerComponents(): void
{
    ComponentRegistry.register('pong-game', PongGame)
	ComponentRegistry.register('game3d', Game3D)
    ComponentRegistry.register('joinTournament', JoinTournamentComponent)
}
