# BlockchainBack Service

Service backend pour enregistrer les résultats des tournois sur la blockchain Avalanche.

## Description

Ce service agit comme un pont entre l'application Transcendence et la blockchain Avalanche. Il est automatiquement appelé par `tournamentback` à la fin de chaque tournoi pour enregistrer de manière immuable les résultats sur la blockchain.

## Fonctionnalités

- Enregistrement des résultats de tournois sur la blockchain
- Lecture des tournois enregistrés
- Support de Avalanche Fuji Testnet et Mainnet
- Mode read-only si pas de clé privée configurée

## API Endpoints

### POST `/register-tournament`
Enregistre un tournoi sur la blockchain.

**Body:**
```json
{
  "tournamentId": "string",
  "tournamentName": "string",
  "maxPlayers": number,
  "winnerId": "string",
  "winnerUsername": "string"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "message": "Tournament registered on blockchain"
}
```

### GET `/tournament/:tournamentId`
Récupère les détails d'un tournoi depuis la blockchain.

**Response:**
```json
{
  "success": true,
  "tournament": {
    "tournamentName": "string",
    "maxPlayers": number,
    "winnerId": "string",
    "winnerUsername": "string",
    "timestamp": bigint
  }
}
```

### GET `/tournaments/count`
Retourne le nombre total de tournois enregistrés.

**Response:**
```json
{
  "success": true,
  "count": number
}
```

### GET `/health`
Endpoint de santé du service.

**Response:**
```json
{
  "status": "ok",
  "service": "blockchain-backend",
  "blockchain": "connected"
}
```

## Configuration

Les variables d'environnement suivantes sont nécessaires (déjà dans `.env`) :

```env
# RPC URLs
FUJI_RPC_URL=https://api.avax-test.network/ext/bc/C/rpc
AVALANCHE_RPC_URL=https://api.avax.network/ext/bc/C/rpc

# Contract
BLOCKCHAIN_CONTRACT_ADDRESS=0xaeB9f52e3E9EB4f5033DF31400E06d1d333856a4
BLOCKCHAIN_PRIVATE_KEY=0x...

# API Key (optionnel)
SNOWTRACE_API_KEY=...
```

## Intégration

Le service est automatiquement appelé par `tournamentback` lorsqu'un tournoi se termine. L'appel se fait dans `TournamentManager.checkRoundCompletion()` :

```typescript
if (tournament.winner) {
  await this.registerTournamentOnBlockchain(
    tournament.id,
    tournament.name,
    tournament.maxPlayers,
    tournament.winner.id,
    tournament.winner.username
  );
}
```

## Smart Contract

Le service utilise le contrat `TournamentRegistry.sol` déployé sur Avalanche Fuji Testnet.

Contract address: `0xaeB9f52e3E9EB4f5033DF31400E06d1d333856a4`

## Architecture

```
tournamentback (fin de tournoi)
    ↓
blockchainback (port 3070)
    ↓
Avalanche Blockchain (Fuji Testnet)
    ↓
Smart Contract TournamentRegistry
```

## Développement

```bash
# Build le service
docker-compose build blockchainback

# Restart le service
docker-compose up -d blockchainback

# Voir les logs
docker-compose logs -f blockchainback
```

## Notes

- Le service ne bloque pas la fin du tournoi si la blockchain n'est pas disponible
- Les erreurs blockchain sont loggées mais ne font pas échouer le tournoi
- Le contrat doit être déployé et l'adresse configurée avant utilisation
- La clé privée doit avoir des fonds (AVAX) pour payer les frais de gas
