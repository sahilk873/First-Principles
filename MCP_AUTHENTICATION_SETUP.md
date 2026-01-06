# Supabase MCP Authentication Setup

The Supabase MCP server requires authentication to access your database. Here's how to set it up:

## Current Status

❌ **MCP is NOT authenticated** - The access token is set in your terminal environment, but Cursor's MCP server needs to be configured separately.

## Setup Options

### Option 1: Configure in Cursor Settings (Recommended)

1. Open Cursor Settings:
   - **Mac**: `Cmd + ,` (Command + Comma)
   - **Windows/Linux**: `Ctrl + ,`

2. Search for "MCP" or "Model Context Protocol"

3. Find the Supabase MCP server configuration

4. Add the access token:
   - Look for `SUPABASE_ACCESS_TOKEN` or similar field
   - Add: `sbp_091ac16c9367e89f21afafb0eaa3d38ac490b079`

5. **Restart Cursor** completely for changes to take effect

### Option 2: MCP Configuration File

Cursor may use an MCP configuration file. Check for:
- `~/.cursor/mcp.json`
- `~/.config/cursor/mcp.json`
- Or check Cursor's documentation for the exact location

If it exists, add:
```json
{
  "mcpServers": {
    "supabase": {
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_091ac16c9367e89f21afafb0eaa3d38ac490b079"
      }
    }
  }
}
```

### Option 3: Verify Access Token

Your access token is:
```
sbp_091ac16c9367e89f21afafb0eaa3d38ac490b079
```

If this token is expired or invalid:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click your profile icon → **Account Settings**
3. Navigate to **Access Tokens**
4. Generate a new token
5. Update the configuration with the new token

## Alternative: Manual Database Checks

While setting up MCP authentication, you can check the database state manually:

1. Go to **Supabase Dashboard → SQL Editor**
2. Copy and paste queries from `check_database_state.sql`
3. Run the queries to see the current database state

## Testing MCP Authentication

After configuring, test by asking the AI assistant:
- "List all tables in the database"
- "Show me the current RLS policies"
- "Check if migration 012 has been applied"

If MCP is working, the assistant will be able to execute SQL queries directly.

## Troubleshooting

### MCP still not working after configuration

1. **Restart Cursor completely** (quit and reopen)
2. Check Cursor's MCP server logs (if available)
3. Verify the access token is valid in Supabase Dashboard
4. Try generating a new access token and updating the configuration

### Can't find MCP settings in Cursor

- Check Cursor's documentation for MCP configuration
- The MCP feature may require a specific Cursor version
- Consider using the manual SQL Editor approach instead








