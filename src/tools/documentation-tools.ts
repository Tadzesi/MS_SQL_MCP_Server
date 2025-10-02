import { DatabaseManager } from '../database.js';
import { SchemaTools } from './schema-tools.js';

type ConnectionPool = any;

export class DocumentationTools {
  constructor(
    private dbManager: DatabaseManager,
    private schemaTools: SchemaTools
  ) {}

  async generateDataDictionary(
    pool: ConnectionPool,
    database: string,
    schema?: string,
    includeProcedures: boolean = true,
    includeViews: boolean = true,
    includeRelationships: boolean = true,
    format: 'markdown' | 'html' = 'markdown'
  ): Promise<string> {
    const tables = await this.schemaTools.listTables(pool, database, schema);

    let doc = `# Data Dictionary: ${database}\n\n`;
    doc += `Generated: ${new Date().toISOString()}\n\n`;

    // Database overview
    doc += `## Overview\n\n`;
    doc += `Database: **${database}**\n`;
    if (schema) {
      doc += `Schema: **${schema}**\n`;
    }
    doc += `Total Tables: **${tables.length}**\n\n`;

    // Tables
    doc += `## Tables\n\n`;

    for (const table of tables) {
      const tableDesc = await this.schemaTools.describeTable(pool, database, table.schema, table.name);

      doc += `### ${table.schema}.${table.name}\n\n`;
      doc += `**Row Count:** ${table.row_count.toLocaleString()}\n\n`;

      // Columns
      doc += `#### Columns\n\n`;
      doc += `| Column | Type | Nullable | Default | Description |\n`;
      doc += `|--------|------|----------|---------|-------------|\n`;

      for (const col of tableDesc.columns) {
        const isPK = tableDesc.primary_keys.includes(col.name) ? ' 🔑' : '';
        const typeInfo = this.formatColumnType(col);
        const nullable = col.is_nullable ? 'Yes' : 'No';
        const defaultVal = col.default_value || '-';
        doc += `| ${col.name}${isPK} | ${typeInfo} | ${nullable} | ${defaultVal} | |\n`;
      }

      doc += `\n`;

      // Indexes
      if (tableDesc.indexes.length > 0) {
        doc += `#### Indexes\n\n`;
        doc += `| Index | Type | Columns | Unique |\n`;
        doc += `|-------|------|---------|--------|\n`;

        for (const idx of tableDesc.indexes) {
          const unique = idx.is_unique ? 'Yes' : 'No';
          const cols = idx.columns.join(', ');
          doc += `| ${idx.name} | ${idx.type} | ${cols} | ${unique} |\n`;
        }

        doc += `\n`;
      }

      // Foreign Keys
      if (tableDesc.foreign_keys.length > 0) {
        doc += `#### Foreign Keys\n\n`;

        for (const fk of tableDesc.foreign_keys) {
          doc += `- **${fk.name}**: ${fk.parent_columns.join(', ')} → ${fk.referenced_schema}.${fk.referenced_table}(${fk.referenced_columns.join(', ')})\n`;
        }

        doc += `\n`;
      }

      // Referenced By
      if (tableDesc.referenced_by.length > 0) {
        doc += `#### Referenced By\n\n`;

        for (const ref of tableDesc.referenced_by) {
          doc += `- **${ref.name}**: ${ref.parent_schema}.${ref.parent_table}(${ref.parent_columns.join(', ')})\n`;
        }

        doc += `\n`;
      }
    }

    // Views
    if (includeViews) {
      const views = await this.schemaTools.listViews(pool, database, schema);
      if (views.length > 0) {
        doc += `## Views\n\n`;
        doc += `| Schema | Name | Created | Modified |\n`;
        doc += `|--------|------|---------|----------|\n`;

        for (const view of views) {
          doc += `| ${view.schema} | ${view.name} | ${view.created_date} | ${view.modified_date} |\n`;
        }

        doc += `\n`;
      }
    }

    // Stored Procedures
    if (includeProcedures) {
      const procs = await this.schemaTools.listStoredProcedures(pool, database, schema);
      if (procs.length > 0) {
        doc += `## Stored Procedures\n\n`;
        doc += `| Schema | Name | Created | Modified |\n`;
        doc += `|--------|------|---------|----------|\n`;

        for (const proc of procs) {
          doc += `| ${proc.schema} | ${proc.name} | ${proc.created_date} | ${proc.modified_date} |\n`;
        }

        doc += `\n`;
      }
    }

    return doc;
  }

  async generateErDiagram(
    pool: ConnectionPool,
    database: string,
    schema?: string,
    format: 'mermaid' | 'plantuml' | 'ascii' = 'mermaid'
  ): Promise<string> {
    const tables = await this.schemaTools.listTables(pool, database, schema);

    if (format === 'mermaid') {
      return this.generateMermaidDiagram(pool, database, tables);
    } else if (format === 'plantuml') {
      return this.generatePlantUmlDiagram(pool, database, tables);
    } else {
      return 'ASCII format not yet implemented. Use mermaid or plantuml.';
    }
  }

  private async generateMermaidDiagram(pool: ConnectionPool, database: string, tables: any[]): Promise<string> {
    let diagram = `erDiagram\n`;

    for (const table of tables) {
      const tableDesc = await this.schemaTools.describeTable(pool, database, table.schema, table.name);
      const tableName = `${table.schema}_${table.name}`;

      diagram += `    ${tableName} {\n`;

      for (const col of tableDesc.columns) {
        const type = this.formatColumnType(col);
        const pk = tableDesc.primary_keys.includes(col.name) ? ' PK' : '';
        const fk = tableDesc.foreign_keys.some(fk => fk.parent_columns.includes(col.name)) ? ' FK' : '';
        diagram += `        ${type} ${col.name}${pk}${fk}\n`;
      }

      diagram += `    }\n\n`;
    }

    // Add relationships
    for (const table of tables) {
      const tableDesc = await this.schemaTools.describeTable(pool, database, table.schema, table.name);
      const tableName = `${table.schema}_${table.name}`;

      for (const fk of tableDesc.foreign_keys) {
        const refTableName = `${fk.referenced_schema}_${fk.referenced_table}`;
        diagram += `    ${tableName} }o--|| ${refTableName} : "${fk.name}"\n`;
      }
    }

    return diagram;
  }

  private async generatePlantUmlDiagram(pool: ConnectionPool, database: string, tables: any[]): Promise<string> {
    let diagram = `@startuml\n`;
    diagram += `!define Table(name,desc) class name as "desc" << (T,#FFAAAA) >>\n`;
    diagram += `hide methods\n`;
    diagram += `hide stereotypes\n\n`;

    for (const table of tables) {
      const tableDesc = await this.schemaTools.describeTable(pool, database, table.schema, table.name);
      const tableName = `${table.schema}_${table.name}`;

      diagram += `class ${tableName} {\n`;

      for (const col of tableDesc.columns) {
        const pk = tableDesc.primary_keys.includes(col.name) ? '<<PK>> ' : '';
        diagram += `  ${pk}${col.name}: ${this.formatColumnType(col)}\n`;
      }

      diagram += `}\n\n`;
    }

    // Add relationships
    for (const table of tables) {
      const tableDesc = await this.schemaTools.describeTable(pool, database, table.schema, table.name);
      const tableName = `${table.schema}_${table.name}`;

      for (const fk of tableDesc.foreign_keys) {
        const refTableName = `${fk.referenced_schema}_${fk.referenced_table}`;
        diagram += `${tableName} --> ${refTableName}\n`;
      }
    }

    diagram += `@enduml\n`;
    return diagram;
  }

  async documentStoredProcedure(
    pool: ConnectionPool,
    database: string,
    schema: string,
    procedure: string
  ): Promise<string> {
    const definition = await this.schemaTools.getProcedureDefinition(pool, database, schema, procedure);

    let doc = `# Stored Procedure: ${schema}.${procedure}\n\n`;
    doc += `## Definition\n\n`;
    doc += `\`\`\`sql\n${definition}\n\`\`\`\n\n`;
    doc += `## Usage\n\n`;
    doc += `Execute the stored procedure:\n\n`;
    doc += `\`\`\`sql\nEXEC ${schema}.${procedure}\n\`\`\`\n\n`;
    doc += `## Notes\n\n`;
    doc += `Review the procedure definition above for parameters and return values.\n`;

    return doc;
  }

  async generateApiDocumentation(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    baseRoute?: string
  ): Promise<string> {
    const tableDesc = await this.schemaTools.describeTable(pool, database, schema, table);
    const route = baseRoute || `/api/${table.toLowerCase()}`;

    let doc = `# API Documentation: ${table}\n\n`;
    doc += `Base Route: \`${route}\`\n\n`;

    // GET List
    doc += `## GET ${route}\n\n`;
    doc += `Get list of ${table} records.\n\n`;
    doc += `**Query Parameters:**\n`;
    doc += `- \`page\` (optional): Page number (default: 1)\n`;
    doc += `- \`pageSize\` (optional): Page size (default: 20)\n`;

    // Add filter parameters for indexed columns
    for (const idx of tableDesc.indexes) {
      if (!idx.is_primary_key) {
        for (const col of idx.columns) {
          doc += `- \`${col}\` (optional): Filter by ${col}\n`;
        }
      }
    }

    doc += `\n**Response:** Array of ${table} objects\n\n`;

    // GET by ID
    const pkCol = tableDesc.primary_keys[0] || 'id';
    doc += `## GET ${route}/{${pkCol}}\n\n`;
    doc += `Get a single ${table} record by ID.\n\n`;
    doc += `**Response:** ${table} object\n\n`;

    // POST
    doc += `## POST ${route}\n\n`;
    doc += `Create a new ${table} record.\n\n`;
    doc += `**Request Body:**\n\n`;
    doc += `\`\`\`json\n{\n`;

    const nonIdColumns = tableDesc.columns.filter(c => !c.is_identity && !tableDesc.primary_keys.includes(c.name));
    for (let i = 0; i < nonIdColumns.length; i++) {
      const col = nonIdColumns[i];
      const comma = i < nonIdColumns.length - 1 ? ',' : '';
      doc += `  "${col.name}": "value"${comma}\n`;
    }

    doc += `}\n\`\`\`\n\n`;
    doc += `**Response:** Created ${table} object\n\n`;

    // PUT
    doc += `## PUT ${route}/{${pkCol}}\n\n`;
    doc += `Update an existing ${table} record.\n\n`;
    doc += `**Request Body:** Same as POST\n\n`;
    doc += `**Response:** Updated ${table} object\n\n`;

    // DELETE
    doc += `## DELETE ${route}/{${pkCol}}\n\n`;
    doc += `Delete a ${table} record.\n\n`;
    doc += `**Response:** 204 No Content\n\n`;

    return doc;
  }

  private formatColumnType(col: any): string {
    let type = col.data_type;

    if (col.max_length && col.max_length > 0 && col.max_length !== -1) {
      type += `(${col.max_length})`;
    } else if (col.precision && col.scale !== null) {
      type += `(${col.precision},${col.scale})`;
    }

    return type;
  }
}