/**
 * Configuration types for MS SQL MCP Server
 */

export interface ConnectionConfig {
  server: string;
  database: string;
  authentication: 'integrated' | 'sql';
  username?: string;
  password?: string;
  readonly: boolean;
  environment: 'development' | 'staging' | 'production';
  port?: number;
  encrypt?: boolean;
  trustServerCertificate?: boolean;
  requireConfirmation?: boolean;
}

export interface LimitsConfig {
  max_rows: number;
  query_timeout_seconds: number;
  max_query_length: number;
}

export interface CodeGenerationConfig {
  default_namespace: string;
  use_nullable_reference_types: boolean;
  entity_framework_version: string;
  use_records_for_dtos: boolean;
}

export interface FeaturesConfig {
  enable_write_operations: boolean;
  enable_procedure_execution: boolean;
  enable_cross_database_queries: boolean;
  enable_schema_comparison: boolean;
}

export interface ServerConfig {
  connections: Record<string, ConnectionConfig>;
  limits: LimitsConfig;
  code_generation: CodeGenerationConfig;
  features: FeaturesConfig;
  current_connection?: string;
}

export interface TableInfo {
  schema: string;
  name: string;
  row_count: number;
  creation_date: string;
}

export interface ColumnInfo {
  name: string;
  data_type: string;
  max_length: number | null;
  precision: number | null;
  scale: number | null;
  is_nullable: boolean;
  is_identity: boolean;
  default_value: string | null;
}

export interface IndexInfo {
  name: string;
  type: string;
  is_unique: boolean;
  is_primary_key: boolean;
  columns: string[];
  included_columns: string[];
  filter_definition: string | null;
}

export interface ForeignKeyInfo {
  name: string;
  parent_table: string;
  parent_schema: string;
  parent_columns: string[];
  referenced_table: string;
  referenced_schema: string;
  referenced_columns: string[];
  delete_rule: string;
  update_rule: string;
}

export interface TableDescription {
  schema: string;
  table: string;
  columns: ColumnInfo[];
  primary_keys: string[];
  indexes: IndexInfo[];
  foreign_keys: ForeignKeyInfo[];
  referenced_by: ForeignKeyInfo[];
  triggers: string[];
}

export interface DatabaseInfo {
  name: string;
  size_mb: number;
  status: string;
  recovery_model: string;
}

export interface StoredProcedureInfo {
  schema: string;
  name: string;
  created_date: string;
  modified_date: string;
}

export interface ViewInfo {
  schema: string;
  name: string;
  created_date: string;
  modified_date: string;
}

export interface QueryResult {
  columns: string[];
  rows: any[];
  row_count: number;
  execution_time_ms: number;
}

export interface ExecutionPlan {
  plan_text: string;
  estimated_cost: number;
  warnings: string[];
}

export interface IndexRecommendation {
  table: string;
  schema: string;
  suggested_index: string;
  included_columns: string[];
  improvement_percent: number;
  query_patterns: string[];
}

export interface ActiveQuery {
  session_id: number;
  query_text: string;
  duration_seconds: number;
  username: string;
  wait_type: string;
  cpu_time_ms: number;
  reads: number;
  writes: number;
  blocking_session_id: number | null;
}

export interface QueryStats {
  query_hash: string;
  query_text: string;
  execution_count: number;
  avg_duration_ms: number;
  total_duration_ms: number;
  avg_cpu_ms: number;
  avg_reads: number;
  last_execution: string;
}

export interface IndexUsageStats {
  index_name: string;
  table_name: string;
  schema_name: string;
  seeks: number;
  scans: number;
  lookups: number;
  updates: number;
  last_used: string | null;
  fragmentation_percent: number;
  is_unused: boolean;
}

export interface BlockingChain {
  blocking_session_id: number;
  blocked_session_id: number;
  wait_time_seconds: number;
  wait_resource: string;
  blocking_query: string;
  blocked_query: string;
}

export interface WaitStatistic {
  wait_type: string;
  wait_time_ms: number;
  wait_count: number;
  percentage: number;
  description: string;
}

export interface ColumnStatistics {
  column: string;
  distinct_count: number;
  null_count: number;
  null_percentage: number;
  min_value: any;
  max_value: any;
  most_common_values: Array<{ value: any; count: number }>;
}

export interface DataQualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  column: string | null;
  description: string;
  affected_rows: number;
}

export interface TableStatistics {
  schema: string;
  table: string;
  row_count: number;
  data_size_mb: number;
  index_size_mb: number;
  total_size_mb: number;
  last_stats_update: string | null;
  is_compressed: boolean;
  partition_count: number;
}

export interface RelationshipInfo {
  from_table: string;
  from_schema: string;
  to_table: string;
  to_schema: string;
  relationship_type: 'parent' | 'child';
  foreign_key_name: string;
  columns: Array<{ from: string; to: string }>;
}

export interface SchemaDifference {
  type: 'table' | 'column' | 'index' | 'constraint' | 'procedure';
  object_name: string;
  difference_type: 'missing_in_target' | 'missing_in_source' | 'different';
  details: string;
}