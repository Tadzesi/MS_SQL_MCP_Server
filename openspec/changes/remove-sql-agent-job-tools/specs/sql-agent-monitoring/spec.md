# SQL Agent Monitoring Specification

## REMOVED Requirements

### Requirement: SQL Agent Job Listing

**REMOVED:** The system no longer provides capabilities to list and filter SQL Server Agent jobs.

#### Scenario: List all SQL Agent jobs

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests to list SQL Agent jobs
- **THEN** the system would return job information including name, enabled status, owner, and category

#### Scenario: Filter jobs by criteria

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests jobs with specific filters (category, enabled status, name pattern)
- **THEN** the system would return only jobs matching the filter criteria

#### Scenario: Paginate job list

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests jobs with pagination parameters (top, offset)
- **THEN** the system would return a subset of jobs according to the pagination settings

### Requirement: Job Detail Inspection

**REMOVED:** The system no longer provides capabilities to retrieve detailed information about specific SQL Agent jobs.

#### Scenario: Get complete job description

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests details for a specific job by name
- **THEN** the system would return complete job metadata including:
  - Basic job information (id, name, enabled, owner, category)
  - All job steps with commands and error handling logic
  - All job schedules with frequency and timing information
  - Email notification configuration

### Requirement: Job Execution History

**REMOVED:** The system no longer provides capabilities to view job execution history.

#### Scenario: View job execution history

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests execution history for a specific job
- **THEN** the system would return historical records showing:
  - Run date and time
  - Run duration
  - Run status (succeeded, failed, retry, canceled, in progress)
  - Error messages
  - Retry attempts

#### Scenario: Limit history records

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user specifies a maximum number of history records to return
- **THEN** the system would return only the most recent N history records

### Requirement: Job Status Monitoring

**REMOVED:** The system no longer provides capabilities to monitor current job status.

#### Scenario: Get current job status

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests the current status of jobs
- **THEN** the system would return status information including:
  - Last run date, time, status, and duration
  - Next scheduled run date and time
  - Current execution status (running, idle, disabled)

#### Scenario: Filter status by job name

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests status for a specific job by name
- **THEN** the system would return status information for only that job

### Requirement: Job Failure Analysis

**REMOVED:** The system no longer provides capabilities to analyze job failures over time.

#### Scenario: Analyze failures over time period

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests failure analysis for a specified number of days
- **THEN** the system would return analysis showing:
  - Total failure count per job
  - Last failure date
  - Failure rate percentage
  - Common error messages with occurrence counts
  - Failed steps with failure counts

#### Scenario: Identify problematic jobs

**REMOVED:** The following scenario is no longer supported:

- **WHEN** a user requests failure analysis
- **THEN** the system would sort results by total failures to highlight the most problematic jobs

## Impact

**Rationale for removal:**
- SQL Agent job monitoring is a specialized capability not core to the primary use cases (schema exploration and Entity Framework code generation)
- Requires access to the `msdb` system database which may not be available in all environments
- Only functions on SQL Server instances with SQL Agent (not available on Azure SQL Database)
- Contributes to MCP tool context size exceeding the 25,000 token protocol limit

**Affected MCP tools (all removed):**
- `mssql_list_jobs`
- `mssql_describe_job`
- `mssql_job_history`
- `mssql_job_status`
- `mssql_analyze_job_failures`

**Migration path:**
- Users requiring SQL Agent monitoring should use native SQL Server Management Studio (SSMS) or Azure Data Studio
- Custom queries can be written directly against `msdb` system database if needed
- This functionality may be reintroduced in a separate, specialized MCP server if demand warrants
