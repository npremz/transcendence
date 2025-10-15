import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";

export const QuickPlayView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })}
		<div class="container mx-auto p-6">
			<h1 class="text-3xl font-bold mb-6">QuickPlay</h1>
			
			<div class="flex flex-col gap-4 max-w-md">
				<a href="/play/waiting" class="px-6 py-3 bg-green-600 text-white rounded text-center">
					Play Online
				</a>
				<button class="px-6 py-3 bg-gray-400 text-white rounded" disabled>
					Play Local (Coming Soon)
				</button>
				<button class="px-6 py-3 bg-gray-400 text-white rounded" disabled>
					Play vs AI (Coming Soon)
				</button>
			</div>
		</div>
	`;
};
