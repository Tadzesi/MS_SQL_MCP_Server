# MS SQL MCP Server

A comprehensive Model Context Protocol (MCP) server that connects Claude Code to Microsoft SQL Server databases for exploration, analysis, and Entity Framework Core code generation.

## Why This Exists

This MCP server bridges the gap between Claude Code and Microsoft SQL Server, enabling AI-assisted database development workflows:

- **Database Exploration**: Ask Claude to inspect your database schema, understand table relationships, and discover stored procedures without leaving your IDE
- **Code Generation**: Generate production-ready Entity Framework Core code (entities, DbContext, repositories, DTOs) directly from your database schema
- **Performance Analysis**: Identify slow queries, missing indexes, and blocking chains through natural language conversations
- **Documentation**: Auto-generate data dictionaries, ER diagrams, and API documentation from your database
- **Safe Operations**: Enforces read-only access by default, preventing accidental data modifications during exploration

Instead of switching between SSMS, documentation tools, and your IDE, simply ask Claude in natural language and get instant, contextual database insights and code generation.

## Quick Start

1. **Install dependencies and build**
   ```bash
   npm install
   npm run build
   ```

2. **Configure connection** (choose one method)

   Option A - Create `config.json`:
   ```json
   {
     "connections": {
       "default": {
         "server": "localhost",
         "database": "master",
         "authentication": "integrated"
       }
     }
   }
   ```

   Option B - Use environment variables:
   ```bash
   export MSSQL_SERVER=localhost
   export MSSQL_DATABASE=master
   export MSSQL_AUTH=integrated
   ```

3. **Add to Claude Code MCP settings**

   Edit Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json` on Windows):
   ```json
   {
     "mcpServers": {
       "mssql": {
         "command": "node",
         "args": ["C:\\path\\to\\MS_SQL_MCP_Server\\dist\\index.js"]
       }
     }
   }
   ```

4. **Start asking Claude**
   ```
   Show me all tables in the Sales database
   Generate a C# entity for the Products table
   Find slow queries running right now
   ```

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

## Installation

```bash
npm install
npm run build
```

## Configuration

Create a `config.json` file in the project root (or use environment variables):

```json
{
  "connections": {
    "default": {
      "server": "localhost",
      "database": "master",
      "authentication": "integrated",
      "readonly": true,
      "environment": "development",
      "port": 1433,
      "encrypt": false,
      "trustServerCertificate": true
    }
  },
  "limits": {
    "max_rows": 10000,
    "query_timeout_seconds": 30,
    "max_query_length": 50000
  },
  "code_generation": {
    "default_namespace": "MyApp.Data",
    "use_nullable_reference_types": true,
    "entity_framework_version": "8.0",
    "use_records_for_dtos": false
  },
  "features": {
    "enable_write_operations": false,
    "enable_procedure_execution": false,
    "enable_cross_database_queries": true,
    "enable_schema_comparison": true
  },
  "current_connection": "default"
}
```

### Environment Variables

Alternatively, configure via environment variables:

- `MSSQL_SERVER` - SQL Server hostname
- `MSSQL_DATABASE` - Database name (default: master)
- `MSSQL_AUTH` - Authentication type: `integrated` or `sql`
- `MSSQL_USER` - Username (for SQL auth)
- `MSSQL_PASSWORD` - Password (for SQL auth)
- `MSSQL_PORT` - Port number (default: 1433)
- `MSSQL_ENCRYPT` - Enable encryption (default: false)
- `MSSQL_TRUST_CERT` - Trust server certificate (default: true)

## Usage with Claude Code

Add to your Claude Code MCP settings:

### Windows

Edit `%APPDATA%\Claude\claude_desktop_config.json`:

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

### macOS/Linux

Edit `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mssql": {
      "command": "node",
      "args": ["/path/to/MS_SQL_MCP_Server/dist/index.js"],
      "env": {
        "MSSQL_SERVER": "localhost",
        "MSSQL_DATABASE": "master",
        "MSSQL_AUTH": "integrated"
      }
    }
  }
}
```

## Available Tools

### Schema Inspection

1. **mssql_list_databases** - List all accessible databases
2. **mssql_list_tables** - List tables in a database
3. **mssql_describe_table** - Get detailed table schema
4. **mssql_list_stored_procedures** - List stored procedures
5. **mssql_get_procedure_definition** - Get procedure source code
6. **mssql_list_views** - List database views
7. **mssql_get_view_definition** - Get view definition
8. **mssql_get_relationships** - Map table relationships

### Query Execution

9. **mssql_execute_query** - Execute SELECT queries
10. **mssql_execute_scalar** - Execute queries returning single values

### Query Analysis

11. **mssql_explain_query** - Analyze execution plans
12. **mssql_validate_syntax** - Validate SQL syntax
13. **mssql_find_missing_indexes** - Find missing index recommendations
14. **mssql_analyze_query_performance** - Deep performance analysis

### Performance Monitoring

15. **mssql_active_queries** - Show currently executing queries
16. **mssql_query_stats** - Get query performance statistics
17. **mssql_index_usage** - Analyze index usage
18. **mssql_blocking_chains** - Identify blocking situations
19. **mssql_wait_statistics** - Analyze wait statistics

### Data Profiling

20. **mssql_sample_data** - Get sample rows from tables
21. **mssql_column_statistics** - Analyze column data distribution
22. **mssql_data_quality_check** - Check for data quality issues
23. **mssql_table_statistics** - Get table size and statistics

### Entity Framework Code Generation

24. **mssql_generate_entity_class** - Generate C# entity classes
25. **mssql_generate_dbcontext** - Generate DbContext
26. **mssql_generate_repository_interface** - Generate repository interfaces
27. **mssql_generate_dto_classes** - Generate DTOs
28. **mssql_generate_ef_configuration** - Generate Fluent API configurations
29. **mssql_generate_migration_class** - Generate migration templates

### Documentation

30. **mssql_generate_data_dictionary** - Create database documentation
31. **mssql_generate_er_diagram** - Generate ER diagrams
32. **mssql_document_stored_procedure** - Document procedures
33. **mssql_generate_api_documentation** - Generate API docs

### Schema Comparison

34. **mssql_compare_schemas** - Compare database schemas
35. **mssql_generate_sync_script** - Generate sync scripts

## Example Prompts for Claude Code

### Database Exploration

```
Show me all tables in the Sales database
```

```
Describe the structure of the Orders table in the dbo schema
```

```
What are all the foreign keys in the Customers table?
```

### Query Development

```
Write a query to find customers who haven't placed orders in the last 6 months
```

```
Analyze the performance of this query: SELECT * FROM Orders WHERE OrderDate > '2024-01-01'
```

### Entity Framework Code Generation

```
Generate a C# entity class for the Products table with navigation properties
```

```
Create a DbContext for the entire Sales database with Fluent API
```

```
Generate DTOs for the Orders table (Create, Update, Read, List)
```

```
Create a repository interface for the Products table with async methods
```

### Performance Analysis

```
Show me all slow running queries (longer than 10 seconds)
```

```
What indexes are missing on the Orders table?
```

```
Check if there are any blocking queries right now
```

### Documentation

```
Create a data dictionary for the Sales database
```

```
Generate an ER diagram in Mermaid format for the database
```

```
Document the sp_ProcessOrders stored procedure
```

### Schema Comparison

```
Compare the schemas between dev and prod databases
```

```
Generate a sync script to update prod from staging
```

## Security Features

- **Read-only by default** - No write operations allowed through MCP
- **Query validation** - Blocks dangerous SQL commands
- **Row limiting** - Automatic limits on SELECT results
- **Timeout enforcement** - Prevents long-running queries
- **Connection pooling** - Efficient resource management
- **Environment detection** - Warnings for production access

## Architecture

### Layered Design

The server follows a layered architecture with clear separation of concerns:

```
MCP Server (index.ts)
    ↓
Configuration Layer (config.ts)
    ↓
Database Connection Layer (database.ts)
    ↓
Tool Categories (tools/*)
    ├── Schema Inspection
    ├── Query Execution & Analysis
    ├── Performance Monitoring
    ├── Data Profiling
    ├── Code Generation
    ├── Documentation
    └── Schema Comparison
```

### Project Structure

```
src/
├── index.ts                 # MCP server implementation (570 lines)
│                           # - Registers all 38 tools with MCP protocol
│                           # - Routes tool calls to appropriate modules
│                           # - Handles MCP request/response formatting
│
├── config.ts               # Configuration management (90 lines)
│                           # - Loads from config.json or environment variables
│                           # - Supports multiple connection profiles
│                           # - Environment-specific settings
│
├── database.ts             # Database connection manager (115 lines)
│                           # - Connection pooling with lifecycle management
│                           # - Query validation (enforces read-only)
│                           # - Two execution patterns: full results & scalar
│
├── types.ts                # TypeScript definitions (230 lines)
│                           # - Configuration, schema, and result types
│                           # - Strongly typed tool interfaces
│
├── logger.ts               # Winston-based logging
│
└── tools/
    ├── schema-tools.ts     # Schema inspection (440 lines)
    │                       # - Queries sys.tables, sys.columns, sys.indexes
    │                       # - Complex joins for complete table metadata
    │
    ├── query-tools.ts      # Query execution & analysis (180 lines)
    │                       # - Safe query execution with row limits
    │                       # - Syntax validation and execution plans
    │
    ├── performance-tools.ts # Performance monitoring (180 lines)
    │                       # - Queries DMVs for active queries & wait stats
    │                       # - Index usage analysis
    │
    ├── profiling-tools.ts  # Data profiling (140 lines)
    │                       # - Statistical analysis of column data
    │                       # - Data quality checks
    │
    ├── codegen-tools.ts    # EF Core code generation (590 lines)
    │                       # - SQL to C# type mapping
    │                       # - Entity, DbContext, DTOs, repositories
    │                       # - Fluent API and Data Annotations
    │
    ├── documentation-tools.ts # Documentation (280 lines)
    │                       # - Markdown data dictionaries
    │                       # - Mermaid/PlantUML ER diagrams
    │
    └── comparison-tools.ts # Schema comparison (200 lines)
                            # - Cross-database schema diff
                            # - T-SQL sync script generation
```

### Core Components

**MCP Protocol Integration** (`index.ts`)
- Implements Model Context Protocol using `@modelcontextprotocol/sdk`
- Two main handlers:
  - `ListToolsRequestSchema` - Returns metadata for all 38 tools
  - `CallToolRequestSchema` - Executes tools and returns formatted results
- Input validation via Zod schemas
- JSON response formatting with error handling

**Security Layer** (`database.ts`)
- Multi-layer read-only enforcement:
  1. Query validation via regex (blocks INSERT, UPDATE, DELETE, DROP, etc.)
  2. Connection-level readonly flags
  3. Automatic row limiting on SELECT queries
  4. Query timeout enforcement
- Must start with SELECT, WITH, or EXPLAIN

**Code Generation Engine** (`codegen-tools.ts`)
- Schema discovery → Type mapping → Naming conversion → Code output
- Handles SQL Server to C# type mappings
- Generates navigation properties from foreign keys
- Supports both Data Annotations and Fluent API patterns

### How It Works

**Schema Inspection**: Uses SQL Server system catalog views (`sys.tables`, `sys.columns`, `sys.indexes`, `sys.foreign_keys`) to extract complete metadata. The `describeTable()` method orchestrates 7 sub-queries to build comprehensive table information.

**Query Safety**: The `validateReadOnlyQuery()` method uses regex patterns to block dangerous SQL operations. Queries must start with SELECT, WITH, or EXPLAIN. Row limits are automatically injected via `addRowLimit()` which adds TOP clauses to SELECT statements.

**Performance Monitoring**: Queries Dynamic Management Views (DMVs) like `sys.dm_exec_requests`, `sys.dm_exec_query_stats`, and `sys.dm_db_index_usage_stats` to provide real-time performance insights.

**Code Generation Flow**:
1. Call `SchemaTools.describeTable()` to get complete metadata
2. Use `mapSqlTypeToCSharp()` to convert SQL Server types to C# types
3. Apply `toPascalCase()` for C# naming conventions
4. Generate navigation properties from foreign key metadata
5. Output formatted C# code with proper indentation

**Connection Management**: The `DatabaseManager` maintains a connection pool map keyed by connection string. Pools persist for the server lifetime and handle automatic lifecycle management.

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (watch)
npm run dev

# Run directly
npm start
```

## Requirements

- Node.js 18+
- SQL Server 2016+ or Azure SQL Database
- Read access to target databases
- Network connectivity to SQL Server

## Authentication

### Windows Integrated Authentication

```json
{
  "authentication": "integrated"
}
```

### SQL Server Authentication

```json
{
  "authentication": "sql",
  "username": "your_username",
  "password": "your_password"
}
```

## Limitations

- **Read-only operations** - No INSERT, UPDATE, DELETE, or DROP commands
- **No stored procedure execution** - For safety (can be enabled in config)
- **Query row limits** - Maximum 10,000 rows per query (configurable)
- **Timeout enforcement** - 30-second default query timeout

## Troubleshooting

### Connection Issues

1. Verify SQL Server is accessible
2. Check firewall settings (port 1433)
3. Confirm authentication credentials
4. Enable TCP/IP protocol in SQL Server Configuration Manager

### Authentication Errors

For Windows Authentication:
- Ensure the user running Claude Code has database access
- Check SQL Server allows Windows authentication

For SQL Authentication:
- Verify username and password
- Ensure SQL Server authentication is enabled
- Check user has appropriate database permissions

### Permission Errors

Grant minimum required permissions:

```sql
-- Grant read access to databases
GRANT VIEW ANY DATABASE TO [username];
GRANT VIEW ANY DEFINITION TO [username];
GRANT VIEW DATABASE STATE TO [username];
GRANT VIEW SERVER STATE TO [username];

-- Grant read access to specific database
USE YourDatabase;
GRANT SELECT TO [username];
```

## Best Practices

1. **Use read-only accounts** - Create dedicated read-only SQL users
2. **Limit database access** - Only grant access to necessary databases
3. **Configure row limits** - Set appropriate max_rows for your environment
4. **Review generated code** - Always review EF Core code before using
5. **Test sync scripts** - Test schema sync scripts in dev before production
6. **Monitor performance** - Use performance tools to identify issues early

## License

MIT

## Contributing

See [CLAUDE.md](CLAUDE.md) for development guidance.

## Support

For issues and questions:
- Review the functional specification in `Documentation/`
- Check connection configuration
- Verify SQL Server permissions
- Review server logs for detailed errors