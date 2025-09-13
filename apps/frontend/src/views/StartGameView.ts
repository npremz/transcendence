import type { ViewFunction } from "../router/types";
import { 
	Button,
	BackButton,
	SettingsButton
		} from "../components/Button";  // Ajoute BackButton
import { gsap } from "gsap";

export const StartGameView: ViewFunction = () => {
    // Animation GSAP après le rendu
    setTimeout(() => {
        // Timeline pour contrôler toute l'animation
        const tl = gsap.timeline();
        
        // Variables pour le contrôle du vaisseau
        let mouseY = window.innerHeight / 2;
        const spaceship = document.getElementById("spaceship");
        
        // 1. Suivre la souris
        document.addEventListener('mousemove', (e) => {
            mouseY = e.clientY;
            
            if (spaceship) {
                // Position relative au centre de l'écran
                const centerY = window.innerHeight / 2;
                const offsetY = mouseY - centerY;
                
                // Limiter le mouvement (max 300px du centre)
                const clampedY = Math.max(-300, Math.min(300, offsetY));
                
                // Animation fluide vers la position de la souris
                gsap.to("#spaceship", {
                    y: clampedY,
                    duration: 0.3,  // Délai pour un mouvement plus smooth
                    ease: "power2.out"
                });
            }
        });
        
        // 2. Fonction pour créer un projectile
        function createProjectile() {
            const spaceship = document.getElementById("spaceship");
            const gameAnimation = document.getElementById("game-animation");
            
            if (!spaceship || !gameAnimation) return;
            
            const rect = spaceship.getBoundingClientRect();
            
            const projectile = document.createElement("div");
            projectile.className = "absolute bg-yellow-400";
            projectile.style.cssText = `
                width: 10px;
                height: 4px;
                left: ${rect.right}px;
                top: ${rect.top + rect.height/2}px;
                border-radius: 1px;
            `;
            
            gameAnimation.appendChild(projectile);
            
            gsap.to(projectile, {
                x: window.innerWidth,
                duration: 2,
                ease: "none",
                onComplete: () => {
                    projectile.remove();
                }
            });
        }
        
        // 3. Tir avec la barre espace
        document.addEventListener('keydown', (e) => {
            if (e.key === ' ') {
                e.preventDefault();  // Empêche le scroll
                createProjectile();
            }
        });
        
        // 4. Tir automatique toutes les secondes
        const shootInterval = setInterval(createProjectile, 1000);
        
        // 5. Animation du background
        tl.to("#stars-bg", {
            x: "-80%",
            duration: 3,
            ease: "power2.out"
        })
        
        // 6. Faire apparaître les boutons
        .to("#menu-buttons", {
            opacity: 1,
            pointerEvents: "auto",
            duration: 1,
            ease: "power2.out",
        });
        
    }, 0);
    
    return `
        <!-- Instructions de contrôle EN BAS À GAUCHE -->
        <div class="fixed bottom-4 left-4 text-white z-10 p-4 rounded bg-[#0C154D]/20 backdrop-blur-sm border border-white/20 text-white">
            <p>🖱️ Souris : Contrôler l'avion</p>
            <p>Espace : Tirer</p>
        </div>
        
        <!-- Canvas pour l'animation -->
        <div id="game-animation" class="fixed inset-0 w-full h-full bg-[#04071A] overflow-hidden">
            <!-- Background étoilé -->
            <div id="stars-bg" class="absolute inset-0 w-[200%]">
                ${Array.from({length: 100}, (_, i) => `
                    <div 
                        class="absolute bg-white rounded-full ${i % 5 === 0 ? 'animate-pulse' : ''}"
                        style="
                            width: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
                            height: ${i % 3 === 0 ? '3px' : i % 2 === 0 ? '2px' : '1px'};
                            left: ${Math.random() * 100}%;
                            top: ${Math.random() * 100}%;
                            opacity: ${0.3 + Math.random() * 0.7};
                            ${i % 5 === 0 ? `animation-delay: ${Math.random() * 5}s;` : ''}
                        "
                    ></div>
                `).join('')}
            </div>
            
            <!-- Avion -->
            <div id="spaceship" class="absolute" style="
                width: 128px;
                height: 128px;
                top: 50%;
                left: 30%;
                transform: translate(-50%, -50%);
            ">
                <img 
                    src="/sprites/spaceship.png" 
                    alt="spaceship"
                    class="w-full h-full"
                    style="image-rendering: pixelated;"
                />
            </div>
        </div>

        <!-- Container des boutons -->
        <div id="menu-buttons" class="fixed inset-0 flex flex-col items-center justify-center opacity-0 pointer-events-none">

			<div class="absolute top-8 left-8">
				${BackButton({
					size: "lg",
					className: "text-center text-white z-10 p-4 rounded bg-[#0C154D]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
				})}
			</div>

			<div class="absolute top-8 right-8">
				${SettingsButton({
					size: "lg",
					className: "text-center text-white z-10 p-4 rounded bg-[#0C154D]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
				})}
			</div>

            <div class="absolute right-48 top-1/2 -translate-y-1/2 flex flex-col gap-16">
                ${Button({
                    children: "⚡ Quickplay",
					variant: "default",
                    size: "lg",
                    href: "/game",
					className: "min-w-[350px] px-10 py-6 text-2xl text-center bg-[#101C69]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
                })}
                
                ${Button({
                    children: "🏆 Tournament",
                    variant: "default",
                    size: "lg",
                    href: "/tournament",
					className: "min-w-[350px] px-10 py-6 text-2xl text-center bg-[#101C69]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
                })}

				${Button({
                    children: "Skin",
                    variant: "default",
                    size: "lg",
                    href: "/skin",
					className: "min-w-[350px] px-10 py-6 text-2xl text-center bg-[#101C69]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
                })}
            </div>
    `;
};
 