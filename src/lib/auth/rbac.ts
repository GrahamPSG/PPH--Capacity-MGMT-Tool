import { UserRole } from '@prisma/client';

export type Permission =
  | 'VIEW_ALL_PROJECTS'
  | 'CREATE_PROJECTS'
  | 'EDIT_PROJECTS'
  | 'DELETE_PROJECTS'
  | 'VIEW_CASH_FLOW'
  | 'MANAGE_EMPLOYEES'
  | 'ASSIGN_CREWS'
  | 'UPDATE_PHASE_PROGRESS'
  | 'VIEW_ALL_REPORTS'
  | 'EXPORT_DATA'
  | 'SYSTEM_CONFIG'
  | 'MONDAY_SYNC';

/**
 * Permission matrix based on spec.md
 */
export const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    'VIEW_ALL_PROJECTS',
    'CREATE_PROJECTS',
    'EDIT_PROJECTS',
    'DELETE_PROJECTS',
    'VIEW_CASH_FLOW',
    'MANAGE_EMPLOYEES',
    'ASSIGN_CREWS',
    'UPDATE_PHASE_PROGRESS',
    'VIEW_ALL_REPORTS',
    'EXPORT_DATA',
    'SYSTEM_CONFIG',
    'MONDAY_SYNC',
  ],
  [UserRole.MANAGER]: [
    'VIEW_ALL_PROJECTS',
    'CREATE_PROJECTS',
    'EDIT_PROJECTS',
    'VIEW_CASH_FLOW',
    'MANAGE_EMPLOYEES',
    'ASSIGN_CREWS',
    'UPDATE_PHASE_PROGRESS',
    'VIEW_ALL_REPORTS',
    'EXPORT_DATA',
    'MONDAY_SYNC',
  ],
  [UserRole.PROJECT_MANAGER]: [
    'VIEW_ALL_PROJECTS',
    'CREATE_PROJECTS',
    'EDIT_PROJECTS',
    'ASSIGN_CREWS',
    'UPDATE_PHASE_PROGRESS',
    'VIEW_ALL_REPORTS',
    'EXPORT_DATA',
  ],
  [UserRole.FOREMAN]: [
    'UPDATE_PHASE_PROGRESS',
    // Note: Foremen can only view/edit their own projects
    // This is handled at the data access layer
  ],
  [UserRole.READ_ONLY]: [
    'VIEW_ALL_PROJECTS',
    // Limited report viewing handled at data layer
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  const permissions = rolePermissions[role] || [];
  return permissions.includes(permission);
}

/**
 * Check if a role has all required permissions
 */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Check if a role has any of the required permissions
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: UserRole): Permission[] {
  return rolePermissions[role] || [];
}

/**
 * Role hierarchy for comparison
 */
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.OWNER]: 5,
  [UserRole.MANAGER]: 4,
  [UserRole.PROJECT_MANAGER]: 3,
  [UserRole.FOREMAN]: 2,
  [UserRole.READ_ONLY]: 1,
};

/**
 * Check if a role is higher or equal in hierarchy
 */
export function isRoleHigherOrEqual(role1: UserRole, role2: UserRole): boolean {
  return roleHierarchy[role1] >= roleHierarchy[role2];
}

/**
 * Get the highest role from a list
 */
export function getHighestRole(roles: UserRole[]): UserRole {
  return roles.reduce((highest, current) =>
    roleHierarchy[current] > roleHierarchy[highest] ? current : highest
  );
}