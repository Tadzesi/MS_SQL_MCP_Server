# Quick Start Guide

## Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Build the project:**
```bash
npm run build
```

## Configuration

### Option 1: Environment Variables (Easiest)

Set these environment variables:

```bash
# Windows (PowerShell)
$env:MSSQL_SERVER="localhost"
$env:MSSQL_DATABASE="master"
$env:MSSQL_AUTH="integrated"

# Windows (CMD)
set MSSQL_SERVER=localhost
set MSSQL_DATABASE=master
set MSSQL_AUTH=integrated

# Linux/macOS
export MSSQL_SERVER="localhost"
export MSSQL_DATABASE="master"
export MSSQL_AUTH="integrated"
```

### Option 2: Configuration File

Create `config.json`:

```json
{
  "connections": {
    "default": {
      "server": "localhost",
      "database": "master",
      "authentication": "integrated",
      "readonly": true,
      "environment": "development"
    }
  },
  "current_connection": "default"
}
```

## Testing

Test the server manually:

```bash
node dist/index.js
```

The server will start and wait for MCP protocol messages on stdin/stdout.

## Integration with Claude Code

Add to Claude Code configuration:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["C:\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"],
      "env": {
        "MSSQL_SERVER": "localhost",
        "MSSQL_DATABASE": "master",
        "MSSQL_AUTH": "integrated"
      }
    }
  }
}
```

**Important:** Use absolute path to dist/index.js!

## Verify Installation

After restarting Claude Code, ask:

```
List all databases on the SQL Server
```

Claude should use the `mssql_list_databases` tool.

## Example Usage

### Explore Database
```
Show me all tables in the AdventureWorks database
```

### Generate Code
```
Generate a C# entity class for the Person.Person table with navigation properties
```

### Analyze Performance
```
Find missing indexes in the Sales.SalesOrderHeader table
```

### Create Documentation
```
Generate a data dictionary for the Sales schema
```

## Troubleshooting

### Connection Failed

1. Verify SQL Server is running
2. Check firewall allows port 1433
3. Confirm authentication method matches server configuration
4. Test with SQL Server Management Studio first

### Permission Denied

Grant minimum required permissions:

```sql
-- Grant server-level permissions
GRANT VIEW ANY DATABASE TO [YourUser];
GRANT VIEW ANY DEFINITION TO [YourUser];
GRANT VIEW SERVER STATE TO [YourUser];

-- Grant database-level permissions
USE YourDatabase;
GRANT SELECT TO [YourUser];
```

### Windows Authentication Not Working

- Ensure SQL Server allows Windows authentication
- Run Claude Code as user with database access
- Check domain/workgroup settings

### SQL Authentication Not Working

- Verify SQL Server authentication is enabled
- Check mixed mode authentication in SQL Server
- Confirm username and password are correct

## Next Steps

1. Review [README.md](README.md) for full documentation
2. Check [Documentation/MS_SQL_MCP_Server-Functionality_Specification.md](Documentation/MS_SQL_MCP_Server-Functionality_Specification.md) for all 38 tools
3. Explore example prompts in README
4. Configure multiple connection profiles for dev/staging/prod

## Security Notes

- Server is **read-only by default**
- No write operations allowed
- Query results limited to 10,000 rows
- 30-second query timeout
- Use dedicated read-only SQL accounts in production