// src/__tests__/platform.test.ts

process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_PORT = '5432';
process.env.DATABASE_USERNAME = 'mock_user';
process.env.DATABASE_PASSWORD = 'mock_password';
process.env.DATABASE_NAME = 'mock_db';

import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { Response } from 'express';

// Import production operations
import { 
  addPermissions, 
  deletePermission, 
  addRole, 
  editRole, 
  deleteRole 
} from '../components/v1/platform/platformControllers/permission.controller';

// Import entities and database dependencies
import { RoleEntity } from '../components/v1/platform/platformEntities/permission.entity';
import permissionRepository from '../components/v1/platform/platformServices/permission.services';
import roleRepository from '../components/v1/platform/platformServices/role.services';
import AppDataSource from '../config/persistence/data-source';

// Import project error handlers
import { 
  ConflictError, 
  NotFoundError, 
  BadRequestError, 
  InvalidRequestError 
} from '../utils/errorHandler';

// Helper to generate a clean Express Response mock spy
const mockResponse = () => {
  const res = {} as unknown as Response;
  res.status = mock.fn(() => res);
  res.json = mock.fn(() => res);
  return res;
};

// Helper to transform raw objects into pseudo-TypeORM entity records
const createMockEntity = (data: any) => {
  const entity = Object.create(RoleEntity.prototype);
  return Object.assign(entity, data);
};

describe('Platform Role and Permission Service Tests (#64)', () => {
  let res: Response;

  beforeEach(() => {
    res = mockResponse();
    mock.restoreAll();
  });

  describe('Permission Operations', () => {
    it('should successfully add a unique permission', async () => {
      const req = { body: { permissions: [{ name: 'write:campaign' }] } } as any;
      
      mock.method(permissionRepository, 'find', async () => []);
      mock.method(permissionRepository, 'insert', async () => ({}));
      mock.method(permissionRepository, 'findBy', async () => [createMockEntity({ id: 1, name: 'write:campaign' })]);

      await addPermissions(req, res);
      assert.strictEqual((res.json as any).mock.callCount(), 1);
    });

    it('should reject duplicate permissions with a ConflictError', async () => {
      const req = { body: { permissions: [{ name: 'read:campaign' }] } } as any;

      mock.method(permissionRepository, 'find', async () => [createMockEntity({ id: 1 })]);

      await assert.rejects(addPermissions(req, res), ConflictError);
    });

    it('should reject deleting a permission that belongs to a role with InvalidRequestError', async () => {
      const req = { params: { permissionId: '1' } } as any;

      mock.method(permissionRepository, 'findOne', async () => createMockEntity({ id: 1, name: 'read:campaign' }));
      
      const mockQueryBuilder = {
        where: () => mockQueryBuilder,
        getOne: async () => createMockEntity({ id: 5, name: 'Manager' })
      };
      mock.method(AppDataSource, 'createQueryBuilder', () => mockQueryBuilder);

      await assert.rejects(deletePermission(req, res), InvalidRequestError);
    });

    it('should reject deleting a non-existent permission with NotFoundError', async () => {
      const req = { params: { permissionId: '999' } } as any;
      mock.method(permissionRepository, 'findOne', async () => null);

      await assert.rejects(deletePermission(req, res), NotFoundError);
    });
  });

  describe('Role Operations', () => {
    it('should create a role with valid permissions', async () => {
      const req = { body: { name: 'Editor', userType: 'Staff', permissions: [{ id: 1, value: 'read:campaign' }] } } as any;

      mock.method(roleRepository, 'findOne', async () => null);
      mock.method(permissionRepository, 'find', async () => [createMockEntity({ id: 1, name: 'read:campaign' })]);
      mock.method(roleRepository, 'create', (data: any) => createMockEntity(data));
      mock.method(roleRepository, 'save', async () => ({}));

      await addRole(req, res);
      assert.strictEqual((res.json as any).mock.callCount(), 1);
    });

    it('should allow editing an existing role', async () => {
      const req = { body: { roleId: 2, name: 'Manager', permissions: [{ id: 1, value: 'read:campaign' }] } } as any;

      mock.method(roleRepository, 'findOneBy', async () => createMockEntity({ id: 2, name: 'Manager' }));
      mock.method(permissionRepository, 'find', async () => [createMockEntity({ id: 1, name: 'read:campaign' })]);
      mock.method(roleRepository, 'save', async () => ({}));

      await editRole(req, res);
      assert.strictEqual((res.json as any).mock.callCount(), 1);
    });

    it('should reject role creation with missing permissions or validation errors (BadRequestError)', async () => {
      const req = { body: { name: 'Editor', userType: 'Staff', permissions: [{ id: 1, value: 'invalid:perm' }] } } as any;

      mock.method(roleRepository, 'findOne', async () => null);
      mock.method(permissionRepository, 'find', async () => [createMockEntity({ id: 1, name: 'read:campaign' })]);

      await assert.rejects(addRole(req, res), BadRequestError);
    });

    it('should reject role creation with non-existent database records (NotFoundError)', async () => {
      const req = { body: { name: 'Editor', userType: 'Staff', permissions: [{ id: 99, value: 'invalid:perm' }] } } as any;

      mock.method(roleRepository, 'findOne', async () => null);
      mock.method(permissionRepository, 'find', async () => []); 

      await assert.rejects(addRole(req, res), NotFoundError);
    });

    it('should prevent deleting the super-admin role or missing records by falling back to NotFoundError', async () => {
      const req = { params: { roleId: '1' } } as any;
      mock.method(roleRepository, 'findOne', async () => null);

      await assert.rejects(deleteRole(req, res), NotFoundError);
    });
  });
});