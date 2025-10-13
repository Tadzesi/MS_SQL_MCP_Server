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
import { Logger } from './logger.js';

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
        description: 'Display current connection configuration',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'mssql_switch_connection',
        description: 'Switch SQL Server connection profile',
        inputSchema: {
          type: 'object',
          properties: {
            environment: {
              type: 'string',
              description: 'Connection profile',
              enum: ['local', 'prod', 'dev']
            }
          },
          required: ['environment']
        }
      },

      // Schema Inspection Tools
      {
        name: 'mssql_list_databases',
        description: 'List accessible databases',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'mssql_list_tables',
        description: 'List tables in database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema filter' },
            include_system: { type: 'boolean', description: 'Include system tables' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_describe_table',
        description: 'Get table schema details',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_list_stored_procedures',
        description: 'List stored procedures',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema filter' },
            pattern: { type: 'string', description: 'Name pattern' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_get_procedure_definition',
        description: 'Get stored procedure source code',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            procedure: { type: 'string', description: 'Procedure' }
          },
          required: ['database', 'schema', 'procedure']
        }
      },
      {
        name: 'mssql_list_views',
        description: 'List views in database',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema filter' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_get_view_definition',
        description: 'Get view source code',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            view: { type: 'string', description: 'View' }
          },
          required: ['database', 'schema', 'view']
        }
      },
      {
        name: 'mssql_get_relationships',
        description: 'Map foreign key relationships',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            table: { type: 'string', description: 'Table filter' },
            depth: { type: 'number', description: 'Traversal depth' }
          },
          required: ['database']
        }
      },

      // Query Execution Tools
      {
        name: 'mssql_execute_query',
        description: 'Execute SELECT query',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            query: { type: 'string', description: 'SQL query' },
            max_rows: { type: 'number', description: 'Row limit' },
            timeout: { type: 'number', description: 'Timeout seconds' }
          },
          required: ['database', 'query']
        }
      },
      {
        name: 'mssql_execute_scalar',
        description: 'Execute query returning single value',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            query: { type: 'string', description: 'SQL query' }
          },
          required: ['database', 'query']
        }
      },

      // Query Analysis Tools
      {
        name: 'mssql_explain_query',
        description: 'Generate execution plan',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            query: { type: 'string', description: 'SQL query' }
          },
          required: ['database', 'query']
        }
      },
      {
        name: 'mssql_validate_syntax',
        description: 'Validate SQL syntax',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            sql: { type: 'string', description: 'SQL statement' }
          },
          required: ['database', 'sql']
        }
      },
      {
        name: 'mssql_find_missing_indexes',
        description: 'Find missing indexes',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            table: { type: 'string', description: 'Table filter' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_analyze_query_performance',
        description: 'Analyze query performance',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            query: { type: 'string', description: 'SQL query' }
          },
          required: ['database', 'query']
        }
      },

      // Performance Monitoring Tools
      {
        name: 'mssql_active_queries',
        description: 'Show executing queries',
        inputSchema: {
          type: 'object',
          properties: {
            min_duration_seconds: { type: 'number', description: 'Min execution time' }
          },
          required: []
        }
      },
      {
        name: 'mssql_query_stats',
        description: 'Get query performance statistics',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            sort_by: { type: 'string', enum: ['duration', 'cpu', 'reads', 'executions'], description: 'Sort metric' },
            top: { type: 'number', description: 'Result limit' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_index_usage',
        description: 'Analyze index usage',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            table: { type: 'string', description: 'Table filter' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_blocking_chains',
        description: 'Identify blocking and deadlocks',
        inputSchema: {
          type: 'object',
          properties: {},
          required: []
        }
      },
      {
        name: 'mssql_wait_statistics',
        description: 'Analyze wait statistics',
        inputSchema: {
          type: 'object',
          properties: {
            top: { type: 'number', description: 'Result limit' }
          },
          required: []
        }
      },

      // Data Profiling Tools
      {
        name: 'mssql_sample_data',
        description: 'Get table sample rows',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            limit: { type: 'number', description: 'Row count' },
            order_by: { type: 'string', description: 'Sort column' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_column_statistics',
        description: 'Get column statistics',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            column: { type: 'string', description: 'Column' }
          },
          required: ['database', 'schema', 'table', 'column']
        }
      },
      {
        name: 'mssql_data_quality_check',
        description: 'Check data quality',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_table_statistics',
        description: 'Get table statistics',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' }
          },
          required: ['database', 'schema', 'table']
        }
      },

      // Entity Framework Code Generation Tools
      {
        name: 'mssql_generate_entity_class',
        description: 'Generate C# entity class',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            namespace: { type: 'string', description: 'C# namespace' },
            use_data_annotations: { type: 'boolean', description: 'Use Data Annotations' },
            include_navigation_properties: { type: 'boolean', description: 'Include navigation properties' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_dbcontext',
        description: 'Generate DbContext class',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema filter' },
            context_name: { type: 'string', description: 'DbContext class name' },
            namespace: { type: 'string', description: 'C# namespace' },
            include_fluent_api: { type: 'boolean', description: 'Include Fluent API' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_generate_repository_interface',
        description: 'Generate repository interface',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            namespace: { type: 'string', description: 'C# namespace' },
            include_async: { type: 'boolean', description: 'Include async methods' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_dto_classes',
        description: 'Generate DTO classes',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            namespace: { type: 'string', description: 'C# namespace' },
            dto_types: {
              type: 'array',
              items: { type: 'string', enum: ['create', 'update', 'read', 'list'] },
              description: 'DTO types'
            }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_ef_configuration',
        description: 'Generate Fluent API configuration',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            namespace: { type: 'string', description: 'C# namespace' }
          },
          required: ['database', 'schema', 'table']
        }
      },
      {
        name: 'mssql_generate_migration_class',
        description: 'Generate EF Core migration',
        inputSchema: {
          type: 'object',
          properties: {
            source_database: { type: 'string', description: 'Source database' },
            migration_name: { type: 'string', description: 'Migration name' }
          },
          required: ['source_database', 'migration_name']
        }
      },

      // Documentation Tools
      {
        name: 'mssql_generate_data_dictionary',
        description: 'Generate database documentation',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema filter' },
            include_procedures: { type: 'boolean', description: 'Include procedures' },
            include_views: { type: 'boolean', description: 'Include views' },
            include_relationships: { type: 'boolean', description: 'Include ER diagram' },
            format: { type: 'string', enum: ['markdown', 'html'], description: 'Output format' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_generate_er_diagram',
        description: 'Generate ER diagram',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema filter' },
            format: { type: 'string', enum: ['mermaid', 'plantuml', 'ascii'], description: 'Diagram format' }
          },
          required: ['database']
        }
      },
      {
        name: 'mssql_document_stored_procedure',
        description: 'Document stored procedure',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            procedure: { type: 'string', description: 'Procedure' }
          },
          required: ['database', 'schema', 'procedure']
        }
      },
      {
        name: 'mssql_generate_api_documentation',
        description: 'Generate API documentation',
        inputSchema: {
          type: 'object',
          properties: {
            database: { type: 'string', description: 'Database' },
            schema: { type: 'string', description: 'Schema' },
            table: { type: 'string', description: 'Table' },
            base_route: { type: 'string', description: 'API base route' }
          },
          required: ['database', 'schema', 'table']
        }
      },

      // Schema Comparison Tools
      {
        name: 'mssql_compare_schemas',
        description: 'Compare database schemas',
        inputSchema: {
          type: 'object',
          properties: {
            source_database: { type: 'string', description: 'Source database' },
            target_database: { type: 'string', description: 'Target database' },
            schema: { type: 'string', description: 'Schema filter' }
          },
          required: ['source_database', 'target_database']
        }
      },
      {
        name: 'mssql_generate_sync_script',
        description: 'Generate schema sync script',
        inputSchema: {
          type: 'object',
          properties: {
            source_database: { type: 'string', description: 'Source database' },
            target_database: { type: 'string', description: 'Target database' },
            include_data: { type: 'boolean', description: 'Include data sync' },
            dry_run: { type: 'boolean', description: 'Script only' }
          },
          required: ['source_database', 'target_database']
        }
      },

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

        return this.formatResponse(result, 'mssql_show_connection_config');
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
          }, 'mssql_switch_connection');
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
        return this.formatResponse(await this.schemaTools.listDatabases(pool), name);

      case 'mssql_list_tables':
        return this.formatResponse(
          await this.schemaTools.listTables(pool, args.database, args.schema, args.include_system),
          name
        );

      case 'mssql_describe_table':
        return this.formatResponse(
          await this.schemaTools.describeTable(pool, args.database, args.schema, args.table),
          name
        );

      case 'mssql_list_stored_procedures':
        return this.formatResponse(
          await this.schemaTools.listStoredProcedures(pool, args.database, args.schema, args.pattern),
          name
        );

      case 'mssql_get_procedure_definition':
        return this.formatTextResponse(
          await this.schemaTools.getProcedureDefinition(pool, args.database, args.schema, args.procedure),
          name
        );

      case 'mssql_list_views':
        return this.formatResponse(
          await this.schemaTools.listViews(pool, args.database, args.schema),
          name
        );

      case 'mssql_get_view_definition':
        return this.formatTextResponse(
          await this.schemaTools.getViewDefinition(pool, args.database, args.schema, args.view),
          name
        );

      case 'mssql_get_relationships':
        return this.formatResponse(
          await this.schemaTools.getRelationships(pool, args.database, args.table, args.depth),
          name
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
          ),
          name
        );

      case 'mssql_execute_scalar':
        return this.formatResponse(
          await this.queryTools.executeScalar(pool, args.database, args.query),
          name
        );

      // Query Analysis
      case 'mssql_explain_query':
        return this.formatResponse(
          await this.queryTools.explainQuery(pool, args.database, args.query),
          name
        );

      case 'mssql_validate_syntax':
        return this.formatResponse(
          await this.queryTools.validateSyntax(pool, args.database, args.sql),
          name
        );

      case 'mssql_find_missing_indexes':
        return this.formatResponse(
          await this.queryTools.findMissingIndexes(pool, args.database, args.table),
          name
        );

      case 'mssql_analyze_query_performance':
        return this.formatResponse(
          await this.queryTools.analyzeQueryPerformance(pool, args.database, args.query),
          name
        );

      // Performance Monitoring
      case 'mssql_active_queries':
        return this.formatResponse(
          await this.performanceTools.getActiveQueries(pool, args.min_duration_seconds || 5),
          name
        );

      case 'mssql_query_stats':
        return this.formatResponse(
          await this.performanceTools.getQueryStats(pool, args.database, args.sort_by, args.top),
          name
        );

      case 'mssql_index_usage':
        return this.formatResponse(
          await this.performanceTools.getIndexUsage(pool, args.database, args.table),
          name
        );

      case 'mssql_blocking_chains':
        return this.formatResponse(
          await this.performanceTools.getBlockingChains(pool),
          name
        );

      case 'mssql_wait_statistics':
        return this.formatResponse(
          await this.performanceTools.getWaitStatistics(pool, args.top),
          name
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
          ),
          name
        );

      case 'mssql_column_statistics':
        return this.formatResponse(
          await this.profilingTools.getColumnStatistics(
            pool,
            args.database,
            args.schema,
            args.table,
            args.column
          ),
          name
        );

      case 'mssql_data_quality_check':
        return this.formatResponse(
          await this.profilingTools.checkDataQuality(pool, args.database, args.schema, args.table),
          name
        );

      case 'mssql_table_statistics':
        return this.formatResponse(
          await this.profilingTools.getTableStatistics(pool, args.database, args.schema, args.table),
          name
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
          ),
          name
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
          ),
          name
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
          ),
          name
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
          ),
          name
        );

      case 'mssql_generate_ef_configuration':
        return this.formatTextResponse(
          await this.codeGenTools.generateEfConfiguration(
            pool,
            args.database,
            args.schema,
            args.table,
            args.namespace
          ),
          name
        );

      case 'mssql_generate_migration_class':
        return this.formatTextResponse(
          await this.codeGenTools.generateMigrationClass(args.source_database, args.migration_name),
          name
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
          ),
          name
        );

      case 'mssql_generate_er_diagram':
        return this.formatTextResponse(
          await this.documentationTools.generateErDiagram(pool, args.database, args.schema, args.format),
          name
        );

      case 'mssql_document_stored_procedure':
        return this.formatTextResponse(
          await this.documentationTools.documentStoredProcedure(
            pool,
            args.database,
            args.schema,
            args.procedure
          ),
          name
        );

      case 'mssql_generate_api_documentation':
        return this.formatTextResponse(
          await this.documentationTools.generateApiDocumentation(
            pool,
            args.database,
            args.schema,
            args.table,
            args.base_route
          ),
          name
        );

      // Schema Comparison
      case 'mssql_compare_schemas':
        return this.formatResponse(
          await this.comparisonTools.compareSchemas(
            pool,
            args.source_database,
            args.target_database,
            args.schema
          ),
          name
        );

      case 'mssql_generate_sync_script':
        return this.formatTextResponse(
          await this.comparisonTools.generateSyncScript(
            pool,
            args.source_database,
            args.target_database,
            args.include_data,
            args.dry_run
          ),
          name
        );

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  /**
   * Estimate token count from text length using character-based approximation.
   * Uses conservative 4:1 character to token ratio.
   *
   * @param text - The text to estimate tokens for
   * @returns Estimated token count (rounded up)
   */
  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Build a user-friendly truncation message with suggestions.
   *
   * @param toolName - Name of the tool being called
   * @param totalItems - Total number of items available
   * @param returnedItems - Number of items being returned
   * @returns Formatted truncation message
   */
  private buildTruncationMessage(toolName: string, totalItems?: number, returnedItems?: number): string {
    let message = `Response truncated due to size limit.`;

    if (totalItems !== undefined && returnedItems !== undefined) {
      message += ` Showing ${returnedItems} of ${totalItems} items.`;
    }

    // Tool-specific suggestions
    if (toolName.includes('list_jobs') || toolName.includes('job_history') || toolName.includes('job_status')) {
      message += ` Consider using the 'top' and 'offset' parameters to paginate results.`;
    } else if (toolName.includes('analyze_job_failures')) {
      message += ` Consider reducing the 'days_back' parameter to analyze a shorter time period.`;
    } else if (toolName.includes('generate_data_dictionary') || toolName.includes('generate_dbcontext')) {
      message += ` Consider specifying a 'schema' parameter to limit the scope.`;
    }

    return message;
  }

  private formatResponse(data: any, toolName: string = 'unknown') {
    const maxTokens = this.configManager.getConfig().limits.max_response_tokens;

    // If truncation is disabled (max_response_tokens === 0), return without size check
    if (maxTokens === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(data, null, 2)
          }
        ]
      };
    }

    // Serialize and estimate token count
    const serialized = JSON.stringify(data, null, 2);
    const estimatedTokens = this.estimateTokenCount(serialized);

    // If within limits, return normally
    if (estimatedTokens <= maxTokens) {
      return {
        content: [
          {
            type: 'text',
            text: serialized
          }
        ]
      };
    }

    // Response exceeds limit - need to truncate
    // Handle arrays by reducing item count
    if (Array.isArray(data)) {
      if (data.length === 0) {
        // Empty array - return as is
        return {
          content: [
            {
              type: 'text',
              text: serialized
            }
          ]
        };
      }

      // Calculate how many items to keep
      const itemsToKeep = Math.max(1, Math.floor(data.length * (maxTokens / estimatedTokens)));
      const truncatedData = data.slice(0, itemsToKeep);

      // Log truncation
      Logger.warn(
        `Response truncated for tool '${toolName}': ${estimatedTokens} tokens > ${maxTokens} limit ` +
        `(reduced from ${data.length} to ${itemsToKeep} items)`
      );

      // Build truncated response with metadata
      const truncatedResponse = {
        truncated: true,
        total_items: data.length,
        returned_items: itemsToKeep,
        message: this.buildTruncationMessage(toolName, data.length, itemsToKeep),
        data: truncatedData
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(truncatedResponse, null, 2)
          }
        ]
      };
    }

    // Handle objects (non-array JSON) - truncate the serialized JSON
    const charLimit = maxTokens * 4;
    const truncatedText = serialized.substring(0, charLimit) + '\n\n[... Response truncated due to size limit ...]';

    Logger.warn(
      `Response truncated for tool '${toolName}': ${estimatedTokens} tokens > ${maxTokens} limit ` +
      `(truncated from ${serialized.length} to ${charLimit} characters)`
    );

    return {
      content: [
        {
          type: 'text',
          text: truncatedText
        }
      ]
    };
  }

  private formatTextResponse(text: string, toolName: string = 'unknown') {
    const maxTokens = this.configManager.getConfig().limits.max_response_tokens;

    // If truncation is disabled (max_response_tokens === 0), return without size check
    if (maxTokens === 0) {
      return {
        content: [
          {
            type: 'text',
            text
          }
        ]
      };
    }

    // Estimate token count
    const estimatedTokens = this.estimateTokenCount(text);

    // If within limits, return normally
    if (estimatedTokens <= maxTokens) {
      return {
        content: [
          {
            type: 'text',
            text
          }
        ]
      };
    }

    // Text exceeds limit - truncate
    const charLimit = maxTokens * 4;
    const truncatedText = text.substring(0, charLimit) +
      `\n\n[... Response truncated: ${text.length} characters (estimated ${estimatedTokens} tokens) exceeds limit of ${maxTokens} tokens ...]`;

    Logger.warn(
      `Text response truncated for tool '${toolName}': ${estimatedTokens} tokens > ${maxTokens} limit ` +
      `(truncated from ${text.length} to ${charLimit} characters)`
    );

    return {
      content: [
        {
          type: 'text',
          text: truncatedText
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