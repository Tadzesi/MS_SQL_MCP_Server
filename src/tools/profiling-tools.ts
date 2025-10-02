import { DatabaseManager } from '../database.js';
import {
  ColumnStatistics,
  DataQualityIssue,
  TableStatistics
} from '../types.js';

type ConnectionPool = any;

export class ProfilingTools {
  constructor(private dbManager: DatabaseManager) {}

  async sampleData(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    limit: number = 10,
    orderBy?: string
  ): Promise<any[]> {
    const orderClause = orderBy ? `ORDER BY ${orderBy}` : '';
    const query = `
      USE [${database}];
      SELECT TOP ${limit} *
      FROM [${schema}].[${table}]
      ${orderClause}
    `;

    const result = await this.dbManager.executeQuery(pool, query);
    return result.recordset;
  }

  async getColumnStatistics(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    column: string
  ): Promise<ColumnStatistics> {
    // Get basic stats
    const statsQuery = `
      USE [${database}];
      SELECT
        COUNT(DISTINCT [${column}]) AS distinct_count,
        SUM(CASE WHEN [${column}] IS NULL THEN 1 ELSE 0 END) AS null_count,
        COUNT(*) AS total_count,
        MIN([${column}]) AS min_value,
        MAX([${column}]) AS max_value
      FROM [${schema}].[${table}]
    `;

    const statsResult = await this.dbManager.executeQuery<any>(pool, statsQuery);
    const stats = statsResult.recordset[0];

    const nullPercentage = (stats.null_count / stats.total_count) * 100;

    // Get most common values
    const commonQuery = `
      USE [${database}];
      SELECT TOP 10
        [${column}] AS value,
        COUNT(*) AS count
      FROM [${schema}].[${table}]
      WHERE [${column}] IS NOT NULL
      GROUP BY [${column}]
      ORDER BY count DESC
    `;

    const commonResult = await this.dbManager.executeQuery<any>(pool, commonQuery);

    return {
      column,
      distinct_count: stats.distinct_count,
      null_count: stats.null_count,
      null_percentage: nullPercentage,
      min_value: stats.min_value,
      max_value: stats.max_value,
      most_common_values: commonResult.recordset
    };
  }

  async checkDataQuality(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<DataQualityIssue[]> {
    const issues: DataQualityIssue[] = [];

    // Check for potential issues
    const checksQuery = `
      USE [${database}];

      -- Get column info
      SELECT
        c.name AS column_name,
        t.name AS data_type,
        c.is_nullable,
        c.max_length
      INTO #columns
      FROM sys.columns c
      INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
      WHERE c.object_id = OBJECT_ID('${schema}.${table}');

      -- Check for nulls in non-nullable looking columns (like 'Id', 'Name')
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql = @sql +
        'SELECT ''' + column_name + ''' AS column_name, ' +
        'COUNT(*) AS issue_count, ' +
        '''Null values in important column'' AS issue_type ' +
        'FROM [${schema}].[${table}] ' +
        'WHERE [' + column_name + '] IS NULL ' +
        'UNION ALL '
      FROM #columns
      WHERE is_nullable = 1
        AND (column_name LIKE '%Id' OR column_name LIKE '%Name' OR column_name LIKE '%Code');

      -- Check for empty strings
      SELECT @sql = @sql +
        'SELECT ''' + column_name + ''' AS column_name, ' +
        'COUNT(*) AS issue_count, ' +
        '''Empty strings found'' AS issue_type ' +
        'FROM [${schema}].[${table}] ' +
        'WHERE [' + column_name + '] = '''' ' +
        'UNION ALL '
      FROM #columns
      WHERE data_type IN ('varchar', 'nvarchar', 'char', 'nchar');

      IF LEN(@sql) > 0
      BEGIN
        SET @sql = LEFT(@sql, LEN(@sql) - 10); -- Remove last UNION ALL
        EXEC sp_executesql @sql;
      END

      DROP TABLE #columns;
    `;

    try {
      const result = await this.dbManager.executeQuery<any>(pool, checksQuery);

      for (const row of result.recordset) {
        if (row.issue_count > 0) {
          issues.push({
            type: row.issue_type,
            severity: row.issue_count > 100 ? 'high' : row.issue_count > 10 ? 'medium' : 'low',
            column: row.column_name,
            description: `${row.issue_type} in column ${row.column_name}`,
            affected_rows: row.issue_count
          });
        }
      }
    } catch (error) {
      // Fallback to simpler checks
      const simpleQuery = `
        USE [${database}];
        SELECT COUNT(*) AS total_rows
        FROM [${schema}].[${table}]
      `;
      const countResult = await this.dbManager.executeQuery<any>(pool, simpleQuery);

      issues.push({
        type: 'info',
        severity: 'low',
        column: null,
        description: `Table contains ${countResult.recordset[0].total_rows} rows. Run detailed quality checks for specific issues.`,
        affected_rows: 0
      });
    }

    return issues;
  }

  async getTableStatistics(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<TableStatistics> {
    const query = `
      USE [${database}];
      SELECT
        '${schema}' AS [schema],
        '${table}' AS [table],
        SUM(CASE WHEN i.index_id IN (0, 1) THEN p.rows ELSE 0 END) AS row_count,
        SUM(CASE WHEN i.index_id IN (0, 1) THEN a.total_pages * 8.0 / 1024 ELSE 0 END) AS data_size_mb,
        SUM(CASE WHEN i.index_id > 1 THEN a.total_pages * 8.0 / 1024 ELSE 0 END) AS index_size_mb,
        SUM(a.total_pages * 8.0 / 1024) AS total_size_mb,
        (SELECT MAX(last_updated)
         FROM sys.stats s
         CROSS APPLY sys.dm_db_stats_properties(s.object_id, s.stats_id) sp
         WHERE s.object_id = t.object_id) AS last_stats_update,
        MAX(CASE WHEN p.data_compression > 0 THEN 1 ELSE 0 END) AS is_compressed,
        COUNT(DISTINCT p.partition_number) AS partition_count
      FROM sys.tables t
      INNER JOIN sys.schemas sch ON t.schema_id = sch.schema_id
      INNER JOIN sys.indexes i ON t.object_id = i.object_id
      INNER JOIN sys.partitions p ON i.object_id = p.object_id AND i.index_id = p.index_id
      INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
      WHERE sch.name = '${schema}' AND t.name = '${table}'
      GROUP BY t.object_id
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);

    if (result.recordset.length === 0) {
      throw new Error(`Table ${schema}.${table} not found`);
    }

    const stats = result.recordset[0];

    return {
      schema: stats.schema,
      table: stats.table,
      row_count: stats.row_count,
      data_size_mb: stats.data_size_mb,
      index_size_mb: stats.index_size_mb,
      total_size_mb: stats.total_size_mb,
      last_stats_update: stats.last_stats_update,
      is_compressed: stats.is_compressed === 1,
      partition_count: stats.partition_count
    };
  }
}