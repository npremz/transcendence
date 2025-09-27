#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
GREY='\033[0;37m'
NC='\033[0m'

AUTH_BASE_URL="https://localhost:8443/authback"
TEST_USER="ventouse_$(date +%s)"
TEST_PASS="123"
TEST_EMAIL="ventouse@hello.org"
JWT_TOKEN=""

pass() { echo -e "${GREEN}✅ PASS${NC}"; }
fail() { echo -e "${RED}❌ FAIL${NC}"; exit 1;}

echo -e "${BLUE}Auth Service Tests${NC}"
echo "===================="

# Test 1: Health Check
echo -ne "Health Check...\t\t\t"
HEALTH_RESPONSE=$(curl -sk "$AUTH_BASE_URL/health" 2>/dev/null)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"' >/dev/null 2>&1; then
	pass
else
	fail
fi

echo -ne "User Registration...\t\t"
REGISTER_DATA="{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\",\"email\":\"$TEST_EMAIL\"}"
REGISTER_RESPONSE=$(curl -sk -X POST -H "Content-Type: application/json" -d "$REGISTER_DATA" "$AUTH_BASE_URL/register" 2>/dev/null)
if echo "$REGISTER_RESPONSE" | grep -q '"success":true' >/dev/null 2>&1; then
	JWT_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
	pass
else
	fail
fi

echo -ne "User Login...\t\t\t"
LOGIN_DATA="{\"username\":\"$TEST_USER\",\"password\":\"$TEST_PASS\"}"
LOGIN_RESPONSE=$(curl -sk -X POST -H "Content-Type: application/json" -d "$LOGIN_DATA" "$AUTH_BASE_URL/login" 2>/dev/null)
if echo "$LOGIN_RESPONSE" | grep -q '"success":true' >/dev/null 2>&1; then
	pass
else
	fail
fi

echo -ne "Token Verification...\t\t"
VERIFY_RESPONSE=$(curl -sk -H "Authorization: Bearer $JWT_TOKEN" "$AUTH_BASE_URL/verify" 2>/dev/null)
if echo "$VERIFY_RESPONSE" | grep -q '"valid":true' >/dev/null 2>&1; then
	pass
else
	fail
fi

echo -ne "Invalid Login Rejection...\t"
INVALID_LOGIN_DATA="{\"username\":\"$TEST_USER\",\"password\":\"lololol\"}"
INVALID_RESPONSE=$(curl -sk -X POST -H "Content-Type: application/json" -d "$INVALID_LOGIN_DATA" "$AUTH_BASE_URL/login" 2>/dev/null)
if echo "$INVALID_RESPONSE" | grep -q '"error"' >/dev/null 2>&1; then
	pass
else
	fail
fi

echo -ne "Invalid Token Rejection...\t"
INVALID_VERIFY_RESPONSE=$(curl -sk -H "Authorization: Bearer --------wrongToken--------" "$AUTH_BASE_URL/verify" 2>/dev/null)
if echo "$INVALID_VERIFY_RESPONSE" | grep -q '"valid":false' >/dev/null 2>&1; then
	pass
else
	fail
fi

echo -e "${GREEN}All tests passed!${NC}"
echo "===================="
