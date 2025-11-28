#!/bin/bash

# Script de test de l'authentification JWT
# Usage: ./test-auth.sh

BASE_URL="http://localhost:3060"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Test de l'authentification JWT"
echo "=========================================="
echo ""

# Test 1: Health check
echo -e "${YELLOW}Test 1: Health check${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/health")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health check OK${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: Création d'utilisateur
echo -e "${YELLOW}Test 2: Création d'utilisateur${NC}"
USERNAME="testuser_$(date +%s)"
PASSWORD="Test123"
RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Utilisateur créé${NC}"
else
    echo -e "${RED}✗ Échec de création${NC}"
fi
echo ""

# Test 3: Login
echo -e "${YELLOW}Test 3: Login${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}")
echo "Response: $RESPONSE"

ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ Login réussi${NC}"
    echo "Access Token: ${ACCESS_TOKEN:0:50}..."
    echo "Refresh Token: $REFRESH_TOKEN"
else
    echo -e "${RED}✗ Login échoué${NC}"
    exit 1
fi
echo ""

# Test 4: Accès à /auth/me avec token
echo -e "${YELLOW}Test 4: Accès à /auth/me (authentifié)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Accès autorisé${NC}"
else
    echo -e "${RED}✗ Accès refusé${NC}"
fi
echo ""

# Test 5: Accès à /users avec token
echo -e "${YELLOW}Test 5: Accès à /users (authentifié)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/users" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Accès autorisé${NC}"
else
    echo -e "${RED}✗ Accès refusé${NC}"
fi
echo ""

# Test 6: Accès sans token (doit échouer)
echo -e "${YELLOW}Test 6: Accès à /users sans token (doit échouer)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/users")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${GREEN}✓ Accès correctement refusé${NC}"
else
    echo -e "${RED}✗ Accès autorisé (erreur de sécurité!)${NC}"
fi
echo ""

# Test 7: Refresh token
echo -e "${YELLOW}Test 7: Refresh token${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "Response: $RESPONSE"

NEW_ACCESS_TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$NEW_ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✓ Token rafraîchi${NC}"
    echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
    ACCESS_TOKEN="$NEW_ACCESS_TOKEN"
else
    echo -e "${RED}✗ Échec du refresh${NC}"
fi
echo ""

# Test 8: Login avec mauvais mot de passe
echo -e "${YELLOW}Test 8: Login avec mauvais mot de passe${NC}"
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"WrongPassword123\"}")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q "HTTP_CODE:401"; then
    echo -e "${GREEN}✓ Login correctement refusé${NC}"
else
    echo -e "${RED}✗ Login autorisé (erreur de sécurité!)${NC}"
fi
echo ""

# Test 9: Logout
echo -e "${YELLOW}Test 9: Logout${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Logout réussi${NC}"
else
    echo -e "${RED}✗ Logout échoué${NC}"
fi
echo ""

# Test 10: Utilisation du token après logout (doit échouer)
echo -e "${YELLOW}Test 10: Utilisation du token après logout (doit échouer)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${GREEN}✓ Token correctement révoqué${NC}"
else
    echo -e "${RED}✗ Token encore valide (erreur de sécurité!)${NC}"
fi
echo ""

# Test 11: Utilisation du refresh token après logout (doit échouer)
echo -e "${YELLOW}Test 11: Utilisation du refresh token après logout (doit échouer)${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REFRESH_TOKEN\"}")
echo "Response: $RESPONSE"
if echo "$RESPONSE" | grep -q '"error"'; then
    echo -e "${GREEN}✓ Refresh token correctement révoqué${NC}"
else
    echo -e "${RED}✗ Refresh token encore valide (erreur de sécurité!)${NC}"
fi
echo ""

echo "=========================================="
echo "Tests terminés"
echo "=========================================="
