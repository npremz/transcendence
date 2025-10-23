import type { ViewFunction, CleanupFunction } from "../router/types";
import { Header } from "../components/Header";

export const WaitingRoomView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })}
		<div class="container mx-auto p-6">
			<h1 class="text-3xl font-bold mb-6">Waiting Room</h1>
			
			<div class="max-w-md">
				<div id="status-display" class="p-4 mb-4 border rounded bg-gray-100">
					Initializing...
				</div>
				<p id="skill-info" class="text-sm text-gray-600 mb-4"></p>
				
				<button id="cancel-btn" class="px-6 py-3 bg-red-600 text-white rounded">
					Cancel
				</button>
			</div>
		</div>
	`;
};

export const waitingRoomLogic = (): CleanupFunction => {
    let pollInterval: NodeJS.Timeout | null = null;
    let roomId: string | null = null;
	const skill = (sessionStorage.getItem('selectedSkill') as 'smash' | 'dash' | null) || 'smash';

    const updateStatus = (message: string) => {
        const statusDisplay = document.getElementById('status-display');
        if (statusDisplay) {
            statusDisplay.textContent = message;
        }
    };

	const updateSkillInfo = () => {
		const skillInfo = document.getElementById('skill-info');
		if (skillInfo) {
			const label = skill === 'dash' ? 'Dash' : 'Smash';
			skillInfo.textContent = `Skill sélectionné : ${label}`;
		}
	};

    const handleJoin = async () => {
        const username = window.simpleAuth.getUsername() || 'Player';
        const playerId = window.simpleAuth.getPlayerId();

        updateStatus('Joining quickplay...');
		updateSkillInfo();

        try {
            const response = await fetch('/quickplay/join', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, playerId, selectedSkill: skill })
            });
            const data = await response.json();
            
            if (data.success) {
                roomId = data.roomId;
                updateStatus('Waiting for opponent...');
                startPolling();
            } else {
                updateStatus('Error: ' + (data.error || 'Failed to join'));
            }
        } catch (err) {
            console.error(err);
            updateStatus('Connection error');
        }
    };

    const startPolling = () => {
        pollInterval = setInterval(async () => {
            if (!roomId) return;
            
            try {
                const response = await fetch(`/quickplay/status/${roomId}`);
                const data = await response.json();
                
                if (data.status === 'ready') {
                    updateStatus('Player found! Redirecting to game...');
                    stopPolling();
                    sessionStorage.setItem('gameWsURL', data.gameServerURL);
                    
                    setTimeout(() => {
                        window.router.navigate(`/game/${roomId}`);
                    }, 1000);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 2000);
    };

    const stopPolling = () => {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    };

    const handleCancel = () => {
        stopPolling();
        window.router.navigate('/play');
    };

    // Start joining immediately on mount
    handleJoin();

    // Attach cancel handler
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', handleCancel);
    }

	updateSkillInfo();

    return () => {
        stopPolling();
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', handleCancel);
        }
    };
};
