import { UserRole } from '@prisma/client';
import {
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getRolePermissions,
  isRoleHigherOrEqual,
  getHighestRole,
  Permission,
} from '@/lib/auth/rbac';

describe('RBAC System', () => {
  describe('hasPermission', () => {
    it('should grant all permissions to OWNER role', () => {
      expect(hasPermission(UserRole.OWNER, 'VIEW_ALL_PROJECTS')).toBe(true);
      expect(hasPermission(UserRole.OWNER, 'SYSTEM_CONFIG')).toBe(true);
      expect(hasPermission(UserRole.OWNER, 'VIEW_CASH_FLOW')).toBe(true);
    });

    it('should grant limited permissions to MANAGER role', () => {
      expect(hasPermission(UserRole.MANAGER, 'VIEW_ALL_PROJECTS')).toBe(true);
      expect(hasPermission(UserRole.MANAGER, 'VIEW_CASH_FLOW')).toBe(true);
      expect(hasPermission(UserRole.MANAGER, 'SYSTEM_CONFIG')).toBe(false);
    });

    it('should grant project permissions to PROJECT_MANAGER role', () => {
      expect(hasPermission(UserRole.PROJECT_MANAGER, 'CREATE_PROJECTS')).toBe(true);
      expect(hasPermission(UserRole.PROJECT_MANAGER, 'ASSIGN_CREWS')).toBe(true);
      expect(hasPermission(UserRole.PROJECT_MANAGER, 'VIEW_CASH_FLOW')).toBe(false);
      expect(hasPermission(UserRole.PROJECT_MANAGER, 'MANAGE_EMPLOYEES')).toBe(false);
    });

    it('should grant minimal permissions to FOREMAN role', () => {
      expect(hasPermission(UserRole.FOREMAN, 'UPDATE_PHASE_PROGRESS')).toBe(true);
      expect(hasPermission(UserRole.FOREMAN, 'CREATE_PROJECTS')).toBe(false);
      expect(hasPermission(UserRole.FOREMAN, 'VIEW_CASH_FLOW')).toBe(false);
    });

    it('should grant view-only permissions to READ_ONLY role', () => {
      expect(hasPermission(UserRole.READ_ONLY, 'VIEW_ALL_PROJECTS')).toBe(true);
      expect(hasPermission(UserRole.READ_ONLY, 'CREATE_PROJECTS')).toBe(false);
      expect(hasPermission(UserRole.READ_ONLY, 'UPDATE_PHASE_PROGRESS')).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when role has all required permissions', () => {
      const permissions: Permission[] = ['VIEW_ALL_PROJECTS', 'CREATE_PROJECTS'];
      expect(hasAllPermissions(UserRole.OWNER, permissions)).toBe(true);
      expect(hasAllPermissions(UserRole.MANAGER, permissions)).toBe(true);
    });

    it('should return false when role lacks any required permission', () => {
      const permissions: Permission[] = ['VIEW_ALL_PROJECTS', 'SYSTEM_CONFIG'];
      expect(hasAllPermissions(UserRole.MANAGER, permissions)).toBe(false);
      expect(hasAllPermissions(UserRole.PROJECT_MANAGER, permissions)).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when role has at least one required permission', () => {
      const permissions: Permission[] = ['SYSTEM_CONFIG', 'VIEW_ALL_PROJECTS'];
      expect(hasAnyPermission(UserRole.MANAGER, permissions)).toBe(true);
      expect(hasAnyPermission(UserRole.READ_ONLY, permissions)).toBe(true);
    });

    it('should return false when role has none of the required permissions', () => {
      const permissions: Permission[] = ['SYSTEM_CONFIG', 'MANAGE_EMPLOYEES'];
      expect(hasAnyPermission(UserRole.FOREMAN, permissions)).toBe(false);
      expect(hasAnyPermission(UserRole.READ_ONLY, permissions)).toBe(false);
    });
  });

  describe('getRolePermissions', () => {
    it('should return correct permissions for each role', () => {
      const ownerPerms = getRolePermissions(UserRole.OWNER);
      expect(ownerPerms).toContain('SYSTEM_CONFIG');
      expect(ownerPerms).toContain('VIEW_CASH_FLOW');
      expect(ownerPerms.length).toBeGreaterThan(10);

      const managerPerms = getRolePermissions(UserRole.MANAGER);
      expect(managerPerms).toContain('VIEW_CASH_FLOW');
      expect(managerPerms).not.toContain('SYSTEM_CONFIG');

      const foremanPerms = getRolePermissions(UserRole.FOREMAN);
      expect(foremanPerms).toContain('UPDATE_PHASE_PROGRESS');
      expect(foremanPerms.length).toBeLessThan(5);
    });
  });

  describe('isRoleHigherOrEqual', () => {
    it('should correctly compare role hierarchy', () => {
      expect(isRoleHigherOrEqual(UserRole.OWNER, UserRole.MANAGER)).toBe(true);
      expect(isRoleHigherOrEqual(UserRole.OWNER, UserRole.OWNER)).toBe(true);
      expect(isRoleHigherOrEqual(UserRole.MANAGER, UserRole.OWNER)).toBe(false);
      expect(isRoleHigherOrEqual(UserRole.PROJECT_MANAGER, UserRole.FOREMAN)).toBe(true);
      expect(isRoleHigherOrEqual(UserRole.FOREMAN, UserRole.PROJECT_MANAGER)).toBe(false);
      expect(isRoleHigherOrEqual(UserRole.READ_ONLY, UserRole.OWNER)).toBe(false);
    });
  });

  describe('getHighestRole', () => {
    it('should return the highest role from a list', () => {
      expect(getHighestRole([UserRole.FOREMAN, UserRole.MANAGER, UserRole.READ_ONLY]))
        .toBe(UserRole.MANAGER);

      expect(getHighestRole([UserRole.READ_ONLY, UserRole.PROJECT_MANAGER]))
        .toBe(UserRole.PROJECT_MANAGER);

      expect(getHighestRole([UserRole.OWNER]))
        .toBe(UserRole.OWNER);
    });
  });
});