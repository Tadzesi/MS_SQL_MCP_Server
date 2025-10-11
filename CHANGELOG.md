# Changelog

All notable changes to the MS SQL MCP Server will be documented in this file.

## [1.2.0] - 2025-10-11

### Added

- **SQL Server Agent Job Monitoring ✅**: Complete suite of job analysis tools (5 new tools)
  - `mssql_list_jobs` - List all SQL Server Agent jobs with basic information
  - `mssql_describe_job` - Get detailed job info including steps, schedules, and notifications
  - `mssql_job_history` - View execution history with success/failure details
  - `mssql_job_status` - Show current job status (last run, next run, running/idle/disabled)
  - `mssql_analyze_job_failures` - Analyze job failures over time with error patterns
- **Job Tools Class**: New `src/tools/job-tools.ts` module (~450 lines)
  - Queries `msdb` system database for SQL Agent information
  - Uses complex CTEs to aggregate job data, history, and schedules
  - Formats SQL Server integer date/time to readable strings (YYYYMMDD/HHMMSS → datetime)
  - Analyzes failure patterns with common error messages and failed step identification
  - Calculates failure rates and next run times from schedule definitions
- **Job Type Definitions**: 7 new TypeScript interfaces in `types.ts`
  - `JobInfo` - Basic job information (id, name, enabled, owner, category)
  - `JobStep` - Individual job step details with commands and error handling
  - `JobSchedule` - Job schedule configuration with frequency and timing
  - `JobDescription` - Complete job details including steps and schedules
  - `JobHistoryRecord` - Execution history with status and duration
  - `JobStatus` - Current job status (last run, next run, execution state)
  - `JobFailureAnalysis` - Failure analysis with error patterns and failure rates

### Changed

- **Tool Count**: Increased from 38 to 43 tools
- **Architecture Documentation**: Updated CLAUDE.md with JobTools category
  - Added SQL Agent Job Monitoring to tool categories diagram
  - Documented job tools architecture and query patterns
  - Added msdb database requirements
- **README**: Updated feature list and tool documentation
  - Added SQL Agent Job Monitoring section
  - Updated tool counts throughout documentation
  - Added job monitoring examples

### Requirements

- **Database Permissions**: Job tools require SELECT permissions on `msdb` database
  - Specifically: `msdb.dbo.sysjobs`, `msdb.dbo.sysjobsteps`, `msdb.dbo.sysjobhistory`, `msdb.dbo.sysjobschedules`, `msdb.dbo.sysschedules`
- **Platform**: SQL Server Agent not available on Azure SQL Database
  - ✅ SQL Server 2016+ (on-premises)
  - ✅ Azure SQL Managed Instance
  - ❌ Azure SQL Database (no SQL Agent)

### Technical Details

- **Date/Time Formatting**: Converts SQL Server integer formats to readable strings
  - Run dates: YYYYMMDD → YYYY-MM-DD
  - Run times: HHMMSS → HH:MM:SS
  - Durations: HHMMSS → HH:MM:SS
- **Query Optimization**: Uses CTEs and ROW_NUMBER() for efficient history retrieval
- **Server-Level Tools**: Job tools don't require database parameter (operate on msdb)
- **ES Module Support**: Uses `.js` extension for imports, follows project conventions

### Breaking Changes

None - This release is fully backward compatible. All existing tools continue to work unchanged.

## [1.1.3] - 2025-10-10

### Added

- **Windows Integrated Authentication ✅**: Full support for Windows authentication via `msnodesqlv8` driver (Windows only)
  - Authenticates using current Windows user session credentials (no username/password required)
  - Uses native SQL Server driver for true Windows integrated security
  - Platform: Windows only (requires `msnodesqlv8` native addon)
- **Dynamic Driver Loading**: Automatic selection of correct SQL Server driver based on authentication type
  - `mssql/msnodesqlv8.js` for Windows integrated authentication
  - `mssql` (tedious) for SQL Server authentication
  - Single codebase supports both authentication methods
- **Claude Code Configuration Guide**: Comprehensive setup documentation in README.md
  - Step-by-step instructions for VS Code `settings.json` configuration
  - Complete examples for both SQL Server and Windows authentication
  - Multiple connection profile setup examples
  - Configuration verification steps
- **Connection Test Suite**: Added `src/test-connection.ts` for testing both authentication methods
  - Tests Windows integrated authentication
  - Tests SQL Server authentication
  - Validates connection and returns server information
- **Dependencies**: Added `msnodesqlv8@5.1.1` for Windows authentication support

### Changed

- **Database Connection Architecture**: Complete refactor of authentication handling in `database.ts`
  - Dynamic driver import based on `authentication` configuration setting
  - Windows auth: Uses `trustedConnection: true` with msnodesqlv8 driver
  - SQL auth: Uses `user`/`password` with tedious driver
  - Removed broken NTLM authentication approach
- **Configuration Error Messages**: Enhanced with detailed examples for both authentication methods
  - Shows separate configuration blocks for SQL and Windows auth
  - Includes platform requirements and driver information
- **Documentation**: Major updates across all documentation files
  - **README.md**: Added "Configuration for Claude Code" section with complete setup guide
  - **CLAUDE.md**: Updated with dynamic driver loading architecture and Windows auth details
  - Quick setup box at top of README highlighting both Claude Desktop and Claude Code setup
  - Updated dependencies section to list both `mssql` and `msnodesqlv8` drivers

### Fixed

- **Windows Authentication**: Completely fixed broken Windows integrated authentication
  - Previous NTLM-based approach did not work with tedious driver
  - Now uses proper `msnodesqlv8` driver with `trustedConnection: true`
  - Successfully authenticates with current Windows user credentials
- **Driver Compatibility**: Resolved authentication failures by using correct driver for each auth type
  - msnodesqlv8 cannot use SQL authentication
  - tedious cannot use true Windows integrated authentication
  - Dynamic loading ensures correct driver is always used

### Technical Details

- **ES Module Compatibility**: Dynamic imports use `.js` extension for msnodesqlv8 driver
- **TypeScript Support**: Added `@ts-ignore` directive for msnodesqlv8 import (no type declarations)
- **Connection Pooling**: Separate pools maintained for different authentication types
- **Platform Requirements**: Windows authentication requires Windows OS and msnodesqlv8 native addon

### Breaking Changes

None - This release is fully backward compatible. Existing SQL Server authentication configurations continue to work unchanged.

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