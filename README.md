# Transcendence

Application web fullstack autour du célèbre jeu "Pong", projet final du cursus de base de l'école 42.

## Description

Transcendence est une plateforme de jeu Pong en ligne permettant aux utilisateurs de jouer en temps réel, de participer à des tournois et d'enregistrer leurs scores sur une blockchain. Le projet utilise une architecture microservices entièrement conteneurisée avec Docker.

## Architecture

Le projet est composé de plusieurs microservices :

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 5173 | Interface utilisateur en TypeScript/Vite avec Babylon.js pour le rendu 3D |
| **Database** | 3020 | Service de base de données SQLite avec API REST |
| **Userback** | 3060 | Gestion des utilisateurs et authentification |
| **Gameback** | 3010 | Logique de jeu et WebSocket pour le temps réel |
| **Quickplayback** | 3030 | Matchmaking et parties rapides |
| **Tournamentback** | 3040 | Gestion des tournois |
| **Blockchainback** | 3070 | Intégration blockchain (Ethereum/Solidity) |
| **Nginx** | 8443/8080 | Reverse proxy et terminaison SSL |

## Technologies

### Frontend
- **TypeScript** + **Vite**
- **Babylon.js** pour le rendu 3D
- **Tailwind CSS** pour le styling
- **GSAP** pour les animations
- Architecture SPA avec routeur custom

### Backend
- **Fastify** (Node.js) pour tous les microservices
- **WebSocket** pour la communication temps réel
- **SQLite** pour la persistance des données
- **TypeScript** avec **tsx** pour l'exécution

### Blockchain
- **Solidity** pour les smart contracts
- **Ethers.js** pour l'interaction avec la blockchain
- Enregistrement des résultats de tournois sur Ethereum

### Infrastructure
- **Docker** & **Docker Compose**
- **Nginx** comme reverse proxy avec HTTPS
- Health checks sur tous les services

## Installation

### Prérequis

- Docker et Docker Compose
- Make

### Démarrage

1. Cloner le repository :
```bash
git clone <repository-url>
cd transcendence
```

2. Créer un fichier `.env` à la racine avec les variables d'environnement nécessaires.

3. Lancer l'application :
```bash
make up
```

L'application sera accessible sur :
- **HTTPS** : https://localhost:8443
- **HTTP** : http://localhost:8080

## Commandes Make

| Commande | Description |
|----------|-------------|
| `make up` | Build et démarre tous les services |
| `make build` | Build les images Docker |
| `make down` | Arrête tous les services |
| `make restart` | Redémarre tous les services |
| `make ps` | Affiche l'état des services |
| `make health` | Vérifie la santé de l'application |
| `make clean` | Supprime les conteneurs, volumes et images |
| `make re` | Clean + up |
| `make logs-*` | Affiche les logs d'un service spécifique |
| `make test-blockchain` | Lance les tests blockchain |

### Logs disponibles
- `make logs-front`
- `make logs-nginx`
- `make logs-gameback`
- `make logs-userback`
- `make logs-quickplay`
- `make logs-tournament`
- `make logs-db`
- `make logs-blockchain`

## Structure du Projet

```
transcendence/
├── apps/
│   ├── frontend/          # Interface utilisateur
│   ├── database/          # Service de base de données
│   ├── userback/          # Gestion des utilisateurs
│   ├── gameback/          # Logique de jeu
│   ├── quickplayback/     # Matchmaking
│   ├── tournamentback/    # Gestion des tournois
│   └── blockchainback/    # Intégration blockchain
├── blockchain/
│   ├── contract/          # Smart contracts Solidity
│   ├── build/             # Contrats compilés
│   └── scripts/           # Scripts de déploiement
├── infra/
│   └── docker/            # Dockerfiles et configuration
├── scripts/               # Scripts utilitaires
├── docker-compose.yml     # Orchestration des services
├── Makefile              # Commandes de gestion
└── README.md
```

## Fonctionnalités

- **Jeu Pong en temps réel** avec rendu 3D
- **Système d'authentification** et gestion des profils
- **Matchmaking** pour parties rapides
- **Tournois** avec enregistrement des résultats sur blockchain
- **Communication WebSocket** pour une expérience fluide

## Licence

Ce projet est sous licence MIT - voir le fichier [LICENSE](LICENSE) pour plus de détails.

---

Projet réalisé dans le cadre du cursus 42.
