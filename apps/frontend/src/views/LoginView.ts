import type { ViewFunction } from "../router/types";
import { 
	Button,
	BackButton
	 } from "../components/Button";

 export const LoginView: ViewFunction = () => {
	return `
		<!-- Fond étoilé -->
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
			
			

		<!-- BackButton -->
		
		<!-- Fenêtre centrale -->
		<div class="fixed inset-0 flex items-center justify-center z-10 px-8">
		<div class="bg-[#0C154D]/30 backdrop-blur-md border border-white/20 rounded-lg p-8 w-full max-w-6xl min-h-[600px] shadow-2xl flex">
		<!-- Côté gauche avec le formulaire -->
			<div class="w-1/2 border-r border-white/20 p-8 flex items-center justify-center">
				<div class="absolute top-8 left-8">
					${BackButton({
						size: "lg",
						className: "text-center text-white z-10 p-4 rounded bg-[#0C154D]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20"
					})}
				</div>
					<img 
						src="/sprites/cat.gif" 
						alt="Animation"
						class="w-full h-full object-contain rounded"
					/>
			</div>
			<!-- Côté droit avec le formulaire -->
			<div class="w-1/2 px-8 flex flex-col justify-center items-center">
				<h1 class="text-4xl font-bold mb-4 text-white">Hello !</h1>
				<h2 class="text-2xl font-bold mb-8 text-white/80 text-center">Login your account</h2>

				<form action="/login" method="POST" id="loginForm">
					<div class="mb-4">
						<label for="username" class="block mb-2 text-white/70">Username:</label>
						<input 
							type="text" 
							id="username" 
							name="username"
							placeholder="Enter your username"
							required
							class="w-full p-2 rounded bg-[#101C69]/40 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
						>
					</div>
					<div class="mb-6">
						<label for="password" class="block mb-2 text-white/70">Password:</label>
						<input 
							type="password" 
							id="password" 
							name="password"
							placeholder="Enter your password"
							required
							class="w-full p-2 rounded bg-[#101C69]/40 border border-white/20 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
						>
					</div>
					<button type="submit" class="w-full py-2 mb-4 text-center bg-[#101C69]/20 backdrop-blur-sm border border-white/20 text-white hover:bg-[#1D31B8]/20">
						Submit
					</button>
				</form>

				${Button({
					children: "Create account",
					variant: "default",
					size: "sm",
					href: "/create",
					className: "w-full text-center text-white/80"
				})} 
			</div>
		</div>
	`;
};
	