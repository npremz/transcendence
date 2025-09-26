import { gsap } from "gsap";

interface VolumeControlProps {
    initialVolume?: number;
    className?: string;
}

export function VolumeControl({ 
    initialVolume = 50,
    className = '' 
}: VolumeControlProps = {}): string {
    // Setup après le rendu
    setTimeout(() => {
        let holdTimer: any = null;
        let chargeLevel = 0;
        const speaker = document.getElementById('volume-speaker');
        const volumeTrack = document.getElementById('volume-track');
        const volumeBall = document.getElementById('volume-ball');
        
        if (!speaker || !volumeTrack || !volumeBall) {
            console.log('Volume control elements not found');
            return;
        }

        // Position initiale
        const initialPos = (initialVolume / 100) * volumeTrack.offsetWidth;
        gsap.set(volumeBall, { x: initialPos });
        
        // Mouse down - commence à charger ET reset la boule
        speaker.addEventListener('mousedown', () => {
            chargeLevel = 0;
            
            // Reset la position de la boule au début
            gsap.set(volumeBall, { 
                x: 0,
                y: 0,
                scale: 1
            });
            
            holdTimer = setInterval(() => {
                chargeLevel = Math.min(100, chargeLevel + 2);
                
                // Vibration du speaker
                gsap.to(speaker, {
                    scale: 1 + (chargeLevel / 200),
                    duration: 0.1
                });
            }, 20);
        });

        // Mouse up - lance la boule avec physique réaliste
        speaker.addEventListener('mouseup', () => {
            if (holdTimer) {
                clearInterval(holdTimer);
                
                // Position finale basée sur la charge
                const finalPosition = (chargeLevel / 100) * volumeTrack.offsetWidth;
                const jumpHeight = 20 + (chargeLevel / 4);
                
                // Mouvement horizontal linéaire
                gsap.fromTo(volumeBall,
                    { x: 0 },
                    { 
                        x: finalPosition,
                        duration: 0.6,
                        ease: "none"
                    }
                );
                
                // Mouvement vertical parabolique
                gsap.fromTo(volumeBall,
                    { y: 0 },
                    {
                        y: -jumpHeight,
                        duration: 0.3,
                        ease: "power2.out",
                        yoyo: true,
                        repeat: 1,
                        immediateRender: false
                    }
                );
                
                gsap.to(speaker, {
                    scale: 1,
                    duration: 0.3
                });
                
                chargeLevel = 0;
            }
        });

        // Mouse leave - annule la charge
        speaker.addEventListener('mouseleave', () => {
            if (holdTimer) {
                clearInterval(holdTimer);
                holdTimer = null;
                
                gsap.to(speaker, {
                    scale: 1,
                    duration: 0.3
                });
                
                chargeLevel = 0;
            }
        });
    }, 0);

    return `
        <div class="flex items-center gap-3 ${className}">
            <!-- Speaker sans fond -->
            <div 
                id="volume-speaker"
                class="w-8 h-8 flex items-center justify-center cursor-pointer select-none"
            >
                <!-- Icône speaker -->
                <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217z"/>
                </svg>
            </div>

            <!-- Container avec padding pour la trajectoire -->
            <div class="relative flex-1 py-6">
                <!-- Ligne de volume -->
                <div 
                    id="volume-track"
                    class="h-[2px] bg-white/50 rounded-full relative"
                >
                    <!-- Boule -->
                    <div 
                        id="volume-ball"
                        class="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full"
                        style="left: 0; transform: translateY(-50%);"
                    ></div>
                </div>
            </div>
        </div>
    `;
}
