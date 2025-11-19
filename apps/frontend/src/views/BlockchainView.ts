// apps/frontend/src/views/BlockchainView.ts
import type { ViewFunction, CleanupFunction } from "../router/types";
import { BackButton } from "../components/Button";
import { gsap } from "gsap";

interface BlockchainTournament {
    tournamentName: string;
    maxPlayers: number;
    winnerId: string;
    winnerUsername: string;
    timestamp: string; // BigInt serialisé
}

interface LocalGame {
    tournament_id?: string;
    game_type: string;
    created_at: string;
}

export const BlockchainView: ViewFunction = () => {
    return `
        <!-- Fond "Blockchain" -->
        <div class="fixed inset-0 bg-[#02040a] overflow-hidden">
            <!-- Grille Hexagonale ou Digitale -->
            <div class="absolute inset-0" style="
                background-image: 
                    linear-gradient(rgba(139, 92, 246, 0.05) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(139, 92, 246, 0.05) 1px, transparent 1px);
                background-size: 30px 30px;
                transform: perspective(500px) rotateX(60deg);
                transform-origin: center 80%;
                animation: gridFlow 20s linear infinite;
            "></div>

            <!-- Flux de données binaire en arrière plan -->
            ${Array.from({length: 20}, () => `
                <div class="absolute text-[#3b82f6] opacity-10 font-mono text-xs select-none" 
                     style="
                        left: ${Math.random() * 100}%; 
                        top: -20px; 
                        animation: binaryRain ${5 + Math.random() * 10}s linear infinite;
                        animation-delay: ${Math.random() * 5}s;
                     ">
                    ${Math.random().toString(2).substring(2, 10)}
                </div>
            `).join('')}

            <style>
                @keyframes gridFlow {
                    0% { background-position: 0 0; }
                    100% { background-position: 0 60px; }
                }
                @keyframes binaryRain {
                    0% { transform: translateY(-100%); opacity: 0; }
                    10% { opacity: 0.2; }
                    90% { opacity: 0.2; }
                    100% { transform: translateY(110vh); opacity: 0; }
                }
                @keyframes pulse-purple {
                    0%, 100% { box-shadow: 0 0 10px rgba(139, 92, 246, 0.3); border-color: rgba(139, 92, 246, 0.5); }
                    50% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.6); border-color: rgba(139, 92, 246, 0.8); }
                }
                
                .crypto-card {
                    background: rgba(10, 10, 25, 0.7);
                    backdrop-filter: blur(12px);
                    border: 1px solid rgba(139, 92, 246, 0.3);
                    transition: all 0.3s ease;
                }
                .crypto-card:hover {
                    transform: translateY(-5px);
                    border-color: #8b5cf6;
                    box-shadow: 0 0 30px rgba(139, 92, 246, 0.2);
                }
                
                .hash-text {
                    font-family: 'Courier New', monospace;
                    letter-spacing: -0.5px;
                }
            </style>
        </div>

        <div class="relative z-10 min-h-screen flex flex-col">
            <!-- Header -->
            <div class="p-8 flex justify-between items-start">
                ${BackButton({
                    size: "lg",
                    className: "text-center text-white z-10 p-4 rounded bg-[#0C154D]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
                })}
                
                <!-- Badge Avalanche -->
                <div class="flex flex-col items-center gap-2">
                    <div class="flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/10 border border-red-500/30">
                        <div class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                        <span class="pixel-font text-xs text-red-400">AVALANCHE C-CHAIN</span>
                    </div>
                    <div class="text-xs text-white/30 mt-1 font-mono">CONTRACT: REGISTERED</div>
                </div>
            </div>

            <!-- Contenu -->
            <div class="container mx-auto px-8 pb-12">
                <div class="text-center mb-12">
                    <h1 class="pixel-font text-5xl font-bold md:text-6xl text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 mb-4 filter drop-shadow-lg">
                        BLOCKCHAIN REGISTRY
                    </h1>
                    <p class="pixel-font text-blue-300/60 tracking-widest">
                        IMMUTABLE TOURNAMENT RECORDS
                    </p>
                </div>

                <!-- Stats Bar -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
                    <div class="crypto-card rounded-xl p-6 text-center">
                        <div class="text-purple-400 text-xs pixel-font mb-2">TOTAL VERIFIED</div>
                        <div id="total-tournaments" class="text-4xl font-bold text-white font-mono">0</div>
                    </div>
                    <div class="crypto-card rounded-xl p-6 text-center">
                        <div class="text-blue-400 text-xs pixel-font mb-2">NETWORK STATUS</div>
                        <div class="text-xl font-bold text-green-400 pixel-font mt-2">ONLINE</div>
                    </div>
                    <div class="crypto-card rounded-xl p-6 text-center">
                        <div class="text-pink-400 text-xs pixel-font mb-2">LATEST BLOCK</div>
                        <div id="block-height" class="text-xl font-bold text-white font-mono mt-2 animate-pulse">SYNCING...</div>
                    </div>
                </div>

                <!-- Loading -->
                <div id="blockchain-loading" class="flex flex-col items-center justify-center py-20">
                    <div class="relative w-24 h-24 mb-8">
                        <div class="absolute inset-0 border-4 border-purple-500/30 rounded-full"></div>
                        <div class="absolute inset-0 border-4 border-t-purple-500 rounded-full animate-spin"></div>
                        <div class="absolute inset-4 border-4 border-blue-500/30 rounded-full"></div>
                        <div class="absolute inset-4 border-4 border-b-blue-500 rounded-full animate-spin" style="animation-direction: reverse;"></div>
                    </div>
                    <p class="pixel-font text-purple-300 animate-pulse">CONNECTING TO NODE...</p>
                </div>

                <!-- Liste des Tournois -->
                <div id="blockchain-list" class="grid grid-cols-1 gap-6 max-w-5xl mx-auto hidden">
                    <!-- Les cartes seront injectées ici -->
                </div>

                <!-- Empty State -->
                <div id="blockchain-empty" class="hidden text-center py-20">
                    <div class="text-6xl mb-4 opacity-50">⛓️</div>
                    <h3 class="pixel-font text-2xl text-white mb-2">NO RECORDS FOUND</h3>
                    <p class="text-white/40 font-mono text-sm">The ledger is empty.</p>
                </div>
            </div>
        </div>
    `;
};

export const blockchainLogic = (): CleanupFunction => {
    const host = import.meta.env.VITE_HOST || 'localhost:8443';
    let isComponentMounted = true;

    gsap.from("h1", { y: -50, opacity: 0, duration: 1, ease: "power3.out" });
    gsap.from(".crypto-card", { 
        y: 50, opacity: 0, duration: 0.8, stagger: 0.1, delay: 0.3, ease: "back.out(1.7)" 
    });

    const blockInterval = setInterval(() => {
        const blockEl = document.getElementById('block-height');
        if (blockEl) {
            const height = Math.floor(Math.random() * 1000000) + 12000000;
            blockEl.textContent = `#${height}`;
        }
    }, 3000);

    const fetchBlockchainData = async () => {
        try {
            const response = await fetch(`https://${host}/blockchainback/tournaments/all`);
            
            if (!response.ok) throw new Error("Network response was not ok");
            
            const data = await response.json();

            if (isComponentMounted) {
                if (data.success) {
                    updateUI(data.tournaments);
                } else {
                    throw new Error(data.error || "Unknown error");
                }
            }

        } catch (err) {
            console.error("Blockchain fetch error:", err);
            if (isComponentMounted) {
                const loading = document.getElementById('blockchain-loading');
                if (loading) loading.innerHTML = `<p class="text-red-500 pixel-font">CONNECTION ERROR</p>`;
            }
        }
    };

    const updateUI = (tournaments: Array<{id: string, data: BlockchainTournament}>) => {
        const loading = document.getElementById('blockchain-loading');
        const list = document.getElementById('blockchain-list');
        const empty = document.getElementById('blockchain-empty');
        const countEl = document.getElementById('total-tournaments');

        if (loading) loading.style.display = 'none';
        if (countEl) countEl.textContent = tournaments.length.toString();

        if (tournaments.length === 0) {
            if (empty) empty.style.display = 'block';
            return;
        }

        if (list) {
            list.style.display = 'grid';
            list.innerHTML = tournaments.map((t) => {
                const date = new Date(Number(t.data.timestamp) * 1000).toLocaleString();
                const visualHash = '0x' + btoa(t.id).substring(0, 40).toLowerCase() + '...';

                return `
                <div class="crypto-card rounded-xl p-6 relative overflow-hidden group opacity-0 translate-y-4 tournament-item">
                    <!-- Effet shimmer -->
                    <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    
                    <div class="flex flex-col md:flex-row justify-between items-center gap-6">
                        <!-- Info Gauche -->
                        <div class="flex items-center gap-6">
                            <div class="w-16 h-16 rounded-lg bg-purple-900/30 border border-purple-500/30 flex items-center justify-center text-3xl">
                                🏆
                            </div>
                            <div>
                                <div class="flex items-center gap-3 mb-1">
                                    <h3 class="text-2xl font-bold text-white pixel-font">${t.data.tournamentName}</h3>
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                                        VERIFIED
                                    </span>
                                </div>
                                <div class="flex items-center gap-4 text-sm text-blue-200/60 font-mono">
                                    <span>Players: ${t.data.maxPlayers}</span>
                                    <span>•</span>
                                    <span>${date}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Info Droite (Winner) -->
                        <div class="text-right">
                            <div class="text-xs text-purple-400 mb-1 pixel-font">WINNER</div>
                            <div class="text-xl text-white font-bold flex items-center justify-end gap-2">
                                <span>${t.data.winnerUsername}</span>
                                <span class="text-yellow-400">👑</span>
                            </div>
                            <div class="mt-2 p-2 bg-black/40 rounded border border-white/10 flex items-center gap-2 cursor-help" title="Transaction Hash">
                                <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                <span class="text-[10px] text-white/40 hash-text">${visualHash}</span>
                            </div>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            gsap.to(".tournament-item", {
                opacity: 1,
                y: 0,
                duration: 0.5,
                stagger: 0.1,
                ease: "power2.out"
            });
        }
    };

    fetchBlockchainData();

    return () => {
        isComponentMounted = false;
        clearInterval(blockInterval);
    };
};
