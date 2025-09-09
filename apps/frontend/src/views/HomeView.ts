import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";
import { Button } from "../components/Button"; // -> Pour import un composant cre

export const HomeView: ViewFunction = () => {
    return `
		${Header({ isLogged: false })}
        <div class="container ml-auto mr-auto">
            <h1 class="text-9xl text-amber-300">Home</h1>
			${Button({ // -> syntax pour appeler la fonction creer dans les composants
				children: "Btn",
				variant: "primary",
				size: "lg",
				href: "/game",
				className: "flex justify-center align-center"
			})} 
        </div>
    `;
};
