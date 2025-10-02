# MS SQL MCP Server - Functionality Specification

## Overview

This document defines the functionality for a Model Context Protocol (MCP) server that connects Claude Code to Microsoft SQL Server databases. The server enables Claude to interact with MS SQL databases for exploration, analysis, and code generation while CRUD operations are handled by Entity Framework and C# APIs.

---

## Target Use Cases

1. **Database exploration and schema understanding**
2. **Query development and optimization**
3. **Troubleshooting performance issues**
4. **Entity Framework model generation**
5. **Database documentation generation**
6. **Safe data inspection and analysis**

---

## Core MCP Tools

### 1. Schema Inspection Tools

#### `mssql_list_databases`

**Purpose**: List all accessible databases on the server  
**Parameters**: None  
**Returns**: Array of database names with basic metadata (size, status, recovery model)  
**Prompt Guidance**: "Show me all databases" or "What databases are available?"

#### `mssql_list_tables`

**Purpose**: List all tables in a specified database  
**Parameters**:

- `database` (required): Target database name
- `schema` (optional): Filter by schema (default: all schemas)
- `include_system` (optional): Include system tables (default: false)

**Returns**: Array of tables with schema, name, row count estimate, and creation date  
**Prompt Guidance**: "List all tables in [database]" or "Show me the tables in the dbo schema"

#### `mssql_describe_table`

**Purpose**: Get detailed schema information for a specific table  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Schema name (default: 'dbo')
- `table` (required): Table name

**Returns**: Complete table definition including:

- Column names, data types, nullability, defaults
- Primary keys and unique constraints
- Foreign key relationships (both referencing and referenced)
- Indexes with included columns and filter conditions
- Triggers associated with the table

**Prompt Guidance**: "Describe the structure of [table]" or "What are the columns in [schema].[table]?"

#### `mssql_list_stored_procedures`

**Purpose**: List stored procedures in a database  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Filter by schema
- `pattern` (optional): Name pattern filter (SQL LIKE syntax)

**Returns**: Array of stored procedures with name, schema, creation date, modification date  
**Prompt Guidance**: "Show me all stored procedures" or "Find procedures with 'Customer' in the name"

#### `mssql_get_procedure_definition`

**Purpose**: Retrieve the full source code of a stored procedure  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `procedure` (required): Procedure name

**Returns**: Full T-SQL definition with parameters and body  
**Prompt Guidance**: "Show me the code for [procedure]" or "Get the definition of [schema].[procedure]"

#### `mssql_list_views`

**Purpose**: List all views in a specified database  
**Parameters**:

- `database` (required): Target database name
- `schema` (optional): Filter by schema (default: all schemas)

**Returns**: Array of views with schema, name, and definition metadata  
**Prompt Guidance**: "Show me all views in [database]" or "List views in the dbo schema"

#### `mssql_get_view_definition`

**Purpose**: Retrieve the full source code of a view  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `view` (required): View name

**Returns**: Full T-SQL view definition  
**Prompt Guidance**: "Show me the view definition for [view]"

#### `mssql_get_relationships`

**Purpose**: Map foreign key relationships for a table or entire database  
**Parameters**:

- `database` (required): Database name
- `table` (optional): Specific table to analyze
- `depth` (optional): Relationship traversal depth (default: 1)

**Returns**: Relationship graph showing parent/child relationships  
**Prompt Guidance**: "Show me all relationships for [table]" or "What tables reference [table]?"

---

### 2. Query Execution Tools

#### `mssql_execute_query`

**Purpose**: Execute a SELECT query and return results  
**Parameters**:

- `database` (required): Database name
- `query` (required): SQL SELECT statement
- `max_rows` (optional): Maximum rows to return (default: 1000, max: 10000)
- `timeout` (optional): Query timeout in seconds (default: 30)

**Returns**: Result set as structured data with column metadata  
**Safety Features**:

- Only SELECT statements allowed
- Automatic row limiting
- Query timeout enforcement
- Read-only connection mode

**Prompt Guidance**: "Run this query: [SQL]" or "Select top 100 rows from [table] where [condition]"

#### `mssql_execute_scalar`

**Purpose**: Execute a query that returns a single value  
**Parameters**:

- `database` (required): Database name
- `query` (required): SQL query returning single value

**Returns**: Single scalar value  
**Use Cases**: COUNT queries, SUM aggregations, EXISTS checks  
**Prompt Guidance**: "How many rows are in [table]?" or "What's the sum of [column]?"

---

### 3. Query Analysis Tools

#### `mssql_explain_query`

**Purpose**: Generate execution plan without executing the query  
**Parameters**:

- `database` (required): Database name
- `query` (required): SQL query to analyze

**Returns**: Execution plan in text format with:

- Estimated costs per operation
- Index usage or table scans
- Join types and order
- Key lookups and warnings

**Prompt Guidance**: "Analyze this query performance" or "Show execution plan for [query]"

#### `mssql_validate_syntax`

**Purpose**: Check SQL syntax without execution  
**Parameters**:

- `database` (required): Database name
- `sql` (required): SQL statement to validate

**Returns**: Validation result (valid/invalid) with error messages if invalid  
**Prompt Guidance**: "Check if this SQL is valid" or "Validate syntax: [SQL]"

#### `mssql_find_missing_indexes`

**Purpose**: Identify missing indexes based on query patterns  
**Parameters**:

- `database` (required): Database name
- `table` (optional): Specific table to analyze

**Returns**: Index recommendations with:

- Suggested index columns
- Expected improvement percentage
- Query patterns that would benefit

**Prompt Guidance**: "What indexes are missing on [table]?" or "Suggest index improvements"

#### `mssql_analyze_query_performance`

**Purpose**: Deep analysis of query performance bottlenecks  
**Parameters**:

- `database` (required): Database name
- `query` (required): SQL query to analyze

**Returns**: Detailed performance analysis including:

- Execution time breakdown
- I/O statistics
- Memory usage
- Parallelism details
- Optimization suggestions

**Prompt Guidance**: "Why is this query slow?" or "Analyze performance issues in [query]"

---

### 4. Performance Monitoring Tools

#### `mssql_active_queries`

**Purpose**: Show currently executing queries  
**Parameters**:

- `min_duration_seconds` (optional): Filter by minimum execution time (default: 5)

**Returns**: List of active queries with:

- Query text
- Execution duration
- Session ID and user
- Wait type and resource usage
- Blocking information

**Prompt Guidance**: "What queries are running right now?" or "Show me long-running queries"

#### `mssql_query_stats`

**Purpose**: Get performance statistics for frequent or expensive queries  
**Parameters**:

- `database` (required): Database name
- `sort_by` (optional): 'duration', 'cpu', 'reads', 'executions' (default: 'duration')
- `top` (optional): Number of queries to return (default: 20)

**Returns**: Query performance metrics from Query Store or DMVs  
**Prompt Guidance**: "Show me the slowest queries" or "What queries use the most CPU?"

#### `mssql_index_usage`

**Purpose**: Analyze index usage statistics  
**Parameters**:

- `database` (required): Database name
- `table` (optional): Specific table to analyze

**Returns**: Index usage data including:

- Seeks, scans, lookups, updates
- Last usage timestamp
- Unused indexes
- Fragmentation levels

**Prompt Guidance**: "Which indexes are unused on [table]?" or "Show index usage statistics"

#### `mssql_blocking_chains`

**Purpose**: Identify blocking and deadlock situations  
**Parameters**: None

**Returns**: Current blocking chains with:

- Blocking session details
- Blocked session details
- Wait times
- Resource being blocked
- Query text of blocking and blocked queries

**Prompt Guidance**: "Show me blocking chains" or "What's causing database blocking?"

#### `mssql_wait_statistics`

**Purpose**: Analyze database wait statistics  
**Parameters**:

- `top` (optional): Number of wait types to return (default: 10)

**Returns**: Top wait types with:

- Wait type description
- Wait time
- Wait count
- Performance impact analysis

**Prompt Guidance**: "Show me database wait statistics" or "What are the top waits?"

---

### 5. Data Profiling Tools

#### `mssql_sample_data`

**Purpose**: Retrieve sample rows from a table  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Schema name (default: 'dbo')
- `table` (required): Table name
- `limit` (optional): Number of rows (default: 10, max: 100)
- `order_by` (optional): Column to sort by

**Returns**: Sample rows with all columns  
**Prompt Guidance**: "Show me some data from [table]" or "Sample 20 rows from [table]"

#### `mssql_column_statistics`

**Purpose**: Get data distribution statistics for a column  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name
- `column` (required): Column name

**Returns**: Statistics including:

- Distinct count
- Null count and percentage
- Min/max values
- Most common values (for categorical data)
- Data type distribution

**Prompt Guidance**: "Analyze the [column] column" or "What are the distinct values in [column]?"

#### `mssql_data_quality_check`

**Purpose**: Identify data quality issues  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name

**Returns**: Report of potential issues:

- Null values in non-nullable looking columns
- Duplicate keys
- Outliers in numeric columns
- Invalid foreign key references
- Empty strings vs nulls

**Prompt Guidance**: "Check data quality of [table]" or "Find data issues in [table]"

#### `mssql_table_statistics`

**Purpose**: Get comprehensive table statistics  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Schema name
- `table` (required): Table name

**Returns**: Statistics including:

- Row count
- Table size (data + indexes)
- Last update statistics date
- Compression status
- Partition information

**Prompt Guidance**: "Show me statistics for [table]" or "How big is [table]?"

---

### 6. Entity Framework Code Generation Tools

#### `mssql_generate_entity_class`

**Purpose**: Generate C# entity class from table schema  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name
- `namespace` (optional): C# namespace (default: "Data.Entities")
- `use_data_annotations` (optional): Use Data Annotations (default: true)
- `use_fluent_api` (optional): Generate Fluent API configuration (default: false)
- `include_navigation_properties` (optional): Include navigation properties (default: true)

**Returns**: C# entity class with:

- Property mappings for all columns
- Data annotations (Required, MaxLength, etc.)
- Navigation properties for relationships
- Constructor initialization
- XML documentation comments

**Prompt Guidance**: "Generate C# entity for [table]" or "Create EF Core model for [table] with navigation properties"

#### `mssql_generate_dbcontext`

**Purpose**: Generate DbContext class for a database or schema  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Limit to specific schema
- `context_name` (optional): DbContext class name (default: "[Database]Context")
- `namespace` (optional): C# namespace (default: "Data")
- `include_fluent_api` (optional): Include Fluent API configurations (default: true)

**Returns**: Complete DbContext class with:

- DbSet properties for all tables
- OnModelCreating with Fluent API configurations
- Connection string configuration placeholder
- XML documentation

**Prompt Guidance**: "Generate DbContext for [database]" or "Create EF Core context for all tables in [schema]"

#### `mssql_generate_repository_interface`

**Purpose**: Generate repository interface for a table  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name
- `namespace` (optional): C# namespace (default: "Data.Repositories")
- `include_async` (optional): Include async methods (default: true)

**Returns**: C# repository interface with:

- Standard repository methods (GetById, GetAll, Add, Update, Delete)
- Custom query methods based on indexes
- Async/await patterns
- XML documentation

**Prompt Guidance**: "Generate repository interface for [table]" or "Create IRepository for [table]"

#### `mssql_generate_dto_classes`

**Purpose**: Generate Data Transfer Object (DTO) classes  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name
- `namespace` (optional): C# namespace (default: "Data.DTOs")
- `dto_types` (optional): Array of DTO types to generate ['create', 'update', 'read', 'list']

**Returns**: DTO classes for different operations:

- CreateDto (fields for creation, excludes auto-generated)
- UpdateDto (all modifiable fields)
- ReadDto (complete entity representation)
- ListDto (summary fields for listing)

**Prompt Guidance**: "Generate DTOs for [table]" or "Create Create and Update DTOs for [table]"

#### `mssql_generate_ef_configuration`

**Purpose**: Generate Fluent API entity configuration class  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name
- `namespace` (optional): C# namespace (default: "Data.Configurations")

**Returns**: IEntityTypeConfiguration implementation with:

- Table and schema mapping
- Primary key configuration
- Property configurations (type, length, required)
- Index definitions
- Relationship configurations
- Default value mappings

**Prompt Guidance**: "Generate Fluent API configuration for [table]" or "Create entity configuration for [table]"

#### `mssql_generate_migration_class`

**Purpose**: Generate EF Core migration class for schema changes  
**Parameters**:

- `source_database` (required): Current database state
- `target_schema` (required): Target schema definition (JSON or table list)
- `migration_name` (required): Migration name

**Returns**: EF Core migration class with:

- Up() method with schema changes
- Down() method for rollback
- Proper migration syntax

**Prompt Guidance**: "Generate migration to add [table]" or "Create migration for schema changes"

---

### 7. Documentation Tools

#### `mssql_generate_data_dictionary`

**Purpose**: Create comprehensive database documentation  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Limit to specific schema
- `include_procedures` (optional): Include stored procedures (default: true)
- `include_views` (optional): Include views (default: true)
- `include_relationships` (optional): Include ER diagram (default: true)
- `format` (optional): Output format 'markdown' or 'html' (default: 'markdown')

**Returns**: Comprehensive documentation with:

- Database overview and statistics
- All tables with column descriptions
- Data types and constraints
- Relationships and foreign keys
- Indexes and their purposes
- Stored procedures and views inventory

**Prompt Guidance**: "Document the [database] database" or "Create data dictionary for [database]"

#### `mssql_generate_er_diagram`

**Purpose**: Generate text-based Entity Relationship diagram  
**Parameters**:

- `database` (required): Database name
- `schema` (optional): Limit to specific schema
- `format` (optional): 'mermaid', 'plantuml', or 'ascii' (default: 'mermaid')

**Returns**: ER diagram showing:

- All tables and their columns
- Primary and foreign key relationships
- Cardinality (one-to-one, one-to-many, many-to-many)

**Prompt Guidance**: "Create ER diagram for [database]" or "Show relationships in Mermaid format"

#### `mssql_document_stored_procedure`

**Purpose**: Generate detailed documentation for a stored procedure  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `procedure` (required): Procedure name

**Returns**: Documentation including:

- Purpose and description
- Input parameters with types
- Return values
- Dependencies (tables, views, other procedures)
- Example usage
- Performance considerations

**Prompt Guidance**: "Document the [procedure] stored procedure" or "Explain what [procedure] does"

#### `mssql_generate_api_documentation`

**Purpose**: Generate API endpoint documentation based on tables  
**Parameters**:

- `database` (required): Database name
- `schema` (required): Schema name
- `table` (required): Table name
- `base_route` (optional): API base route (default: "/api/[table]")

**Returns**: OpenAPI/Swagger-style documentation for suggested endpoints:

- GET (list with filtering)
- GET by ID
- POST (create)
- PUT (update)
- DELETE
- Request/response models

**Prompt Guidance**: "Generate API docs for [table]" or "Suggest REST endpoints for [table]"

---

### 8. Schema Comparison Tools

#### `mssql_compare_schemas`

**Purpose**: Compare schemas between two databases  
**Parameters**:

- `source_database` (required): Source database name
- `target_database` (required): Target database name
- `schema` (optional): Limit comparison to specific schema

**Returns**: Detailed comparison report:

- Tables that exist in only one database
- Column differences (type, nullability, defaults)
- Index differences
- Constraint differences
- Stored procedure differences

**Prompt Guidance**: "Compare [db1] and [db2] schemas" or "What's different between dev and prod?"

#### `mssql_generate_sync_script`

**Purpose**: Generate T-SQL script to synchronize schemas  
**Parameters**:

- `source_database` (required): Source database
- `target_database` (required): Target database
- `include_data` (optional): Include data sync (default: false)
- `dry_run` (optional): Generate script without executing (default: true)

**Returns**: T-SQL script with:

- ALTER TABLE statements
- CREATE/DROP statements
- Index modifications
- Constraint updates
- Rollback script

**Prompt Guidance**: "Generate sync script from [source] to [target]" or "Create schema update script"

---

## Security & Safety Features

### Connection Management

- Support for multiple connection profiles (dev, staging, prod)
- Read-only connection enforcement for query operations
- Automatic detection of production environments with warnings
- Connection pooling and timeout management

### Query Safety

- Whitelist of allowed SQL commands (SELECT, EXPLAIN, SHOW, etc.)
- Blacklist of dangerous operations (DROP, TRUNCATE, DELETE, UPDATE, INSERT)
- Automatic row limiting on SELECT queries
- Query timeout enforcement
- No write operations allowed (handled by EF Core in application layer)

### Access Control

- Role-based tool availability
- Configurable row limits per environment
- Audit logging of all operations
- Environment-specific restrictions

### Entity Framework Integration

- Generated code follows EF Core best practices
- No direct data manipulation through MCP
- All CRUD operations delegated to application API layer
- Focus on read-only analysis and code generation

---

## Configuration File Structure

```json
{
  "connections": {
    "dev": {
      "server": "localhost",
      "database": "master",
      "authentication": "integrated",
      "readonly": true,
      "environment": "development"
    },
    "staging": {
      "server": "staging-server",
      "database": "master",
      "authentication": "sql",
      "username": "readonly_user",
      "readonly": true,
      "environment": "staging"
    },
    "prod": {
      "server": "prod-server",
      "database": "master",
      "authentication": "sql",
      "username": "readonly_user",
      "readonly": true,
      "require_confirmation": true,
      "environment": "production"
    }
  },
  "limits": {
    "max_rows": 10000,
    "query_timeout_seconds": 30,
    "max_query_length": 50000
  },
  "code_generation": {
    "default_namespace": "MyApp.Data",
    "use_nullable_reference_types": true,
    "entity_framework_version": "8.0",
    "use_records_for_dtos": false
  },
  "features": {
    "enable_write_operations": false,
    "enable_procedure_execution": false,
    "enable_cross_database_queries": true,
    "enable_schema_comparison": true
  }
}
```

---

## Prompt Engineering Guidelines for Claude Code

### Effective Prompts

**Schema Exploration:**

- "Show me the structure of the Orders table in the Sales database"
- "What are all the foreign keys in the Customers table?"
- "List all stored procedures that have 'Invoice' in their name"
- "Describe all tables in the dbo schema"

**Query Development:**

- "Write a query to find customers who haven't placed orders in the last 6 months"
- "Show me the top 10 products by revenue this year"
- "Analyze the performance of this query: [paste query]"
- "What's the most efficient way to join Orders and OrderDetails?"

**Troubleshooting:**

- "Why is this query slow? [paste query]"
- "What indexes should I add to improve performance on the Orders table?"
- "Show me any blocking queries right now"
- "What are the current wait statistics?"

**Entity Framework Code Generation:**

- "Generate a C# entity class for the Products table with EF Core annotations"
- "Create a DbContext for the entire Sales database"
- "Generate DTOs for the Orders table"
- "Create Fluent API configuration for the Customers table"
- "Generate a repository interface for the Products table"

**Documentation:**

- "Create a data dictionary for the Sales database"
- "Document all the relationships in the Inventory schema"
- "Explain what the sp_ProcessOrders stored procedure does"
- "Generate ER diagram in Mermaid format for the database"
- "Create API documentation for the Products table"

**Schema Comparison:**

- "Compare the schemas between dev and prod databases"
- "What tables are different between staging and prod?"
- "Generate a sync script to update prod schema from staging"

### Context Building

Claude Code works best when you provide context:

**1. Start broad**:

- "I'm working with a database that tracks orders and inventory for an e-commerce platform"

**2. Explore schema**:

- "Show me all tables in the Sales database"
- "What are the relationships between Orders, OrderDetails, and Products?"

**3. Generate code**:

- "Generate EF Core entities for all tables in the Sales schema with navigation properties"
- "Create a DbContext with Fluent API configurations"

**4. Optimize and troubleshoot**:

- "Analyze the performance of my product search query"
- "What indexes should I add based on current query patterns?"

**5. Document**:

- "Create comprehensive documentation for the entire database"
- "Generate API documentation for all entities"

---

## Implementation Priority

### Phase 1 - Essential Schema Tools

1. `mssql_list_databases`
2. `mssql_list_tables`
3. `mssql_describe_table`
4. `mssql_execute_query`
5. `mssql_sample_data`
6. `mssql_get_relationships`

### Phase 2 - Analysis & Performance

7. `mssql_explain_query`
8. `mssql_find_missing_indexes`
9. `mssql_query_stats`
10. `mssql_active_queries`
11. `mssql_index_usage`

### Phase 3 - EF Core Code Generation

12. `mssql_generate_entity_class`
13. `mssql_generate_dbcontext`
14. `mssql_generate_ef_configuration`
15. `mssql_generate_dto_classes`
16. `mssql_generate_repository_interface`

### Phase 4 - Documentation & Advanced

17. `mssql_generate_data_dictionary`
18. `mssql_generate_er_diagram`
19. `mssql_compare_schemas`
20. `mssql_generate_api_documentation`

---

## Expected Benefits

1. **Faster Development**: Schema exploration and EF Core code generation without manual work
2. **Better Code Quality**: Automated code generation following best practices and conventions
3. **Performance Optimization**: Quick identification of slow queries, missing indexes, and bottlenecks
4. **Comprehensive Documentation**: Automatic generation of up-to-date database and API documentation
5. **Learning & Understanding**: Claude can explain complex queries, schemas, and database concepts
6. **Safety First**: Read-only operations with all CRUD handled safely through EF Core and APIs
7. **Consistency**: Standardized entity models, DTOs, and configurations across the codebase

---

## Integration with C# Development Workflow

### Typical Workflow

**1. Database First Approach:**

```
Explore schema → Generate entities → Generate DbContext →
Generate DTOs → Create repositories → Build API controllers
```

**2. Code Review & Optimization:**

```
Analyze existing queries → Find performance issues →
Suggest indexes → Document changes
```

**3. Deployment & Comparison:**

```
Compare schemas → Generate migration →
Validate changes → Document differences
```

### Claude Code Commands

```
# Initial setup
"Show me all tables in the Sales database"
"Generate EF Core entities for all tables in the dbo schema"
"Create a DbContext class named SalesContext"

# Build data access layer
"Generate DTOs for the Orders table"
"Create repository interface for the Products table"
"Generate Fluent API configuration for all tables"

# API development
"Generate API documentation for the Products table"
"Suggest REST endpoints for the Orders table"

# Performance tuning
"Analyze this query: [SQL]"
"What indexes are missing on the Orders table?"
"Show me the slowest queries in the database"

# Documentation
"Create a data dictionary for the entire database"
"Generate ER diagram in Mermaid format"
"Document all stored procedures"

# Deployment
"Compare dev and prod schemas"
"Generate sync script for schema changes"
```

---

## Testing Scenarios

### Scenario 1: New Developer Onboarding

**Goal**: Understand database structure and generate initial code  
**Commands**:

1. List all databases
2. Explore application database tables and relationships
3. Generate EF Core entities for all tables
4. Create DbContext with configurations
5. Generate data dictionary

### Scenario 2: Query Optimization

**Goal**: Fix slow running query  
**Commands**:

1. Show active slow queries
2. Get execution plan for specific query
3. Find missing indexes
4. Analyze wait statistics
5. Generate optimized version with Claude's suggestions

### Scenario 3: API Development

**Goal**: Build REST API endpoints  
**Commands**:

1. Describe table structure
2. Generate entity class with navigation properties
3. Generate DTOs (Create, Update, Read)
4. Create repository interface
5. Generate API documentation

### Scenario 4: Schema Evolution

**Goal**: Update database schema safely  
**Commands**:

1. Compare dev and prod schemas
2. Identify differences
3. Generate sync script
4. Review changes with Claude
5. Document schema changes

---

## Notes for Claude Code Users

When using this MCP server with Claude Code:

- **Be specific**: Include database and table names when possible
- **Iterate naturally**: Start with exploration, then drill down into specific areas
- **Trust the chain**: Claude can call multiple tools automatically to solve complex problems
- **Ask for explanations**: Claude can explain the results from any tool and suggest next steps
- **Request alternatives**: Ask Claude to suggest different approaches or optimizations
- **Safety focus**: The server prevents write operations - all CRUD is handled by your EF Core application
- **Code generation**: Generated code follows current C# and EF Core best practices
- **Namespace consistency**: Specify your preferred namespace structure for consistency

### Best Practices

✅ **Do:**

- Use the MCP for exploration and analysis
- Generate entity models and configurations
- Analyze query performance
- Create documentation
- Compare schemas across environments

❌ **Don't:**

- Try to execute INSERT/UPDATE/DELETE through MCP
- Expect CRUD operations (use your EF Core API)
- Skip validation of generated code
- Deploy generated migrations without review

---

## Future Enhancements

- **Query Store Deep Dive**: Historical query performance analysis
- **Extended Events**: Real-time monitoring configuration
- **Index Recommendations**: ML-based index suggestions
- **Migration Validation**: Pre-deployment migration testing
- **Test Data Suggestions**: Generate realistic test data based on schema
- **Performance Baselines**: Track metrics over time
- **Natural Language Queries**: Enhanced NL to SQL with full context
- **GraphQL Schema Generation**: Generate GraphQL schemas from database
- **Automated Refactoring**: Suggest and generate code refactoring
- **Integration Tests**: Generate integration test templates
