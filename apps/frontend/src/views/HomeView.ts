import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";
import { 
    Button,
    SkinButton,
    SettingsButton,
	CoffeeButton
} from "../components/Button";


export const HomeView: ViewFunction = () => {
    return `
		${Header({ isLogged: false })}
        <div class="container ml-auto mr-auto">
            <h1 class="text-9xl text-amber-300">Pong</h1>
			${Button({ // -> syntax pour appeler la fonction creer dans les composants
				children: "Start game",
				variant: "primary",
				size: "lg",
				href: "/startgame",
				className: "flex justify-center align-center"
			})} 
			${SkinButton()}
			${SettingsButton()}
			${CoffeeButton()}
        </div>
    `;
};
