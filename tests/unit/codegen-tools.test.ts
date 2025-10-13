import { describe, test, expect } from '@jest/globals';
import { CodeGenTools } from '../../src/tools/codegen-tools.js';
import { DatabaseManager } from '../../src/database.js';
import { SchemaTools } from '../../src/tools/schema-tools.js';
import { CodeGenerationConfig } from '../../src/types.js';

describe('CodeGenTools', () => {
  let codeGenTools: CodeGenTools;
  let mockDbManager: DatabaseManager;
  let mockSchemaTools: SchemaTools;
  let config: CodeGenerationConfig;

  beforeEach(() => {
    mockDbManager = {} as DatabaseManager;
    mockSchemaTools = {} as SchemaTools;
    config = {
      default_namespace: 'MyApp.Data',
      use_nullable_reference_types: true,
      entity_framework_version: '8.0',
      use_records_for_dtos: false,
    };
    codeGenTools = new CodeGenTools(mockDbManager, mockSchemaTools, config);
  });

  describe('SQL Type to C# Type Mapping', () => {
    test('should map int to int', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('int');
      expect(result).toBe('int');
    });

    test('should map bigint to long', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('bigint');
      expect(result).toBe('long');
    });

    test('should map smallint to short', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('smallint');
      expect(result).toBe('short');
    });

    test('should map tinyint to byte', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('tinyint');
      expect(result).toBe('byte');
    });

    test('should map nvarchar to string', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('nvarchar');
      expect(result).toBe('string');
    });

    test('should map varchar to string', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('varchar');
      expect(result).toBe('string');
    });

    test('should map text to string', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('text');
      expect(result).toBe('string');
    });

    test('should map ntext to string', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('ntext');
      expect(result).toBe('string');
    });

    test('should map char to string', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('char');
      expect(result).toBe('string');
    });

    test('should map nchar to string', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('nchar');
      expect(result).toBe('string');
    });

    test('should map decimal to decimal', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('decimal');
      expect(result).toBe('decimal');
    });

    test('should map numeric to decimal', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('numeric');
      expect(result).toBe('decimal');
    });

    test('should map money to decimal', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('money');
      expect(result).toBe('decimal');
    });

    test('should map smallmoney to decimal', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('smallmoney');
      expect(result).toBe('decimal');
    });

    test('should map datetime to DateTime', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('datetime');
      expect(result).toBe('DateTime');
    });

    test('should map datetime2 to DateTime', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('datetime2');
      expect(result).toBe('DateTime');
    });

    test('should map date to DateTime', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('date');
      expect(result).toBe('DateTime');
    });

    test('should map time to TimeSpan', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('time');
      expect(result).toBe('TimeSpan');
    });

    test('should map datetimeoffset to DateTimeOffset', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('datetimeoffset');
      expect(result).toBe('DateTimeOffset');
    });

    test('should map bit to bool', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('bit');
      expect(result).toBe('bool');
    });

    test('should map uniqueidentifier to Guid', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('uniqueidentifier');
      expect(result).toBe('Guid');
    });

    test('should map float to double', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('float');
      expect(result).toBe('double');
    });

    test('should map real to float', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('real');
      expect(result).toBe('float');
    });

    test('should map binary to byte[]', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('binary');
      expect(result).toBe('byte[]');
    });

    test('should map varbinary to byte[]', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('varbinary');
      expect(result).toBe('byte[]');
    });

    test('should map image to byte[]', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('image');
      expect(result).toBe('byte[]');
    });

    test('should be case insensitive', () => {
      expect((codeGenTools as any).mapSqlTypeToCSharp('INT')).toBe('int');
      expect((codeGenTools as any).mapSqlTypeToCSharp('NVARCHAR')).toBe('string');
      expect((codeGenTools as any).mapSqlTypeToCSharp('DateTime2')).toBe('DateTime');
    });

    test('should default to object for unknown types', () => {
      const result = (codeGenTools as any).mapSqlTypeToCSharp('unknown_type');
      expect(result).toBe('object');
    });
  });

  describe('Value Type Detection', () => {
    test('should recognize int as value type', () => {
      expect((codeGenTools as any).isValueType('int')).toBe(true);
    });

    test('should recognize long as value type', () => {
      expect((codeGenTools as any).isValueType('long')).toBe(true);
    });

    test('should recognize bool as value type', () => {
      expect((codeGenTools as any).isValueType('bool')).toBe(true);
    });

    test('should recognize decimal as value type', () => {
      expect((codeGenTools as any).isValueType('decimal')).toBe(true);
    });

    test('should recognize DateTime as value type', () => {
      expect((codeGenTools as any).isValueType('DateTime')).toBe(true);
    });

    test('should recognize Guid as value type', () => {
      expect((codeGenTools as any).isValueType('Guid')).toBe(true);
    });

    test('should recognize string as reference type', () => {
      expect((codeGenTools as any).isValueType('string')).toBe(false);
    });

    test('should recognize byte[] as reference type', () => {
      expect((codeGenTools as any).isValueType('byte[]')).toBe(false);
    });

    test('should recognize object as reference type', () => {
      expect((codeGenTools as any).isValueType('object')).toBe(false);
    });
  });

  describe('PascalCase Conversion', () => {
    test('should convert snake_case to PascalCase', () => {
      expect((codeGenTools as any).toPascalCase('user_name')).toBe('UserName');
      expect((codeGenTools as any).toPascalCase('order_id')).toBe('OrderId');
      expect((codeGenTools as any).toPascalCase('created_at')).toBe('CreatedAt');
    });

    test('should handle single word', () => {
      expect((codeGenTools as any).toPascalCase('id')).toBe('Id');
      expect((codeGenTools as any).toPascalCase('name')).toBe('Name');
      expect((codeGenTools as any).toPascalCase('email')).toBe('Email');
    });

    test('should handle multiple underscores', () => {
      expect((codeGenTools as any).toPascalCase('first_name_value')).toBe('FirstNameValue');
      expect((codeGenTools as any).toPascalCase('a_b_c_d')).toBe('ABCD');
    });

    test('should handle empty string', () => {
      expect((codeGenTools as any).toPascalCase('')).toBe('');
    });

    test('should handle spaces', () => {
      expect((codeGenTools as any).toPascalCase('user name')).toBe('UserName');
      expect((codeGenTools as any).toPascalCase('order  id')).toBe('OrderId');
    });

    test('should handle already PascalCase', () => {
      expect((codeGenTools as any).toPascalCase('UserName')).toBe('UserName');
      expect((codeGenTools as any).toPascalCase('OrderId')).toBe('OrderId');
    });

    test('should handle numbers', () => {
      expect((codeGenTools as any).toPascalCase('user_id_123')).toBe('UserId123');
      expect((codeGenTools as any).toPascalCase('order_2_items')).toBe('Order2Items');
    });

    test('should handle consecutive underscores', () => {
      expect((codeGenTools as any).toPascalCase('user__name')).toBe('UserName');
    });
  });

  describe('Pluralize', () => {
    test('should add s to regular nouns', () => {
      expect((codeGenTools as any).pluralize('User')).toBe('Users');
      expect((codeGenTools as any).pluralize('Order')).toBe('Orders');
      expect((codeGenTools as any).pluralize('Product')).toBe('Products');
    });

    test('should replace y with ies', () => {
      expect((codeGenTools as any).pluralize('Category')).toBe('Categories');
      expect((codeGenTools as any).pluralize('Company')).toBe('Companies');
      expect((codeGenTools as any).pluralize('Country')).toBe('Countries');
    });

    test('should add es to words ending in s', () => {
      expect((codeGenTools as any).pluralize('Address')).toBe('Addresses');
      expect((codeGenTools as any).pluralize('Business')).toBe('Businesses');
    });

    test('should add es to words ending in x', () => {
      expect((codeGenTools as any).pluralize('Index')).toBe('Indexes');
      expect((codeGenTools as any).pluralize('Box')).toBe('Boxes');
    });

    test('should add es to words ending in ch', () => {
      expect((codeGenTools as any).pluralize('Branch')).toBe('Branches');
      expect((codeGenTools as any).pluralize('Church')).toBe('Churches');
    });

    test('should add es to words ending in sh', () => {
      expect((codeGenTools as any).pluralize('Wish')).toBe('Wishes');
      expect((codeGenTools as any).pluralize('Dish')).toBe('Dishes');
    });
  });

  describe('Property Generation Edge Cases', () => {
    test('should handle nullable value types', () => {
      const column = {
        name: 'age',
        data_type: 'int',
        max_length: 4,
        precision: 10,
        scale: 0,
        is_nullable: true,
        is_identity: false,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, [], true);

      expect(result).toContain('public int? Age { get; set; }');
    });

    test('should handle nullable reference types', () => {
      const column = {
        name: 'description',
        data_type: 'nvarchar',
        max_length: -1, // nvarchar(max)
        precision: 0,
        scale: 0,
        is_nullable: true,
        is_identity: false,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, [], true);

      // String is reference type, so no ? suffix even when nullable
      expect(result).toContain('public string Description { get; set; }');
    });

    test('should handle identity columns', () => {
      const column = {
        name: 'id',
        data_type: 'int',
        max_length: 4,
        precision: 10,
        scale: 0,
        is_nullable: false,
        is_identity: true,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, ['id'], true);

      expect(result).toContain('[Key]');
      expect(result).toContain('[DatabaseGenerated(DatabaseGeneratedOption.Identity)]');
    });

    test('should handle columns with max length', () => {
      const column = {
        name: 'username',
        data_type: 'nvarchar',
        max_length: 100,
        precision: 0,
        scale: 0,
        is_nullable: false,
        is_identity: false,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, [], true);

      expect(result).toContain('[MaxLength(100)]');
    });

    test('should not add MaxLength for nvarchar(max)', () => {
      const column = {
        name: 'description',
        data_type: 'nvarchar',
        max_length: -1, // Indicates max
        precision: 0,
        scale: 0,
        is_nullable: true,
        is_identity: false,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, [], true);

      expect(result).not.toContain('[MaxLength');
    });

    test('should add Required attribute for non-nullable non-PK columns', () => {
      const column = {
        name: 'email',
        data_type: 'nvarchar',
        max_length: 255,
        precision: 0,
        scale: 0,
        is_nullable: false,
        is_identity: false,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, [], true);

      expect(result).toContain('[Required]');
    });

    test('should not add Required attribute for primary keys', () => {
      const column = {
        name: 'id',
        data_type: 'int',
        max_length: 4,
        precision: 10,
        scale: 0,
        is_nullable: false,
        is_identity: true,
        default_value: null,
      };

      const result = (codeGenTools as any).generateProperty(column, ['id'], true);

      expect(result).not.toContain('[Required]');
      expect(result).toContain('[Key]');
    });
  });
});
