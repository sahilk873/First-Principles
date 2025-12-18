# Setting Up Supabase MCP Authentication

To enable direct SQL execution via MCP, you need to set up a Personal Access Token.

## Step 1: Get Your Supabase Personal Access Token

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click on your profile icon (top right) → **Account Settings**
3. Navigate to **Access Tokens** section
4. Click **Generate New Token**
5. Name it (e.g., "MCP Access Token")
6. Copy the token immediately (you won't be able to see it again)

## Step 2: Set the Access Token

You have two options:

### Option A: Environment Variable (Recommended)

Set it in your terminal session:
```bash
export SUPABASE_ACCESS_TOKEN="your-access-token-here"
```

Or add it to your shell profile (~/.zshrc or ~/.bashrc):
```bash
echo 'export SUPABASE_ACCESS_TOKEN="your-access-token-here"' >> ~/.zshrc
source ~/.zshrc
```

### Option B: MCP Configuration

If your MCP client requires configuration, you may need to update the MCP server configuration file. This depends on how Cursor/your MCP client is configured.

## Step 3: Verify Authentication

After setting the token, the AI assistant should be able to use MCP Supabase tools directly.

## Alternative: Manual Execution

If you prefer to execute migrations manually, you can use the `MIGRATION_EXECUTION_GUIDE.md` which has step-by-step instructions.

