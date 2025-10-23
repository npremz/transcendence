#!/bin/bash

# ═══════════════════════════════════════════════════════
# Script de test pour l'API Database de Transcendence
# Avec nettoyage automatique des données de test
# ═══════════════════════════════════════════════════════

# set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
API_URL="https://fu-r5-p5:8443/gamedb"
CURL_OPTS="-k"

# Générer des identifiants uniques avec timestamp
TIMESTAMP=$(date +%s)
RANDOM_SUFFIX=$((RANDOM % 10000))

PLAYER1_ID="test-player1-${TIMESTAMP}-${RANDOM_SUFFIX}"
PLAYER2_ID="test-player2-${TIMESTAMP}-${RANDOM_SUFFIX}"
PLAYER3_ID="test-player3-${TIMESTAMP}-${RANDOM_SUFFIX}"
PLAYER4_ID="test-player4-${TIMESTAMP}-${RANDOM_SUFFIX}"

PLAYER1_USERNAME="TestPlayer1-${TIMESTAMP}-${RANDOM_SUFFIX}"
PLAYER2_USERNAME="TestPlayer2-${TIMESTAMP}-${RANDOM_SUFFIX}"
PLAYER3_USERNAME="TestPlayer3-${TIMESTAMP}-${RANDOM_SUFFIX}"
PLAYER4_USERNAME="TestPlayer4-${TIMESTAMP}-${RANDOM_SUFFIX}"

TOURNAMENT_ID="test-tournament-${TIMESTAMP}-${RANDOM_SUFFIX}"
GAME_ID="test-game-${TIMESTAMP}-${RANDOM_SUFFIX}"
ROOM_ID="test-room-${TIMESTAMP}-${RANDOM_SUFFIX}"

# Compteurs
TESTS_PASSED=0
TESTS_FAILED=0

# Tableau pour tracker les ressources créées
declare -a CREATED_USERS=()
declare -a CREATED_TOURNAMENTS=()
declare -a CREATED_GAMES=()

# ═══════════════════════════════════════════════════════
# Fonctions utilitaires
# ═══════════════════════════════════════════════════════

print_header() {
	echo -e "\n${BLUE}═══════════════════════════════════════════════════════${NC}"
	echo -e "${BLUE}  $1${NC}"
	echo -e "${BLUE}═══════════════════════════════════════════════════════${NC}\n"
}

print_test() {
	echo -e "${YELLOW}▶ Test:${NC} $1"
}

print_success() {
	echo -e "${GREEN}✓ Succès:${NC} $1"
	((TESTS_PASSED++))
}

print_error() {
	echo -e "${RED}✗ Échec:${NC} $1"
	((TESTS_FAILED++))
}

print_cleanup() {
	echo -e "${MAGENTA}🧹 Nettoyage:${NC} $1"
}

check_service() {
	print_header "Vérification du service"
	
	if curl $CURL_OPTS -s -f "$API_URL/health" > /dev/null; then
		print_success "Service database opérationnel"
	else
		print_error "Service database non accessible sur $API_URL"
		exit 1
	fi
}

# ═══════════════════════════════════════════════════════
# Fonction de nettoyage
# ═══════════════════════════════════════════════════════

cleanup_test_data() {
	print_header "Nettoyage des données de test"
	
	local cleanup_count=0
	
	# Nettoyer les parties (games)
	for game_id in "${CREATED_GAMES[@]}"; do
		if [ -n "$game_id" ]; then
			curl $CURL_OPTS -s -X DELETE "$API_URL/games/$game_id" > /dev/null 2>&1 || true
			((cleanup_count++))
		fi
	done
	
	# Nettoyer les tournois (tournaments)
	for tournament_id in "${CREATED_TOURNAMENTS[@]}"; do
		if [ -n "$tournament_id" ]; then
			curl $CURL_OPTS -s -X DELETE "$API_URL/tournaments/$tournament_id" > /dev/null 2>&1 || true
			((cleanup_count++))
		fi
	done
	
	# Nettoyer les utilisateurs (users)
	for user_id in "${CREATED_USERS[@]}"; do
		if [ -n "$user_id" ]; then
			curl $CURL_OPTS -s -X DELETE "$API_URL/users/$user_id" > /dev/null 2>&1 || true
			((cleanup_count++))
		fi
	done
	
	if [ $cleanup_count -gt 0 ]; then
		print_cleanup "$cleanup_count ressources supprimées"
	else
		print_cleanup "Aucune ressource à nettoyer"
	fi
}

# Trap pour nettoyer même en cas d'erreur
trap cleanup_test_data EXIT

# ═══════════════════════════════════════════════════════
# Tests Users
# ═══════════════════════════════════════════════════════

test_users() {
	print_header "Tests Users"
	
	# Test 1: Créer un utilisateur
	print_test "Créer un utilisateur (player1)"
	RESPONSE=$(curl $CURL_OPTS -s -X POST "$API_URL/users" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"$PLAYER1_ID\",\"username\":\"$PLAYER1_USERNAME\"}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Utilisateur créé"
		CREATED_USERS+=("$PLAYER1_ID")
	else
		print_error "Échec création utilisateur: $RESPONSE"
	fi
	
	# Test 2: Créer les autres joueurs
	curl $CURL_OPTS -s -X POST "$API_URL/users" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"$PLAYER2_ID\",\"username\":\"$PLAYER2_USERNAME\"}" > /dev/null
	CREATED_USERS+=("$PLAYER2_ID")
	
	curl $CURL_OPTS -s -X POST "$API_URL/users" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"$PLAYER3_ID\",\"username\":\"$PLAYER3_USERNAME\"}" > /dev/null
	CREATED_USERS+=("$PLAYER3_ID")
	
	curl $CURL_OPTS -s -X POST "$API_URL/users" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"$PLAYER4_ID\",\"username\":\"$PLAYER4_USERNAME\"}" > /dev/null
	CREATED_USERS+=("$PLAYER4_ID")
	
	print_success "3 utilisateurs supplémentaires créés"
	
	# Test 3: Récupérer un utilisateur par ID
	print_test "Récupérer un utilisateur par ID"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/users/$PLAYER1_ID")
	
	if echo "$RESPONSE" | grep -q "$PLAYER1_USERNAME"; then
		print_success "Utilisateur récupéré par ID"
	else
		print_error "Échec récupération par ID: $RESPONSE"
	fi
	
	# Test 4: Rechercher par username
	print_test "Rechercher par username"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/users?username=$PLAYER1_USERNAME")
	
	if echo "$RESPONSE" | grep -q "$PLAYER1_ID"; then
		print_success "Utilisateur trouvé par username"
	else
		print_error "Échec recherche par username: $RESPONSE"
	fi
	
	# Test 5: Mettre à jour last_seen
	print_test "Mettre à jour last_seen"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/users/$PLAYER1_ID/last-seen")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "last_seen mis à jour"
	else
		print_error "Échec mise à jour last_seen: $RESPONSE"
	fi
	
	# Test 6: Incrémenter stats (victoire)
	print_test "Incrémenter stats (victoire)"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/users/$PLAYER1_ID/stats" \
		-H "Content-Type: application/json" \
		-d '{"won":true}')
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Stats incrémentées (victoire)"
	else
		print_error "Échec incrémentation stats: $RESPONSE"
	fi
	
	# Test 7: Incrémenter stats (défaite)
	print_test "Incrémenter stats (défaite)"
	curl $CURL_OPTS -s -X PATCH "$API_URL/users/$PLAYER2_ID/stats" \
		-H "Content-Type: application/json" \
		-d '{"won":false}' > /dev/null
	
	print_success "Stats incrémentées (défaite)"
	
	# Test 8: Leaderboard
	print_test "Récupérer le leaderboard"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/users/leaderboard")
	
	if echo "$RESPONSE" | grep -q "$PLAYER1_USERNAME"; then
		print_success "Leaderboard récupéré"
	else
		print_error "Échec récupération leaderboard: $RESPONSE"
	fi
	
	# Test 9: Tentative de créer un utilisateur avec username existant (doit échouer)
	print_test "Tentative de doublon username (doit échouer)"
	RESPONSE=$(curl $CURL_OPTS -s -w "\n%{http_code}" -X POST "$API_URL/users" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"duplicate-id-$TIMESTAMP\",\"username\":\"$PLAYER1_USERNAME\"}")
	
	HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
	if [ "$HTTP_CODE" = "409" ]; then
		print_success "Contrainte UNIQUE respectée (409 Conflict)"
	else
		print_error "Doublon non détecté (HTTP $HTTP_CODE)"
	fi
}

# ═══════════════════════════════════════════════════════
# Tests Tournaments
# ═══════════════════════════════════════════════════════

test_tournaments() {
	print_header "Tests Tournaments"
	
	# Test 1: Créer un tournoi
	print_test "Créer un tournoi"
	RESPONSE=$(curl $CURL_OPTS -s -X POST "$API_URL/tournaments" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"$TOURNAMENT_ID\",\"name\":\"4p\",\"max_players\":4}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Tournoi créé"
		CREATED_TOURNAMENTS+=("$TOURNAMENT_ID")
	else
		print_error "Échec création tournoi: $RESPONSE"
	fi
	
	# Test 2: Récupérer le tournoi
	print_test "Récupérer le tournoi"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/tournaments/$TOURNAMENT_ID")
	
	if echo "$RESPONSE" | grep -q "registration"; then
		print_success "Tournoi récupéré (status: registration)"
	else
		print_error "Échec récupération tournoi: $RESPONSE"
	fi
	
	# Test 3: Lister les tournois actifs
	print_test "Lister les tournois actifs"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/tournaments")
	
	if echo "$RESPONSE" | grep -q "$TOURNAMENT_ID"; then
		print_success "Tournoi dans la liste"
	else
		print_error "Tournoi absent de la liste: $RESPONSE"
	fi
	
	# Test 4: Démarrer le tournoi
	print_test "Démarrer le tournoi"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/tournaments/$TOURNAMENT_ID/start")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Tournoi démarré"
	else
		print_error "Échec démarrage tournoi: $RESPONSE"
	fi
	
	# Test 5: Avancer au round suivant
	print_test "Avancer au round suivant"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/tournaments/$TOURNAMENT_ID/next-round")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Round avancé"
	else
		print_error "Échec avancement round: $RESPONSE"
	fi
	
	# Test 6: Terminer le tournoi
	print_test "Terminer le tournoi"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/tournaments/$TOURNAMENT_ID/finish" \
		-H "Content-Type: application/json" \
		-d "{\"winner_id\":\"$PLAYER1_ID\"}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Tournoi terminé"
	else
		print_error "Échec fin tournoi: $RESPONSE"
	fi
}

# ═══════════════════════════════════════════════════════
# Tests Tournament Registrations
# ═══════════════════════════════════════════════════════

test_registrations() {
	print_header "Tests Tournament Registrations"
	
	# Créer un nouveau tournoi pour les inscriptions
	NEW_TOURNAMENT_ID="test-tournament-reg-${TIMESTAMP}-${RANDOM_SUFFIX}"
	curl $CURL_OPTS -s -X POST "$API_URL/tournaments" \
		-H "Content-Type: application/json" \
		-d "{\"id\":\"$NEW_TOURNAMENT_ID\",\"name\":\"4p\",\"max_players\":4}" > /dev/null
	CREATED_TOURNAMENTS+=("$NEW_TOURNAMENT_ID")
	
	# Test 1: Inscrire un joueur
	print_test "Inscrire un joueur"
	RESPONSE=$(curl $CURL_OPTS -s -X POST "$API_URL/tournament-registrations" \
		-H "Content-Type: application/json" \
		-d "{\"tournament_id\":\"$NEW_TOURNAMENT_ID\",\"player_id\":\"$PLAYER1_ID\"}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Joueur inscrit"
	else
		print_error "Échec inscription: $RESPONSE"
	fi
	
	# Test 2: Inscrire les autres joueurs
	curl $CURL_OPTS -s -X POST "$API_URL/tournament-registrations" \
		-H "Content-Type: application/json" \
		-d "{\"tournament_id\":\"$NEW_TOURNAMENT_ID\",\"player_id\":\"$PLAYER2_ID\"}" > /dev/null
	
	curl $CURL_OPTS -s -X POST "$API_URL/tournament-registrations" \
		-H "Content-Type: application/json" \
		-d "{\"tournament_id\":\"$NEW_TOURNAMENT_ID\",\"player_id\":\"$PLAYER3_ID\"}" > /dev/null
	
	print_success "2 joueurs supplémentaires inscrits"
	
	# Test 3: Lister les joueurs inscrits
	print_test "Lister les joueurs inscrits"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/tournament-registrations/tournament/$NEW_TOURNAMENT_ID")
	
	if echo "$RESPONSE" | grep -q "$PLAYER1_USERNAME"; then
		print_success "Liste des joueurs récupérée"
	else
		print_error "Échec récupération liste: $RESPONSE"
	fi
	
	# Test 4: Éliminer un joueur
	print_test "Éliminer un joueur"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/tournament-registrations/tournament/$NEW_TOURNAMENT_ID/player/$PLAYER2_ID/eliminate" \
		-H "Content-Type: application/json" \
		-d '{"final_position":3}')
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Joueur éliminé"
	else
		print_error "Échec élimination: $RESPONSE"
	fi
	
	# Test 5: Désinscrire un joueur (avant le début)
	print_test "Désinscrire un joueur"
	RESPONSE=$(curl $CURL_OPTS -s -X DELETE "$API_URL/tournament-registrations/tournament/$NEW_TOURNAMENT_ID/player/$PLAYER3_ID")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Joueur désinscrit"
	else
		print_error "Échec désinscription: $RESPONSE"
	fi
	
	# Test 6: Tentative de doublon (doit échouer)
	print_test "Tentative de doublon inscription (doit échouer)"
	RESPONSE=$(curl $CURL_OPTS -s -w "\n%{http_code}" -X POST "$API_URL/tournament-registrations" \
		-H "Content-Type: application/json" \
		-d "{\"tournament_id\":\"$NEW_TOURNAMENT_ID\",\"player_id\":\"$PLAYER1_ID\"}")
	
	HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
	if [ "$HTTP_CODE" = "409" ]; then
		print_success "Doublon détecté (409 Conflict)"
	else
		print_error "Doublon non détecté (HTTP $HTTP_CODE)"
	fi
}

# ═══════════════════════════════════════════════════════
# Tests Games
# ═══════════════════════════════════════════════════════

test_games() {
	print_header "Tests Games"
	
	# Test 1: Créer une partie quickplay
	print_test "Créer une partie quickplay"
	RESPONSE=$(curl $CURL_OPTS -s -X POST "$API_URL/games" \
		-H "Content-Type: application/json" \
		-d "{
			\"id\":\"$GAME_ID\",
			\"room_id\":\"$ROOM_ID\",
			\"game_type\":\"quickplay\",
			\"player_left_id\":\"$PLAYER1_ID\",
			\"player_right_id\":\"$PLAYER2_ID\"
		}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Partie créée"
		CREATED_GAMES+=("$GAME_ID")
	else
		print_error "Échec création partie: $RESPONSE"
	fi
	
	# Test 2: Récupérer la partie par room_id
	print_test "Récupérer la partie par room_id"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/games/room/$ROOM_ID")
	
	if echo "$RESPONSE" | grep -q "$PLAYER1_USERNAME"; then
		print_success "Partie récupérée"
	else
		print_error "Échec récupération partie: $RESPONSE"
	fi
	
	# Test 3: Démarrer la partie
	print_test "Démarrer la partie"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/games/room/$ROOM_ID/start")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Partie démarrée"
	else
		print_error "Échec démarrage partie: $RESPONSE"
	fi
	
	# Test 4: Terminer la partie
	print_test "Terminer la partie"
	RESPONSE=$(curl $CURL_OPTS -s -X PATCH "$API_URL/games/room/$ROOM_ID/finish" \
		-H "Content-Type: application/json" \
		-d "{
			\"score_left\":11,
			\"score_right\":9,
			\"winner_id\":\"$PLAYER1_ID\",
			\"end_reason\":\"score\"
		}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Partie terminée"
	else
		print_error "Échec fin partie: $RESPONSE"
	fi
	
	# Test 5: Historique d'un joueur
	print_test "Historique d'un joueur"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/games/player/$PLAYER1_ID/history")
	
	if echo "$RESPONSE" | grep -q "$ROOM_ID"; then
		print_success "Historique récupéré"
	else
		print_error "Échec récupération historique: $RESPONSE"
	fi
}

# ═══════════════════════════════════════════════════════
# Tests Game Stats
# ═══════════════════════════════════════════════════════

test_game_stats() {
	print_header "Tests Game Stats"
	
	# Test 1: Enregistrer les stats
	print_test "Enregistrer les stats d'une partie"
	RESPONSE=$(curl $CURL_OPTS -s -X POST "$API_URL/game-stats" \
		-H "Content-Type: application/json" \
		-d "{
			\"game_id\":\"$GAME_ID\",
			\"player_id\":\"$PLAYER1_ID\",
			\"side\":\"left\",
			\"paddle_hits\":52,
			\"smashes_used\":4,
			\"max_ball_speed\":1420.3,
			\"power_ups_collected\":3,
			\"time_disconnected_ms\":0
		}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Stats enregistrées"
	else
		print_error "Échec enregistrement stats: $RESPONSE"
	fi
	
	# Test 2: Stats d'une partie
	print_test "Récupérer les stats d'une partie"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/game-stats/game/$GAME_ID")
	
	if echo "$RESPONSE" | grep -q "paddle_hits"; then
		print_success "Stats de la partie récupérées"
	else
		print_error "Échec récupération stats partie: $RESPONSE"
	fi
	
	# Test 3: Stats agrégées d'un joueur
	print_test "Stats agrégées d'un joueur"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/game-stats/player/$PLAYER1_ID/aggregate")
	
	if echo "$RESPONSE" | grep -q "total_games"; then
		print_success "Stats agrégées récupérées"
	else
		print_error "Échec récupération stats agrégées: $RESPONSE"
	fi
}

# ═══════════════════════════════════════════════════════
# Tests Power-ups
# ═══════════════════════════════════════════════════════

test_powerups() {
	print_header "Tests Power-ups"
	
	# Test 1: Enregistrer un power-up
	print_test "Enregistrer un power-up"
	RESPONSE=$(curl $CURL_OPTS -s -X POST "$API_URL/power-ups" \
		-H "Content-Type: application/json" \
		-d "{
			\"game_id\":\"$GAME_ID\",
			\"player_id\":\"$PLAYER1_ID\",
			\"power_up_type\":\"split\",
			\"activated_at_game_time\":23.5
		}")
	
	if echo "$RESPONSE" | grep -q '"success":true'; then
		print_success "Power-up enregistré"
	else
		print_error "Échec enregistrement power-up: $RESPONSE"
	fi
	
	# Test 2: Power-ups d'une partie
	print_test "Récupérer les power-ups d'une partie"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/power-ups/game/$GAME_ID")
	
	if echo "$RESPONSE" | grep -q "split"; then
		print_success "Power-ups de la partie récupérés"
	else
		print_error "Échec récupération power-ups: $RESPONSE"
	fi
	
	# Test 3: Stats power-ups d'un joueur
	print_test "Stats power-ups d'un joueur"
	RESPONSE=$(curl $CURL_OPTS -s "$API_URL/power-ups/player/$PLAYER1_ID/stats")
	
	if echo "$RESPONSE" | grep -q "times_used"; then
		print_success "Stats power-ups récupérées"
	else
		print_error "Échec récupération stats power-ups: $RESPONSE"
	fi
}

# ═══════════════════════════════════════════════════════
# Tests d'erreurs
# ═══════════════════════════════════════════════════════

test_errors() {
	print_header "Tests de gestion d'erreurs"
	
	# Test 1: Utilisateur inexistant (404)
	print_test "Récupérer un utilisateur inexistant (doit retourner 404)"
	RESPONSE=$(curl $CURL_OPTS -s -w "\n%{http_code}" "$API_URL/users/nonexistent-user-id")
	HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
	
	if [ "$HTTP_CODE" = "404" ]; then
		print_success "404 retourné pour utilisateur inexistant"
	else
		print_error "Code HTTP incorrect: $HTTP_CODE (attendu 404)"
	fi
	
	# Test 2: Champs manquants (400)
	print_test "Créer un utilisateur sans username (doit retourner 400)"
	RESPONSE=$(curl $CURL_OPTS -s -w "\n%{http_code}" -X POST "$API_URL/users" \
		-H "Content-Type: application/json" \
		-d '{"id":"test-id"}')
	HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
	
	if [ "$HTTP_CODE" = "400" ]; then
		print_success "400 retourné pour champs manquants"
	else
		print_error "Code HTTP incorrect: $HTTP_CODE (attendu 400)"
	fi
	
	# Test 3: Partie inexistante (404)
	print_test "Récupérer une partie inexistante (doit retourner 404)"
	RESPONSE=$(curl $CURL_OPTS -s -w "\n%{http_code}" "$API_URL/games/room/nonexistent-room")
	HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
	
	if [ "$HTTP_CODE" = "404" ]; then
		print_success "404 retourné pour partie inexistante"
	else
		print_error "Code HTTP incorrect: $HTTP_CODE (attendu 404)"
	fi
}

# ═══════════════════════════════════════════════════════
# Résumé des tests
# ═══════════════════════════════════════════════════════

print_summary() {
	print_header "Résumé des tests"
	
	TOTAL_TESTS=$((TESTS_PASSED + TESTS_FAILED))
	
	echo -e "${GREEN}Tests réussis: $TESTS_PASSED${NC}"
	echo -e "${RED}Tests échoués: $TESTS_FAILED${NC}"
	echo -e "${BLUE}Total: $TOTAL_TESTS${NC}"
	
	if [ $TESTS_FAILED -eq 0 ]; then
		echo -e "\n${GREEN}✓ Tous les tests sont passés !${NC}\n"
	else
		echo -e "\n${RED}✗ Certains tests ont échoué${NC}\n"
	fi
}

# ═══════════════════════════════════════════════════════
# Exécution des tests
# ═══════════════════════════════════════════════════════

main() {
	echo -e "${BLUE}"
	echo "╔═══════════════════════════════════════════════════════╗"
	echo "║                                                       ║"
	echo "║       Tests API Database - Transcendence              ║"
	echo "║       Avec nettoyage automatique                      ║"
	echo "║                                                       ║"
	echo "╚═══════════════════════════════════════════════════════╝"
	echo -e "${NC}"
	
	check_service
	test_users
	test_tournaments
	test_registrations
	test_games
	test_game_stats
	test_powerups
	test_errors
	print_summary
	
	# Le nettoyage sera automatiquement appelé via le trap EXIT
}

main
