# Documentation : Créer et Utiliser des Composants

Ce document explique comment créer, enregistrer et utiliser des composants réutilisables dans notre projet.

## **Le Concept de Composant**

Dans notre architecture, un "Composant" est une brique de code autonome qui contrôle une portion de l'interface utilisateur (une partie du DOM). Son but est d'encapsuler à la fois :
1.  **Le comportement** : la logique JavaScript/TypeScript (ex: gérer des clics, afficher des données, etc.).
2.  **Le cycle de vie** : ce qui se passe à sa création (`constructor`) et à sa destruction (`cleanup`).

Chaque composant est une classe TypeScript qui est associée à un élément HTML via un attribut `data-component`. Le `ComponentManager` se charge de trouver ces éléments et de donner vie aux composants correspondants.

L'avantage principal est de pouvoir créer des éléments d'interface (comme un modal, un menu déroulant, un compteur interactif) une seule fois et de les réutiliser partout dans l'application, sans se soucier de dupliquer la logique ou de provoquer des fuites de mémoire.

---

## **Comment Créer un Nouveau Composant**

Suis ces 3 étapes pour créer un composant fonctionnel. Nous allons prendre l'exemple d'un simple compteur.

### **Étape 1 : Créer le Fichier du Composant**

Crée un nouveau fichier pour ta classe. Par convention, nommons-le avec un `PascalCase` suivi de `.ts`.

Exemple : `src/components/CounterComponent.ts`

### **Étape 2 : Écrire la Classe du Composant**

La classe **doit** implémenter l'interface `Component`, ce qui nous force à créer une méthode `cleanup`.

Voici la structure de base d'un composant :

```typescript
// src/components/CounterComponent.ts

// On importe l'interface Component pour respecter le contrat
import type { Component } from './ComponantManager'; // Adapte le chemin d'importation

export class CounterComponent implements Component {
    // L'élément HTML auquel notre composant est rattaché
    private element: HTMLElement;
    // Les éléments internes que notre composant va manipuler
    private countSpan: HTMLElement | null;
    private incrementButton: HTMLElement | null;
    
    // Notre logique de compteur
    private count = 0;

    // La fonction qui sera liée à l'événement 'click'
    // On utilise une fonction fléchée pour conserver le bon 'this'
    private handleIncrement = () => {
        this.count++;
        if (this.countSpan) {
            this.countSpan.textContent = this.count.toString();
        }
    };

    // Le constructeur est appelé automatiquement par le ComponentManager
    constructor(element: HTMLElement) {
        console.log('CounterComponent a été créé !', element);
        this.element = element;

        // 1. Initialiser les références aux éléments du DOM
        this.countSpan = this.element.querySelector('.count');
        this.incrementButton = this.element.querySelector('.increment-btn');

        // 2. Initialiser l'état initial de l'affichage
        if (this.countSpan) {
            this.countSpan.textContent = this.count.toString();
        }

        // 3. Ajouter les écouteurs d'événements (la logique)
        if (this.incrementButton) {
            this.incrementButton.addEventListener('click', this.handleIncrement);
        }
    }

    // La méthode cleanup est appelée automatiquement avant un changement de page
    cleanup(): void {
        console.log('CounterComponent est nettoyé !');
        
        // On retire les écouteurs d'événements pour éviter les fuites de mémoire
        if (this.incrementButton) {
            this.incrementButton.removeEventListener('click', this.handleIncrement);
        }
    }
}
```

**Points importants :**

*   **`constructor(element: HTMLElement)`** : C'est le point d'entrée. Il reçoit l'élément du DOM qui porte l'attribut `data-component`. C'est ici que tu initialises tout : tu trouves les sous-éléments, tu ajoutes tes `addEventListener`, tu lances des `setInterval`, etc.
*   **`cleanup(): void`** : C'est la fonction de nettoyage. Elle est **essentielle**. Son rôle est de défaire tout ce que le `constructor` a fait. Si tu as ajouté un `addEventListener`, tu dois faire un `removeEventListener`. Si tu as lancé un `setInterval`, tu dois faire un `clearInterval`. Cela empêche les "fuites de mémoire" et les comportements fantômes quand on navigue d'une page à l'autre.

### **Étape 3 : Creer la fonction qui retourne le DOM**

Pour encapsuler l'usage dans une fonction on en defini une qui a le nom du composant qui retourne le DOM qui nous interesse, **C'est cette fonction qu'on appellera dans nos vues**

```typescript
// 3. Fonction HTML
export function CounterComponent() {
    return `<div data-component="counter">
                <p>Compte actuel : <span class="count">0</span></p>
                <button class="increment-btn">Ajouter 1</button>
            </div>`;
}
```

### **Étape 4 : Enregistrer le Composant**

Maintenant que la classe est créée, il faut la "déclarer" à notre système pour qu'il puisse la trouver. Pour cela, on utilise le `ComponentRegistry`.

Idéalement, on centralise tous les enregistrements dans un seul fichier, par exemple `src/components/index.ts`.

```typescript
// src/components/index.ts (ou un fichier similaire)

import { ComponentRegistry } from './ComponantManager';
import { CounterComponent } from './CounterComponent';
// Importe ici tous les autres composants que tu crées

export function registerComponents(): void {
    // On associe un nom (en string) à une classe (le constructeur)
    ComponentRegistry.register('counter', CounterComponent);
    
    // Enregistre tes autres composants ici
    // ComponentRegistry.register('mon-autre-composant', MonAutreComposant);
}
```

N'oublie pas d'appeler cette fonction `registerComponents()` une seule fois au démarrage de ton application, par exemple dans ton `main.ts`.

```typescript
// main.ts
import { Router } from './router/Router';
import { registerComponents } from './components'; // Importer la fonction

// Enregistrer tous les composants avant de démarrer le routeur
registerComponents(); 

const router = new Router();
// ... le reste de ton code
```

---

## **Comment Utiliser le Composant dans une Vue**

Une fois le composant créé et enregistré, son utilisation est très simple.

Dans le code HTML renvoyé par n'importe laquelle de tes vues (ex: `HomeView`, `GameView`), il te suffit de placer un élément HTML avec l'attribut `data-component` correspondant au nom que tu as utilisé lors de l'enregistrement.

```typescript
import { Header } from "../components/Header"; // On importe la fonction

export const TestView: ViewFunction = () => {
	return `
		${Header({ isLogged: false })} // On appelle la fonction dans ${} qui retourne une string
        // Reste de la vue
	`;
};

```

**Que se passe-t-il ?**
1.  Le `Router` affiche le HTML de la nouvelle page.
2.  Il appelle `componentManager.scanAndMount()`.
3.  Le manager trouve `<div data-component="counter">`.
4.  Il cherche "counter" dans le `ComponentRegistry`.
5.  Il trouve la classe `CounterComponent` que nous avons enregistrée.
6.  Il exécute `new CounterComponent(element)`, où `element` est le `div` en question.
7.  Ton composant est vivant et interactif !

Quand tu navigueras vers une autre page, le `Router` appellera la méthode `cleanup()` de ton instance de `CounterComponent` avant de changer le contenu de la page, assurant un nettoyage propre.