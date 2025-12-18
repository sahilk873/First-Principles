#!/bin/bash
# Script to set up Supabase MCP Access Token

echo "Setting up Supabase MCP Access Token"
echo ""
echo "Please get your Personal Access Token from:"
echo "https://supabase.com/dashboard/account/tokens"
echo ""
read -sp "Paste your access token here: " TOKEN
echo ""

if [ -z "$TOKEN" ]; then
    echo "Error: Token cannot be empty"
    exit 1
fi

# Export for current session
export SUPABASE_ACCESS_TOKEN="$TOKEN"
echo "✓ Token set for current terminal session"

# Optionally add to shell profile
read -p "Add to ~/.zshrc for persistence? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Remove old entry if exists
    sed -i.bak '/SUPABASE_ACCESS_TOKEN/d' ~/.zshrc 2>/dev/null || true
    # Add new entry
    echo "export SUPABASE_ACCESS_TOKEN=\"$TOKEN\"" >> ~/.zshrc
    echo "✓ Token added to ~/.zshrc"
    echo "Run 'source ~/.zshrc' or restart your terminal to use it in new sessions"
fi

echo ""
echo "Setup complete! The MCP server should now be able to authenticate."
echo "You can test by asking the AI assistant to execute SQL queries."

