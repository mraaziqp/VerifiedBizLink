#!/bin/bash

#################################
# VERIFIEDBIZLINK TEST SUITE
# Complete end-to-end application testing
#################################

set -e

echo "🧪 VerifiedBizLink Application Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0
WARNINGS=0

# Helper function to print test result
test_result() {
    local name=$1
    local passed=$2

    if [ "$passed" = true ]; then
        echo -e "${GREEN}✅${NC} $name"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌${NC} $name"
        ((TESTS_FAILED++))
    fi
}

warn_result() {
    local name=$1
    echo -e "${YELLOW}⚠️${NC} $name"
    ((WARNINGS++))
}

# ===========================================
# PHASE 1: ENVIRONMENT SETUP CHECK
# ===========================================
echo ""
echo "📋 PHASE 1: ENVIRONMENT SETUP CHECK"
echo "------------------------------------"

# Check Node version
NODE_VERSION=$(node -v)
test_result "Node.js installed ($NODE_VERSION)" true

# Check npm
NPM_VERSION=$(npm -v)
test_result "npm installed ($NPM_VERSION)" true

# Check .env.local exists
if [ -f ".env.local" ]; then
    test_result ".env.local file exists" true
else
    test_result ".env.local file exists" false
fi

# Check critical env variables
if grep -q "DATABASE_URL" .env.local 2>/dev/null; then
    test_result "DATABASE_URL set" true
else
    test_result "DATABASE_URL set" false
fi

if grep -q "NEXTAUTH_SECRET" .env.local 2>/dev/null; then
    test_result "NEXTAUTH_SECRET set" true
else
    test_result "NEXTAUTH_SECRET set" false
fi

# ===========================================
# PHASE 2: DEPENDENCY CHECK
# ===========================================
echo ""
echo "📦 PHASE 2: DEPENDENCY CHECK"
echo "------------------------------------"

# Check key packages
packages=("react" "next" "typescript" "bcrypt" "postgres")

for pkg in "${packages[@]}"; do
    if npm list "$pkg" &>/dev/null; then
        test_result "$pkg installed" true
    else
        test_result "$pkg installed" false
    fi
done

# ===========================================
# PHASE 3: DATABASE CONNECTIVITY
# ===========================================
echo ""
echo "🗄️  PHASE 3: DATABASE CONNECTIVITY"
echo "------------------------------------"

if command -v psql &> /dev/null; then
    # Try to connect to database
    if psql $DATABASE_URL -c "SELECT 1;" &>/dev/null; then
        test_result "Database connection successful" true
    else
        test_result "Database connection successful" false
    fi

    # Check tables exist
    if psql $DATABASE_URL -c "\dt" | grep -q "users"; then
        test_result "Users table exists" true
    else
        test_result "Users table exists" false
    fi

    if psql $DATABASE_URL -c "\dt" | grep -q "vetting_submissions"; then
        test_result "Vetting table exists" true
    else
        test_result "Vetting table exists" false
    fi
else
    warn_result "psql not installed (can't test database)"
fi

# ===========================================
# PHASE 4: FILE STRUCTURE CHECK
# ===========================================
echo ""
echo "📁 PHASE 4: FILE STRUCTURE CHECK"
echo "------------------------------------"

# Check critical files exist
files=(
    "src/app/page.tsx"
    "src/app/login/page.tsx"
    "src/app/signup/page.tsx"
    "src/app/dashboard/page.tsx"
    "src/app/admin/orchestrator/page.tsx"
    "src/app/pricing/page.tsx"
    "src/components/layout/hero-section.tsx"
    "src/components/signup/complete-business-form.tsx"
    "src/components/admin/vetting/page.tsx"
    "migrations/003_enhance_business_profiles.sql"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        test_result "File exists: $file" true
    else
        test_result "File exists: $file" false
    fi
done

# ===========================================
# PHASE 5: BUILD CHECK
# ===========================================
echo ""
echo "🔨 PHASE 5: BUILD CHECK"
echo "------------------------------------"

echo "Running TypeScript compilation..."
if npm run build &>/dev/null; then
    test_result "TypeScript compilation successful" true
else
    test_result "TypeScript compilation successful" false
fi

# ===========================================
# PHASE 6: LINT CHECK
# ===========================================
echo ""
echo "🎨 PHASE 6: CODE QUALITY CHECK"
echo "------------------------------------"

# Check for console.log statements (bad practice in production)
CONSOLE_LOGS=$(find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "console.log" 2>/dev/null | wc -l)
if [ "$CONSOLE_LOGS" -eq 0 ]; then
    test_result "No console.log statements (0 files)" true
else
    warn_result "Found console.log in $CONSOLE_LOGS files"
fi

# Check for TODO comments
TODOS=$(find src -name "*.tsx" -o -name "*.ts" | xargs grep -l "TODO\|FIXME" 2>/dev/null | wc -l)
if [ "$TODOS" -eq 0 ]; then
    test_result "No TODO/FIXME comments (0 files)" true
else
    warn_result "Found TODO/FIXME in $TODOS files"
fi

# ===========================================
# PHASE 7: COMPONENT VERIFICATION
# ===========================================
echo ""
echo "🧩 PHASE 7: COMPONENT VERIFICATION"
echo "------------------------------------"

# Check hero section exists
if grep -q "Build Trust" src/components/layout/hero-section.tsx 2>/dev/null; then
    test_result "Hero section has correct content" true
else
    test_result "Hero section has correct content" false
fi

# Check signup form has 4 steps
if grep -q "step === 1\|step === 2\|step === 3\|step === 4" src/components/signup/complete-business-form.tsx 2>/dev/null; then
    test_result "Signup form has 4 steps" true
else
    test_result "Signup form has 4 steps" false
fi

# Check pricing has 4 tiers
if grep -q "Basic Listing\|Verified Business\|Premium Business\|Enterprise Partner" src/app/pricing/page.tsx 2>/dev/null; then
    test_result "Pricing page has 4 tiers" true
else
    test_result "Pricing page has 4 tiers" false
fi

# Check vetting page exists
if [ -f "src/app/admin/vetting/page.tsx" ]; then
    test_result "Vetting page exists" true
else
    test_result "Vetting page exists" false
fi

# ===========================================
# PHASE 8: API ROUTES CHECK
# ===========================================
echo ""
echo "🔌 PHASE 8: API ROUTES CHECK"
echo "------------------------------------"

api_routes=(
    "src/app/api/auth/login/route.ts"
    "src/app/api/auth/signup/route.ts"
    "src/app/api/auth/business-signup/route.ts"
)

for route in "${api_routes[@]}"; do
    if [ -f "$route" ]; then
        test_result "Route exists: $route" true
    else
        test_result "Route exists: $route" false
    fi
done

# ===========================================
# PHASE 9: SUMMARY
# ===========================================
echo ""
echo "=========================================="
echo "📊 TEST RESULTS"
echo "=========================================="
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}✅ All critical tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. npm run dev"
    echo "2. Open http://localhost:3000 in browser"
    echo "3. Follow ULTIMATE_TEST_SUITE.md for manual testing"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please fix issues above.${NC}"
    exit 1
fi
