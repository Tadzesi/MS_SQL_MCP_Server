# Quick Start Guide

Get your MS SQL MCP Server running with Claude Desktop in under 5 minutes!

## Prerequisites

- Node.js 18+ installed
- SQL Server 2016+ or Azure SQL Database running
- Claude Desktop installed
- Read access to your SQL Server database

## Step 1: Install and Build

```bash
# Clone or navigate to the project directory
cd MS_SQL_MCP_Server

# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build
```

## Step 2: Configure Claude Desktop

Edit your Claude Desktop MCP configuration file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS/Linux:** `~/.config/claude/claude_desktop_config.json`

### For SQL Server Authentication (Recommended)

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"],
      "env": {
        "MSSQL_LOCAL_SERVER": "localhost",
        "MSSQL_LOCAL_DATABASE": "YourDatabase",
        "MSSQL_LOCAL_AUTH": "sql",
        "MSSQL_LOCAL_USERNAME": "your_username",
        "MSSQL_LOCAL_PASSWORD": "your_password"
      }
    }
  }
}
```

### For Windows Integrated Authentication

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"],
      "env": {
        "MSSQL_LOCAL_SERVER": "localhost",
        "MSSQL_LOCAL_DATABASE": "YourDatabase",
        "MSSQL_LOCAL_AUTH": "integrated"
      }
    }
  }
}
```

**⚠️ Important:**
- Replace `C:\\absolute\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js` with your actual absolute path
- Use double backslashes (`\\`) or forward slashes (`/`) in Windows paths
- Point to `dist/index.js` (compiled), not `src/index.ts`

## Step 3: Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

## Step 4: Verify It Works

Open Claude Desktop and try these commands:

```
List all databases on the server
```

Claude should respond with a list of your databases using the `mssql_list_databases` tool.

```
Show me all tables in the [YourDatabase] database
```

You should see a list of tables in your database.

If you see database information, congratulations! Your MCP server is working! 🎉

## What You Can Do Now

Once your MCP server is connected, you can use natural language to:

### 🔍 Explore Your Database
```
Show me all tables in the Sales database
Describe the structure of the Orders table
What are the foreign keys in the Customers table?
```

### 💻 Generate Entity Framework Code
```
Generate a C# entity class for the Products table with navigation properties
Create a DbContext for the Sales database using Fluent API
Generate Create, Update, and Read DTOs for the Orders table
```

### ⚡ Analyze Performance
```
Show me all queries running longer than 10 seconds
What indexes are missing on the Orders table?
Are there any blocking queries right now?
```

### 📊 Profile Data
```
Show me 10 sample rows from the Customers table
What's the distribution of values in the Status column?
Check for data quality issues in the Orders table
```

### 📝 Generate Documentation
```
Create a data dictionary for the Sales database in Markdown
Generate an ER diagram in Mermaid format
Document the sp_ProcessOrders stored procedure
```

## Troubleshooting

### MCP Server Not Appearing in Claude

**Check the configuration:**
1. Verify the path in `claude_desktop_config.json` is absolute and points to `dist/index.js`
2. Make sure you used double backslashes (`\\`) or forward slashes (`/`) in Windows paths
3. Restart Claude Desktop after any config changes

**Test the server manually:**
```bash
node dist/index.js
```
The server should start and wait for input. Press Ctrl+C to exit.

### Cannot Connect to SQL Server

**Verify SQL Server is accessible:**
```bash
# Test with sqlcmd (if installed)
sqlcmd -S localhost -U your_username -P your_password -Q "SELECT @@VERSION"

# Or for Windows Auth
sqlcmd -S localhost -E -Q "SELECT @@VERSION"
```

**Common issues:**
- ❌ SQL Server not running → ✅ Start SQL Server service
- ❌ Port 1433 blocked → ✅ Check firewall settings
- ❌ TCP/IP disabled → ✅ Enable in SQL Server Configuration Manager
- ❌ Wrong server name → ✅ Use `localhost`, `.\SQLEXPRESS`, or actual server name

### Authentication Errors

**For SQL Authentication:**
- Verify SQL Server authentication is enabled (not Windows-only mode)
- Check username and password in your configuration
- Ensure the user exists: `SELECT name FROM sys.sql_logins WHERE name = 'your_username'`

**For Windows Authentication:**
- The Windows user running Claude Desktop must have SQL Server access
- Verify you can connect with SSMS using Windows Auth first

### Permission Errors

Grant minimum read-only permissions:

```sql
-- Server-level permissions
USE master;
GRANT VIEW ANY DATABASE TO [your_username];
GRANT VIEW ANY DEFINITION TO [your_username];
GRANT VIEW DATABASE STATE TO [your_username];
GRANT VIEW SERVER STATE TO [your_username];

-- Database-level permissions
USE YourDatabase;
GRANT SELECT TO [your_username];
```

### Getting "ECONNREFUSED" Error

This means the server hostname/port is wrong:
1. Check `MSSQL_LOCAL_SERVER` is correct (e.g., `localhost`, `.\SQLEXPRESS`, or IP address)
2. Verify SQL Server is listening on port 1433 (or specify custom port with `MSSQL_LOCAL_PORT`)
3. For named instances, use format: `SERVER\INSTANCENAME`

## Advanced: Multiple Connection Profiles

You can configure multiple SQL Server environments (local, dev, prod) in one configuration:

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["C:\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"],
      "env": {
        "MSSQL_LOCAL_SERVER": "localhost",
        "MSSQL_LOCAL_DATABASE": "LocalDB",
        "MSSQL_LOCAL_AUTH": "integrated",

        "MSSQL_DEV_SERVER": "dev-sql-server",
        "MSSQL_DEV_DATABASE": "DevDatabase",
        "MSSQL_DEV_AUTH": "sql",
        "MSSQL_DEV_USERNAME": "dev_user",
        "MSSQL_DEV_PASSWORD": "dev_password",

        "MSSQL_PROD_SERVER": "prod-sql-server",
        "MSSQL_PROD_DATABASE": "ProdDatabase",
        "MSSQL_PROD_AUTH": "sql",
        "MSSQL_PROD_USERNAME": "readonly_user",
        "MSSQL_PROD_PASSWORD": "readonly_password"
      }
    }
  }
}
```

Then switch connections in Claude:
```
Switch to the dev connection
Switch to the prod connection
Switch to the local connection
```

## Security & Limitations

✅ **Built-in Safety:**
- **Read-only by default** - No INSERT/UPDATE/DELETE/DROP allowed
- **Query validation** - Blocks dangerous SQL operations
- **Row limits** - Maximum 10,000 rows per query
- **Timeouts** - 30-second query timeout prevents runaway queries

⚠️ **Best Practices:**
- Use dedicated read-only SQL accounts
- Grant only minimum required permissions (SELECT, VIEW DEFINITION)
- Test on development databases first
- Review all generated code before using in production

## Next Steps

📖 **Learn More:**
- [README.md](README.md) - Full documentation and usage examples
- [CLAUDE.md](CLAUDE.md) - Architecture and development guide
- [Functional Specification](Documentation/MS_SQL_MCP_Server-Functionality_Specification.md) - Details on all 38 tools

🚀 **Start Using:**
- Explore your database schema
- Generate Entity Framework code
- Analyze query performance
- Create database documentation
- Compare schemas across environments

## Getting Help

If you encounter issues:
1. Check the troubleshooting section above
2. Review Claude Desktop logs for error messages
3. Test SQL Server connection with `sqlcmd` or SSMS
4. Verify permissions with the SQL commands provided

Happy exploring! 🎉