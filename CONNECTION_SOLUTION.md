# SQL Server Connection Solution

## Problem Summary

When connecting to SQL Server using the MCP server, Windows integrated authentication did not work with the Node.js `mssql` package, despite working with `sqlcmd`.

## Root Cause

The Node.js `mssql` package (using the `tedious` driver) does not support true Windows SSPI authentication the way native SQL Server tools do. It requires explicit credentials even for Windows authentication via NTLM.

## Solution

Use **SQL Server Authentication** instead of Windows Authentication.

### Working Configuration

The Claude Desktop MCP configuration has been updated to:

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": [
        "C:\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"
      ],
      "env": {
        "MSSQL_LOCAL_SERVER": "your-server-name",
        "MSSQL_LOCAL_DATABASE": "YourDatabase",
        "MSSQL_LOCAL_AUTH": "sql",
        "MSSQL_LOCAL_USERNAME": "your_username",
        "MSSQL_LOCAL_PASSWORD": "your_password"
      }
    }
  }
}
```

### Connection Details

- **Server**: your-server-name (e.g., `localhost`, `.\SQLEXPRESS`, or hostname)
- **Database**: YourDatabase
- **Authentication Type**: SQL Server Authentication
- **Username**: your_username
- **Password**: your_password
- **SQL Server Version**: SQL Server 2016+ or Azure SQL Database

### Test Results

All connection tests passed successfully:
- ✓ Connection established
- ✓ Database query execution working
- ✓ Table enumeration working
- ✓ Schema inspection working

## Testing

Or test with sqlcmd:

```bash
sqlcmd -S your-server-name -d YourDatabase -U your_username -P your_password -Q "SELECT DB_NAME(), SUSER_NAME()"
```

## Code Verification

The MCP server code in `src/database.ts` and `src/config.ts` already handles SQL authentication correctly:

1. **config.ts** (lines 54-69): Loads `MSSQL_LOCAL_USERNAME` and `MSSQL_LOCAL_PASSWORD` from environment variables
2. **database.ts** (lines 47-54): Sets `config.user` and `config.password` for SQL authentication

No code changes were needed - the issue was just configuration.

## Next Steps

**Restart Claude Desktop** to apply the new MCP server configuration.

After restarting, the MCP server will connect using SQL authentication and all 38 tools will be available for database operations.

## Creating a Dedicated SQL User (Optional)

You can create a dedicated read-only SQL user for the MCP server:

```sql
-- Create SQL login
CREATE LOGIN mcp_readonly_user WITH PASSWORD = 'YourSecurePassword123!';

-- Create database user
USE YourDatabase;
CREATE USER mcp_readonly_user FOR LOGIN mcp_readonly_user;

-- Grant read-only permissions
ALTER ROLE db_datareader ADD MEMBER mcp_readonly_user;
GRANT VIEW DEFINITION TO mcp_readonly_user;
```

This dedicated user provides:
- db_datareader role (SELECT on all tables)
- VIEW DEFINITION (to see stored procedures, views, etc.)
- Read-only access ideal for the MCP server

## Why Windows Auth Didn't Work

The `mssql` npm package requires a password for NTLM authentication:

```javascript
authentication: {
  type: 'ntlm',
  options: {
    domain: 'DOMAIN',
    userName: 'user',
    password: 'password' // Required - cannot be empty
  }
}
```

Without providing the actual Windows password (which is a security risk to store in config files), Windows authentication cannot work. SQL authentication with dedicated database credentials is the correct approach.

## References

- Configuration file location:
  - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
  - **macOS/Linux**: `~/.config/claude/claude_desktop_config.json`

- Always restart Claude Desktop after modifying the MCP configuration
