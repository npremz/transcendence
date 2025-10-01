import type { ViewFunction } from "../router/types";
import { Pong } from "../components/PongGame/PongGame";
import { gsap } from "gsap";
import { BackButton } from "../components/Button";

 export const GameView: ViewFunction = () => {
	// Animation d'entrée
	setTimeout(() => {
		const tl = gsap.timeline();
		
		// Récupérer les positions data-x et data-y
		const stars = document.querySelectorAll('.star-particle');
		stars.forEach((star) => {
			const targetX = parseFloat(star.getAttribute('data-x') || '0');
			const targetY = parseFloat(star.getAttribute('data-y') || '0');
			
			gsap.fromTo(star,
				{ 
					x: 0,
					y: 0,
					scale: 0.1,
					opacity: 1
				},
				{ 
					x: targetX,
					y: targetY,
					scale: 1,
					opacity: 1,
					duration: 4,
					ease: "power2.out"
				}
			);
		});
		
		// Faire disparaître la transition après l'animation
		tl.to("#space-transition", 
			{ 
				opacity: 0,
				duration: 1,
				delay: 2, // Attendre que les étoiles soient parties
				onComplete: () => {
					const transition = document.getElementById('space-transition');
					if (transition) transition.style.display = 'none';
				}
			}
		)
		.fromTo("#game-content", 
			{ opacity: 0, scale: 0.8 },
			{ opacity: 1, scale: 1, duration: 0.5, ease: "back.out" },
			"-=0.5"
		);
	}, 0);
	
	return `
		<div id="space-transition" class="fixed inset-0 z-50 bg-[#04071A] overflow-hidden">
			${Array.from({length: 300}, (_) => {
				const angle = Math.random() * Math.PI * 2;
				const distance = Math.random() * 1500 + 500;
				const x = Math.cos(angle) * distance;
				const y = Math.sin(angle) * distance;
				const size = Math.random() * 4 + 1;
				
				return `
					<div 
						class="star-particle absolute bg-white rounded-full"
						style="
							width: ${size}px;
							height: ${size}px;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%);
							box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, 0.8);
						"
						data-x="${x}"
						data-y="${y}"
					></div>
				`;
			}).join('')}
			
			<!-- Lignes de vitesse -->
			${Array.from({length: 50}, (_) => {
				const angle = Math.random() * Math.PI * 2;
				const length = Math.random() * 200 + 100;
				const distance = Math.random() * 800;
				
				return `
					<div 
						class="absolute bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
						style="
							width: ${length}px;
							height: 1px;
							left: 50%;
							top: 50%;
							transform: translate(-50%, -50%) 
									  rotate(${angle}rad) 
									  translateX(${distance}px);
						"
					></div>
				`;
			}).join('')}
		</div>
		<div id="game-content">
			${BackButton()}
			${Pong()}
		</div>
	`

};
