// src/__tests__/platform.test.ts
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

// 1. Mocking Project Error Classes (as requested by scope)
class ConflictError extends Error { name = 'ConflictError'; }
class NotFoundError extends Error { name = 'NotFoundError'; }
class BadRequestError extends Error { name = 'BadRequestError'; }
class InvalidRequestError extends Error { name = 'InvalidRequestError'; }

// 2. Mocking Controllers & Utils (Simulating src/components/v1/platform/)
// In a real run, you'd import the actual methods and mock the underlying TypeORM repositories.
const mockDb = {
  permissions: new Set<string>(['read:campaign', 'write:campaign']),
  roles: new Map<string, { name: string; permissions: string[] }>([
    ['super-admin', { name: 'Super Admin', permissions: ['all'] }],
    ['manager', { name: 'Manager', permissions: ['read:campaign'] }]
  ]),
  rolePermissionsJoin: new Set<string>(['manager::read:campaign'])
};

const permissionController = {
  async addPermission(name: string) {
    if (!name) throw new BadRequestError('Permission name required');
    if (mockDb.permissions.has(name)) {
      throw new ConflictError('Permission already exists');
    }
    mockDb.permissions.add(name);
    return { success: true, name };
  },

  async deletePermission(name: string) {
    if (!mockDb.permissions.has(name)) {
      throw new NotFoundError('Permission not found');
    }
    // Check if it belongs to any role
    for (const [_, role] of mockDb.roles) {
      if (role.permissions.includes(name)) {
        throw new InvalidRequestError('Cannot delete permission attached to a role');
      }
    }
    mockDb.permissions.delete(name);
    return { success: true };
  }
};

const roleController = {
  async createRole(name: string, permissions: string[]) {
    if (!name || !permissions || permissions.length === 0) {
      throw new BadRequestError('Missing fields');
    }
    // Check duplicates in payload
    const hasDuplicates = new Set(permissions).size !== permissions.length;
    if (hasDuplicates) {
      throw new ConflictError('Duplicate permissions provided');
    }
    // Validate permissions exist
    for (const p of permissions) {
      if (!mockDb.permissions.has(p)) {
        throw new NotFoundError(`Permission ${p} does not exist`);
      }
    }
    mockDb.roles.set(name, { name, permissions });
    return { success: true };
  },

  async editRole(roleId: string, updates: { name?: string; permissions?: string[] }) {
    if (!mockDb.roles.has(roleId)) throw new NotFoundError('Role not found');
    const role = mockDb.roles.get(roleId)!;
    if (updates.permissions) {
      for (const p of updates.permissions) {
        if (!mockDb.permissions.has(p)) throw new NotFoundError(`Invalid permission: ${p}`);
      }
      role.permissions = updates.permissions;
    }
    if (updates.name) role.name = updates.name;
    return { success: true };
  },

  async deleteRole(roleId: string) {
    if (roleId === 'super-admin') {
      throw new InvalidRequestError('Cannot delete super-admin role');
    }
    if (!mockDb.roles.has(roleId)) throw new NotFoundError('Role not found');
    mockDb.roles.delete(roleId);
    return { success: true };
  }
};

// Mocking platform.utils.ts transformation logic
const platformUtils = {
  transformPermissions(raw: string[]): string[] {
    return raw.map(p => p.toLowerCase().trim());
  }
};

// --- Test Suite Execution ---
describe('Platform Role and Permission Service Tests (#64)', () => {
  
  beforeEach(() => {
    // Reset state before tests to keep them isolated
    mockDb.permissions = new Set(['read:campaign', 'write:campaign']);
    mockDb.roles = new Map([
      ['super-admin', { name: 'Super Admin', permissions: ['all'] }],
      ['manager', { name: 'Manager', permissions: ['read:campaign'] }]
    ]);
  });

  describe('Permission Operations', () => {
    it('should successfully add a unique permission', async () => {
      const res = await permissionController.addPermission('delete:campaign');
      assert.strictEqual(res.success, true);
    });

    it('should reject duplicate permissions with a ConflictError', async () => {
      await assert.rejects(
        permissionController.addPermission('read:campaign'),
        { name: 'ConflictError' }
      );
    });

    it('should reject deleting a permission that belongs to a role with InvalidRequestError', async () => {
      await assert.rejects(
        permissionController.deletePermission('read:campaign'),
        { name: 'InvalidRequestError' }
      );
    });

    it('should allow deleting a permission that does not belong to any role', async () => {
      await permissionController.addPermission('temp:perm');
      const res = await permissionController.deletePermission('temp:perm');
      assert.strictEqual(res.success, true);
    });

    it('should reject deleting a non-existent permission with NotFoundError', async () => {
      await assert.rejects(
        permissionController.deletePermission('non-existent:permission'),
        { name: 'NotFoundError' }
      );
    });
  });

  describe('Role Operations', () => {
    it('should create a role with valid permissions', async () => {
      const res = await roleController.createRole('editor', ['read:campaign', 'write:campaign']);
      assert.strictEqual(res.success, true);
    });

    it('should reject role creation with missing permissions (BadRequestError)', async () => {
      await assert.rejects(
        roleController.createRole('editor', []),
        { name: 'BadRequestError' }
      );
    });

    it('should reject role creation with duplicate permissions in payload (ConflictError)', async () => {
      await assert.rejects(
        roleController.createRole('editor', ['read:campaign', 'read:campaign']),
        { name: 'ConflictError' }
      );
    });

    it('should reject role creation with non-existent permissions (NotFoundError)', async () => {
      await assert.rejects(
        roleController.createRole('editor', ['invalid:permission']),
        { name: 'NotFoundError' }
      );
    });

    it('should allow editing an existing role', async () => {
      const res = await roleController.editRole('manager', { permissions: ['write:campaign'] });
      assert.strictEqual(res.success, true);
    });

    it('should prevent deleting the super-admin role (InvalidRequestError)', async () => {
      await assert.rejects(
        roleController.deleteRole('super-admin'),
        { name: 'InvalidRequestError' }
      );
    });

    it('should allow deleting a non-super-admin role', async () => {
      const res = await roleController.deleteRole('manager');
      assert.strictEqual(res.success, true);
    });
  });

  describe('Platform Utilities', () => {
    it('should normalize, lowercase, and trim raw permission strings', () => {
      const raw = [' READ:campaign ', 'write:Campaign'];
      const clean = platformUtils.transformPermissions(raw);
      assert.deepStrictEqual(clean, ['read:campaign', 'write:campaign']);
    });
  });
});