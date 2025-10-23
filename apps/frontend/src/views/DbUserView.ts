import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";

export const dbUserView: ViewFunction = () => {
    return `
        <div class="fixed inset-0 bg-[#04071A] overflow-hidden">
			<!-- Étoiles -->
			${Array.from({length: 150}, (_, i) => `
			<div 
					class="absolute bg-white rounded-full ${i % 7 === 0 ? 'animate-pulse' : ''}"
					style="
						width: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
						height: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
						left: ${Math.random() * 100}%;
						top: ${Math.random() * 100}%;
						opacity: ${0.3 + Math.random() * 0.7};
						${i % 7 === 0 ? `animation-delay: ${Math.random() * 5}s;` : ''}
					"
				></div>
			`).join('')}
			<!-- Étoiles normales -->
			${Array.from({length: 150}, (_, i) => `
				<div 
					class="absolute bg-white rounded-full ${i % 7 === 0 ? 'animate-pulse' : ''}"
					style="
						width: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
						height: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
						left: ${Math.random() * 100}%;
						top: ${Math.random() * 100}%;
						opacity: ${0.3 + Math.random() * 0.7};
						${i % 7 === 0 ? `animation-delay: ${Math.random() * 5}s;` : ''}
					"
				></div>
			`).join('')}
			
			<!-- Étoiles qui scintillent fort -->
			${Array.from({length: 50}, (_) => `
				<div 
					class="absolute"
					style="
						left: ${Math.random() * 100}%;
						top: ${Math.random() * 100}%;
						animation: strong-sparkle ${4 + Math.random() * 3}s ease-in-out ${Math.random() * 10}s infinite;
					"
				>
					<div class="w-[4px] h-[4px] bg-white rounded-full"></div>
				</div>
			`).join('')}
			
			<style>
				@keyframes strong-sparkle {
					0%, 100% {
						opacity: 0.3;
						filter: blur(0px);
					}
					50% {
						opacity: 1;
						filter: blur(0px) drop-shadow(0 0 10px white) drop-shadow(0 0 20px white);
					}
				}
			</style>

        ${Header({ isLogged: false })}
        <h1>bonjour kenzo</h1>

        `;
};

export const dbUserLogic = (): CleanupFunction => {

    function handleClick() {
        alert("ok")
    }
    
    document?.querySelector('h1')?.addEventListener("click", handleClick)


    return () => {
        document.querySelector('h1')?.removeEventListener("click", handleClick)
    };
};
