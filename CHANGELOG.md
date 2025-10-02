# Changelog

All notable changes to the MS SQL MCP Server will be documented in this file.

## [1.1.0] - 2025-10-02

### Breaking Changes

- **Configuration System Overhaul**: Removed config.json file support and hardcoded database connections
- **Environment Variables Required**: All database connections must now be configured via environment variables with prefixes (`MSSQL_LOCAL_*`, `MSSQL_PROD_*`, `MSSQL_DEV_*`)
- **Default Connection Changed**: Default connection profile changed from `default` to `local`
- **Validation**: Server now requires `MSSQL_LOCAL_*` environment variables to be set or will fail with helpful error message

### Added

- **Connection Switching Tool**: New `mssql_switch_connection` tool to switch between connection profiles (local, prod, dev) at runtime
- **Enhanced Development Workflow**: Added `concurrently` and `nodemon` to dev script for automatic TypeScript recompilation and server restart
- **Environment-Based Configuration**: Automatic connection profile creation from environment variable prefixes
- **Better Error Messages**: Configuration errors now provide clear, actionable instructions with example configuration

### Changed

- **Configuration Loading**: `ConfigManager` now loads connection profiles exclusively from environment variables
- **Connection Profiles**: Support for multiple environments via `MSSQL_{PREFIX}_*` pattern (LOCAL, PROD, DEV)
- **Documentation**: Complete rewrite of QUICKSTART.md with step-by-step setup instructions
- **Documentation**: Enhanced README.md with environment variable configuration examples
- **Documentation**: Updated CLAUDE.md with architecture details and configuration instructions

### Removed

- **Logging**: Removed Winston file-based logging from `index.ts` (now uses stderr only)
- **Config Files**: Removed `config.example.json` and config.json support
- **Test Files**: Removed `test-connection.js`, `test-mcp-input.json`, `test-mcp.cjs`
- **Documentation**: Removed `IMPLEMENTATION_SUMMARY.md` (consolidated into other docs)
- **Config Logging**: Removed automatic config file writing to `mssql-mcp-config.log`

### Fixed

- **Authentication Handling**: Improved Windows integrated auth and SQL auth configuration
- **Connection Pooling**: Better connection string-based pool management

### Security

- **No Hardcoded Credentials**: All database credentials must be explicitly configured via environment variables
- **Profile Validation**: Server validates required connection profile exists before starting

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