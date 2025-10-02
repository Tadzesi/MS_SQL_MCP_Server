import { DatabaseManager } from '../database.js';
import { SchemaTools } from './schema-tools.js';
import { CodeGenerationConfig, TableDescription, ColumnInfo } from '../types.js';

type ConnectionPool = any;

export class CodeGenTools {
  constructor(
    private dbManager: DatabaseManager,
    private schemaTools: SchemaTools,
    private codeGenConfig: CodeGenerationConfig
  ) {}

  async generateEntityClass(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    namespace?: string,
    useDataAnnotations: boolean = true,
    includeNavigationProperties: boolean = true
  ): Promise<string> {
    const tableDesc = await this.schemaTools.describeTable(pool, database, schema, table);
    const ns = namespace || this.codeGenConfig.default_namespace + '.Entities';

    let code = `using System;\n`;
    code += `using System.Collections.Generic;\n`;

    if (useDataAnnotations) {
      code += `using System.ComponentModel.DataAnnotations;\n`;
      code += `using System.ComponentModel.DataAnnotations.Schema;\n`;
    }

    code += `\n`;
    code += `namespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// Entity class for ${schema}.${table}\n`;
    code += `/// </summary>\n`;

    if (useDataAnnotations) {
      code += `[Table("${table}", Schema = "${schema}")]\n`;
    }

    code += `public class ${this.toPascalCase(table)}\n`;
    code += `{\n`;

    // Generate properties
    for (const col of tableDesc.columns) {
      code += this.generateProperty(col, tableDesc.primary_keys, useDataAnnotations);
    }

    // Add navigation properties
    if (includeNavigationProperties) {
      code += this.generateNavigationProperties(tableDesc);
    }

    code += `}\n`;

    return code;
  }

  async generateDbContext(
    pool: ConnectionPool,
    database: string,
    schema?: string,
    contextName?: string,
    namespace?: string,
    includeFluentApi: boolean = true
  ): Promise<string> {
    const tables = await this.schemaTools.listTables(pool, database, schema);
    const ns = namespace || this.codeGenConfig.default_namespace;
    const ctxName = contextName || `${database}Context`;

    let code = `using Microsoft.EntityFrameworkCore;\n`;
    code += `using ${ns}.Entities;\n\n`;
    code += `namespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// DbContext for ${database} database\n`;
    code += `/// </summary>\n`;
    code += `public class ${ctxName} : DbContext\n`;
    code += `{\n`;
    code += `    public ${ctxName}(DbContextOptions<${ctxName}> options) : base(options)\n`;
    code += `    {\n`;
    code += `    }\n\n`;

    // DbSet properties
    for (const table of tables) {
      const entityName = this.toPascalCase(table.name);
      code += `    public DbSet<${entityName}> ${this.pluralize(entityName)} { get; set; }\n`;
    }

    code += `\n`;

    if (includeFluentApi) {
      code += `    protected override void OnModelCreating(ModelBuilder modelBuilder)\n`;
      code += `    {\n`;
      code += `        base.OnModelCreating(modelBuilder);\n\n`;
      code += `        // Apply configurations\n`;

      for (const table of tables) {
        const entityName = this.toPascalCase(table.name);
        code += `        // modelBuilder.ApplyConfiguration(new ${entityName}Configuration());\n`;
      }

      code += `    }\n`;
    }

    code += `}\n`;

    return code;
  }

  async generateRepositoryInterface(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    namespace?: string,
    includeAsync: boolean = true
  ): Promise<string> {
    const tableDesc = await this.schemaTools.describeTable(pool, database, schema, table);
    const ns = namespace || this.codeGenConfig.default_namespace + '.Repositories';
    const entityName = this.toPascalCase(table);

    // Determine primary key type
    const pkColumn = tableDesc.columns.find(c => tableDesc.primary_keys.includes(c.name));
    const pkType = pkColumn ? this.mapSqlTypeToCSharp(pkColumn.data_type) : 'int';

    let code = `using System;\n`;
    code += `using System.Collections.Generic;\n`;
    if (includeAsync) {
      code += `using System.Threading.Tasks;\n`;
    }
    code += `using ${this.codeGenConfig.default_namespace}.Entities;\n\n`;
    code += `namespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// Repository interface for ${entityName}\n`;
    code += `/// </summary>\n`;
    code += `public interface I${entityName}Repository\n`;
    code += `{\n`;

    const asyncSuffix = includeAsync ? 'Async' : '';
    const returnWrapper = includeAsync ? 'Task<' : '';
    const returnWrapperClose = includeAsync ? '>' : '';

    code += `    /// <summary>Gets an entity by ID</summary>\n`;
    code += `    ${returnWrapper}${entityName}?${returnWrapperClose} GetById${asyncSuffix}(${pkType} id);\n\n`;

    code += `    /// <summary>Gets all entities</summary>\n`;
    code += `    ${returnWrapper}IEnumerable<${entityName}>${returnWrapperClose} GetAll${asyncSuffix}();\n\n`;

    code += `    /// <summary>Adds a new entity</summary>\n`;
    code += `    ${returnWrapper}${entityName}${returnWrapperClose} Add${asyncSuffix}(${entityName} entity);\n\n`;

    code += `    /// <summary>Updates an existing entity</summary>\n`;
    code += `    ${returnWrapper}${entityName}${returnWrapperClose} Update${asyncSuffix}(${entityName} entity);\n\n`;

    code += `    /// <summary>Deletes an entity</summary>\n`;
    code += `    ${returnWrapper}bool${returnWrapperClose} Delete${asyncSuffix}(${pkType} id);\n`;

    code += `}\n`;

    return code;
  }

  async generateDtoClasses(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    namespace?: string,
    dtoTypes: string[] = ['create', 'update', 'read', 'list']
  ): Promise<Record<string, string>> {
    const tableDesc = await this.schemaTools.describeTable(pool, database, schema, table);
    const ns = namespace || this.codeGenConfig.default_namespace + '.DTOs';
    const entityName = this.toPascalCase(table);

    const dtos: Record<string, string> = {};

    if (dtoTypes.includes('create')) {
      dtos.create = this.generateCreateDto(tableDesc, entityName, ns);
    }

    if (dtoTypes.includes('update')) {
      dtos.update = this.generateUpdateDto(tableDesc, entityName, ns);
    }

    if (dtoTypes.includes('read')) {
      dtos.read = this.generateReadDto(tableDesc, entityName, ns);
    }

    if (dtoTypes.includes('list')) {
      dtos.list = this.generateListDto(tableDesc, entityName, ns);
    }

    return dtos;
  }

  async generateEfConfiguration(
    pool: ConnectionPool,
    database: string,
    schema: string,
    table: string,
    namespace?: string
  ): Promise<string> {
    const tableDesc = await this.schemaTools.describeTable(pool, database, schema, table);
    const ns = namespace || this.codeGenConfig.default_namespace + '.Configurations';
    const entityName = this.toPascalCase(table);

    let code = `using Microsoft.EntityFrameworkCore;\n`;
    code += `using Microsoft.EntityFrameworkCore.Metadata.Builders;\n`;
    code += `using ${this.codeGenConfig.default_namespace}.Entities;\n\n`;
    code += `namespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// Entity Framework configuration for ${entityName}\n`;
    code += `/// </summary>\n`;
    code += `public class ${entityName}Configuration : IEntityTypeConfiguration<${entityName}>\n`;
    code += `{\n`;
    code += `    public void Configure(EntityTypeBuilder<${entityName}> builder)\n`;
    code += `    {\n`;
    code += `        builder.ToTable("${table}", "${schema}");\n\n`;

    // Primary key
    if (tableDesc.primary_keys.length > 0) {
      const pkProps = tableDesc.primary_keys.map(pk => this.toPascalCase(pk)).join(', e.');
      code += `        builder.HasKey(e => e.${pkProps});\n\n`;
    }

    // Properties
    for (const col of tableDesc.columns) {
      const propName = this.toPascalCase(col.name);
      code += `        builder.Property(e => e.${propName})\n`;
      code += `            .HasColumnName("${col.name}")\n`;

      if (col.max_length && col.max_length > 0 && col.max_length !== -1) {
        code += `            .HasMaxLength(${col.max_length})\n`;
      }

      if (!col.is_nullable) {
        code += `            .IsRequired()\n`;
      }

      if (col.default_value) {
        code += `            .HasDefaultValueSql("${col.default_value}")\n`;
      }

      code += `            ;\n\n`;
    }

    // Foreign keys
    for (const fk of tableDesc.foreign_keys) {
      const navProp = this.toPascalCase(fk.referenced_table);
      const fkProp = this.toPascalCase(fk.parent_columns[0]);
      code += `        builder.HasOne(e => e.${navProp})\n`;
      code += `            .WithMany()\n`;
      code += `            .HasForeignKey(e => e.${fkProp})\n`;
      code += `            .HasConstraintName("${fk.name}");\n\n`;
    }

    code += `    }\n`;
    code += `}\n`;

    return code;
  }

  async generateMigrationClass(
    sourceDatabase: string,
    migrationName: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').substring(0, 14);

    let code = `using Microsoft.EntityFrameworkCore.Migrations;\n\n`;
    code += `namespace ${this.codeGenConfig.default_namespace}.Migrations;\n\n`;
    code += `/// <summary>\n`;
    code += `/// Migration: ${migrationName}\n`;
    code += `/// </summary>\n`;
    code += `public partial class ${migrationName}_${timestamp} : Migration\n`;
    code += `{\n`;
    code += `    protected override void Up(MigrationBuilder migrationBuilder)\n`;
    code += `    {\n`;
    code += `        // Add your schema changes here\n`;
    code += `        // Example:\n`;
    code += `        // migrationBuilder.CreateTable(\n`;
    code += `        //     name: "TableName",\n`;
    code += `        //     schema: "dbo",\n`;
    code += `        //     columns: table => new\n`;
    code += `        //     {\n`;
    code += `        //         Id = table.Column<int>(nullable: false)\n`;
    code += `        //             .Annotation("SqlServer:Identity", "1, 1"),\n`;
    code += `        //         Name = table.Column<string>(maxLength: 100, nullable: false)\n`;
    code += `        //     },\n`;
    code += `        //     constraints: table =>\n`;
    code += `        //     {\n`;
    code += `        //         table.PrimaryKey("PK_TableName", x => x.Id);\n`;
    code += `        //     });\n`;
    code += `    }\n\n`;
    code += `    protected override void Down(MigrationBuilder migrationBuilder)\n`;
    code += `    {\n`;
    code += `        // Add rollback logic here\n`;
    code += `        // Example:\n`;
    code += `        // migrationBuilder.DropTable(\n`;
    code += `        //     name: "TableName",\n`;
    code += `        //     schema: "dbo");\n`;
    code += `    }\n`;
    code += `}\n`;

    return code;
  }

  private generateProperty(col: ColumnInfo, primaryKeys: string[], useDataAnnotations: boolean): string {
    let code = `\n`;
    code += `    /// <summary>${col.name}</summary>\n`;

    if (useDataAnnotations) {
      if (primaryKeys.includes(col.name)) {
        code += `    [Key]\n`;
      }

      if (col.is_identity) {
        code += `    [DatabaseGenerated(DatabaseGeneratedOption.Identity)]\n`;
      }

      if (!col.is_nullable && !primaryKeys.includes(col.name)) {
        code += `    [Required]\n`;
      }

      if (col.max_length && col.max_length > 0 && col.max_length !== -1) {
        code += `    [MaxLength(${col.max_length})]\n`;
      }

      code += `    [Column("${col.name}")]\n`;
    }

    const propName = this.toPascalCase(col.name);
    const propType = this.mapSqlTypeToCSharp(col.data_type);
    const nullable = col.is_nullable && !this.isValueType(propType) ? '' : (col.is_nullable ? '?' : '');

    code += `    public ${propType}${nullable} ${propName} { get; set; }\n`;

    return code;
  }

  private generateNavigationProperties(tableDesc: TableDescription): string {
    let code = '\n';
    code += `    // Navigation properties\n`;

    // Foreign keys (many-to-one)
    for (const fk of tableDesc.foreign_keys) {
      const navProp = this.toPascalCase(fk.referenced_table);
      code += `    public virtual ${navProp}? ${navProp} { get; set; }\n`;
    }

    // Referenced by (one-to-many)
    for (const refBy of tableDesc.referenced_by) {
      const navProp = this.pluralize(this.toPascalCase(refBy.parent_table));
      code += `    public virtual ICollection<${this.toPascalCase(refBy.parent_table)}> ${navProp} { get; set; } = new List<${this.toPascalCase(refBy.parent_table)}>();\n`;
    }

    return code;
  }

  private generateCreateDto(tableDesc: TableDescription, entityName: string, ns: string): string {
    let code = `using System;\nusing System.ComponentModel.DataAnnotations;\n\n`;
    code += `namespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// DTO for creating ${entityName}\n`;
    code += `/// </summary>\n`;
    code += `public class Create${entityName}Dto\n`;
    code += `{\n`;

    // Exclude identity and auto-generated columns
    for (const col of tableDesc.columns) {
      if (!col.is_identity && !tableDesc.primary_keys.includes(col.name)) {
        const propName = this.toPascalCase(col.name);
        const propType = this.mapSqlTypeToCSharp(col.data_type);
        const nullable = col.is_nullable ? '?' : '';

        if (!col.is_nullable) {
          code += `    [Required]\n`;
        }

        if (col.max_length && col.max_length > 0) {
          code += `    [MaxLength(${col.max_length})]\n`;
        }

        code += `    public ${propType}${nullable} ${propName} { get; set; }\n`;
      }
    }

    code += `}\n`;
    return code;
  }

  private generateUpdateDto(tableDesc: TableDescription, entityName: string, ns: string): string {
    let code = `using System;\nusing System.ComponentModel.DataAnnotations;\n\n`;
    code += `namespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// DTO for updating ${entityName}\n`;
    code += `/// </summary>\n`;
    code += `public class Update${entityName}Dto\n`;
    code += `{\n`;

    for (const col of tableDesc.columns) {
      const propName = this.toPascalCase(col.name);
      const propType = this.mapSqlTypeToCSharp(col.data_type);
      const nullable = col.is_nullable || !tableDesc.primary_keys.includes(col.name) ? '?' : '';

      if (col.max_length && col.max_length > 0 && !tableDesc.primary_keys.includes(col.name)) {
        code += `    [MaxLength(${col.max_length})]\n`;
      }

      code += `    public ${propType}${nullable} ${propName} { get; set; }\n`;
    }

    code += `}\n`;
    return code;
  }

  private generateReadDto(tableDesc: TableDescription, entityName: string, ns: string): string {
    let code = `using System;\n\nnamespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// DTO for reading ${entityName}\n`;
    code += `/// </summary>\n`;
    code += `public class ${entityName}Dto\n`;
    code += `{\n`;

    for (const col of tableDesc.columns) {
      const propName = this.toPascalCase(col.name);
      const propType = this.mapSqlTypeToCSharp(col.data_type);
      const nullable = col.is_nullable ? '?' : '';
      code += `    public ${propType}${nullable} ${propName} { get; set; }\n`;
    }

    code += `}\n`;
    return code;
  }

  private generateListDto(tableDesc: TableDescription, entityName: string, ns: string): string {
    let code = `using System;\n\nnamespace ${ns};\n\n`;
    code += `/// <summary>\n`;
    code += `/// DTO for listing ${entityName}\n`;
    code += `/// </summary>\n`;
    code += `public class ${entityName}ListDto\n`;
    code += `{\n`;

    // Include only key fields and important columns
    const importantColumns = tableDesc.columns.filter(c =>
      tableDesc.primary_keys.includes(c.name) ||
      c.name.toLowerCase().includes('name') ||
      c.name.toLowerCase().includes('title') ||
      c.name.toLowerCase().includes('code') ||
      c.name.toLowerCase().includes('date')
    ).slice(0, 6);

    for (const col of importantColumns) {
      const propName = this.toPascalCase(col.name);
      const propType = this.mapSqlTypeToCSharp(col.data_type);
      const nullable = col.is_nullable ? '?' : '';
      code += `    public ${propType}${nullable} ${propName} { get; set; }\n`;
    }

    code += `}\n`;
    return code;
  }

  private mapSqlTypeToCSharp(sqlType: string): string {
    const typeMap: Record<string, string> = {
      'bigint': 'long',
      'int': 'int',
      'smallint': 'short',
      'tinyint': 'byte',
      'bit': 'bool',
      'decimal': 'decimal',
      'numeric': 'decimal',
      'money': 'decimal',
      'smallmoney': 'decimal',
      'float': 'double',
      'real': 'float',
      'datetime': 'DateTime',
      'datetime2': 'DateTime',
      'date': 'DateTime',
      'time': 'TimeSpan',
      'datetimeoffset': 'DateTimeOffset',
      'char': 'string',
      'varchar': 'string',
      'text': 'string',
      'nchar': 'string',
      'nvarchar': 'string',
      'ntext': 'string',
      'uniqueidentifier': 'Guid',
      'binary': 'byte[]',
      'varbinary': 'byte[]',
      'image': 'byte[]'
    };

    return typeMap[sqlType.toLowerCase()] || 'object';
  }

  private isValueType(type: string): boolean {
    return ['int', 'long', 'short', 'byte', 'bool', 'decimal', 'double', 'float', 'DateTime', 'DateTimeOffset', 'TimeSpan', 'Guid'].includes(type);
  }

  private toPascalCase(str: string): string {
    return str.replace(/(?:^\w|[A-Z]|\b\w)/g, (letter, index) => {
      return index === 0 ? letter.toUpperCase() : letter.toLowerCase();
    }).replace(/\s+|_/g, '').replace(/^[a-z]/, c => c.toUpperCase());
  }

  private pluralize(str: string): string {
    if (str.endsWith('y')) {
      return str.slice(0, -1) + 'ies';
    }
    if (str.endsWith('s') || str.endsWith('x') || str.endsWith('ch') || str.endsWith('sh')) {
      return str + 'es';
    }
    return str + 's';
  }
}