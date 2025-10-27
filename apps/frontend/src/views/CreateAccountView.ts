
import type { ViewFunction } from "../router/types";
import { gsap } from "gsap";

export const CreateAccountView: ViewFunction = () => {
    return `
        <!-- Fond avec grille animée (même que HomeView) -->
        <div class="fixed inset-0 bg-black overflow-hidden">
            <!-- Grille de fond -->
            <div class="absolute inset-0" style="
                background-image: 
                    linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px);
                background-size: 50px 50px;
                animation: gridMove 20s linear infinite;
            "></div>
            
            <style>
                @keyframes gridMove {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(50px); }
                }
                
                @keyframes neonPulse {
                    0%, 100% { 
                        text-shadow: 
                            0 0 10px rgba(59, 130, 246, 0.8),
                            0 0 20px rgba(59, 130, 246, 0.6),
                            0 0 30px rgba(59, 130, 246, 0.4);
                    }
                    50% { 
                        text-shadow: 
                            0 0 20px rgba(59, 130, 246, 1),
                            0 0 30px rgba(59, 130, 246, 0.8),
                            0 0 40px rgba(59, 130, 246, 0.6);
                    }
                }
                
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100vh); }
                }
                
                .pixel-font {
                    font-family: 'Courier New', monospace;
                    font-weight: bold;
                    letter-spacing: 0.1em;
                }
                
                .neon-border {
                    box-shadow: 
                        0 0 10px rgba(59, 130, 246, 0.5),
                        inset 0 0 10px rgba(59, 130, 246, 0.2);
                    border: 3px solid rgba(59, 130, 246, 0.8);
                }
                
                .neon-border:hover {
                    box-shadow: 
                        0 0 20px rgba(59, 130, 246, 0.8),
                        inset 0 0 20px rgba(59, 130, 246, 0.3);
                    border-color: rgba(59, 130, 246, 1);
                }
                
                .neon-input {
                    background: rgba(15, 23, 42, 0.6);
                    border: 2px solid rgba(59, 130, 246, 0.5);
                    color: #60A5FA;
                    transition: all 0.3s ease;
                }
                
                .neon-input:focus {
                    outline: none;
                    border-color: rgba(59, 130, 246, 1);
                    box-shadow: 
                        0 0 10px rgba(59, 130, 246, 0.5),
                        inset 0 0 10px rgba(59, 130, 246, 0.2);
                    background: rgba(15, 23, 42, 0.8);
                }
                
                .neon-input::placeholder {
                    color: rgba(96, 165, 250, 0.4);
                }

                .neon-input.error {
                    border-color: rgba(239, 68, 68, 0.8);
                    box-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
                }
            </style>
            
            <!-- Scanline effect -->
            <div class="absolute inset-0 pointer-events-none opacity-10">
                <div class="absolute w-full h-1 bg-blue-400" style="animation: scanline 8s linear infinite;"></div>
            </div>
        </div>

        <!-- Contenu principal -->
        <div class="relative z-10 min-h-screen flex flex-col">
            <!-- Header avec BackButton -->
            <div class="p-8">
                <button 
                    onclick="history.back()" 
                    class="pixel-font px-6 py-3 neon-border bg-transparent text-blue-400 hover:bg-blue-500/10 transition-all"
                    id="back-button"
                >
                    ← BACK
                </button>
            </div>

            <!-- Zone centrale -->
            <div class="flex-1 flex items-center justify-center px-4 py-12">
                <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <!-- Côté gauche - Animation/Image -->
                    <div class="flex items-center justify-center p-8" id="left-panel">
                        <div class="relative w-full h-full min-h-[500px] neon-border bg-black/50 backdrop-blur-sm rounded-lg overflow-hidden flex items-center justify-center">
                            <!-- GIF ou animation -->
                            <img 
                                src="/sprites/dancing-cat.gif" 
                                alt="Animation"
                                class="w-full h-full object-contain"
                                style="image-rendering: pixelated;"
                            />
                            
                            <!-- Overlay avec effet néon -->
                            <div class="absolute inset-0 pointer-events-none" style="
                                background: radial-gradient(circle at center, transparent 40%, rgba(59, 130, 246, 0.1) 100%);
                            "></div>
                        </div>
                    </div>

                    <!-- Côté droit - Formulaire -->
                    <div class="flex flex-col justify-center p-8 neon-border bg-black/50 backdrop-blur-sm rounded-lg relative" id="right-panel">
                        <!-- Titre -->
                        <div class="text-center mb-8">
                            <h1 class="pixel-font text-4xl md:text-5xl text-blue-400 mb-2" 
                                style="animation: neonPulse 2s ease-in-out infinite;"
                                id="create-title">
                                HELLO!
                            </h1>
                            <h2 class="pixel-font text-xl md:text-2xl text-blue-300 opacity-80">
                                Create your account
                            </h2>
                        </div>

                        <!-- Message d'erreur -->
                        <div id="error-message" class="hidden mb-4 p-3 neon-border bg-red-500/10 rounded">
                            <p class="pixel-font text-xs text-red-400 text-center"></p>
                        </div>

                        <!-- Formulaire -->
                        <form action="/create" method="POST" id="createForm" class="space-y-6">
                            <!-- Username -->
                            <div>
                                <label for="username" class="block mb-2 pixel-font text-sm text-blue-300">
                                    USERNAME:
                                </label>
                                <input 
                                    type="text" 
                                    id="username" 
                                    name="username"
                                    placeholder="Enter username"
                                    required
                                    minlength="3"
                                    maxlength="20"
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Password -->
                            <div>
                                <label for="password" class="block mb-2 pixel-font text-sm text-blue-300">
                                    PASSWORD:
                                </label>
                                <input 
                                    type="password" 
                                    id="password" 
                                    name="password"
                                    placeholder="Enter password"
                                    required
                                    minlength="6"
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Confirm Password -->
                            <div>
                                <label for="confirmpassword" class="block mb-2 pixel-font text-sm text-blue-300">
                                    CONFIRM PASSWORD:
                                </label>
                                <input 
                                    type="password" 
                                    id="confirmpassword" 
                                    name="confirmpassword"
                                    placeholder="Confirm your password"
                                    required
                                    class="w-full p-3 rounded pixel-font text-sm neon-input"
                                >
                            </div>

                            <!-- Bouton Submit -->
                            <button 
                                type="submit" 
                                class="w-full py-3 pixel-font text-sm neon-border bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 hover:text-white transition-all"
                                id="submit-btn"
                            >
                                >>> CREATE ACCOUNT <<<
                            </button>
                        </form>

                        <!-- Lien vers login -->
                        <div class="mt-6 text-center">
                            <p class="pixel-font text-xs text-blue-300/60 mb-3">
                                Already have an account?
                            </p>
                            <a 
                                href="/login" 
                                class="pixel-font text-sm text-blue-400 hover:text-blue-300 transition-colors inline-block"
                            >
                                >>> LOGIN <<<
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <footer class="text-center py-6 pixel-font text-xs text-blue-400 opacity-50">
                <p>© 2025 PONG - SKILL ISSUE</p>
            </footer>
        </div>
    `;
};

export const createAccountLogic = (): (() => void) => {
    // Animations d'entrée avec GSAP
    gsap.from('#create-title', {
        scale: 0.5,
        opacity: 0,
        duration: 1,
        ease: 'back.out(1.7)'
    });

    gsap.from('#left-panel', {
        x: -100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
    });

    gsap.from('#right-panel', {
        x: 100,
        opacity: 0,
        duration: 0.8,
        ease: 'power2.out'
    });

    // Gestion du formulaire
    const form = document.getElementById('createForm') as HTMLFormElement;
    const errorMessage = document.getElementById('error-message');
    const errorText = errorMessage?.querySelector('p');
    
    const showError = (message: string) => {
        if (errorMessage && errorText) {
            errorText.textContent = message;
            errorMessage.classList.remove('hidden');
            
            // Animation de l'erreur
            gsap.fromTo(errorMessage, 
                { scale: 0.8, opacity: 0 },
                { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out' }
            );
        }
    };

    const hideError = () => {
        if (errorMessage) {
            errorMessage.classList.add('hidden');
        }
    };

    const handleSubmit = (e: Event) => {
        e.preventDefault();
        hideError();
        
        const username = (document.getElementById('username') as HTMLInputElement).value;
        const password = (document.getElementById('password') as HTMLInputElement).value;
        const confirmPassword = (document.getElementById('confirmpassword') as HTMLInputElement).value;

        // Validation
        if (username.length < 3 || username.length > 20) {
            showError('⚠️ Username must be between 3 and 20 characters');
            return;
        }

        if (password.length < 6) {
            showError('⚠️ Password must be at least 6 characters');
            return;
        }

        if (password !== confirmPassword) {
            showError('⚠️ Passwords do not match');
            
            // Ajouter classe error aux champs password
            const passwordInput = document.getElementById('password') as HTMLInputElement;
            const confirmInput = document.getElementById('confirmpassword') as HTMLInputElement;
            passwordInput?.classList.add('error');
            confirmInput?.classList.add('error');
            
            // Retirer après 2 secondes
            setTimeout(() => {
                passwordInput?.classList.remove('error');
                confirmInput?.classList.remove('error');
            }, 2000);
            
            return;
        }

        // Animation du bouton
        const submitBtn = document.getElementById('submit-btn');
        if (submitBtn) {
            gsap.to(submitBtn, {
                scale: 0.95,
                duration: 0.1,
                yoyo: true,
                repeat: 1
            });
        }

        // TODO: Logique de création de compte réelle
        console.log('Create account attempt:', { username, password });
        
        // Animation de succès
        gsap.to('#right-panel', {
            scale: 1.05,
            duration: 0.2,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                // Exemple de redirection après succès
                // window.router.navigate('/login');
            }
        });
    };

    if (form) {
        form.addEventListener('submit', handleSubmit);
    }

    // Cleanup
    return () => {
        if (form) {
            form.removeEventListener('submit', handleSubmit);
        }
    };
};
