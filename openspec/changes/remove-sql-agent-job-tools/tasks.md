# Implementation Tasks: Remove SQL Agent Job Tools

## Code Removal Tasks

### 1. Remove SQL Agent job tool definitions from index.ts

**File:** `src/index.ts` (lines 604-666 in `getToolDefinitions()`)

- [x] Remove `mssql_list_jobs` tool definition (lines ~605-621)
- [x] Remove `mssql_describe_job` tool definition (lines ~622-632)
- [x] Remove `mssql_job_history` tool definition (lines ~633-643)
- [x] Remove `mssql_job_status` tool definition (lines ~644-655)
- [x] Remove `mssql_analyze_job_failures` tool definition (lines ~656-666)

**Validation:** ✅ Tool definitions array length decreased from 43 to 38 tools

### 2. Remove SQL Agent job case handlers from index.ts

**File:** `src/index.ts` (lines 1051-1088 in `handleToolCall()`)

- [x] Remove `case 'mssql_list_jobs':` handler (lines ~1052-1064)
- [x] Remove `case 'mssql_describe_job':` handler (lines ~1066-1070)
- [x] Remove `case 'mssql_job_history':` handler (lines ~1072-1076)
- [x] Remove `case 'mssql_job_status':` handler (lines ~1078-1082)
- [x] Remove `case 'mssql_analyze_job_failures':` handler (lines ~1084-1088)

**Validation:** ✅ Switch statement has 5 fewer cases

### 3. Remove JobTools class usage from index.ts

**File:** `src/index.ts`

- [x] Remove import statement: `import { JobTools } from './tools/job-tools.js';` (line 21)
- [x] Remove field declaration: `private jobTools: JobTools;` (line 39)
- [x] Remove instantiation: `this.jobTools = new JobTools(this.dbManager);` (line 68)

**Validation:** ✅ No references to `JobTools` remain in index.ts

### 4. Delete job-tools.ts file

**File:** `src/tools/job-tools.ts`

- [x] Delete entire file (505 lines)

**Validation:** ✅ File no longer exists in src/tools/ directory

### 5. Remove SQL Agent job types from types.ts

**File:** `src/types.ts`

- [x] Remove `JobInfo` interface
- [x] Remove `JobDescription` interface
- [x] Remove `JobStep` interface
- [x] Remove `JobSchedule` interface
- [x] Remove `JobHistoryRecord` interface
- [x] Remove `JobStatus` interface
- [x] Remove `JobFailureAnalysis` interface

**Validation:** ✅ All SQL Agent job types removed from types.ts

## Documentation Update Tasks

### 6. Update CLAUDE.md

**File:** `CLAUDE.md`

- [x] Update tool count in overview: "43 tools" → "38 tools" (line 15)
- [x] Remove SQL Agent Job Monitoring from capabilities list (line 13)
- [x] Remove SQL Agent Job Tools section from Architecture (line 605-666 equivalent)
- [x] Remove JobTools from tool categories list
- [x] Remove SQL Agent job types from Type System section
- [x] Remove SQL Agent notes from Known Implementation Details
- [x] Remove SQL Agent tools from MCP Protocol Integration section

**Validation:** ✅ No references to SQL Agent, msdb, or job tools remain

### 7. Update README.md

**File:** `README.md`

- [x] Update tool count: "43 tools" → "38 tools"
- [x] Remove SQL Agent job monitoring from features list
- [x] Remove SQL Agent job tools from tool listing
- [x] Remove SQL Agent notes from requirements section (msdb permissions)

**Validation:** ✅ No references to SQL Agent or job monitoring

### 8. Update project.md

**File:** `openspec/project.md`

- [x] Remove "SQL Agent Job Monitoring" from Purpose section (line 13)
- [x] Update tool count: "43 tools" → "38 tools" (line 15)
- [x] Remove SQL Agent job monitoring capability description
- [x] Remove JobTools from Architecture Patterns section
- [x] Remove SQL Agent job types from Domain Context section
- [x] Remove msdb dependency from External Dependencies section
- [x] Update SQL Server constraint note about SQL Agent not being available on Azure SQL Database

**Validation:** ✅ SQL Agent references removed while preserving other content

### 9. Add CHANGELOG entry

**File:** `CHANGELOG.md`

- [x] Add entry under "Breaking Changes" section describing removal of 5 SQL Agent job tools
- [x] Document migration path (use SSMS or Azure Data Studio for SQL Agent monitoring)
- [x] Note that this resolves MCP protocol token limit issue

**Validation:** ✅ Users will be informed of breaking change

## Build and Verification Tasks

### 10. Compile and verify build

- [x] Run `npm run build`
- [x] Verify no TypeScript compilation errors
- [x] Check that dist/index.js is generated successfully
- [x] Verify no references to job-tools in compiled output

**Validation:** ✅ Build succeeds with zero errors

### 11. Test MCP integration

- [ ] Update Claude Desktop MCP configuration to point to newly built server
- [ ] Restart Claude Desktop
- [ ] Run `doctor` command to verify MCP tool context size is under 25,000 tokens
- [ ] Verify that SQL Agent job tools are no longer listed in available tools
- [ ] Test that existing tools (schema inspection, query execution, code generation) still work

**Validation:**
- Doctor command passes without "Large MCP tools context" error
- 38 tools available (not 43)
- Core functionality intact

**Note:** MCP integration testing requires user to restart Claude Desktop and verify with `doctor` command

## Dependency Notes

**Sequential dependencies:**
- Tasks 1-5 must be completed before task 10 (build will fail otherwise)
- Tasks 6-9 can be done in parallel with tasks 1-5
- Task 10 must complete successfully before task 11
- All tasks must complete before proposal can be marked as implemented

**Parallelizable work:**
- Documentation updates (tasks 6-9) can be done concurrently
- Code removal tasks (1-5) can be done concurrently if careful with merge conflicts

## Validation Checklist

After all tasks complete:

- [x] TypeScript build succeeds with no errors
- [x] No references to `JobTools`, `job-tools`, or SQL Agent job types in code
- [x] Documentation updated to reflect 38 tools (down from 43)
- [x] CHANGELOG.md documents breaking change
- [ ] Claude Desktop doctor command shows MCP context under 25,000 tokens (requires user testing)
- [ ] Available tools list shows 38 tools (5 SQL Agent tools missing) (requires user testing)
- [ ] Core functionality (schema, query, codegen, performance, profiling, documentation, comparison tools) still works (requires user testing)
