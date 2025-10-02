# MS SQL MCP Server

A Model Context Protocol (MCP) server that connects Claude Desktop and Claude Code to Microsoft SQL Server databases, enabling AI-powered database exploration, analysis, and Entity Framework Core code generation through natural language.

## What is MCP?

[Model Context Protocol](https://modelcontextprotocol.io) is an open standard that allows AI assistants like Claude to securely connect to external data sources and tools. This server implements MCP to bridge Claude with SQL Server databases.

## Key Capabilities

**🔍 Database Exploration**

- Inspect schemas, tables, columns, indexes, and relationships
- View stored procedures and views without SSMS
- Explore foreign key relationships across tables

**💻 Entity Framework Code Generation**

- Generate C# entity classes with Data Annotations or Fluent API
- Create complete DbContext with all DbSets
- Generate DTOs (Create, Update, Read, List)
- Create repository interfaces with async methods

**⚡ Performance Analysis**

- Monitor active queries and execution statistics
- Identify missing indexes and blocking chains
- Analyze wait statistics and index usage

**📊 Data Profiling & Quality**

- Sample table data and analyze distributions
- Check for nulls, duplicates, and data quality issues
- Get table size and row count statistics

**📝 Documentation Generation**

- Create comprehensive data dictionaries
- Generate ER diagrams (Mermaid/PlantUML)
- Document stored procedures and generate API specs

**🔒 Security First**

- Read-only by default (no INSERT/UPDATE/DELETE/DROP)
- Query validation blocks dangerous operations
- Automatic row limiting and timeout enforcement

## Quick Start

### 1. Install and Build

```bash
npm install
npm run build
```

### 2. Configure Claude Desktop

Edit your Claude Desktop MCP configuration file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**macOS/Linux**: `~/.config/claude/claude_desktop_config.json`

Add the MCP server configuration:

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

**Important Notes**:

- Use **absolute path** to `dist/index.js` (not `src/index.ts`)
- On Windows, use double backslashes (`\\`) or forward slashes (`/`) in paths
- Restart Claude Desktop after configuration changes

### 3. Start Using with Claude

Open Claude Desktop and start asking:

```
Show me all tables in the Sales database
Describe the structure of the Orders table
Generate a C# entity class for the Products table
Find slow queries running right now
Create an ER diagram for my database
```

The server provides 38 tools that Claude can use to explore your database and generate code.

## Features

### 🔍 Schema Inspection (8 tools)

- List databases, tables, views, and stored procedures
- Get detailed table descriptions with columns, indexes, and relationships
- Explore foreign key relationships
- View stored procedure and view definitions

### 🔎 Query Execution & Analysis (6 tools)

- Execute SELECT queries safely (read-only)
- Validate SQL syntax
- Analyze query execution plans
- Find missing indexes
- Performance analysis

### 📊 Performance Monitoring (5 tools)

- Monitor active queries
- Analyze query statistics
- Check index usage
- Identify blocking chains
- Review wait statistics

### 📈 Data Profiling (4 tools)

- Sample table data
- Analyze column statistics
- Check data quality
- Get table statistics

### 🏗️ Entity Framework Code Generation (6 tools)

- Generate entity classes with Data Annotations
- Create DbContext with Fluent API
- Generate repository interfaces
- Create DTOs (Create, Update, Read, List)
- Generate entity configurations
- Create migration templates

### 📝 Documentation (4 tools)

- Generate comprehensive data dictionaries
- Create ER diagrams (Mermaid, PlantUML)
- Document stored procedures
- Generate REST API documentation

### 🔄 Schema Comparison (2 tools)

- Compare schemas between databases
- Generate synchronization scripts

## Environment Configuration

The MCP server supports multiple connection profiles through environment variables. Configure different environments (local, development, production) using prefixed environment variables.

### Connection Profile Environment Variables

The server recognizes three profile prefixes: `LOCAL`, `DEV`, and `PROD`.

#### LOCAL Profile (Development)

```bash
MSSQL_LOCAL_SERVER=localhost
MSSQL_LOCAL_DATABASE=YourDatabase
MSSQL_LOCAL_AUTH=sql                    # or "integrated" for Windows Auth
MSSQL_LOCAL_USERNAME=your_username      # Required for SQL auth
MSSQL_LOCAL_PASSWORD=your_password      # Required for SQL auth
MSSQL_LOCAL_PORT=1433                   # Optional, defaults to 1433
MSSQL_LOCAL_ENCRYPT=false               # Optional, defaults to false
MSSQL_LOCAL_TRUST_CERT=true             # Optional, defaults to true
MSSQL_LOCAL_READONLY=true               # Optional, defaults to true
```

#### DEV Profile (Development Server)

```bash
MSSQL_DEV_SERVER=dev-sql-server
MSSQL_DEV_DATABASE=DevDatabase
MSSQL_DEV_AUTH=sql
MSSQL_DEV_USERNAME=dev_user
MSSQL_DEV_PASSWORD=dev_password
```

#### PROD Profile (Production - Read Only!)

```bash
MSSQL_PROD_SERVER=prod-sql-server
MSSQL_PROD_DATABASE=ProductionDatabase
MSSQL_PROD_AUTH=sql
MSSQL_PROD_USERNAME=readonly_user
MSSQL_PROD_PASSWORD=readonly_password
MSSQL_PROD_READONLY=true                # Always use read-only for production!
```

### Authentication Methods

**SQL Server Authentication** (recommended for cross-platform):

```json
"env": {
  "MSSQL_LOCAL_AUTH": "sql",
  "MSSQL_LOCAL_USERNAME": "your_username",
  "MSSQL_LOCAL_PASSWORD": "your_password"
}
```

**Windows Integrated Authentication** (Windows only):

```json
"env": {
  "MSSQL_LOCAL_AUTH": "integrated"
}
```

### Configuration in Claude Desktop

Add environment variables to the MCP server configuration:

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["C:\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"],
      "env": {
        "MSSQL_LOCAL_SERVER": "localhost",
        "MSSQL_LOCAL_DATABASE": "MyDatabase",
        "MSSQL_LOCAL_AUTH": "sql",
        "MSSQL_LOCAL_USERNAME": "user",
        "MSSQL_LOCAL_PASSWORD": "pass",

        "MSSQL_DEV_SERVER": "dev-server",
        "MSSQL_DEV_DATABASE": "DevDB",
        "MSSQL_DEV_AUTH": "sql",
        "MSSQL_DEV_USERNAME": "dev_user",
        "MSSQL_DEV_PASSWORD": "dev_pass"
      }
    }
  }
}
```

### Configuration Requirement

**Important**: The server requires `MSSQL_LOCAL_*` environment variables to be configured. There are no hardcoded defaults.

If you start the server without configuring the `local` connection profile, you will receive an error message with setup instructions.

## Project Structure

```
MS_SQL_MCP_Server/
├── src/
│   ├── index.ts                    # MCP server entry point
│   │                               # - Implements MCP protocol
│   │                               # - Registers 38 tools
│   │                               # - Routes tool calls to handlers
│   │
│   ├── config.ts                   # Configuration management
│   │                               # - Loads environment variables
│   │                               # - Manages connection profiles
│   │
│   ├── database.ts                 # Database connection layer
│   │                               # - Connection pooling
│   │                               # - Query validation (read-only)
│   │                               # - Query execution
│   │
│   ├── types.ts                    # TypeScript type definitions
│   ├── logger.ts                   # Winston logging (stderr)
│   │
│   └── tools/                      # Tool implementations
│       ├── schema-tools.ts         # Schema inspection (8 tools)
│       ├── query-tools.ts          # Query execution (6 tools)
│       ├── performance-tools.ts    # Performance monitoring (5 tools)
│       ├── profiling-tools.ts      # Data profiling (4 tools)
│       ├── codegen-tools.ts        # EF Core code generation (6 tools)
│       ├── documentation-tools.ts  # Documentation generation (4 tools)
│       └── comparison-tools.ts     # Schema comparison (2 tools)
│
├── dist/                           # Compiled JavaScript (generated)
│   └── index.js                    # Entry point for MCP
│
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # This file
└── CLAUDE.md                       # Development guide for Claude Code
```

### Architecture

**Layered Design**:

```
MCP Protocol Layer (index.ts)
         ↓
Configuration Layer (config.ts)
         ↓
Database Layer (database.ts)
         ↓
Tool Categories (tools/*)
```

**Key Design Patterns**:

- **Dependency Injection**: Tool classes receive `DatabaseManager` instance
- **Connection Pooling**: Automatic pool management by connection string
- **Read-Only Enforcement**: Multi-layer security (validation + connection flags)
- **MCP Integration**: Standard protocol for AI-to-database communication

## MCP Server Functionality

The server implements the Model Context Protocol, exposing **38 tools** that Claude can use through natural language. Each tool is a function that Claude can call to interact with SQL Server.

### How MCP Tools Work

1. **Natural Language → Tool Selection**: You ask Claude in natural language
2. **Tool Execution**: Claude selects and calls appropriate MCP tools
3. **Database Interaction**: Server executes safe, read-only operations
4. **Result Formatting**: Returns data to Claude for presentation

### Tool Categories (38 Total)

#### 🔍 Schema Inspection (8 tools)

```
mssql_list_databases              - List all accessible databases
mssql_list_tables                 - List tables in a database
mssql_describe_table              - Get complete table metadata (columns, indexes, FKs)
mssql_list_stored_procedures      - List stored procedures
mssql_get_procedure_definition    - Get procedure source code
mssql_list_views                  - List database views
mssql_get_view_definition         - Get view definition
mssql_get_relationships           - Map foreign key relationships
```

#### 💻 Query Execution & Analysis (6 tools)

```
mssql_execute_query               - Execute SELECT queries (read-only)
mssql_execute_scalar              - Get single value from query
mssql_explain_query               - Analyze query execution plan
mssql_validate_syntax             - Validate SQL syntax
mssql_find_missing_indexes        - Get index recommendations
mssql_analyze_query_performance   - Deep performance analysis
```

#### ⚡ Performance Monitoring (5 tools)

```
mssql_active_queries              - Show currently executing queries
mssql_query_stats                 - Query performance statistics
mssql_index_usage                 - Index usage analysis
mssql_blocking_chains             - Identify blocking queries
mssql_wait_statistics             - Analyze wait statistics
```

#### 📊 Data Profiling (4 tools)

```
mssql_sample_data                 - Get sample rows from tables
mssql_column_statistics           - Analyze column distributions
mssql_data_quality_check          - Check for nulls, duplicates, etc.
mssql_table_statistics            - Get table size and row counts
```

#### 🏗️ Entity Framework Code Generation (6 tools)

```
mssql_generate_entity_class       - Generate C# entity with Data Annotations
mssql_generate_dbcontext          - Generate DbContext with DbSets
mssql_generate_repository_interface - Generate repository interface
mssql_generate_dto_classes        - Generate Create/Update/Read/List DTOs
mssql_generate_ef_configuration   - Generate Fluent API configuration
mssql_generate_migration_class    - Generate migration template
```

#### 📝 Documentation (4 tools)

```
mssql_generate_data_dictionary    - Create comprehensive data dictionary
mssql_generate_er_diagram         - Generate Mermaid/PlantUML ER diagrams
mssql_document_stored_procedure   - Document stored procedure
mssql_generate_api_documentation  - Generate REST API documentation
```

#### 🔄 Schema Comparison (2 tools)

```
mssql_compare_schemas             - Compare schemas between databases
mssql_generate_sync_script        - Generate T-SQL sync script
```

#### ⚙️ Configuration (3 tools)

```
mssql_list_connections            - List available connection profiles
mssql_switch_connection           - Switch to different connection profile
mssql_get_current_connection      - Get current connection info
```

## Example Usage with Claude

Once configured, simply chat with Claude in natural language. Claude will automatically use the MCP tools to fulfill your requests.

### 🔍 Exploring Your Database

```
Show me all tables in the Sales database

Describe the Orders table structure including indexes and foreign keys

What are all the relationships between the Customers and Orders tables?

List all stored procedures in the database
```

### 💻 Code Generation

```
Generate a C# entity class for the Products table with navigation properties

Create a complete DbContext for the Sales database using Fluent API

Generate Create, Update, and Read DTOs for the Orders table

Create a repository interface for the Products table with async CRUD methods
```

### ⚡ Performance Tuning

```
Show me all queries currently running that take longer than 10 seconds

What indexes are missing on the Orders table?

Are there any blocking queries right now?

Analyze the performance of this query: SELECT * FROM Orders WHERE Status = 'Pending'
```

### 📊 Data Analysis

```
Show me a sample of 10 rows from the Customers table

What's the distribution of values in the Status column?

Check for data quality issues in the Orders table

How many rows does each table have?
```

### 📝 Documentation

```
Create a data dictionary for the Sales database in Markdown format

Generate an ER diagram in Mermaid format for all tables

Document the sp_ProcessOrders stored procedure with parameter details

Generate REST API documentation for the Products table
```

### 🔄 Schema Management

```
Compare the schemas between local and prod connections

What are the differences between the dev and prod databases?

Generate a sync script to update the staging database from production
```

## Security Model

The server enforces **read-only access** through multiple security layers:

### 1. Query Validation

- **Regex-based blocking** of dangerous operations in `database.ts:validateReadOnlyQuery()`
- Blocks: `INSERT`, `UPDATE`, `DELETE`, `DROP`, `TRUNCATE`, `ALTER`, `CREATE`, `EXEC`
- Only allows queries starting with: `SELECT`, `WITH`, or `EXPLAIN`
- Dynamic SQL and stored procedure execution disabled by default

### 2. Connection-Level Protection

- All connections use `readonly: true` configuration flag
- SQL Server connection includes `readOnlyIntent: true` option
- Prevents accidental writes even if query validation bypassed

### 3. Automatic Safety Limits

- **Row Limiting**: Automatically injects `TOP N` clause into SELECT queries (default: 10,000 rows)
- **Timeout Enforcement**: 30-second default timeout prevents runaway queries
- **Query Length Limits**: Maximum query length enforced (50,000 characters)

### 4. Feature Flags

Configuration-based feature controls in `config.ts`:

```typescript
features: {
  enable_write_operations: false,      // Disabled by default
  enable_procedure_execution: false,   // Disabled by default
  enable_cross_database_queries: true,
  enable_schema_comparison: true
}
```

### Security Best Practices

✅ **Do**:

- Use dedicated read-only SQL Server accounts
- Grant only `SELECT`, `VIEW DEFINITION`, `VIEW DATABASE STATE` permissions
- Test in non-production environments first
- Review all generated code before using in production

❌ **Don't**:

- Use sa or admin accounts
- Connect to production with write permissions
- Bypass query validation
- Execute generated sync scripts without review

## Development

### Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Development mode (watch for changes and auto-restart)
npm run dev

# Run the compiled server
npm start
# or
node dist/index.js
```

### TypeScript Configuration

- **Target**: ES2022
- **Module**: Node16 (ES Modules)
- **Output**: `./dist` directory
- **Important**: All imports must include `.js` extension (even for `.ts` files)

### Project Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `mssql` - SQL Server driver
- `winston` - Logging
- `zod` - Schema validation

## Requirements

- **Node.js**: 18.0.0 or higher
- **SQL Server**: 2016+ or Azure SQL Database
- **Permissions**: Read access (`SELECT`, `VIEW DEFINITION`, `VIEW DATABASE STATE`)
- **Network**: TCP/IP connectivity to SQL Server (port 1433)

## Known Limitations

- **Read-only operations**: No INSERT/UPDATE/DELETE/DROP commands
- **No stored procedure execution**: Disabled by default for safety
- **Query row limits**: Maximum 10,000 rows per query (configurable in limits.max_rows)
- **Timeout enforcement**: 30-second default query timeout (configurable)
- **Execution plans**: Simplified analysis only; full plans require SSMS

## Troubleshooting

### MCP Server Not Appearing in Claude

1. **Check configuration file path**:

   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
   - macOS: `~/.config/claude/claude_desktop_config.json`

2. **Verify absolute path to dist/index.js**:

   ```json
   "args": ["C:\\absolute\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"]
   ```

   - Must point to compiled `dist/index.js`, not `src/index.ts`
   - On Windows, use `\\` or `/` in paths

3. **Restart Claude Desktop** after configuration changes

4. **Check for errors**: Claude Desktop logs show MCP server startup errors

### Connection Failures

**SQL Server not accessible**:

- Verify server is running: `sqlcmd -S servername -Q "SELECT @@VERSION"`
- Check firewall allows port 1433
- Confirm TCP/IP protocol enabled in SQL Server Configuration Manager

**Authentication errors**:

_SQL Authentication_:

```bash
# Test connection with sqlcmd
sqlcmd -S servername -U username -P password -Q "SELECT DB_NAME()"
```

- Verify SQL Server authentication mode is enabled (not Windows-only)
- Check username and password are correct

_Windows Authentication_:

- User running Claude Desktop must have SQL Server access
- Test: `sqlcmd -S servername -E -Q "SELECT SUSER_NAME()"`

**Permission errors**:

Grant minimum required permissions:

```sql
USE master;
GRANT VIEW ANY DATABASE TO [username];
GRANT VIEW ANY DEFINITION TO [username];
GRANT VIEW DATABASE STATE TO [username];
GRANT VIEW SERVER STATE TO [username];

USE YourDatabase;
GRANT SELECT TO [username];
```

### Debugging

**Enable detailed logging**:

- MCP server logs to stderr (visible in Claude Desktop logs)
- Check `Logger` output for connection details

**Test MCP server manually**:

```bash
node dist/index.js
# MCP server should start and wait for stdin
```

**Common issues**:

- ❌ Path points to `src/index.ts` → ✅ Use `dist/index.js`
- ❌ Relative path in config → ✅ Use absolute path
- ❌ Missing `npm run build` → ✅ Build TypeScript first
- ❌ Environment variables wrong → ✅ Check `MSSQL_LOCAL_*` prefix

## Contributing

See [CLAUDE.md](CLAUDE.md) for architecture details and development guidance.

## License

MIT

## Resources

- **MCP Protocol**: https://modelcontextprotocol.io
- **Claude Desktop**: https://claude.ai/download
- **SQL Server**: https://www.microsoft.com/sql-server
- **Entity Framework Core**: https://docs.microsoft.com/ef/core
