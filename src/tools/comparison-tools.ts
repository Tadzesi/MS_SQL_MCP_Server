import { DatabaseManager } from '../database.js';
import { SchemaTools } from './schema-tools.js';
import { SchemaDifference } from '../types.js';

type ConnectionPool = any;

export class ComparisonTools {
  constructor(
    private dbManager: DatabaseManager,
    private schemaTools: SchemaTools
  ) {}

  async compareSchemas(
    pool: ConnectionPool,
    sourceDatabase: string,
    targetDatabase: string,
    schema?: string
  ): Promise<SchemaDifference[]> {
    const differences: SchemaDifference[] = [];

    // Compare tables
    const sourceTables = await this.schemaTools.listTables(pool, sourceDatabase, schema);
    const targetTables = await this.schemaTools.listTables(pool, targetDatabase, schema);

    const sourceTableNames = new Set(sourceTables.map(t => `${t.schema}.${t.name}`));
    const targetTableNames = new Set(targetTables.map(t => `${t.schema}.${t.name}`));

    // Tables in source but not in target
    for (const table of sourceTables) {
      const fullName = `${table.schema}.${table.name}`;
      if (!targetTableNames.has(fullName)) {
        differences.push({
          type: 'table',
          object_name: fullName,
          difference_type: 'missing_in_target',
          details: `Table exists in ${sourceDatabase} but not in ${targetDatabase}`
        });
      }
    }

    // Tables in target but not in source
    for (const table of targetTables) {
      const fullName = `${table.schema}.${table.name}`;
      if (!sourceTableNames.has(fullName)) {
        differences.push({
          type: 'table',
          object_name: fullName,
          difference_type: 'missing_in_source',
          details: `Table exists in ${targetDatabase} but not in ${sourceDatabase}`
        });
      }
    }

    // Compare columns for common tables
    for (const sourceTable of sourceTables) {
      const fullName = `${sourceTable.schema}.${sourceTable.name}`;
      if (targetTableNames.has(fullName)) {
        const columnDiffs = await this.compareTableColumns(
          pool,
          sourceDatabase,
          targetDatabase,
          sourceTable.schema,
          sourceTable.name
        );
        differences.push(...columnDiffs);
      }
    }

    // Compare stored procedures
    const sourceProcedures = await this.schemaTools.listStoredProcedures(pool, sourceDatabase, schema);
    const targetProcedures = await this.schemaTools.listStoredProcedures(pool, targetDatabase, schema);

    const sourceProcNames = new Set(sourceProcedures.map(p => `${p.schema}.${p.name}`));
    const targetProcNames = new Set(targetProcedures.map(p => `${p.schema}.${p.name}`));

    for (const proc of sourceProcedures) {
      const fullName = `${proc.schema}.${proc.name}`;
      if (!targetProcNames.has(fullName)) {
        differences.push({
          type: 'procedure',
          object_name: fullName,
          difference_type: 'missing_in_target',
          details: `Stored procedure exists in ${sourceDatabase} but not in ${targetDatabase}`
        });
      }
    }

    for (const proc of targetProcedures) {
      const fullName = `${proc.schema}.${proc.name}`;
      if (!sourceProcNames.has(fullName)) {
        differences.push({
          type: 'procedure',
          object_name: fullName,
          difference_type: 'missing_in_source',
          details: `Stored procedure exists in ${targetDatabase} but not in ${sourceDatabase}`
        });
      }
    }

    return differences;
  }

  private async compareTableColumns(
    pool: ConnectionPool,
    sourceDatabase: string,
    targetDatabase: string,
    schema: string,
    table: string
  ): Promise<SchemaDifference[]> {
    const differences: SchemaDifference[] = [];

    const sourceDesc = await this.schemaTools.describeTable(pool, sourceDatabase, schema, table);
    const targetDesc = await this.schemaTools.describeTable(pool, targetDatabase, schema, table);

    const sourceColNames = new Set(sourceDesc.columns.map(c => c.name));
    const targetColNames = new Set(targetDesc.columns.map(c => c.name));

    // Columns in source but not in target
    for (const col of sourceDesc.columns) {
      if (!targetColNames.has(col.name)) {
        differences.push({
          type: 'column',
          object_name: `${schema}.${table}.${col.name}`,
          difference_type: 'missing_in_target',
          details: `Column exists in ${sourceDatabase} but not in ${targetDatabase}`
        });
      }
    }

    // Columns in target but not in source
    for (const col of targetDesc.columns) {
      if (!sourceColNames.has(col.name)) {
        differences.push({
          type: 'column',
          object_name: `${schema}.${table}.${col.name}`,
          difference_type: 'missing_in_source',
          details: `Column exists in ${targetDatabase} but not in ${sourceDatabase}`
        });
      }
    }

    // Compare column definitions for common columns
    for (const sourceCol of sourceDesc.columns) {
      const targetCol = targetDesc.columns.find(c => c.name === sourceCol.name);
      if (targetCol) {
        const diffs: string[] = [];

        if (sourceCol.data_type !== targetCol.data_type) {
          diffs.push(`type: ${sourceCol.data_type} vs ${targetCol.data_type}`);
        }

        if (sourceCol.is_nullable !== targetCol.is_nullable) {
          diffs.push(`nullable: ${sourceCol.is_nullable} vs ${targetCol.is_nullable}`);
        }

        if (sourceCol.max_length !== targetCol.max_length) {
          diffs.push(`max_length: ${sourceCol.max_length} vs ${targetCol.max_length}`);
        }

        if (diffs.length > 0) {
          differences.push({
            type: 'column',
            object_name: `${schema}.${table}.${sourceCol.name}`,
            difference_type: 'different',
            details: diffs.join(', ')
          });
        }
      }
    }

    // Compare indexes
    const sourceIdxNames = new Set(sourceDesc.indexes.map(i => i.name));
    const targetIdxNames = new Set(targetDesc.indexes.map(i => i.name));

    for (const idx of sourceDesc.indexes) {
      if (!targetIdxNames.has(idx.name)) {
        differences.push({
          type: 'index',
          object_name: `${schema}.${table}.${idx.name}`,
          difference_type: 'missing_in_target',
          details: `Index exists in ${sourceDatabase} but not in ${targetDatabase}`
        });
      }
    }

    for (const idx of targetDesc.indexes) {
      if (!sourceIdxNames.has(idx.name)) {
        differences.push({
          type: 'index',
          object_name: `${schema}.${table}.${idx.name}`,
          difference_type: 'missing_in_source',
          details: `Index exists in ${targetDatabase} but not in ${sourceDatabase}`
        });
      }
    }

    return differences;
  }

  async generateSyncScript(
    pool: ConnectionPool,
    sourceDatabase: string,
    targetDatabase: string,
    includeData: boolean = false,
    dryRun: boolean = true
  ): Promise<string> {
    const differences = await this.compareSchemas(pool, sourceDatabase, targetDatabase);

    let script = `-- Schema Synchronization Script\n`;
    script += `-- Source: ${sourceDatabase}\n`;
    script += `-- Target: ${targetDatabase}\n`;
    script += `-- Generated: ${new Date().toISOString()}\n`;
    script += `-- Dry Run: ${dryRun}\n\n`;

    script += `USE [${targetDatabase}];\n`;
    script += `GO\n\n`;

    script += `BEGIN TRANSACTION;\n\n`;

    // Generate ALTER statements
    for (const diff of differences) {
      if (diff.type === 'table' && diff.difference_type === 'missing_in_target') {
        script += `-- Create table ${diff.object_name}\n`;
        script += `-- TODO: Add CREATE TABLE statement\n`;
        script += `-- CREATE TABLE ${diff.object_name} (...);\n\n`;
      }

      if (diff.type === 'column' && diff.difference_type === 'missing_in_target') {
        const [schema, table, column] = diff.object_name.split('.');
        script += `-- Add column ${diff.object_name}\n`;
        script += `-- TODO: Add ALTER TABLE statement with correct data type\n`;
        script += `-- ALTER TABLE [${schema}].[${table}] ADD [${column}] VARCHAR(50) NULL;\n\n`;
      }

      if (diff.type === 'column' && diff.difference_type === 'different') {
        const [schema, table, column] = diff.object_name.split('.');
        script += `-- Modify column ${diff.object_name}\n`;
        script += `-- ${diff.details}\n`;
        script += `-- TODO: Add ALTER TABLE statement\n`;
        script += `-- ALTER TABLE [${schema}].[${table}] ALTER COLUMN [${column}] VARCHAR(100) NULL;\n\n`;
      }

      if (diff.type === 'index' && diff.difference_type === 'missing_in_target') {
        script += `-- Create index ${diff.object_name}\n`;
        script += `-- TODO: Add CREATE INDEX statement\n\n`;
      }
    }

    script += `-- Review the changes above before committing\n`;
    script += `-- COMMIT TRANSACTION;\n`;
    script += `-- ROLLBACK TRANSACTION;\n\n`;

    script += `GO\n\n`;

    // Rollback script
    script += `-- ROLLBACK SCRIPT\n`;
    script += `-- ==================\n\n`;

    for (const diff of differences) {
      if (diff.type === 'table' && diff.difference_type === 'missing_in_target') {
        script += `-- DROP TABLE ${diff.object_name};\n`;
      }

      if (diff.type === 'column' && diff.difference_type === 'missing_in_target') {
        const [schema, table, column] = diff.object_name.split('.');
        script += `-- ALTER TABLE [${schema}].[${table}] DROP COLUMN [${column}];\n`;
      }
    }

    return script;
  }
}