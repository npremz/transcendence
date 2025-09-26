import type { ViewFunction } from "../router/types";
import { Header } from "../components/Header";
import { VolumeControl } from "../components/VolumeControl";
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
			<div class="fixed bottom-4 right-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg">
            ${VolumeControl({ 
                initialVolume: 0,
                className: "w-32"
            })}
        </div>
        </div>
    `;
};
