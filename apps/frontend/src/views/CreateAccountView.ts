import type { ViewFunction } from "../router/types";
import { 
	Button,
	BackButton
	 } from "../components/Button";

export const CreateAccountView: ViewFunction = () => {
    return `
		${BackButton()}
        <div>
            <h1 class="text-4xl font-bold mb-8">Hello !</h1>
			<h2 class="text-2xl font-bold mb-8">Create an account</h2>

			<form action="/login" method="POST" id="loginForm">
				<div>
					<label for="username">Username:</label>
					<input 
						type="text" 
						id="username" 
						name="username"
						placeholder="Enter username"
						required
				>
				</div>
				<div>
					<label for="password">Password:</label>
					<input 
						type="text" 
						id="password" 
						name="password"
						placeholder="Enter password"
						required
				>
				</div>
				<button type="submit">Submit</button>
			</form>

			${Button({ // -> syntax pour appeler la fonction creer dans les composants
				children: "Create account",
				variant: "secondary",
				size: "sm",
				href: "",
				className: "flex justify-center align-center"
			})} 

        </div>
    `;
};
