import type { ViewFunction } from "../router/types";

export const HomeView: ViewFunction = () => {
    return `
		<header>
			<ul>
				<li>
					<a href="/test">Test</a>
				</li>
			</ul>
		</header>
        <div class="container ml-auto mr-auto">
            <h1 class="text-9xl text-amber-300">Home</h1>
        </div>
    `;
};
