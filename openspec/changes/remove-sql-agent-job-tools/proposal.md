# Proposal: Remove SQL Agent Job Tools

## Why

The MCP server's tool definitions exceed the MCP protocol limit of 25,000 tokens (~25,686 tokens observed), causing failures when running the `doctor` command in MCP clients like Claude Desktop. This prevents proper tool discovery and breaks protocol compliance.

The SQL Agent job monitoring tools represent a specialized capability that:
- Adds 5 tools to the server (mssql_list_jobs, mssql_describe_job, mssql_job_history, mssql_job_status, mssql_analyze_job_failures)
- Requires access to the `msdb` system database
- Only works on SQL Server instances with SQL Agent (not Azure SQL Database)
- Contributes ~1,500-2,000 tokens to the tool definitions context
- Is not core to the primary use case (schema exploration and Entity Framework code generation)

Removing these specialized tools will reduce the MCP context size and bring the server back into protocol compliance.

## What Changes

**Removed capabilities:**
- SQL Agent job listing and filtering
- Job detail inspection (steps, schedules)
- Job execution history viewing
- Job status monitoring
- Job failure analysis

**Code removals:**
- Delete `src/tools/job-tools.ts` (505 lines)
- Remove 5 tool definitions from `src/index.ts` (lines 604-666, plus cases 1052-1088)
- Remove `JobTools` class instantiation and import from `src/index.ts`
- Remove SQL Agent job types from `src/types.ts`: `JobInfo`, `JobDescription`, `JobStep`, `JobSchedule`, `JobHistoryRecord`, `JobStatus`, `JobFailureAnalysis`

**Documentation updates:**
- Update CLAUDE.md to remove SQL Agent job references
- Update README.md to reflect 38 tools (down from 43)
- Update project.md to remove SQL Agent monitoring capability

## Impact

- **Affected specs**: `sql-agent-monitoring` (capability being removed)
- **Affected code**: `src/index.ts`, `src/tools/job-tools.ts`, `src/types.ts`, CLAUDE.md, README.md
- **Breaking**: Yes - removes 5 MCP tools:
  - `mssql_list_jobs`
  - `mssql_describe_job`
  - `mssql_job_history`
  - `mssql_job_status`
  - `mssql_analyze_job_failures`
- **Benefits**:
  - Resolves MCP protocol limit violation (~25,686 → ~23,500 tokens estimated)
  - Simplifies server scope to core database exploration
  - Removes dependency on `msdb` database access
  - Reduces maintenance surface area
- **Risks**:
  - Users relying on SQL Agent monitoring will lose functionality
  - May need to be documented as a removed feature in CHANGELOG.md

## Alternatives Considered

1. **Reduce tool description verbosity** (existing proposal: reduce-tool-descriptions-size) - saves ~6,000 tokens but keeps all tools
2. **Make SQL Agent tools optional via feature flag** - adds complexity without solving the immediate protocol violation
3. **Split into separate MCP server** - over-engineering for 5 tools

This proposal favors simplicity: remove the specialized capability to ensure core functionality remains protocol-compliant.
