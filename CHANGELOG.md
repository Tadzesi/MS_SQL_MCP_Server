# Changelog

All notable changes to the MS SQL MCP Server will be documented in this file.

## [1.0.0] - 2025-09-30

### Initial Release

#### Added
- Complete MCP server implementation with 38 tools
- Schema inspection tools (8 tools)
  - List databases, tables, views, stored procedures
  - Describe table structures with full metadata
  - Explore relationships and foreign keys
- Query execution and analysis tools (6 tools)
  - Safe read-only query execution
  - SQL syntax validation
  - Query performance analysis
  - Missing index recommendations
- Performance monitoring tools (5 tools)
  - Active query monitoring
  - Query statistics analysis
  - Index usage tracking
  - Blocking chain detection
  - Wait statistics analysis
- Data profiling tools (4 tools)
  - Sample data retrieval
  - Column statistics
  - Data quality checks
  - Table statistics
- Entity Framework Core code generation tools (6 tools)
  - Entity class generation with Data Annotations
  - DbContext generation with Fluent API
  - Repository interface generation
  - DTO generation (Create, Update, Read, List)
  - Entity configuration generation
  - Migration template generation
- Documentation tools (4 tools)
  - Data dictionary generation
  - ER diagram generation (Mermaid, PlantUML)
  - Stored procedure documentation
  - REST API documentation
- Schema comparison tools (2 tools)
  - Cross-database schema comparison
  - Synchronization script generation

#### Security
- Read-only query enforcement (blocks write operations)
- Automatic query row limiting (max 10,000 rows)
- Query timeout enforcement (30 seconds default)
- Connection pooling with limits
- Multiple connection profile support
- Environment-specific restrictions

#### Configuration
- JSON configuration file support
- Environment variable configuration
- Configurable query limits
- Code generation preferences
- Feature flags for optional capabilities

#### Documentation
- Comprehensive README with examples
- Quick start guide
- Configuration examples
- Implementation summary
- Claude Code integration guide (CLAUDE.md)

#### Technical
- TypeScript implementation with full type safety
- ES2022 + Node16 module support
- Source maps for debugging
- Type declaration files for IDE support
- Modular architecture with separated concerns

### Dependencies
- @modelcontextprotocol/sdk: ^1.0.4
- mssql: ^11.0.1
- zod: ^3.23.8
- TypeScript: ^5.7.2

### Requirements
- Node.js 18+
- SQL Server 2016+ or Azure SQL Database
- Read access to target databases

### Known Limitations
- Execution plan viewing requires SSMS or Azure Data Studio for detailed visualization
- Some advanced features require specific SQL Server permissions
- Generated code may require minor adjustments for specific use cases
- Schema sync scripts should be reviewed before execution

### Notes
- All 38 tools from the functional specification implemented
- ~2,815 lines of TypeScript code
- Production-ready with comprehensive error handling
- Follows Entity Framework Core 8.0 best practices for code generation