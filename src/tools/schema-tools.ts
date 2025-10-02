import sql from 'mssql';
import { DatabaseManager } from '../database.js';
import {
  DatabaseInfo,
  TableInfo,
  TableDescription,
  StoredProcedureInfo,
  ViewInfo,
  RelationshipInfo,
  ColumnInfo,
  IndexInfo,
  ForeignKeyInfo
} from '../types.js';

type ConnectionPool = any;

export class SchemaTools {
  constructor(private dbManager: DatabaseManager) {}

  async listDatabases(pool: ConnectionPool): Promise<DatabaseInfo[]> {
    const query = `
      SELECT
        name,
        (SELECT SUM(size) * 8.0 / 1024 FROM sys.master_files WHERE database_id = d.database_id) AS size_mb,
        state_desc AS status,
        recovery_model_desc AS recovery_model
      FROM sys.databases d
      WHERE name NOT IN ('master', 'tempdb', 'model', 'msdb')
      ORDER BY name
    `;

    const result = await this.dbManager.executeQuery<DatabaseInfo>(pool, query);
    return result.recordset;
  }

  async listTables(
    pool: ConnectionPool,
    database: string,
    schema?: string,
    includeSystem: boolean = false
  ): Promise<TableInfo[]> {
    const schemaFilter = schema ? `AND s.name = '${schema}'` : '';
    const systemFilter = includeSystem ? '' : "AND s.name != 'sys' AND s.name != 'INFORMATION_SCHEMA'";

    const query = `
      USE [${database}];
      SELECT
        s.name AS [schema],
        t.name AS name,
        ISNULL(p.rows, 0) AS row_count,
        t.create_date AS creation_date
      FROM sys.tables t
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      LEFT JOIN sys.partitions p ON t.object_id = p.object_id AND p.index_id IN (0, 1)
      WHERE t.is_ms_shipped = 0
        ${schemaFilter}
        ${systemFilter}
      ORDER BY s.name, t.name
    `;

    const result = await this.dbManager.executeQuery<TableInfo>(pool, query);
    return result.recordset;
  }

  async describeTable(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<TableDescription> {
    // Get columns
    const columns = await this.getTableColumns(pool, database, schema, table);

    // Get primary keys
    const primaryKeys = await this.getPrimaryKeys(pool, database, schema, table);

    // Get indexes
    const indexes = await this.getIndexes(pool, database, schema, table);

    // Get foreign keys
    const foreignKeys = await this.getForeignKeys(pool, database, schema, table);

    // Get referenced by (reverse foreign keys)
    const referencedBy = await this.getReferencedBy(pool, database, schema, table);

    // Get triggers
    const triggers = await this.getTriggers(pool, database, schema, table);

    return {
      schema,
      table,
      columns,
      primary_keys: primaryKeys,
      indexes,
      foreign_keys: foreignKeys,
      referenced_by: referencedBy,
      triggers
    };
  }

  private async getTableColumns(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<ColumnInfo[]> {
    const query = `
      USE [${database}];
      SELECT
        c.name,
        t.name AS data_type,
        c.max_length,
        c.precision,
        c.scale,
        c.is_nullable,
        c.is_identity,
        dc.definition AS default_value
      FROM sys.columns c
      INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
      INNER JOIN sys.tables tb ON c.object_id = tb.object_id
      INNER JOIN sys.schemas s ON tb.schema_id = s.schema_id
      LEFT JOIN sys.default_constraints dc ON c.default_object_id = dc.object_id
      WHERE s.name = '${schema}' AND tb.name = '${table}'
      ORDER BY c.column_id
    `;

    const result = await this.dbManager.executeQuery<ColumnInfo>(pool, query);
    return result.recordset;
  }

  private async getPrimaryKeys(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<string[]> {
    const query = `
      USE [${database}];
      SELECT c.name
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE s.name = '${schema}' AND t.name = '${table}' AND i.is_primary_key = 1
      ORDER BY ic.key_ordinal
    `;

    const result = await this.dbManager.executeQuery<{ name: string }>(pool, query);
    return result.recordset.map(r => r.name);
  }

  private async getIndexes(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<IndexInfo[]> {
    const query = `
      USE [${database}];
      SELECT
        i.name,
        i.type_desc AS type,
        i.is_unique,
        i.is_primary_key,
        STUFF((
          SELECT ',' + c.name
          FROM sys.index_columns ic
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 0
          ORDER BY ic.key_ordinal
          FOR XML PATH('')
        ), 1, 1, '') AS columns,
        STUFF((
          SELECT ',' + c.name
          FROM sys.index_columns ic
          INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
          WHERE ic.object_id = i.object_id AND ic.index_id = i.index_id AND ic.is_included_column = 1
          ORDER BY ic.key_ordinal
          FOR XML PATH('')
        ), 1, 1, '') AS included_columns,
        i.filter_definition
      FROM sys.indexes i
      INNER JOIN sys.tables t ON i.object_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE s.name = '${schema}' AND t.name = '${table}' AND i.type > 0
      ORDER BY i.name
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);
    return result.recordset.map(r => ({
      name: r.name,
      type: r.type,
      is_unique: r.is_unique,
      is_primary_key: r.is_primary_key,
      columns: r.columns ? r.columns.split(',') : [],
      included_columns: r.included_columns ? r.included_columns.split(',') : [],
      filter_definition: r.filter_definition
    }));
  }

  private async getForeignKeys(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<ForeignKeyInfo[]> {
    const query = `
      USE [${database}];
      SELECT
        fk.name,
        SCHEMA_NAME(tp.schema_id) AS parent_schema,
        tp.name AS parent_table,
        STUFF((
          SELECT ',' + cp.name
          FROM sys.foreign_key_columns fkc
          INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
          WHERE fkc.constraint_object_id = fk.object_id
          ORDER BY fkc.constraint_column_id
          FOR XML PATH('')
        ), 1, 1, '') AS parent_columns,
        SCHEMA_NAME(tr.schema_id) AS referenced_schema,
        tr.name AS referenced_table,
        STUFF((
          SELECT ',' + cr.name
          FROM sys.foreign_key_columns fkc
          INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
          WHERE fkc.constraint_object_id = fk.object_id
          ORDER BY fkc.constraint_column_id
          FOR XML PATH('')
        ), 1, 1, '') AS referenced_columns,
        fk.delete_referential_action_desc AS delete_rule,
        fk.update_referential_action_desc AS update_rule
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      WHERE SCHEMA_NAME(tp.schema_id) = '${schema}' AND tp.name = '${table}'
      ORDER BY fk.name
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);
    return result.recordset.map(r => ({
      name: r.name,
      parent_schema: r.parent_schema,
      parent_table: r.parent_table,
      parent_columns: r.parent_columns ? r.parent_columns.split(',') : [],
      referenced_schema: r.referenced_schema,
      referenced_table: r.referenced_table,
      referenced_columns: r.referenced_columns ? r.referenced_columns.split(',') : [],
      delete_rule: r.delete_rule,
      update_rule: r.update_rule
    }));
  }

  private async getReferencedBy(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<ForeignKeyInfo[]> {
    const query = `
      USE [${database}];
      SELECT
        fk.name,
        SCHEMA_NAME(tp.schema_id) AS parent_schema,
        tp.name AS parent_table,
        STUFF((
          SELECT ',' + cp.name
          FROM sys.foreign_key_columns fkc
          INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
          WHERE fkc.constraint_object_id = fk.object_id
          ORDER BY fkc.constraint_column_id
          FOR XML PATH('')
        ), 1, 1, '') AS parent_columns,
        SCHEMA_NAME(tr.schema_id) AS referenced_schema,
        tr.name AS referenced_table,
        STUFF((
          SELECT ',' + cr.name
          FROM sys.foreign_key_columns fkc
          INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
          WHERE fkc.constraint_object_id = fk.object_id
          ORDER BY fkc.constraint_column_id
          FOR XML PATH('')
        ), 1, 1, '') AS referenced_columns,
        fk.delete_referential_action_desc AS delete_rule,
        fk.update_referential_action_desc AS update_rule
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      WHERE SCHEMA_NAME(tr.schema_id) = '${schema}' AND tr.name = '${table}'
      ORDER BY fk.name
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);
    return result.recordset.map(r => ({
      name: r.name,
      parent_schema: r.parent_schema,
      parent_table: r.parent_table,
      parent_columns: r.parent_columns ? r.parent_columns.split(',') : [],
      referenced_schema: r.referenced_schema,
      referenced_table: r.referenced_table,
      referenced_columns: r.referenced_columns ? r.referenced_columns.split(',') : [],
      delete_rule: r.delete_rule,
      update_rule: r.update_rule
    }));
  }

  private async getTriggers(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string
  ): Promise<string[]> {
    const query = `
      USE [${database}];
      SELECT tr.name
      FROM sys.triggers tr
      INNER JOIN sys.tables t ON tr.parent_id = t.object_id
      INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
      WHERE s.name = '${schema}' AND t.name = '${table}'
      ORDER BY tr.name
    `;

    const result = await this.dbManager.executeQuery<{ name: string }>(pool, query);
    return result.recordset.map(r => r.name);
  }

  async listStoredProcedures(
    pool: ConnectionPool,
    database: string,
    schema?: string,
    pattern?: string
  ): Promise<StoredProcedureInfo[]> {
    const schemaFilter = schema ? `AND s.name = '${schema}'` : '';
    const patternFilter = pattern ? `AND p.name LIKE '${pattern}'` : '';

    const query = `
      USE [${database}];
      SELECT
        s.name AS [schema],
        p.name,
        p.create_date AS created_date,
        p.modify_date AS modified_date
      FROM sys.procedures p
      INNER JOIN sys.schemas s ON p.schema_id = s.schema_id
      WHERE p.is_ms_shipped = 0
        ${schemaFilter}
        ${patternFilter}
      ORDER BY s.name, p.name
    `;

    const result = await this.dbManager.executeQuery<StoredProcedureInfo>(pool, query);
    return result.recordset;
  }

  async getProcedureDefinition(
    pool: ConnectionPool,
    database: string,
    schema: string,
    procedure: string
  ): Promise<string> {
    const query = `
      USE [${database}];
      SELECT OBJECT_DEFINITION(OBJECT_ID('${schema}.${procedure}')) AS definition
    `;

    const result = await this.dbManager.executeQuery<{ definition: string }>(pool, query);
    if (result.recordset.length === 0 || !result.recordset[0].definition) {
      throw new Error(`Stored procedure ${schema}.${procedure} not found`);
    }
    return result.recordset[0].definition;
  }

  async listViews(
    pool: ConnectionPool,
    database: string,
    schema?: string
  ): Promise<ViewInfo[]> {
    const schemaFilter = schema ? `AND s.name = '${schema}'` : '';

    const query = `
      USE [${database}];
      SELECT
        s.name AS [schema],
        v.name,
        v.create_date AS created_date,
        v.modify_date AS modified_date
      FROM sys.views v
      INNER JOIN sys.schemas s ON v.schema_id = s.schema_id
      WHERE v.is_ms_shipped = 0
        ${schemaFilter}
      ORDER BY s.name, v.name
    `;

    const result = await this.dbManager.executeQuery<ViewInfo>(pool, query);
    return result.recordset;
  }

  async getViewDefinition(
    pool: ConnectionPool,
    database: string,
    schema: string,
    view: string
  ): Promise<string> {
    const query = `
      USE [${database}];
      SELECT OBJECT_DEFINITION(OBJECT_ID('${schema}.${view}')) AS definition
    `;

    const result = await this.dbManager.executeQuery<{ definition: string }>(pool, query);
    if (result.recordset.length === 0 || !result.recordset[0].definition) {
      throw new Error(`View ${schema}.${view} not found`);
    }
    return result.recordset[0].definition;
  }

  async getRelationships(
    pool: ConnectionPool,
    database: string,
    table?: string,
    depth: number = 1
  ): Promise<RelationshipInfo[]> {
    const tableFilter = table ? `AND (tp.name = '${table}' OR tr.name = '${table}')` : '';

    const query = `
      USE [${database}];
      SELECT
        SCHEMA_NAME(tp.schema_id) AS from_schema,
        tp.name AS from_table,
        SCHEMA_NAME(tr.schema_id) AS to_schema,
        tr.name AS to_table,
        'child' AS relationship_type,
        fk.name AS foreign_key_name,
        STUFF((
          SELECT ',' + cp.name + ':' + cr.name
          FROM sys.foreign_key_columns fkc
          INNER JOIN sys.columns cp ON fkc.parent_object_id = cp.object_id AND fkc.parent_column_id = cp.column_id
          INNER JOIN sys.columns cr ON fkc.referenced_object_id = cr.object_id AND fkc.referenced_column_id = cr.column_id
          WHERE fkc.constraint_object_id = fk.object_id
          ORDER BY fkc.constraint_column_id
          FOR XML PATH('')
        ), 1, 1, '') AS columns
      FROM sys.foreign_keys fk
      INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
      INNER JOIN sys.tables tr ON fk.referenced_object_id = tr.object_id
      WHERE 1=1 ${tableFilter}
      ORDER BY from_schema, from_table, to_schema, to_table
    `;

    const result = await this.dbManager.executeQuery<any>(pool, query);
    return result.recordset.map(r => {
      const columnPairs = r.columns ? r.columns.split(',').map((pair: string) => {
        const [from, to] = pair.split(':');
        return { from, to };
      }) : [];

      return {
        from_schema: r.from_schema,
        from_table: r.from_table,
        to_schema: r.to_schema,
        to_table: r.to_table,
        relationship_type: r.relationship_type,
        foreign_key_name: r.foreign_key_name,
        columns: columnPairs
      };
    });
  }
}