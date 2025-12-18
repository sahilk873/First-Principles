# Configuring Supabase MCP in Cursor

The MCP server needs to be configured in Cursor's settings to access the access token.

## Option 1: Configure in Cursor Settings

1. Open Cursor Settings (Cmd+, on Mac)
2. Search for "MCP" or "Model Context Protocol"
3. Find the Supabase MCP server configuration
4. Add the access token:
   - Look for `SUPABASE_ACCESS_TOKEN` or similar field
   - Add: `sbp_091ac16c9367e89f21afafb0eaa3d38ac490b079`

## Option 2: MCP Configuration File

Cursor may use an MCP configuration file. Check for:
- `~/.cursor/mcp.json`
- `~/.config/cursor/mcp.json`
- Or similar location

If it exists, you may need to add:
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

## Option 3: Restart Cursor

After setting the environment variable in your shell profile, try:
1. Restart Cursor completely
2. Make sure Cursor is launched from a terminal where the environment variable is set
3. Or launch Cursor from the terminal: `open -a Cursor` (after setting the variable)

## Your Access Token
```
sbp_091ac16c9367e89f21afafb0eaa3d38ac490b079
```

## Alternative: Continue with Manual Execution

If MCP configuration is complex, you can continue using the `MIGRATION_EXECUTION_GUIDE.md` to run migrations manually in the SQL Editor, which is also straightforward.

