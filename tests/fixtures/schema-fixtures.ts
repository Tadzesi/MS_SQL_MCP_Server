import { ColumnInfo, IndexInfo, ForeignKeyInfo, TableDescription } from '../../src/types.js';

/**
 * Sample table fixtures for testing
 */

export const usersTableColumns: ColumnInfo[] = [
  {
    name: 'user_id',
    data_type: 'int',
    max_length: 4,
    precision: 10,
    scale: 0,
    is_nullable: false,
    is_identity: true,
    default_value: null,
  },
  {
    name: 'username',
    data_type: 'nvarchar',
    max_length: 100,
    precision: 0,
    scale: 0,
    is_nullable: false,
    is_identity: false,
    default_value: null,
  },
  {
    name: 'email',
    data_type: 'nvarchar',
    max_length: 255,
    precision: 0,
    scale: 0,
    is_nullable: false,
    is_identity: false,
    default_value: null,
  },
  {
    name: 'created_at',
    data_type: 'datetime2',
    max_length: 8,
    precision: 27,
    scale: 7,
    is_nullable: false,
    is_identity: false,
    default_value: '(getdate())',
  },
  {
    name: 'is_active',
    data_type: 'bit',
    max_length: 1,
    precision: 1,
    scale: 0,
    is_nullable: true,
    is_identity: false,
    default_value: '((1))',
  },
];

export const usersTableIndexes: IndexInfo[] = [
  {
    name: 'PK_users',
    type: 'CLUSTERED',
    is_unique: true,
    is_primary_key: true,
    columns: ['user_id'],
    included_columns: [],
    filter_definition: null,
  },
  {
    name: 'IX_users_email',
    type: 'NONCLUSTERED',
    is_unique: true,
    is_primary_key: false,
    columns: ['email'],
    included_columns: [],
    filter_definition: null,
  },
];

export const usersTableDescription: TableDescription = {
  schema: 'dbo',
  table: 'users',
  columns: usersTableColumns,
  primary_keys: ['user_id'],
  indexes: usersTableIndexes,
  foreign_keys: [],
  referenced_by: [],
  triggers: [],
};

export const ordersTableColumns: ColumnInfo[] = [
  {
    name: 'order_id',
    data_type: 'int',
    max_length: 4,
    precision: 10,
    scale: 0,
    is_nullable: false,
    is_identity: true,
    default_value: null,
  },
  {
    name: 'user_id',
    data_type: 'int',
    max_length: 4,
    precision: 10,
    scale: 0,
    is_nullable: false,
    is_identity: false,
    default_value: null,
  },
  {
    name: 'order_date',
    data_type: 'datetime2',
    max_length: 8,
    precision: 27,
    scale: 7,
    is_nullable: false,
    is_identity: false,
    default_value: '(getdate())',
  },
  {
    name: 'total_amount',
    data_type: 'decimal',
    max_length: 9,
    precision: 18,
    scale: 2,
    is_nullable: false,
    is_identity: false,
    default_value: null,
  },
  {
    name: 'status',
    data_type: 'nvarchar',
    max_length: 50,
    precision: 0,
    scale: 0,
    is_nullable: true,
    is_identity: false,
    default_value: "('pending')",
  },
];

export const ordersTableForeignKeys: ForeignKeyInfo[] = [
  {
    name: 'FK_orders_users',
    parent_schema: 'dbo',
    parent_table: 'orders',
    parent_columns: ['user_id'],
    referenced_schema: 'dbo',
    referenced_table: 'users',
    referenced_columns: ['user_id'],
    delete_rule: 'NO_ACTION',
    update_rule: 'NO_ACTION',
  },
];

export const ordersTableDescription: TableDescription = {
  schema: 'dbo',
  table: 'orders',
  columns: ordersTableColumns,
  primary_keys: ['order_id'],
  indexes: [
    {
      name: 'PK_orders',
      type: 'CLUSTERED',
      is_unique: true,
      is_primary_key: true,
      columns: ['order_id'],
      included_columns: [],
      filter_definition: null,
    },
    {
      name: 'IX_orders_user_id',
      type: 'NONCLUSTERED',
      is_unique: false,
      is_primary_key: false,
      columns: ['user_id'],
      included_columns: [],
      filter_definition: null,
    },
  ],
  foreign_keys: ordersTableForeignKeys,
  referenced_by: [],
  triggers: [],
};

export const productsTableColumns: ColumnInfo[] = [
  {
    name: 'product_id',
    data_type: 'int',
    max_length: 4,
    precision: 10,
    scale: 0,
    is_nullable: false,
    is_identity: true,
    default_value: null,
  },
  {
    name: 'product_name',
    data_type: 'nvarchar',
    max_length: 200,
    precision: 0,
    scale: 0,
    is_nullable: false,
    is_identity: false,
    default_value: null,
  },
  {
    name: 'price',
    data_type: 'decimal',
    max_length: 9,
    precision: 18,
    scale: 2,
    is_nullable: false,
    is_identity: false,
    default_value: null,
  },
  {
    name: 'description',
    data_type: 'nvarchar',
    max_length: -1, // nvarchar(max)
    precision: 0,
    scale: 0,
    is_nullable: true,
    is_identity: false,
    default_value: null,
  },
];

export const productsTableDescription: TableDescription = {
  schema: 'dbo',
  table: 'products',
  columns: productsTableColumns,
  primary_keys: ['product_id'],
  indexes: [
    {
      name: 'PK_products',
      type: 'CLUSTERED',
      is_unique: true,
      is_primary_key: true,
      columns: ['product_id'],
      included_columns: [],
      filter_definition: null,
    },
  ],
  foreign_keys: [],
  referenced_by: [],
  triggers: [],
};

/**
 * Sample query result fixtures
 */

export const sampleUsers = [
  { user_id: 1, username: 'john_doe', email: 'john@example.com', created_at: new Date('2024-01-01'), is_active: true },
  { user_id: 2, username: 'jane_smith', email: 'jane@example.com', created_at: new Date('2024-01-02'), is_active: true },
  { user_id: 3, username: 'bob_jones', email: 'bob@example.com', created_at: new Date('2024-01-03'), is_active: false },
];

export const sampleOrders = [
  { order_id: 1, user_id: 1, order_date: new Date('2024-01-10'), total_amount: 99.99, status: 'completed' },
  { order_id: 2, user_id: 1, order_date: new Date('2024-01-15'), total_amount: 149.50, status: 'pending' },
  { order_id: 3, user_id: 2, order_date: new Date('2024-01-20'), total_amount: 75.00, status: 'completed' },
];

export const sampleProducts = [
  { product_id: 1, product_name: 'Widget A', price: 29.99, description: 'High-quality widget' },
  { product_id: 2, product_name: 'Widget B', price: 49.99, description: 'Premium widget' },
  { product_id: 3, product_name: 'Widget C', price: 19.99, description: null },
];

export const sampleDatabases = [
  { name: 'TestDB', size_mb: 256.5, status: 'ONLINE', recovery_model: 'SIMPLE' },
  { name: 'ProductionDB', size_mb: 10240.0, status: 'ONLINE', recovery_model: 'FULL' },
  { name: 'DevDB', size_mb: 128.25, status: 'ONLINE', recovery_model: 'SIMPLE' },
];

export const sampleTables = [
  { schema: 'dbo', name: 'users', row_count: 1000, creation_date: new Date('2024-01-01') },
  { schema: 'dbo', name: 'orders', row_count: 5000, creation_date: new Date('2024-01-01') },
  { schema: 'dbo', name: 'products', row_count: 250, creation_date: new Date('2024-01-01') },
];
