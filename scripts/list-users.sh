#!/bin/bash
# Helper script to list all users
# Uses environment variables if set, otherwise prompts

echo "📋 First Principles - List All Users"
echo "====================================="
echo ""

# Check if SUPABASE_URL is set
if [ -z "$SUPABASE_URL" ] && [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo "📝 Enter your Supabase Project URL:"
    echo "   (Get it from: Dashboard → Settings → API → Project URL)"
    read -p "   URL: " SUPABASE_URL
    export SUPABASE_URL
else
    SUPABASE_URL=${SUPABASE_URL:-$NEXT_PUBLIC_SUPABASE_URL}
    echo "✓ Using SUPABASE_URL: $SUPABASE_URL"
fi

# Check if SUPABASE_SERVICE_ROLE_KEY is set
if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo ""
    echo "📝 Enter your Supabase Service Role Key:"
    echo "   (Get it from: Dashboard → Settings → API → service_role key)"
    echo "   ⚠️  IMPORTANT: Use service_role key, NOT anon key!"
    read -sp "   Key: " SUPABASE_SERVICE_ROLE_KEY
    echo ""
    export SUPABASE_SERVICE_ROLE_KEY
else
    echo "✓ Using SUPABASE_SERVICE_ROLE_KEY: [hidden]"
fi

echo ""
echo "Fetching users..."
echo ""

# Run the Node.js script
node scripts/list-users.js

