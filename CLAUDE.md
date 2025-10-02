# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MS SQL MCP Server - A production-ready Model Context Protocol (MCP) server that connects Claude Code to Microsoft SQL Server databases for exploration, analysis, and Entity Framework Core code generation.

**Status**: ✅ Complete implementation with all 38 tools from the functional specification.

## Build Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript
npm run build

# Development mode (watch for changes)
npm run dev

# Run the server (requires build first)
npm start
# Or directly:
node dist/index.js
```

## Architecture

### High-Level Structure

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

### Core Components

**index.ts** (570 lines)
- MCP server implementation using `@modelcontextprotocol/sdk`
- Registers all 38 tools with the MCP protocol
- Routes tool calls to appropriate tool modules
- Handles request/response formatting for MCP
- Main entry point: `MsSqlMcpServer` class

**config.ts** (90 lines)
- `ConfigManager` class manages configuration
- Loads from: config.json, environment variables, or defaults
- Supports multiple connection profiles (dev/staging/prod)
- Configuration schema in `types.ts`

**database.ts** (115 lines)
- `DatabaseManager` class handles SQL Server connections
- Connection pooling with automatic lifecycle management
- **Critical**: `validateReadOnlyQuery()` enforces security by blocking write operations
- Two execution patterns:
  - `executeQuery()` - returns full result sets
  - `executeScalar()` - returns single values

### Tool Categories Architecture

Each tool category is a separate class that receives `DatabaseManager` as dependency:

**SchemaTools** (440 lines)
- Primary queries use system catalog views: `sys.tables`, `sys.columns`, `sys.indexes`, `sys.foreign_keys`
- Key method: `describeTable()` - orchestrates 7 sub-queries to build complete table metadata
- Uses `STUFF...FOR XML PATH('')` pattern to aggregate column lists

**QueryTools** (180 lines)
- Critical: `addRowLimit()` injects TOP clause into SELECT queries for safety
- Note: Execution plan viewing is simplified - full plans require SSMS

**CodeGenTools** (590 lines)
- Most complex module - generates C# code from database schema
- `mapSqlTypeToCSharp()` - handles all SQL Server to C# type mappings
- `toPascalCase()` - converts SQL naming to C# conventions
- Each generation method returns formatted C# code strings
- Supports Data Annotations and Fluent API styles

**PerformanceTools** (180 lines)
- Queries DMVs: `sys.dm_exec_requests`, `sys.dm_exec_query_stats`, `sys.dm_db_index_usage_stats`
- `getWaitStatistics()` filters out noise waits for actionable results

**ProfilingTools** (140 lines)
- Uses COUNT DISTINCT and GROUP BY for statistical analysis
- `checkDataQuality()` uses dynamic SQL to check multiple columns

**DocumentationTools** (280 lines)
- Generates Markdown by default
- `generateMermaidDiagram()` creates ER diagrams in Mermaid syntax
- Iterates over schema metadata to build comprehensive docs

**ComparisonTools** (200 lines)
- `compareSchemas()` performs set operations on schema metadata
- `generateSyncScript()` creates T-SQL but recommends review before execution

## Security Model

The server enforces read-only access through multiple layers:

1. **Query Validation** (`database.ts:validateReadOnlyQuery`)
   - Regex-based blocking of INSERT, UPDATE, DELETE, DROP, TRUNCATE, ALTER, CREATE, EXEC
   - Must start with SELECT, WITH, or EXPLAIN

2. **Connection Configuration**
   - All connections marked `readonly: true`
   - Uses `readOnlyIntent: true` in mssql driver config

3. **Automatic Limiting**
   - `addRowLimit()` in QueryTools enforces max_rows
   - Query timeout enforcement via mssql request timeout

4. **No Stored Procedure Execution**
   - Can only read procedure definitions, not execute them
   - Feature flag `enable_procedure_execution: false`

## Code Generation Strategy

Entity Framework code generation follows this pattern:

1. **Schema Discovery**: Call `SchemaTools.describeTable()` to get complete metadata
2. **Type Mapping**: Use `mapSqlTypeToCSharp()` to convert SQL types
3. **Naming Conversion**: Apply `toPascalCase()` for C# conventions
4. **Navigation Properties**: Use foreign key metadata to generate relationships
5. **Output Formatting**: String concatenation builds properly indented C# code

Key generation methods:
- `generateEntityClass()` - Creates entity with Data Annotations
- `generateDbContext()` - Creates DbContext with DbSet properties
- `generateEfConfiguration()` - Creates IEntityTypeConfiguration with Fluent API
- `generateDtoClasses()` - Returns dictionary of DTO types (create/update/read/list)

## Type System

All types defined in `types.ts` (230 lines):

**Configuration Types**:
- `ServerConfig` - Root configuration object
- `ConnectionConfig` - Database connection settings
- `CodeGenerationConfig` - C# code generation preferences

**Schema Types**:
- `TableDescription` - Complete table metadata (columns, indexes, FKs)
- `ColumnInfo` - Column metadata with nullability, defaults, identity
- `IndexInfo`, `ForeignKeyInfo` - Relationship metadata

**Query Result Types**:
- `QueryResult` - SELECT query results with execution time
- `ExecutionPlan` - Query performance analysis
- `IndexRecommendation` - Missing index suggestions

**Code Generation Types**:
- Return types are always `string` or `Record<string, string>` (for multiple files)

## MCP Protocol Integration

The server implements MCP protocol via two handlers:

1. **ListToolsRequestSchema** - Returns metadata for all 38 tools
   - Each tool has: name, description, inputSchema (JSON Schema)
   - Input schemas use Zod for runtime validation

2. **CallToolRequestSchema** - Executes tool and returns results
   - Receives: tool name + arguments object
   - Returns: `{ content: [{ type: 'text', text: '...' }] }`
   - Errors return: `{ content: [...], isError: true }`

Response formatting:
- JSON data: `JSON.stringify(data, null, 2)`
- Text/code: Raw string in text content block

## Configuration

The server loads configuration in this priority order:

1. Path provided to constructor
2. `./config.json`
3. `./mssql-mcp-config.json`
4. `MSSQL_MCP_CONFIG` environment variable path
5. Environment variables (MSSQL_SERVER, MSSQL_DATABASE, etc.)
6. Default configuration

Connection profiles support:
- Different servers per environment (dev/staging/prod)
- Separate credentials per profile
- Environment-specific feature flags

## Working with the Codebase

### Adding a New Tool

1. Add tool definition to `getToolDefinitions()` in index.ts
2. Add case handler in `handleToolCall()` switch statement
3. Implement method in appropriate tool class
4. Update types.ts if new return types needed

### Modifying Code Generation

All code generation happens in `CodeGenTools`. Key methods:
- `generateProperty()` - Single property with annotations
- `generateNavigationProperties()` - Relationships from foreign keys
- `mapSqlTypeToCSharp()` - Type mapping table (modify here for new types)

### Changing Query Safety

Modify `validateReadOnlyQuery()` in database.ts:
- `dangerousPatterns` array - regex patterns to block
- Test regex against normalized query (lowercase, trimmed)

### Adding New SQL Server Features

Most SQL Server queries are in the tool classes. Common patterns:
- Use parameterized schema/table names: `[${schema}].[${table}]`
- Always `USE [${database}]` before queries
- Query system views: `sys.*`, `INFORMATION_SCHEMA.*`
- Query DMVs for performance: `sys.dm_*`

## Testing Locally

Since this is an MCP server (stdio transport), testing requires:

1. **Manual stdin/stdout test**:
```bash
node dist/index.js
# Then send MCP protocol JSON messages via stdin
```

2. **Claude Code integration**:
Configure in Claude Desktop config with absolute path to dist/index.js

3. **Test database requirements**:
- SQL Server 2016+ or Azure SQL Database
- Read permissions on target databases
- TCP/IP protocol enabled on port 1433

## Known Implementation Details

- **Execution Plans**: `explainQuery()` returns simplified guidance due to mssql driver limitations. Full plans need SSMS.
- **Dynamic SQL**: Some profiling queries use dynamic SQL which may require elevated permissions.
- **Connection Pooling**: Pools are kept in memory map by connection string. Not cleaned up until server shutdown.
- **Type Assertions**: `(request as any).timeout` used because mssql types are incomplete.
- **Error Handling**: All tool calls wrapped in try/catch in `handleToolCall()`.

## Important Conventions

- SQL identifiers always bracket-quoted: `[schema].[table]`
- C# code uses 4-space indentation
- Generated code includes XML documentation comments (`///`)
- All async operations use async/await (no callbacks)
- Connection pooling handled automatically by DatabaseManager
- All tools require database parameter except server-level tools