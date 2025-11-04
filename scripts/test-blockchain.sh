#!/bin/bash

# Script de test pour le service blockchainback

HOST="${VITE_HOST:-localhost:8443}"
BASE_URL="https://${HOST}/blockchainback"

echo "Testing BlockchainBack Service"
echo "=================================="
echo ""

# Test health endpoint
echo "Testing health endpoint..."
curl -k -s "${BASE_URL}/health" | jq '.'
echo ""

# Test tournament count
echo "Getting tournament count..."
curl -k -s "${BASE_URL}/tournaments/count" | jq '.'
echo ""

# Test registering a tournament (example)
echo "Registering test tournament..."
TEST_TOURNAMENT_ID="test-$(date +%s)"
curl -k -s -X POST "${BASE_URL}/register-tournament" \
  -H "Content-Type: application/json" \
  -d "{
    \"tournamentId\": \"${TEST_TOURNAMENT_ID}\",
    \"tournamentName\": \"Test Tournament\",
    \"maxPlayers\": 8,
    \"winnerId\": \"player123\",
    \"winnerUsername\": \"TestWinner\"
  }" | jq '.'
echo ""

# Wait a bit for transaction
echo "Waiting for transaction confirmation..."
sleep 5
echo ""

# Test getting tournament
echo "Getting tournament details..."
curl -k -s "${BASE_URL}/tournament/${TEST_TOURNAMENT_ID}" | jq '.'
echo ""

echo "✅ Tests completed!"
