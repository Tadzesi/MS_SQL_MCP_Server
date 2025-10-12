# Project Context

## Purpose
MS SQL MCP Server is a production-ready Model Context Protocol (MCP) server that connects Claude Code to Microsoft SQL Server databases. It provides 43 specialized tools for:

- **Schema Exploration**: Inspect databases, tables, columns, indexes, and relationships
- **Query Execution & Analysis**: Run SELECT queries with safety limits and performance analysis
- **Performance Monitoring**: Analyze query stats, missing indexes, blocking chains, and wait statistics
- **Data Profiling**: Sample data, column statistics, and data quality checks
- **Code Generation**: Generate Entity Framework Core entities, DbContext, repositories, DTOs, and Fluent API configurations
- **Documentation**: Create data dictionaries, ER diagrams (Mermaid/PlantUML), and API documentation
- **Schema Comparison**: Compare and synchronize schemas between databases
- **SQL Agent Job Monitoring**: List, describe, monitor, and analyze SQL Server Agent jobs

**Status**: ✅ Complete implementation with all 43 tools operational.

## Tech Stack

### Core Technologies
- **TypeScript 5.x** - ES2022 target, Node16 module resolution, ES modules (`"type": "module"`)
- **Node.js** - Runtime environment with stdio-based MCP transport
- **Microsoft SQL Server** - Target database (2016+, Azure SQL Database, SQL Managed Instance)

### Key Dependencies
- **@modelcontextprotocol/sdk** - MCP protocol implementation
- **mssql** (tedious driver) - SQL Server client for SQL authentication (cross-platform)
- **msnodesqlv8** - Native addon for Windows Integrated Authentication (Windows-only)
- **winston** - Logging to stderr (avoids stdio transport interference)
- **zod** - Runtime schema validation for MCP tool inputs

### Build Tools
- **TypeScript Compiler** - Transpiles to `./dist` directory
- **concurrently** + **nodemon** - Development mode with hot reload
- **npm scripts** - Build automation

## Project Conventions

### Code Style

**TypeScript/JavaScript**:
- ES Modules with explicit `.js` extensions in imports (even for `.ts` source files)
- Async/await for all asynchronous operations (no callbacks)
- PascalCase for class names (`DatabaseManager`, `SchemaTools`)
- camelCase for methods and variables
- Descriptive variable names with full words (no abbreviations unless standard)
- 2-space indentation (TypeScript code)

**SQL Queries**:
- Always use bracket-quoted identifiers: `[database].[schema].[table]`
- Parameterized table/schema names in template literals
- `USE [${database}]` before queries (except server-level operations)
- Query system catalog views (`sys.*`, `INFORMATION_SCHEMA.*`)
- Query DMVs for performance data (`sys.dm_*`)
- Query `msdb` for SQL Agent job data

**Generated C# Code**:
- 4-space indentation
- PascalCase for all identifiers (classes, properties, methods)
- XML documentation comments (`///`) for all public members
- Data Annotations or Fluent API configuration styles supported
- Navigation properties for relationships

### Architecture Patterns

**Layered Architecture**:
```
MCP Server (index.ts)
    ↓ requests tool execution
Configuration Layer (config.ts)
    ↓ provides connection settings
Database Connection Layer (database.ts)
    ↓ executes queries with pooling
Tool Categories (tools/*)
    ↓ implements business logic
```

**Separation of Concerns**:
- **index.ts**: MCP protocol handling and routing
- **config.ts**: Configuration management with environment variables
- **database.ts**: Connection pooling and query execution
- **logger.ts**: Centralized logging to stderr
- **types.ts**: Comprehensive TypeScript type definitions
- **tools/***: Separate classes for each tool category (SchemaTools, QueryTools, CodeGenTools, etc.)

**Dependency Injection**:
- Tool classes receive `DatabaseManager` instance via constructor
- No global state or singletons
- Clear dependency graph

**Connection Pooling**:
- Automatic pool management by connection string
- Pools kept in memory Map until server shutdown
- Reuses connections for same connection string

**Dynamic Driver Loading**:
- Runtime import selection based on authentication type
- `import('mssql/msnodesqlv8.js')` for Windows Integrated Authentication
- `import('mssql')` for SQL Server Authentication
- Single codebase supports both authentication methods

### Testing Strategy

**Local Testing**:
Since this is an MCP server using stdio transport, testing requires:

1. **Claude Desktop Integration**:
   - Edit `%APPDATA%\Claude\claude_desktop_config.json` (Windows) or `~/.config/claude/claude_desktop_config.json` (Unix)
   - Configure MCP server with absolute path to `dist/index.js`
   - Set environment variables for database connection
   - **Critical**: Restart Claude Desktop after any configuration changes

2. **Manual stdio Testing**:
   - Run `node dist/index.js` and send MCP protocol JSON via stdin
   - Validate tool responses match expected format

3. **Test Database Requirements**:
   - SQL Server 2016+ or Azure SQL Database
   - Read permissions on target databases
   - Read permissions on `msdb` for SQL Agent job tools
   - TCP/IP protocol enabled (port 1433)

**Security Testing**:
- Validate read-only query enforcement in `validateReadOnlyQuery()`
- Test that write operations (INSERT, UPDATE, DELETE, DROP, etc.) are blocked
- Verify connection uses `readOnlyIntent: true`

### Git Workflow

**Branch Strategy**:
- Feature branches for new capabilities
- Descriptive branch names (e.g., `MCP-tool-response-(35808-tokens)-exceeds-maximum-allowed-tokens`)
- Merge to main branch after testing

**Commit Conventions**:
- Use conventional commit format: `feat:`, `fix:`, `chore:`, `docs:`
- Concise messages focusing on "why" rather than "what"
- Include co-authorship when appropriate

**Version Management**:
- Semantic versioning in package.json
- Update version on significant changes

## Domain Context

### Model Context Protocol (MCP)
- Protocol for connecting AI assistants to data sources and tools
- Uses stdio transport for communication
- Tools defined with JSON Schema input validation
- Responses formatted as content blocks with text/error indicators

### Microsoft SQL Server
- Relational database management system
- System catalog views (`sys.*`) for metadata
- Dynamic Management Views (DMVs) for performance monitoring
- `msdb` database for SQL Server Agent jobs
- SQL Server Agent for scheduled job automation

### Entity Framework Core
- .NET ORM (Object-Relational Mapper)
- DbContext pattern for database access
- Data Annotations for simple configuration
- Fluent API for complex configuration
- Repository pattern for data access abstraction
- DTOs (Data Transfer Objects) for data contracts

### SQL Server Type System
- Complete mapping from SQL Server types to C# types
- Handling nullable types with `?` suffix
- Special cases: `decimal(18,2)`, `nvarchar(max)`, `varbinary(max)`
- Identity columns mapped to auto-incrementing properties

## Important Constraints

### Security Constraints
1. **Read-Only Operations**: All queries validated to prevent write operations
2. **No Stored Procedure Execution**: Can only read procedure definitions, not execute
3. **Query Validation**: Regex-based blocking of dangerous SQL keywords
4. **Connection Intent**: All connections use `readOnlyIntent: true`

### Technical Constraints
1. **ES Modules Required**: All imports must include `.js` extension
2. **stdio Transport**: No HTTP endpoints, uses stdin/stdout for MCP protocol
3. **Windows Authentication**: msnodesqlv8 is Windows-only (SQL auth is cross-platform)
4. **SQL Agent Jobs**: Not available on Azure SQL Database (only SQL Managed Instance and on-premises)

### Performance Constraints
1. **Row Limits**: `addRowLimit()` enforces max_rows (default 1000, max 10000)
2. **Query Timeout**: Default 30 seconds, configurable per query
3. **Connection Pooling**: Pools not cleaned up until server shutdown

### Configuration Constraints
1. **No Hardcoded Connections**: All connections via environment variables
2. **No config.json**: Configuration only from environment variables
3. **Required Profile**: `MSSQL_LOCAL_*` environment variables must be set
4. **Profile Naming**: Only `local`, `prod`, and `dev` profiles supported

## External Dependencies

### Database Systems
- **Microsoft SQL Server** (2016+)
  - Target database for schema exploration and queries
  - Requires SELECT permissions on user databases
  - Requires SELECT permissions on `msdb` for SQL Agent job tools
  - TCP/IP protocol must be enabled (port 1433)

- **Azure SQL Database** (SQL Agent jobs not supported)
- **Azure SQL Managed Instance** (full SQL Agent support)

### MCP Protocol
- **@modelcontextprotocol/sdk** - Official MCP SDK for Node.js
- Requires MCP-compatible client (Claude Desktop)

### SQL Server Drivers
- **tedious** (via `mssql` package) - SQL Server authentication
- **msnodesqlv8** (via `mssql/msnodesqlv8.js`) - Windows Integrated Authentication
  - Native Node.js addon compiled for Windows
  - Uses current Windows user credentials
  - Requires SQL Server to accept Windows authentication

### System Catalog Dependencies
- **sys.tables**, **sys.columns**, **sys.indexes**, **sys.foreign_keys** - Schema metadata
- **sys.dm_exec_requests**, **sys.dm_exec_query_stats** - Performance monitoring
- **sys.dm_db_index_usage_stats** - Index usage statistics
- **sys.dm_os_wait_stats** - Wait statistics
- **msdb.dbo.sysjobs**, **msdb.dbo.sysjobhistory**, **msdb.dbo.sysjobschedules** - SQL Agent jobs
