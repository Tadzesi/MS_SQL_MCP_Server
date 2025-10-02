#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

import { ConfigManager } from './config.js';
import { DatabaseManager } from './database.js';
import { SchemaTools } from './tools/schema-tools.js';
import { QueryTools } from './tools/query-tools.js';
import { PerformanceTools } from './tools/performance-tools.js';
import { ProfilingTools } from './tools/profiling-tools.js';
import { CodeGenTools } from './tools/codegen-tools.js';
import { DocumentationTools } from './tools/documentation-tools.js';
import { ComparisonTools } from './tools/comparison-tools.js';

/**
 * MS SQL MCP Server
 * Provides database exploration, analysis, and Entity Framework code generation
 */
class MsSqlMcpServer {
  private server: Server;
  private configManager: ConfigManager;
  private dbManager: DatabaseManager;
  private schemaTools: SchemaTools;
  private queryTools: QueryTools;
  private performanceTools: PerformanceTools;
  private profilingTools: ProfilingTools;
  private codeGenTools: CodeGenTools;
  private documentationTools: DocumentationTools;
  private comparisonTools: ComparisonTools;

  constructor() {
    this.server = new Server(
      {
        name: 'mssql-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Initialize managers
    this.configManager = new ConfigManager();
    this.dbManager = new DatabaseManager();
    this.schemaTools = new SchemaTools(this.dbManager);
    this.queryTools = new QueryTools(this.dbManager);
    this.performanceTools = new PerformanceTools(this.dbManager);
    this.profilingTools = new ProfilingTools(this.dbManager);
    this.codeGenTools = new CodeGenTools(
      this.dbManager,
      this.schemaTools,
      this.configManager.getConfig().code_generation
    );
    this.documentationTools = new DocumentationTools(this.dbManager, this.schemaTools);
    this.comparisonTools = new ComparisonTools(this.dbManager, this.schemaTools);

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getToolDefinitions()
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const config = this.configManager.getCurrentConnection();
        const pool = await this.dbManager.getConnection(config);

        return await this.handleToolCall(request.params.name, request.params.arguments, pool);
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message || 'Unknown error'}`
            }
          ],
          isError: true
        };
      }
    });
  }

  private getToolDefinitions(): Tool[] {
    return [
      // Configuration Tools
      {
        name: 'mssql_show_connection_config',
        description: 'Display current connection configuration and SQL connection string details',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'mssql_switch_connection',
        description: 'Switch to a different SQL Server connection profile (local, prod, or dev). Default profile is "local".',
        inputSchema: {
          type: 'object',
          properties: {
            environment: {
              type: 'string',
              description: 'Connection profile name (local, prod, or dev)',
              enum: ['local', 'prod', 'dev']
            }
          },
          required: ['environment']
        }
      },

      // Schema Inspection Tools
      {
        name: 'mssql_list_databases',
        description: 'List all accessible databases on the server',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'mssql_list_tables',
        description: 'List all tables in a specified database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Target database name' },
            schema: { type: 'string', description: 'Filter by schema (optional)' },
            include_system: { type: 'boolean', description: 'Include system tables (default: false)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_describe_table',
        description: 'Get detailed schema information for a specific table',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name (default: dbo)' },
            table: { type: 'string', description: 'Table name' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_list_stored_procedures',
        description: 'List stored procedures in a database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Filter by schema (optional)' },
            pattern: { type: 'string', description: 'Name pattern filter (SQL LIKE syntax, optional)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_get_procedure_definition',
        description: 'Retrieve the full source code of a stored procedure',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            procedure: { type: 'string', description: 'Procedure name' }
          },
          required: ['database', 'schema', 'procedure']
        }
      },
      {
        name: 'mssql_list_views',
        description: 'List all views in a specified database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Filter by schema (optional)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_get_view_definition',
        description: 'Retrieve the full source code of a view',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            view: { type: 'string', description: 'View name' }
          },
          required: ['database', 'schema', 'view']
        }
      },
      {
        name: 'mssql_get_relationships',
        description: 'Map foreign key relationships for a table or entire database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            table: { type: 'string', description: 'Specific table to analyze (optional)' },
            depth: { type: 'number', description: 'Relationship traversal depth (default: 1)' }
          },
          required: ['database']
        }
      },

      // Query Execution Tools
      {
        name: 'mssql_execute_query',
        description: 'Execute a SELECT query and return results (read-only)',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            query: { type: 'string', description: 'SQL SELECT statement' },
            max_rows: { type: 'number', description: 'Maximum rows to return (default: 1000, max: 10000)' },
            timeout: { type: 'number', description: 'Query timeout in seconds (default: 30)' }
          },
          required: ['database', 'query']
        }
      },
      {
        name: 'mssql_execute_scalar',
        description: 'Execute a query that returns a single value',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            query: { type: 'string', description: 'SQL query returning single value' }
          },
          required: ['database', 'query']
        }
      },

      // Query Analysis Tools
      {
        name: 'mssql_explain_query',
        description: 'Generate execution plan without executing the query',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            query: { type: 'string', description: 'SQL query to analyze' }
          },
          required: ['database', 'query']
        }
      },
      {
        name: 'mssql_validate_syntax',
        description: 'Check SQL syntax without execution',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            sql: { type: 'string', description: 'SQL statement to validate' }
          },
          required: ['database', 'sql']
        }
      },
      {
        name: 'mssql_find_missing_indexes',
        description: 'Identify missing indexes based on query patterns',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            table: { type: 'string', description: 'Specific table to analyze (optional)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_analyze_query_performance',
        description: 'Deep analysis of query performance bottlenecks',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            query: { type: 'string', description: 'SQL query to analyze' }
          },
          required: ['database', 'query']
        }
      },

      // Performance Monitoring Tools
      {
        name: 'mssql_active_queries',
        description: 'Show currently executing queries',
        inputSchema: {
          type: 'object',
          properties: {
            min_duration_seconds: { type: 'number', description: 'Filter by minimum execution time (default: 5)' }
          },
          required: []
        }
      },
      {
        name: 'mssql_query_stats',
        description: 'Get performance statistics for frequent or expensive queries',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            sort_by: { type: 'string', enum: ['duration', 'cpu', 'reads', 'executions'], description: 'Sort metric (default: duration)' },
            top: { type: 'number', description: 'Number of queries to return (default: 20)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_index_usage',
        description: 'Analyze index usage statistics',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            table: { type: 'string', description: 'Specific table to analyze (optional)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_blocking_chains',
        description: 'Identify blocking and deadlock situations',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'mssql_wait_statistics',
        description: 'Analyze database wait statistics',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Number of wait types to return (default: 10)' }
          },
          required: []
        }
      },

      // Data Profiling Tools
      {
        name: 'mssql_sample_data',
        description: 'Retrieve sample rows from a table',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name (default: dbo)' },
            table: { type: 'string', description: 'Table name' },
            limit: { type: 'number', description: 'Number of rows (default: 10, max: 100)' },
            order_by: { type: 'string', description: 'Column to sort by (optional)' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_column_statistics',
        description: 'Get data distribution statistics for a column',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' },
            column: { type: 'string', description: 'Column name' }
          },
          required: ['database', 'schema', 'table', 'column']
        }
      },
      {
        name: 'mssql_data_quality_check',
        description: 'Identify data quality issues',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_table_statistics',
        description: 'Get comprehensive table statistics',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' }
          },
          required: ['database', 'schema', 'table']
        }
      },

      // Entity Framework Code Generation Tools
      {
        name: 'mssql_generate_entity_class',
        description: 'Generate C# entity class from table schema',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' },
            namespace: { type: 'string', description: 'C# namespace (optional)' },
            use_data_annotations: { type: 'boolean', description: 'Use Data Annotations (default: true)' },
            include_navigation_properties: { type: 'boolean', description: 'Include navigation properties (default: true)' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_dbcontext',
        description: 'Generate DbContext class for a database or schema',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Limit to specific schema (optional)' },
            context_name: { type: 'string', description: 'DbContext class name (optional)' },
            namespace: { type: 'string', description: 'C# namespace (optional)' },
            include_fluent_api: { type: 'boolean', description: 'Include Fluent API configurations (default: true)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_generate_repository_interface',
        description: 'Generate repository interface for a table',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' },
            namespace: { type: 'string', description: 'C# namespace (optional)' },
            include_async: { type: 'boolean', description: 'Include async methods (default: true)' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_dto_classes',
        description: 'Generate Data Transfer Object (DTO) classes',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' },
            namespace: { type: 'string', description: 'C# namespace (optional)' },
            dto_types: {
              type: 'array',
              items: { type: 'string', enum: ['create', 'update', 'read', 'list'] },
              description: 'DTO types to generate (default: all)'
            }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_ef_configuration',
        description: 'Generate Fluent API entity configuration class',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' },
            namespace: { type: 'string', description: 'C# namespace (optional)' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_migration_class',
        description: 'Generate EF Core migration class for schema changes',
        inputSchema: {
          type: 'object',
          properties: {
            source_database: { type: 'string', description: 'Current database state' },
            migration_name: { type: 'string', description: 'Migration name' }
          },
          required: ['source_database', 'migration_name']
        }
      },

      // Documentation Tools
      {
        name: 'mssql_generate_data_dictionary',
        description: 'Create comprehensive database documentation',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Limit to specific schema (optional)' },
            include_procedures: { type: 'boolean', description: 'Include stored procedures (default: true)' },
            include_views: { type: 'boolean', description: 'Include views (default: true)' },
            include_relationships: { type: 'boolean', description: 'Include ER diagram (default: true)' },
            format: { type: 'string', enum: ['markdown', 'html'], description: 'Output format (default: markdown)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_generate_er_diagram',
        description: 'Generate Entity Relationship diagram',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Limit to specific schema (optional)' },
            format: { type: 'string', enum: ['mermaid', 'plantuml', 'ascii'], description: 'Diagram format (default: mermaid)' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_document_stored_procedure',
        description: 'Generate detailed documentation for a stored procedure',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            procedure: { type: 'string', description: 'Procedure name' }
          },
          required: ['database', 'schema', 'procedure']
        }
      },
      {
        name: 'mssql_generate_api_documentation',
        description: 'Generate API endpoint documentation based on tables',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database name' },
            schema: { type: 'string', description: 'Schema name' },
            table: { type: 'string', description: 'Table name' },
            base_route: { type: 'string', description: 'API base route (optional)' }
          },
          required: ['database', 'schema', 'table']
        }
      },

      // Schema Comparison Tools
      {
        name: 'mssql_compare_schemas',
        description: 'Compare schemas between two databases',
        inputSchema: {
          type: 'object',
          properties: {
            source_database: { type: 'string', description: 'Source database name' },
            target_database: { type: 'string', description: 'Target database name' },
            schema: { type: 'string', description: 'Limit comparison to specific schema (optional)' }
          },
          required: ['source_database', 'target_database']
        }
      },
      {
        name: 'mssql_generate_sync_script',
        description: 'Generate T-SQL script to synchronize schemas',
        inputSchema: {
          type: 'object',
          properties: {
            source_database: { type: 'string', description: 'Source database' },
            target_database: { type: 'string', description: 'Target database' },
            include_data: { type: 'boolean', description: 'Include data sync (default: false)' },
            dry_run: { type: 'boolean', description: 'Generate script without executing (default: true)' }
          },
          required: ['source_database', 'target_database']
        }
      }
    ];
  }

  private async handleToolCall(name: string, args: any, pool: any): Promise<any> {
    const limits = this.configManager.getConfig().limits;

    switch (name) {
      // Configuration
      case 'mssql_show_connection_config': {
        const connConfig = this.configManager.getCurrentConnection();

        // Build the mssql config object (same as in database.ts)
        const mssqlConfig: any = {
          server: connConfig.server,
          database: connConfig.database,
          options: {
            encrypt: connConfig.encrypt ?? false,
            trustServerCertificate: connConfig.trustServerCertificate ?? true,
            enableArithAbort: true,
            readOnlyIntent: connConfig.readonly,
            instanceName: connConfig.server.includes('\\') ? connConfig.server.split('\\')[1] : undefined
          },
          pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000
          },
          requestTimeout: 30000,
          connectionTimeout: 15000
        };

        if (connConfig.authentication === 'sql') {
          mssqlConfig.user = connConfig.username;
          mssqlConfig.password = '***MASKED***';
        } else {
          mssqlConfig.authentication = {
            type: 'ntlm',
            options: {
              domain: '',
              userName: connConfig.username || '',
              password: '***MASKED***'
            }
          };
        }

        const result = {
          currentConnection: this.configManager.getConfig().current_connection,
          connectionConfig: {
            ...connConfig,
            password: '***MASKED***'
          },
          mssqlDriverConfig: mssqlConfig,
          connectionString: `Server=${connConfig.server};Database=${connConfig.database};User Id=${connConfig.username};Authentication=${connConfig.authentication}`
        };

        return this.formatResponse(result);
      }

      case 'mssql_switch_connection': {
        const environment = args.environment;

        try {
          this.configManager.setCurrentConnection(environment);
          const newConfig = this.configManager.getCurrentConnection();

          return this.formatResponse({
            success: true,
            message: `Switched to '${environment}' connection`,
            connection: {
              server: newConfig.server,
              database: newConfig.database,
              environment: newConfig.environment
            }
          });
        } catch (error: any) {
          return {
            content: [{
              type: 'text',
              text: `Failed to switch connection: ${error.message}`
            }],
            isError: true
          };
        }
      }

      // Schema Inspection
      case 'mssql_list_databases':
        return this.formatResponse(await this.schemaTools.listDatabases(pool));

      case 'mssql_list_tables':
        return this.formatResponse(
          await this.schemaTools.listTables(pool, args.database, args.schema, args.include_system)
        );

      case 'mssql_describe_table':
        return this.formatResponse(
          await this.schemaTools.describeTable(pool, args.database, args.schema, args.table)
        );

      case 'mssql_list_stored_procedures':
        return this.formatResponse(
          await this.schemaTools.listStoredProcedures(pool, args.database, args.schema, args.pattern)
        );

      case 'mssql_get_procedure_definition':
        return this.formatTextResponse(
          await this.schemaTools.getProcedureDefinition(pool, args.database, args.schema, args.procedure)
        );

      case 'mssql_list_views':
        return this.formatResponse(
          await this.schemaTools.listViews(pool, args.database, args.schema)
        );

      case 'mssql_get_view_definition':
        return this.formatTextResponse(
          await this.schemaTools.getViewDefinition(pool, args.database, args.schema, args.view)
        );

      case 'mssql_get_relationships':
        return this.formatResponse(
          await this.schemaTools.getRelationships(pool, args.database, args.table, args.depth)
        );

      // Query Execution
      case 'mssql_execute_query':
        return this.formatResponse(
          await this.queryTools.executeQuery(
            pool,
            args.database,
            args.query,
            Math.min(args.max_rows || 1000, limits.max_rows),
            args.timeout || limits.query_timeout_seconds
          )
        );

      case 'mssql_execute_scalar':
        return this.formatResponse(
          await this.queryTools.executeScalar(pool, args.database, args.query)
        );

      // Query Analysis
      case 'mssql_explain_query':
        return this.formatResponse(
          await this.queryTools.explainQuery(pool, args.database, args.query)
        );

      case 'mssql_validate_syntax':
        return this.formatResponse(
          await this.queryTools.validateSyntax(pool, args.database, args.sql)
        );

      case 'mssql_find_missing_indexes':
        return this.formatResponse(
          await this.queryTools.findMissingIndexes(pool, args.database, args.table)
        );

      case 'mssql_analyze_query_performance':
        return this.formatResponse(
          await this.queryTools.analyzeQueryPerformance(pool, args.database, args.query)
        );

      // Performance Monitoring
      case 'mssql_active_queries':
        return this.formatResponse(
          await this.performanceTools.getActiveQueries(pool, args.min_duration_seconds || 5)
        );

      case 'mssql_query_stats':
        return this.formatResponse(
          await this.performanceTools.getQueryStats(pool, args.database, args.sort_by, args.top)
        );

      case 'mssql_index_usage':
        return this.formatResponse(
          await this.performanceTools.getIndexUsage(pool, args.database, args.table)
        );

      case 'mssql_blocking_chains':
        return this.formatResponse(
          await this.performanceTools.getBlockingChains(pool)
        );

      case 'mssql_wait_statistics':
        return this.formatResponse(
          await this.performanceTools.getWaitStatistics(pool, args.top)
        );

      // Data Profiling
      case 'mssql_sample_data':
        return this.formatResponse(
          await this.profilingTools.sampleData(
            pool,
            args.database,
            args.schema,
            args.table,
            Math.min(args.limit || 10, 100),
            args.order_by
          )
        );

      case 'mssql_column_statistics':
        return this.formatResponse(
          await this.profilingTools.getColumnStatistics(
            pool,
            args.database,
            args.schema,
            args.table,
            args.column
          )
        );

      case 'mssql_data_quality_check':
        return this.formatResponse(
          await this.profilingTools.checkDataQuality(pool, args.database, args.schema, args.table)
        );

      case 'mssql_table_statistics':
        return this.formatResponse(
          await this.profilingTools.getTableStatistics(pool, args.database, args.schema, args.table)
        );

      // Entity Framework Code Generation
      case 'mssql_generate_entity_class':
        return this.formatTextResponse(
          await this.codeGenTools.generateEntityClass(
            pool,
            args.database,
            args.schema,
            args.table,
            args.namespace,
            args.use_data_annotations,
            args.include_navigation_properties
          )
        );

      case 'mssql_generate_dbcontext':
        return this.formatTextResponse(
          await this.codeGenTools.generateDbContext(
            pool,
            args.database,
            args.schema,
            args.context_name,
            args.namespace,
            args.include_fluent_api
          )
        );

      case 'mssql_generate_repository_interface':
        return this.formatTextResponse(
          await this.codeGenTools.generateRepositoryInterface(
            pool,
            args.database,
            args.schema,
            args.table,
            args.namespace,
            args.include_async
          )
        );

      case 'mssql_generate_dto_classes':
        return this.formatResponse(
          await this.codeGenTools.generateDtoClasses(
            pool,
            args.database,
            args.schema,
            args.table,
            args.namespace,
            args.dto_types
          )
        );

      case 'mssql_generate_ef_configuration':
        return this.formatTextResponse(
          await this.codeGenTools.generateEfConfiguration(
            pool,
            args.database,
            args.schema,
            args.table,
            args.namespace
          )
        );

      case 'mssql_generate_migration_class':
        return this.formatTextResponse(
          await this.codeGenTools.generateMigrationClass(args.source_database, args.migration_name)
        );

      // Documentation
      case 'mssql_generate_data_dictionary':
        return this.formatTextResponse(
          await this.documentationTools.generateDataDictionary(
            pool,
            args.database,
            args.schema,
            args.include_procedures,
            args.include_views,
            args.include_relationships,
            args.format
          )
        );

      case 'mssql_generate_er_diagram':
        return this.formatTextResponse(
          await this.documentationTools.generateErDiagram(pool, args.database, args.schema, args.format)
        );

      case 'mssql_document_stored_procedure':
        return this.formatTextResponse(
          await this.documentationTools.documentStoredProcedure(
            pool,
            args.database,
            args.schema,
            args.procedure
          )
        );

      case 'mssql_generate_api_documentation':
        return this.formatTextResponse(
          await this.documentationTools.generateApiDocumentation(
            pool,
            args.database,
            args.schema,
            args.table,
            args.base_route
          )
        );

      // Schema Comparison
      case 'mssql_compare_schemas':
        return this.formatResponse(
          await this.comparisonTools.compareSchemas(
            pool,
            args.source_database,
            args.target_database,
            args.schema
          )
        );

      case 'mssql_generate_sync_script':
        return this.formatTextResponse(
          await this.comparisonTools.generateSyncScript(
            pool,
            args.source_database,
            args.target_database,
            args.include_data,
            args.dry_run
          )
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private formatResponse(data: any) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(data, null, 2)
        }
      ]
    };
  }

  private formatTextResponse(text: string) {
    return {
      content: [
        {
          type: 'text',
          text
        }
      ]
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MS SQL MCP Server running on stdio');
  }
}

// Start the server
const server = new MsSqlMcpServer();
server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});