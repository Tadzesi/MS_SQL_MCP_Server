import { DatabaseManager } from '../database.js';
import {
  JobInfo,
  JobDescription,
  JobStep,
  JobSchedule,
  JobHistoryRecord,
  JobStatus,
  JobFailureAnalysis
} from '../types.js';

type ConnectionPool = any;

export class JobTools {
  constructor(private dbManager: DatabaseManager) {}

  /**
   * List all SQL Server Agent jobs with pagination and filtering
   */
  async listJobs(
    pool: ConnectionPool,
    options?: {
      top?: number;
      offset?: number;
      category?: string;
      enabled_only?: boolean;
      name_pattern?: string;
      include_description?: boolean;
      max_description_length?: number;
    }
  ): Promise<JobInfo[]> {
    // Default values
    const top = Math.min(options?.top || 100, 500); // Max 500
    const offset = options?.offset || 0;
    const includeDescription = options?.include_description || false;
    const maxDescLength = options?.max_description_length || 200;

    // Build WHERE clause
    const whereConditions: string[] = ['1=1'];

    if (options?.category) {
      whereConditions.push(`c.name = '${options.category.replace(/'/g, "''")}'`);
    }

    if (options?.enabled_only) {
      whereConditions.push('j.enabled = 1');
    }

    if (options?.name_pattern) {
      whereConditions.push(`j.name LIKE '${options.name_pattern.replace(/'/g, "''")}'`);
    }

    const whereClause = whereConditions.join(' AND ');

    // Build description field
    const descriptionField = includeDescription
      ? `LEFT(j.description, ${maxDescLength}) AS description`
      : 'NULL AS description';

    const query = `
      USE msdb;
      SELECT
        CONVERT(VARCHAR(36), j.job_id) AS job_id,
        j.name,
        j.enabled,
        ${descriptionField},
        j.date_created,
        j.date_modified,
        SUSER_SNAME(j.owner_sid) AS owner,
        c.name AS category
      FROM dbo.sysjobs j
      LEFT JOIN dbo.syscategories c ON j.category_id = c.category_id
      WHERE ${whereClause}
      ORDER BY j.name
      OFFSET ${offset} ROWS
      FETCH NEXT ${top} ROWS ONLY
    `;

    const result = await this.dbManager.executeQuery<JobInfo>(pool, query);
    return result.recordset.map(r => ({
      job_id: r.job_id,
      name: r.name,
      enabled: r.enabled,
      description: r.description,
      date_created: r.date_created,
      date_modified: r.date_modified,
      owner: r.owner,
      category: r.category
    }));
  }

  /**
   * Get detailed information about a specific job including steps and schedules
   */
  async describeJob(pool: ConnectionPool, jobName: string): Promise<JobDescription> {
    // Get job basic info
    const jobQuery = `
      USE msdb;
      SELECT
        CONVERT(VARCHAR(36), j.job_id) AS job_id,
        j.name,
        j.enabled,
        j.description,
        j.date_created,
        j.date_modified,
        SUSER_SNAME(j.owner_sid) AS owner,
        c.name AS category,
        CASE j.notify_level_email
          WHEN 0 THEN 'Never'
          WHEN 1 THEN 'On Success'
          WHEN 2 THEN 'On Failure'
          WHEN 3 THEN 'On Completion'
        END AS email_level,
        o.name AS email_operator
      FROM dbo.sysjobs j
      LEFT JOIN dbo.syscategories c ON j.category_id = c.category_id
      LEFT JOIN dbo.sysoperators o ON j.notify_email_operator_id = o.id
      WHERE j.name = '${jobName}'
    `;

    const jobResult = await this.dbManager.executeQuery<any>(pool, jobQuery);
    if (jobResult.recordset.length === 0) {
      throw new Error(`Job '${jobName}' not found`);
    }

    const job = jobResult.recordset[0];

    // Get job steps
    const steps = await this.getJobSteps(pool, jobName);

    // Get job schedules
    const schedules = await this.getJobSchedules(pool, jobName);

    return {
      job_id: job.job_id,
      name: job.name,
      enabled: job.enabled,
      description: job.description,
      date_created: job.date_created,
      date_modified: job.date_modified,
      owner: job.owner,
      category: job.category,
      steps,
      schedules,
      email_level: job.email_level,
      email_operator: job.email_operator
    };
  }

  /**
   * Get job steps for a specific job
   */
  private async getJobSteps(pool: ConnectionPool, jobName: string): Promise<JobStep[]> {
    const query = `
      USE msdb;
      SELECT
        s.step_id,
        s.step_name,
        s.subsystem,
        s.command,
        s.database_name,
        CASE s.on_success_action
          WHEN 1 THEN 'Quit with success'
          WHEN 2 THEN 'Quit with failure'
          WHEN 3 THEN 'Go to next step'
          WHEN 4 THEN 'Go to step ' + CAST(s.on_success_step_id AS VARCHAR)
        END AS on_success_action,
        CASE s.on_fail_action
          WHEN 1 THEN 'Quit with success'
          WHEN 2 THEN 'Quit with failure'
          WHEN 3 THEN 'Go to next step'
          WHEN 4 THEN 'Go to step ' + CAST(s.on_fail_step_id AS VARCHAR)
        END AS on_fail_action,
        s.retry_attempts,
        s.retry_interval
      FROM dbo.sysjobsteps s
      INNER JOIN dbo.sysjobs j ON s.job_id = j.job_id
      WHERE j.name = '${jobName}'
      ORDER BY s.step_id
    `;

    const result = await this.dbManager.executeQuery<JobStep>(pool, query);
    return result.recordset;
  }

  /**
   * Get job schedules for a specific job
   */
  private async getJobSchedules(pool: ConnectionPool, jobName: string): Promise<JobSchedule[]> {
    const query = `
      USE msdb;
      SELECT
        s.schedule_id,
        s.name AS schedule_name,
        s.enabled,
        CASE s.freq_type
          WHEN 1 THEN 'Once'
          WHEN 4 THEN 'Daily'
          WHEN 8 THEN 'Weekly'
          WHEN 16 THEN 'Monthly'
          WHEN 32 THEN 'Monthly relative'
          WHEN 64 THEN 'When SQL Server Agent starts'
          WHEN 128 THEN 'When computer is idle'
        END AS freq_type,
        s.freq_interval,
        CASE s.freq_subday_type
          WHEN 1 THEN 'At specified time'
          WHEN 2 THEN 'Seconds'
          WHEN 4 THEN 'Minutes'
          WHEN 8 THEN 'Hours'
        END AS freq_subday_type,
        s.freq_subday_interval,
        s.freq_recurrence_factor,
        CONVERT(VARCHAR(10), CAST(CAST(s.active_start_date AS VARCHAR) AS DATETIME), 120) AS active_start_date,
        CONVERT(VARCHAR(10), CAST(CAST(s.active_end_date AS VARCHAR) AS DATETIME), 120) AS active_end_date,
        RIGHT('00' + CAST(s.active_start_time / 10000 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST((s.active_start_time % 10000) / 100 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST(s.active_start_time % 100 AS VARCHAR), 2) AS active_start_time,
        RIGHT('00' + CAST(s.active_end_time / 10000 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST((s.active_end_time % 10000) / 100 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST(s.active_end_time % 100 AS VARCHAR), 2) AS active_end_time
      FROM dbo.sysschedules s
      INNER JOIN dbo.sysjobschedules js ON s.schedule_id = js.schedule_id
      INNER JOIN dbo.sysjobs j ON js.job_id = j.job_id
      WHERE j.name = '${jobName}'
      ORDER BY s.name
    `;

    const result = await this.dbManager.executeQuery<JobSchedule>(pool, query);
    return result.recordset;
  }

  /**
   * Get execution history for a specific job
   */
  async getJobHistory(
    pool: ConnectionPool,
    jobName: string,
    top: number = 50
  ): Promise<JobHistoryRecord[]> {
    const query = `
      USE msdb;
      SELECT TOP ${top}
        h.instance_id,
        j.name AS job_name,
        h.step_id,
        h.step_name,
        CONVERT(VARCHAR(10), CAST(CAST(h.run_date AS VARCHAR) AS DATETIME), 120) AS run_date,
        RIGHT('00' + CAST(h.run_time / 10000 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST((h.run_time % 10000) / 100 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST(h.run_time % 100 AS VARCHAR), 2) AS run_time,
        RIGHT('00' + CAST(h.run_duration / 10000 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST((h.run_duration % 10000) / 100 AS VARCHAR), 2) + ':' +
        RIGHT('00' + CAST(h.run_duration % 100 AS VARCHAR), 2) AS run_duration,
        CASE h.run_status
          WHEN 0 THEN 'Failed'
          WHEN 1 THEN 'Succeeded'
          WHEN 2 THEN 'Retry'
          WHEN 3 THEN 'Canceled'
          WHEN 4 THEN 'In Progress'
        END AS run_status,
        h.message,
        h.retries_attempted
      FROM dbo.sysjobhistory h
      INNER JOIN dbo.sysjobs j ON h.job_id = j.job_id
      WHERE j.name = '${jobName}'
      ORDER BY h.instance_id DESC
    `;

    const result = await this.dbManager.executeQuery<JobHistoryRecord>(pool, query);
    return result.recordset;
  }

  /**
   * Get current status of jobs (last run, next run, enabled/disabled)
   */
  async getJobStatus(pool: ConnectionPool, jobName?: string): Promise<JobStatus[]> {
    const jobFilter = jobName ? `AND j.name = '${jobName}'` : '';

    const query = `
      USE msdb;
      WITH LastRun AS (
        SELECT
          h.job_id,
          h.run_date,
          h.run_time,
          h.run_duration,
          h.run_status,
          ROW_NUMBER() OVER (PARTITION BY h.job_id ORDER BY h.instance_id DESC) AS rn
        FROM dbo.sysjobhistory h
        WHERE h.step_id = 0  -- Only job-level outcomes
      ),
      NextRun AS (
        SELECT
          js.job_id,
          MIN(ja.next_run_date) AS next_run_date,
          MIN(ja.next_run_time) AS next_run_time
        FROM dbo.sysjobschedules js
        CROSS APPLY (
          SELECT
            msdb.dbo.agent_datetime(js.next_run_date, js.next_run_time) AS next_run
        ) ja_calc
        CROSS APPLY (
          SELECT
            CONVERT(INT, CONVERT(VARCHAR(8), ja_calc.next_run, 112)) AS next_run_date,
            (DATEPART(HOUR, ja_calc.next_run) * 10000 +
             DATEPART(MINUTE, ja_calc.next_run) * 100 +
             DATEPART(SECOND, ja_calc.next_run)) AS next_run_time
        ) ja
        WHERE js.next_run_date > 0
        GROUP BY js.job_id
      )
      SELECT
        CONVERT(VARCHAR(36), j.job_id) AS job_id,
        j.name AS job_name,
        j.enabled,
        CASE WHEN lr.run_date IS NOT NULL
          THEN CONVERT(VARCHAR(10), CAST(CAST(lr.run_date AS VARCHAR) AS DATETIME), 120)
          ELSE NULL
        END AS last_run_date,
        CASE WHEN lr.run_time IS NOT NULL
          THEN RIGHT('00' + CAST(lr.run_time / 10000 AS VARCHAR), 2) + ':' +
               RIGHT('00' + CAST((lr.run_time % 10000) / 100 AS VARCHAR), 2) + ':' +
               RIGHT('00' + CAST(lr.run_time % 100 AS VARCHAR), 2)
          ELSE NULL
        END AS last_run_time,
        CASE lr.run_status
          WHEN 0 THEN 'Failed'
          WHEN 1 THEN 'Succeeded'
          WHEN 2 THEN 'Retry'
          WHEN 3 THEN 'Canceled'
          WHEN 4 THEN 'In Progress'
          ELSE NULL
        END AS last_run_status,
        CASE WHEN lr.run_duration IS NOT NULL
          THEN RIGHT('00' + CAST(lr.run_duration / 10000 AS VARCHAR), 2) + ':' +
               RIGHT('00' + CAST((lr.run_duration % 10000) / 100 AS VARCHAR), 2) + ':' +
               RIGHT('00' + CAST(lr.run_duration % 100 AS VARCHAR), 2)
          ELSE NULL
        END AS last_run_duration,
        CASE WHEN nr.next_run_date IS NOT NULL
          THEN CONVERT(VARCHAR(10), CAST(CAST(nr.next_run_date AS VARCHAR) AS DATETIME), 120)
          ELSE NULL
        END AS next_run_date,
        CASE WHEN nr.next_run_time IS NOT NULL
          THEN RIGHT('00' + CAST(nr.next_run_time / 10000 AS VARCHAR), 2) + ':' +
               RIGHT('00' + CAST((nr.next_run_time % 10000) / 100 AS VARCHAR), 2) + ':' +
               RIGHT('00' + CAST(nr.next_run_time % 100 AS VARCHAR), 2)
          ELSE NULL
        END AS next_run_time,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM dbo.sysjobactivity ja
            WHERE ja.job_id = j.job_id
              AND ja.stop_execution_date IS NULL
              AND ja.start_execution_date IS NOT NULL
          ) THEN 'Running'
          WHEN j.enabled = 0 THEN 'Disabled'
          ELSE 'Idle'
        END AS current_execution_status
      FROM dbo.sysjobs j
      LEFT JOIN LastRun lr ON j.job_id = lr.job_id AND lr.rn = 1
      LEFT JOIN NextRun nr ON j.job_id = nr.job_id
      WHERE 1=1 ${jobFilter}
      ORDER BY j.name
    `;

    const result = await this.dbManager.executeQuery<JobStatus>(pool, query);
    return result.recordset;
  }

  /**
   * Analyze job failures over a specified time period
   */
  async analyzeJobFailures(
    pool: ConnectionPool,
    daysBack: number = 30
  ): Promise<JobFailureAnalysis[]> {
    const query = `
      USE msdb;
      WITH FailureStats AS (
        SELECT
          j.job_id,
          j.name AS job_name,
          COUNT(*) AS total_failures,
          MAX(msdb.dbo.agent_datetime(h.run_date, h.run_time)) AS last_failure_date,
          h.message
        FROM dbo.sysjobhistory h
        INNER JOIN dbo.sysjobs j ON h.job_id = j.job_id
        WHERE h.run_status = 0  -- Failed
          AND h.step_id = 0     -- Job level
          AND h.run_date >= CONVERT(INT, CONVERT(VARCHAR(8), DATEADD(DAY, -${daysBack}, GETDATE()), 112))
        GROUP BY j.job_id, j.name, h.message
      ),
      TotalRuns AS (
        SELECT
          job_id,
          COUNT(*) AS total_runs
        FROM dbo.sysjobhistory
        WHERE step_id = 0
          AND run_date >= CONVERT(INT, CONVERT(VARCHAR(8), DATEADD(DAY, -${daysBack}, GETDATE()), 112))
        GROUP BY job_id
      ),
      FailedSteps AS (
        SELECT
          j.job_id,
          h.step_name,
          COUNT(*) AS failure_count
        FROM dbo.sysjobhistory h
        INNER JOIN dbo.sysjobs j ON h.job_id = j.job_id
        WHERE h.run_status = 0
          AND h.step_id > 0  -- Step level
          AND h.run_date >= CONVERT(INT, CONVERT(VARCHAR(8), DATEADD(DAY, -${daysBack}, GETDATE()), 112))
        GROUP BY j.job_id, h.step_name
      )
      SELECT
        CONVERT(VARCHAR(36), fs.job_id) AS job_id,
        fs.job_name,
        SUM(fs.total_failures) AS total_failures,
        CONVERT(VARCHAR(23), MAX(fs.last_failure_date), 120) AS last_failure_date,
        CAST(ROUND((SUM(fs.total_failures) * 100.0) / NULLIF(tr.total_runs, 0), 2) AS DECIMAL(5,2)) AS failure_rate_percent
      FROM FailureStats fs
      LEFT JOIN TotalRuns tr ON fs.job_id = tr.job_id
      GROUP BY fs.job_id, fs.job_name, tr.total_runs
      HAVING SUM(fs.total_failures) > 0
      ORDER BY total_failures DESC
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);

    // For each job, get common error messages and failed steps
    const analyses: JobFailureAnalysis[] = [];

    for (const row of result.recordset) {
      const errorMessages = await this.getCommonErrorMessages(pool, row.job_name, daysBack);
      const failedSteps = await this.getFailedSteps(pool, row.job_name, daysBack);

      analyses.push({
        job_id: row.job_id,
        job_name: row.job_name,
        total_failures: row.total_failures,
        last_failure_date: row.last_failure_date,
        failure_rate_percent: row.failure_rate_percent,
        common_error_messages: errorMessages,
        failed_steps: failedSteps
      });
    }

    return analyses;
  }

  /**
   * Get common error messages for a job
   */
  private async getCommonErrorMessages(
    pool: ConnectionPool,
    jobName: string,
    daysBack: number
  ): Promise<Array<{ message: string; count: number }>> {
    const query = `
      USE msdb;
      SELECT TOP 5
        LEFT(h.message, 200) AS message,
        COUNT(*) AS count
      FROM dbo.sysjobhistory h
      INNER JOIN dbo.sysjobs j ON h.job_id = j.job_id
      WHERE j.name = '${jobName}'
        AND h.run_status = 0
        AND h.run_date >= CONVERT(INT, CONVERT(VARCHAR(8), DATEADD(DAY, -${daysBack}, GETDATE()), 112))
        AND LEN(h.message) > 0
      GROUP BY LEFT(h.message, 200)
      ORDER BY count DESC
    `;

    const result = await this.dbManager.executeQuery<{ message: string; count: number }>(pool, query);
    return result.recordset;
  }

  /**
   * Get failed steps for a job
   */
  private async getFailedSteps(
    pool: ConnectionPool,
    jobName: string,
    daysBack: number
  ): Promise<Array<{ step_name: string; failure_count: number }>> {
    const query = `
      USE msdb;
      SELECT
        h.step_name,
        COUNT(*) AS failure_count
      FROM dbo.sysjobhistory h
      INNER JOIN dbo.sysjobs j ON h.job_id = j.job_id
      WHERE j.name = '${jobName}'
        AND h.run_status = 0
        AND h.step_id > 0
        AND h.run_date >= CONVERT(INT, CONVERT(VARCHAR(8), DATEADD(DAY, -${daysBack}, GETDATE()), 112))
      GROUP BY h.step_name
      ORDER BY failure_count DESC
    `;

    const result = await this.dbManager.executeQuery<{ step_name: string; failure_count: number }>(pool, query);
    return result.recordset;
  }
}
