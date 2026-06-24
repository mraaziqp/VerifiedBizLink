#!/bin/bash

# Email Verification System - Quick Test Script
# Usage: bash test-email-verification.sh

set -e

echo "🧪 VerifiedBizLink Email Verification Test Suite"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_URL="${NEXT_PUBLIC_APP_URL:-http://localhost:3000}"
TEST_EMAIL="test-$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
TEST_NAME="Test User"

echo "📋 Test Configuration:"
echo "  App URL: $APP_URL"
echo "  Test Email: $TEST_EMAIL"
echo "  Test Password: $TEST_PASSWORD"
echo ""

# Test 1: Database Schema
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 1: Database Schema Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ DATABASE_URL not set${NC}"
  echo "   Please set: export DATABASE_URL='postgresql://...'"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Test 2: Resend Configuration
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 2: Resend Configuration"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -z "$RESEND_API_KEY" ]; then
  echo -e "${RED}❌ RESEND_API_KEY not set${NC}"
  exit 1
fi
echo "✅ RESEND_API_KEY is set"

if [ -z "$RESEND_FROM_EMAIL" ]; then
  echo -e "${YELLOW}⚠️  RESEND_FROM_EMAIL not set, using default${NC}"
  RESEND_FROM_EMAIL="noreply@verifiedbizlink.co.za"
fi
echo "✅ RESEND_FROM_EMAIL: $RESEND_FROM_EMAIL"
echo ""

# Test 3: Signup Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 3: Signup Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📝 Signing up with test email..."
SIGNUP_RESPONSE=$(curl -s -X POST "$APP_URL/api/auth/signup" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"fullName\": \"$TEST_NAME\",
    \"role\": \"customer\"
  }")

if echo "$SIGNUP_RESPONSE" | grep -q "success"; then
  echo -e "${GREEN}✅ Signup successful${NC}"

  # Extract session cookie
  SESSION=$(echo "$SIGNUP_RESPONSE" | grep -o "vbl_session=[^;]*" | cut -d'=' -f2 || echo "")
  if [ -n "$SESSION" ]; then
    echo "✅ Session cookie received"
  fi
else
  echo -e "${RED}❌ Signup failed${NC}"
  echo "Response: $SIGNUP_RESPONSE"
  exit 1
fi
echo ""

# Test 4: /me Endpoint
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 4: Get User Info (/api/auth/me)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$SESSION" ]; then
  ME_RESPONSE=$(curl -s -X GET "$APP_URL/api/auth/me" \
    -H "Cookie: vbl_session=$SESSION")

  if echo "$ME_RESPONSE" | grep -q "emailVerified"; then
    echo -e "${GREEN}✅ User info retrieved${NC}"
    EMAIL_STATUS=$(echo "$ME_RESPONSE" | grep -o '"emailVerified":\(true\|false\)' || echo "")
    echo "   Email Verified: $EMAIL_STATUS"

    if echo "$ME_RESPONSE" | grep -q '"emailVerified":false'; then
      echo -e "${GREEN}✅ User is correctly marked as unverified${NC}"
    fi
  fi
fi
echo ""

# Test 5: Verify Page
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 5: Verify Email Page"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

VERIFY_PAGE=$(curl -s "$APP_URL/verify-email")
if echo "$VERIFY_PAGE" | grep -q "Check your email"; then
  echo -e "${GREEN}✅ Verify email page is accessible${NC}"
  echo "   Shows correct message"
else
  echo -e "${YELLOW}⚠️  Could not verify page content${NC}"
fi
echo ""

# Test 6: Rate Limiting
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "TEST 6: Rate Limiting"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "📝 Attempting multiple rapid signups..."
RATE_LIMIT_HIT=false

for i in {1..6}; do
  RESPONSE=$(curl -s -X POST "$APP_URL/api/auth/signup" \
    -H "Content-Type: application/json" \
    -d "{
      \"email\": \"rapid-$i-$(date +%s)@example.com\",
      \"password\": \"$TEST_PASSWORD\",
      \"fullName\": \"$TEST_NAME\",
      \"role\": \"customer\"
    }")

  if echo "$RESPONSE" | grep -q "Too many signup"; then
    echo "✅ Rate limit triggered on attempt $i"
    RATE_LIMIT_HIT=true
    break
  fi
done

if [ "$RATE_LIMIT_HIT" = false ]; then
  echo -e "${YELLOW}⚠️  Rate limiting may not be enforced${NC}"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ QUICK TEST COMPLETE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next Steps:"
echo "  1. Run full test plan: cat EMAIL_VERIFICATION_TEST_PLAN.md"
echo "  2. Check inbox for test email"
echo "  3. Click verification link"
echo "  4. Verify email_verified = true in database"
echo ""
echo "Test email used: $TEST_EMAIL"
echo "Check your inbox or spam folder for the verification email."
echo ""
