/**
 * @jest-environment node
 */

import { ProjectService } from '../ProjectService';
import { ProjectStatus, ProjectType, Division, UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    project: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    alert: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  },
}));

describe('ProjectService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.PROJECT_MANAGER,
    firstName: 'Test',
    lastName: 'User',
  };

  const mockProjectData = {
    name: 'Test Project',
    type: ProjectType.COMMERCIAL,
    division: Division.PLUMBING_COMMERCIAL,
    status: ProjectStatus.QUOTED,
    contractAmount: 150000,
    startDate: '2024-01-01T00:00:00Z',
    endDate: '2024-06-30T00:00:00Z',
    clientName: 'Test Client',
    clientContact: '555-1234',
    crewSize: 5,
    address: '123 Test St',
    notes: 'Test notes',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProject', () => {
    it('should create a project with auto-generated code', async () => {
      const mockCreatedProject = {
        id: 'project-123',
        projectCode: 'PRJ-001',
        ...mockProjectData,
        createdById: mockUser.id,
        modifiedById: mockUser.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue(mockCreatedProject);

      const result = await ProjectService.createProject(mockProjectData, mockUser.id);

      expect(result).toEqual(mockCreatedProject);
      expect(prisma.project.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectCode: 'PRJ-001',
          name: mockProjectData.name,
          type: mockProjectData.type,
          division: mockProjectData.division,
          createdById: mockUser.id,
          modifiedById: mockUser.id,
        }),
        include: expect.any(Object),
      });
    });

    it('should increment project code for subsequent projects', async () => {
      const existingProject = {
        projectCode: 'PRJ-005',
      };

      (prisma.project.findFirst as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.create as jest.Mock).mockResolvedValue({
        id: 'project-124',
        projectCode: 'PRJ-006',
        ...mockProjectData,
      });

      const result = await ProjectService.createProject(mockProjectData, mockUser.id);

      expect(result.projectCode).toBe('PRJ-006');
    });

    it('should throw error for invalid input', async () => {
      const invalidData = {
        ...mockProjectData,
        name: 'ab', // Too short
      };

      await expect(ProjectService.createProject(invalidData, mockUser.id))
        .rejects
        .toThrow('Validation failed');
    });
  });

  describe('updateProject', () => {
    it('should update project successfully', async () => {
      const projectId = 'project-123';
      const updates = {
        name: 'Updated Project Name',
        contractAmount: 200000,
      };

      const existingProject = {
        id: projectId,
        ...mockProjectData,
        status: ProjectStatus.AWARDED,
      };

      const updatedProject = {
        ...existingProject,
        ...updates,
        modifiedById: mockUser.id,
        updatedAt: new Date(),
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(existingProject);
      (prisma.project.update as jest.Mock).mockResolvedValue(updatedProject);

      const result = await ProjectService.updateProject(projectId, updates, mockUser.id);

      expect(result).toEqual(updatedProject);
      expect(prisma.project.update).toHaveBeenCalledWith({
        where: { id: projectId },
        data: expect.objectContaining({
          ...updates,
          modifiedById: mockUser.id,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if project not found', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(ProjectService.updateProject('invalid-id', {}, mockUser.id))
        .rejects
        .toThrow('Project not found');
    });
  });

  describe('getProjectById', () => {
    it('should return project with all relations', async () => {
      const mockProject = {
        id: 'project-123',
        ...mockProjectData,
        foreman: { firstName: 'John', lastName: 'Doe' },
        phases: [],
        _count: { phases: 0 },
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      const result = await ProjectService.getProjectById('project-123');

      expect(result).toEqual(mockProject);
      expect(prisma.project.findUnique).toHaveBeenCalledWith({
        where: { id: 'project-123' },
        include: expect.objectContaining({
          foreman: true,
          createdBy: true,
          modifiedBy: true,
          phases: expect.any(Object),
          scheduleOfValues: expect.any(Object),
        }),
      });
    });

    it('should return null for non-existent project', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await ProjectService.getProjectById('invalid-id');

      expect(result).toBeNull();
    });
  });

  describe('getProjects', () => {
    it('should return filtered projects', async () => {
      const filters = {
        status: ProjectStatus.IN_PROGRESS,
        division: Division.PLUMBING_COMMERCIAL,
      };

      const mockProjects = [
        { id: 'project-1', ...mockProjectData },
        { id: 'project-2', ...mockProjectData },
      ];

      (prisma.project.findMany as jest.Mock).mockResolvedValue(mockProjects);
      (prisma.project.count as jest.Mock).mockResolvedValue(2);

      const result = await ProjectService.getProjects(filters);

      expect(result.projects).toEqual(mockProjects);
      expect(result.total).toBe(2);
      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          status: filters.status,
          division: filters.division,
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });

    it('should handle search term', async () => {
      const filters = {
        search: 'test',
      };

      (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.project.count as jest.Mock).mockResolvedValue(0);

      await ProjectService.getProjects(filters);

      expect(prisma.project.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: 'test', mode: 'insensitive' } },
            { projectCode: { contains: 'test', mode: 'insensitive' } },
            { clientName: { contains: 'test', mode: 'insensitive' } },
          ],
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 50,
      });
    });
  });

  describe('deleteProject', () => {
    it('should delete project successfully', async () => {
      const projectId = 'project-123';
      const mockProject = {
        id: projectId,
        ...mockProjectData,
        status: ProjectStatus.QUOTED,
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (prisma.project.delete as jest.Mock).mockResolvedValue(mockProject);

      const result = await ProjectService.deleteProject(projectId, mockUser.id);

      expect(result).toBe(true);
      expect(prisma.project.delete).toHaveBeenCalledWith({
        where: { id: projectId },
      });
    });

    it('should throw error if project is in progress', async () => {
      const mockProject = {
        id: 'project-123',
        status: ProjectStatus.IN_PROGRESS,
      };

      (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      await expect(ProjectService.deleteProject('project-123', mockUser.id))
        .rejects
        .toThrow('Cannot delete a project that is in progress or completed');
    });
  });

  describe('getProjectStatistics', () => {
    it('should return project statistics', async () => {
      const mockStats = [
        { status: ProjectStatus.IN_PROGRESS, _count: 5 },
        { status: ProjectStatus.COMPLETED, _count: 10 },
        { status: ProjectStatus.QUOTED, _count: 3 },
      ];

      (prisma.project.count as jest.Mock)
        .mockResolvedValueOnce(18) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(10); // completed

      (prisma.project.findMany as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockStats);
      });

      const result = await ProjectService.getProjectStatistics();

      expect(result).toEqual({
        total: 18,
        active: 5,
        completed: 10,
        byStatus: mockStats,
        byDivision: mockStats,
      });
    });
  });
});