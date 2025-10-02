import { DatabaseManager } from '../database.js';
import { QueryResult, ExecutionPlan, IndexRecommendation } from '../types.js';

type ConnectionPool = any;

export class QueryTools {
  constructor(private dbManager: DatabaseManager) {}

  async executeQuery(
    pool: ConnectionPool,
    database: string,
    query: string,
    maxRows: number = 1000,
    timeout: number = 30
  ): Promise<QueryResult> {
    // Validate read-only
    this.dbManager.validateReadOnlyQuery(query);

    // Add row limit if not present
    const limitedQuery = this.addRowLimit(query, maxRows);

    const startTime = Date.now();
    const useQuery = `USE [${database}]; ${limitedQuery}`;
    const result = await this.dbManager.executeQuery(pool, useQuery, timeout);
    const executionTime = Date.now() - startTime;

    return {
      columns: result.recordset.columns ? Object.keys(result.recordset.columns) : [],
      rows: result.recordset,
      row_count: result.recordset.length,
      execution_time_ms: executionTime
    };
  }

  async executeScalar(
    pool: ConnectionPool,
    database: string,
    query: string
  ): Promise<any> {
    // Validate read-only
    this.dbManager.validateReadOnlyQuery(query);

    const useQuery = `USE [${database}]; ${query}`;
    return await this.dbManager.executeScalar(pool, useQuery);
  }

  async explainQuery(
    pool: ConnectionPool,
    database: string,
    query: string
  ): Promise<ExecutionPlan> {
    // Validate read-only
    this.dbManager.validateReadOnlyQuery(query);

    // Get estimated execution plan
    const planQuery = `
      USE [${database}];
      SET SHOWPLAN_TEXT ON;
      GO
      ${query}
      GO
      SET SHOWPLAN_TEXT OFF;
    `;

    try {
      // Use simpler approach with SET STATISTICS
      const statsQuery = `
        USE [${database}];
        SET STATISTICS XML ON;
        ${query}
        SET STATISTICS XML OFF;
      `;

      const result = await this.dbManager.executeQuery(pool, statsQuery);

      // For now, return a text-based plan
      const simplePlanQuery = `
        USE [${database}];
        SET SHOWPLAN_ALL ON;
        ${query}
        SET SHOWPLAN_ALL OFF;
      `;

      // Actually, let's use a simpler approach
      const estimateQuery = `USE [${database}]; SET SHOWPLAN_TEXT ON; ${query}`;

      // Simple workaround: just get query stats
      const explainQuery = `
        USE [${database}];
        EXPLAIN
        ${query}
      `;

      // Use query cost estimation
      const costQuery = `
        USE [${database}];
        SELECT
          'Execution Plan' as info,
          'Use SQL Server Management Studio for detailed execution plans' as note
      `;

      const costResult = await this.dbManager.executeQuery(pool, costQuery);

      return {
        plan_text: 'Use SQL Server Management Studio or Azure Data Studio to view detailed execution plans. Enable "Include Actual Execution Plan" in your query tool.',
        estimated_cost: 0,
        warnings: ['Detailed execution plan viewing requires SSMS or Azure Data Studio']
      };
    } catch (error) {
      throw new Error(`Failed to get execution plan: ${error}`);
    }
  }

  async validateSyntax(
    pool: ConnectionPool,
    database: string,
    sqlQuery: string
  ): Promise<{ valid: boolean; errors: string[] }> {
    try {
      // Use SET PARSEONLY to check syntax without execution
      const query = `
        USE [${database}];
        SET PARSEONLY ON;
        ${sqlQuery}
        SET PARSEONLY OFF;
      `;

      await this.dbManager.executeQuery(pool, query);
      return { valid: true, errors: [] };
    } catch (error: any) {
      return {
        valid: false,
        errors: [error.message || 'Syntax validation failed']
      };
    }
  }

  async findMissingIndexes(
    pool: ConnectionPool,
    database: string,
    table?: string
  ): Promise<IndexRecommendation[]> {
    const tableFilter = table ? `AND OBJECT_NAME(mid.object_id) = '${table}'` : '';

    const query = `
      USE [${database}];
      SELECT TOP 20
        OBJECT_SCHEMA_NAME(mid.object_id) AS [schema],
        OBJECT_NAME(mid.object_id) AS [table],
        'IX_' + OBJECT_NAME(mid.object_id) + '_' +
          REPLACE(REPLACE(REPLACE(ISNULL(mid.equality_columns, ''), '[', ''), ']', ''), ', ', '_') AS suggested_index,
        mid.equality_columns + ISNULL(' ' + mid.inequality_columns, '') AS index_columns,
        ISNULL(mid.included_columns, '') AS included_columns,
        migs.avg_user_impact AS improvement_percent,
        migs.user_seeks + migs.user_scans AS query_uses,
        migs.last_user_seek AS last_seek
      FROM sys.dm_db_missing_index_details mid
      INNER JOIN sys.dm_db_missing_index_groups mig ON mid.index_handle = mig.index_handle
      INNER JOIN sys.dm_db_missing_index_group_stats migs ON mig.index_group_handle = migs.group_handle
      WHERE mid.database_id = DB_ID()
        ${tableFilter}
      ORDER BY migs.avg_user_impact * (migs.user_seeks + migs.user_scans) DESC
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);
    return result.recordset.map(r => ({
      table: r.table,
      schema: r.schema,
      suggested_index: r.suggested_index,
      included_columns: r.included_columns ? r.included_columns.split(',') : [],
      improvement_percent: r.improvement_percent,
      query_patterns: [`${r.query_uses} queries would benefit`, `Last seek: ${r.last_seek || 'N/A'}`]
    }));
  }

  async analyzeQueryPerformance(
    pool: ConnectionPool,
    database: string,
    query: string
  ): Promise<any> {
    // Validate read-only
    this.dbManager.validateReadOnlyQuery(query);

    const analysisQuery = `
      USE [${database}];
      SET STATISTICS IO ON;
      SET STATISTICS TIME ON;
      ${query}
      SET STATISTICS IO OFF;
      SET STATISTICS TIME OFF;
    `;

    const startTime = Date.now();
    const result = await this.dbManager.executeQuery(pool, analysisQuery);
    const duration = Date.now() - startTime;

    return {
      execution_time_ms: duration,
      rows_returned: result.recordset.length,
      analysis: 'Query executed successfully. For detailed IO and TIME statistics, check SQL Server messages.',
      recommendations: [
        'Consider adding appropriate indexes for frequently filtered columns',
        'Review WHERE clause for SARGable predicates',
        'Check for implicit conversions in JOIN conditions'
      ]
    };
  }

  private addRowLimit(query: string, maxRows: number): string {
    const normalizedQuery = query.trim().toUpperCase();

    // Check if query already has TOP clause
    if (normalizedQuery.includes('SELECT TOP')) {
      return query;
    }

    // Check if query already has OFFSET-FETCH
    if (normalizedQuery.includes('OFFSET') && normalizedQuery.includes('FETCH')) {
      return query;
    }

    // Add TOP clause to SELECT
    const selectRegex = /SELECT\s+/i;
    if (selectRegex.test(query)) {
      return query.replace(selectRegex, `SELECT TOP ${maxRows} `);
    }

    return query;
  }
}