import { UserService } from '@/services/users/UserService';
import { UserValidator } from '@/services/users/UserValidator';
import { UserRole, Division } from '@prisma/client';
import prisma from '@/lib/prisma/client';

// Mock Prisma
jest.mock('@/lib/prisma/client', () => ({
  __esModule: true,
  default: {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback({
      user: {
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    })),
  },
}));

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should return all users when no filters provided', async () => {
      const mockUsers = [
        { id: '1', email: 'test@example.com', role: UserRole.MANAGER },
        { id: '2', email: 'test2@example.com', role: UserRole.FOREMAN },
      ];

      (prisma.user.findMany as jest.Mock).mockResolvedValue(mockUsers);

      const result = await UserService.getUsers();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ role: 'asc' }, { lastName: 'asc' }],
        select: expect.any(Object),
      });
      expect(result).toEqual(mockUsers);
    });

    it('should filter users by role', async () => {
      await UserService.getUsers({ role: UserRole.MANAGER });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: UserRole.MANAGER },
        orderBy: expect.any(Array),
        select: expect.any(Object),
      });
    });

    it('should filter users by division access', async () => {
      await UserService.getUsers({ division: Division.PLUMBING_MULTIFAMILY });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { divisionAccess: { has: Division.PLUMBING_MULTIFAMILY } },
        orderBy: expect.any(Array),
        select: expect.any(Object),
      });
    });

    it('should search users by name or email', async () => {
      await UserService.getUsers({ search: 'john' });

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: { contains: 'john', mode: 'insensitive' } },
            { firstName: { contains: 'john', mode: 'insensitive' } },
            { lastName: { contains: 'john', mode: 'insensitive' } },
          ],
        },
        orderBy: expect.any(Array),
        select: expect.any(Object),
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user with audit log', async () => {
      const createData = {
        email: 'new@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PROJECT_MANAGER,
        divisionAccess: [Division.PLUMBING_MULTIFAMILY],
        auth0Id: 'auth0|123',
      };

      const mockUser = { id: 'new-id', ...createData };
      const mockTx = {
        user: {
          create: jest.fn().mockResolvedValue(mockUser),
        },
        auditLog: {
          create: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
        callback(mockTx)
      );

      const result = await UserService.createUser(createData, 'creator-id');

      expect(mockTx.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'new@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: UserRole.PROJECT_MANAGER,
        }),
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'User',
          action: 'CREATE',
          userId: 'creator-id',
        }),
      });

      expect(result).toEqual(mockUser);
    });

    it('should throw error for invalid input', async () => {
      const invalidData = {
        email: 'invalid-email',
        firstName: '',
        lastName: 'Doe',
        role: UserRole.PROJECT_MANAGER,
        divisionAccess: [],
        auth0Id: 'auth0|123',
      };

      await expect(
        UserService.createUser(invalidData, 'creator-id')
      ).rejects.toThrow('Validation failed');
    });
  });

  describe('updateUser', () => {
    it('should update user and create audit log', async () => {
      const currentUser = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: UserRole.PROJECT_MANAGER,
      };

      const updateData = {
        firstName: 'Jane',
        role: UserRole.MANAGER,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(currentUser);

      const mockTx = {
        user: {
          update: jest.fn().mockResolvedValue({ ...currentUser, ...updateData }),
        },
        auditLog: {
          create: jest.fn(),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation((callback) =>
        callback(mockTx)
      );

      const result = await UserService.updateUser('user-id', updateData, 'updater-id');

      expect(mockTx.user.update).toHaveBeenCalledWith({
        where: { id: 'user-id' },
        data: expect.objectContaining(updateData),
      });

      expect(mockTx.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entityType: 'User',
          action: 'UPDATE',
          userId: 'updater-id',
        }),
      });
    });

    it('should throw error if user not found', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        UserService.updateUser('non-existent', {}, 'updater-id')
      ).rejects.toThrow('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should soft delete user without dependencies', async () => {
      const user = {
        id: 'user-id',
        createdProjects: [],
        assignments: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      const updateSpy = jest.spyOn(UserService, 'updateUser').mockResolvedValue({} as any);

      await UserService.deleteUser('user-id', 'deleter-id');

      expect(updateSpy).toHaveBeenCalledWith(
        'user-id',
        { isActive: false },
        'deleter-id'
      );
    });

    it('should prevent deletion of user with projects', async () => {
      const user = {
        id: 'user-id',
        createdProjects: [{ id: 'project-1' }],
        assignments: [],
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);

      await expect(
        UserService.deleteUser('user-id', 'deleter-id')
      ).rejects.toThrow('Cannot delete user with associated projects');
    });
  });
});

describe('UserValidator', () => {
  describe('canAssignRole', () => {
    it('should allow owners to assign any role', () => {
      expect(UserValidator.canAssignRole(UserRole.OWNER, UserRole.OWNER)).toBe(true);
      expect(UserValidator.canAssignRole(UserRole.OWNER, UserRole.MANAGER)).toBe(true);
      expect(UserValidator.canAssignRole(UserRole.OWNER, UserRole.READ_ONLY)).toBe(true);
    });

    it('should prevent non-owners from assigning owner role', () => {
      expect(UserValidator.canAssignRole(UserRole.MANAGER, UserRole.OWNER)).toBe(false);
      expect(UserValidator.canAssignRole(UserRole.PROJECT_MANAGER, UserRole.OWNER)).toBe(false);
    });

    it('should allow managers to assign roles at or below their level', () => {
      expect(UserValidator.canAssignRole(UserRole.MANAGER, UserRole.MANAGER)).toBe(true);
      expect(UserValidator.canAssignRole(UserRole.MANAGER, UserRole.PROJECT_MANAGER)).toBe(true);
      expect(UserValidator.canAssignRole(UserRole.MANAGER, UserRole.FOREMAN)).toBe(true);
    });
  });
});