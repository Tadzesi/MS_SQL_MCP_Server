import { DatabaseManager } from '../database.js';
import {
  ActiveQuery,
  QueryStats,
  IndexUsageStats,
  BlockingChain,
  WaitStatistic
} from '../types.js';

type ConnectionPool = any;

export class PerformanceTools {
  constructor(private dbManager: DatabaseManager) {}

  async getActiveQueries(
    pool: ConnectionPool,
    minDurationSeconds: number = 5
  ): Promise<ActiveQuery[]> {
    const query = `
      SELECT
        s.session_id,
        SUBSTRING(qt.text, (r.statement_start_offset/2)+1,
          ((CASE r.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE r.statement_end_offset
          END - r.statement_start_offset)/2) + 1) AS query_text,
        DATEDIFF(SECOND, r.start_time, GETDATE()) AS duration_seconds,
        s.login_name AS username,
        r.wait_type,
        r.cpu_time AS cpu_time_ms,
        r.reads,
        r.writes,
        r.blocking_session_id
      FROM sys.dm_exec_requests r
      INNER JOIN sys.dm_exec_sessions s ON r.session_id = s.session_id
      CROSS APPLY sys.dm_exec_sql_text(r.sql_handle) qt
      WHERE s.session_id != @@SPID
        AND DATEDIFF(SECOND, r.start_time, GETDATE()) >= ${minDurationSeconds}
      ORDER BY duration_seconds DESC
    `;

    const result = await this.dbManager.executeQuery<ActiveQuery>(pool, query);
    return result.recordset;
  }

  async getQueryStats(
    pool: ConnectionPool,
    database: string,
    sortBy: 'duration' | 'cpu' | 'reads' | 'executions' = 'duration',
    top: number = 20
  ): Promise<QueryStats[]> {
    const orderByClause = {
      duration: 'total_duration_ms DESC',
      cpu: 'avg_cpu_ms DESC',
      reads: 'avg_reads DESC',
      executions: 'execution_count DESC'
    }[sortBy];

    const query = `
      USE [${database}];
      SELECT TOP ${top}
        qs.query_hash,
        SUBSTRING(qt.text, (qs.statement_start_offset/2)+1,
          ((CASE qs.statement_end_offset
            WHEN -1 THEN DATALENGTH(qt.text)
            ELSE qs.statement_end_offset
          END - qs.statement_start_offset)/2) + 1) AS query_text,
        qs.execution_count,
        qs.total_elapsed_time / 1000 / qs.execution_count AS avg_duration_ms,
        qs.total_elapsed_time / 1000 AS total_duration_ms,
        qs.total_worker_time / 1000 / qs.execution_count AS avg_cpu_ms,
        qs.total_logical_reads / qs.execution_count AS avg_reads,
        qs.last_execution_time AS last_execution
      FROM sys.dm_exec_query_stats qs
      CROSS APPLY sys.dm_exec_sql_text(qs.sql_handle) qt
      WHERE qt.dbid = DB_ID()
      ORDER BY ${orderByClause}
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);
    return result.recordset.map(r => ({
      query_hash: r.query_hash?.toString('hex') || '',
      query_text: r.query_text || '',
      execution_count: r.execution_count,
      avg_duration_ms: r.avg_duration_ms,
      total_duration_ms: r.total_duration_ms,
      avg_cpu_ms: r.avg_cpu_ms,
      avg_reads: r.avg_reads,
      last_execution: r.last_execution
    }));
  }

  async getIndexUsage(
    pool: ConnectionPool,
    database: string,
    table?: string
  ): Promise<IndexUsageStats[]> {
    const tableFilter = table ? `AND OBJECT_NAME(ius.object_id) = '${table}'` : '';

    const query = `
      USE [${database}];
      SELECT
        i.name AS index_name,
        OBJECT_NAME(ius.object_id) AS table_name,
        OBJECT_SCHEMA_NAME(ius.object_id) AS schema_name,
        ISNULL(ius.user_seeks, 0) AS seeks,
        ISNULL(ius.user_scans, 0) AS scans,
        ISNULL(ius.user_lookups, 0) AS lookups,
        ISNULL(ius.user_updates, 0) AS updates,
        ius.last_user_seek AS last_used,
        ps.avg_fragmentation_in_percent AS fragmentation_percent,
        CASE
          WHEN ius.user_seeks IS NULL AND ius.user_scans IS NULL AND ius.user_lookups IS NULL THEN 1
          ELSE 0
        END AS is_unused
      FROM sys.indexes i
      LEFT JOIN sys.dm_db_index_usage_stats ius
        ON i.object_id = ius.object_id AND i.index_id = ius.index_id AND ius.database_id = DB_ID()
      LEFT JOIN sys.dm_db_index_physical_stats(DB_ID(), NULL, NULL, NULL, 'LIMITED') ps
        ON i.object_id = ps.object_id AND i.index_id = ps.index_id
      WHERE i.object_id > 100
        AND i.type > 0
        ${tableFilter}
      ORDER BY schema_name, table_name, index_name
    `;

    const result = await this.dbManager.executeQuery<IndexUsageStats>(pool, query);
    return result.recordset;
  }

  async getBlockingChains(pool: ConnectionPool): Promise<BlockingChain[]> {
    const query = `
      SELECT
        blocking.session_id AS blocking_session_id,
        blocked.session_id AS blocked_session_id,
        DATEDIFF(SECOND, blocked.start_time, GETDATE()) AS wait_time_seconds,
        blocked.wait_resource,
        blocking_qt.text AS blocking_query,
        blocked_qt.text AS blocked_query
      FROM sys.dm_exec_requests blocked
      INNER JOIN sys.dm_exec_requests blocking
        ON blocked.blocking_session_id = blocking.session_id
      CROSS APPLY sys.dm_exec_sql_text(blocking.sql_handle) blocking_qt
      CROSS APPLY sys.dm_exec_sql_text(blocked.sql_handle) blocked_qt
      WHERE blocked.blocking_session_id != 0
      ORDER BY wait_time_seconds DESC
    `;

    const result = await this.dbManager.executeQuery<BlockingChain>(pool, query);
    return result.recordset;
  }

  async getWaitStatistics(
    pool: ConnectionPool,
    top: number = 10
  ): Promise<WaitStatistic[]> {
    const query = `
      WITH waits AS (
        SELECT
          wait_type,
          wait_time_ms,
          waiting_tasks_count AS wait_count,
          wait_time_ms * 100.0 / SUM(wait_time_ms) OVER() AS percentage
        FROM sys.dm_os_wait_stats
        WHERE wait_type NOT IN (
          'CLR_SEMAPHORE', 'LAZYWRITER_SLEEP', 'RESOURCE_QUEUE', 'SLEEP_TASK',
          'SLEEP_SYSTEMTASK', 'SQLTRACE_BUFFER_FLUSH', 'WAITFOR', 'LOGMGR_QUEUE',
          'CHECKPOINT_QUEUE', 'REQUEST_FOR_DEADLOCK_SEARCH', 'XE_TIMER_EVENT',
          'BROKER_TO_FLUSH', 'BROKER_TASK_STOP', 'CLR_MANUAL_EVENT',
          'CLR_AUTO_EVENT', 'DISPATCHER_QUEUE_SEMAPHORE', 'FT_IFTS_SCHEDULER_IDLE_WAIT',
          'XE_DISPATCHER_WAIT', 'XE_DISPATCHER_JOIN', 'SQLTRACE_INCREMENTAL_FLUSH_SLEEP'
        )
      )
      SELECT TOP ${top}
        wait_type,
        wait_time_ms,
        wait_count,
        percentage,
        CASE wait_type
          WHEN 'PAGEIOLATCH_SH' THEN 'Waiting for data pages to be read from disk'
          WHEN 'PAGEIOLATCH_EX' THEN 'Waiting to write data pages to disk'
          WHEN 'LCK_M_X' THEN 'Waiting for exclusive locks'
          WHEN 'LCK_M_S' THEN 'Waiting for shared locks'
          WHEN 'WRITELOG' THEN 'Waiting for transaction log writes'
          WHEN 'ASYNC_NETWORK_IO' THEN 'Waiting for client to consume data'
          WHEN 'CXPACKET' THEN 'Waiting for parallel query coordination'
          WHEN 'SOS_SCHEDULER_YIELD' THEN 'CPU pressure - queries yielding scheduler'
          ELSE 'See SQL Server documentation for wait type details'
        END AS description
      FROM waits
      ORDER BY wait_time_ms DESC
    `;

    const result = await this.dbManager.executeQuery<WaitStatistic>(pool, query);
    return result.recordset;
  }
}