/**
 * @jest-environment node
 */

// Mock Prisma - must be defined before imports
jest.mock('@/lib/prisma/client', () => {
  const mockPrisma = {
    projectPhase: {
      create: jest.fn(),
      createMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    alert: {
      create: jest.fn(),
    },
    $transaction: jest.fn((callback: any) => callback(mockPrisma)),
  };

  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

import { PhaseService } from '../PhaseService';
import { PhaseStatus, Division, UserRole, ProjectStatus } from '@prisma/client';
import prisma from '@/lib/prisma/client';

// Get the mocked prisma for use in tests
const mockPrisma = prisma as any;

describe('PhaseService', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    role: UserRole.PROJECT_MANAGER,
  };

  const mockProject = {
    id: 'project-123',
    projectCode: 'PRJ-001',
    name: 'Test Project',
    division: Division.PLUMBING_COMMERCIAL,
    status: ProjectStatus.IN_PROGRESS,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-06-30'),
  };

  const mockPhaseData = {
    projectId: 'project-123',
    phaseNumber: 1,
    name: 'Rough-in Plumbing',
    division: Division.PLUMBING_COMMERCIAL,
    startDate: new Date('2024-01-15'),
    endDate: new Date('2024-02-15'),
    duration: 31,
    requiredCrewSize: 5,
    requiredForeman: true,
    requiredJourneymen: 3,
    requiredApprentices: 1,
    laborHours: 200,
    dependencies: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPhase', () => {
    it('should create a phase successfully', async () => {
      const mockCreatedPhase = {
        id: 'phase-123',
        ...mockPhaseData,
        status: PhaseStatus.NOT_STARTED,
        progressPercentage: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastUpdated: new Date(),
        updatedBy: mockUser.id,
      };

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (mockPrisma.projectPhase.create as jest.Mock).mockResolvedValue(mockCreatedPhase);

      const result = await PhaseService.createPhase(mockPhaseData, mockUser.id);

      expect(result).toEqual(mockCreatedPhase);
      expect(mockPrisma.projectPhase.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: mockPhaseData.projectId,
          phaseNumber: mockPhaseData.phaseNumber,
          name: mockPhaseData.name,
          division: mockPhaseData.division,
          status: PhaseStatus.NOT_STARTED,
          progressPercentage: 0,
          updatedBy: mockUser.id,
        }),
        include: expect.any(Object),
      });
    });

    it('should validate phase dates against project dates', async () => {
      const invalidPhaseData = {
        ...mockPhaseData,
        startDate: new Date('2023-12-01'), // Before project start
      };

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);

      await expect(PhaseService.createPhase(invalidPhaseData, mockUser.id))
        .rejects
        .toThrow('Phase dates must be within project dates');
    });

    it('should check for circular dependencies', async () => {
      const phaseWithDependencies = {
        ...mockPhaseData,
        dependencies: ['phase-456', 'phase-789'],
      };

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (mockPrisma.projectPhase.findMany as jest.Mock).mockResolvedValue([
        { id: 'phase-456', dependencies: ['phase-123'] }, // Circular dependency
      ]);

      await expect(PhaseService.createPhase(phaseWithDependencies, mockUser.id))
        .rejects
        .toThrow('Circular dependency detected');
    });
  });

  describe('updatePhase', () => {
    it('should update phase successfully', async () => {
      const phaseId = 'phase-123';
      const updates = {
        name: 'Updated Phase Name',
        progressPercentage: 50,
      };

      const existingPhase = {
        id: phaseId,
        ...mockPhaseData,
        status: PhaseStatus.IN_PROGRESS,
      };

      const updatedPhase = {
        ...existingPhase,
        ...updates,
        updatedBy: mockUser.id,
        lastUpdated: new Date(),
      };

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(existingPhase);
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (mockPrisma.projectPhase.update as jest.Mock).mockResolvedValue(updatedPhase);

      const result = await PhaseService.updatePhase(phaseId, updates, mockUser.id);

      expect(result).toEqual(updatedPhase);
      expect(mockPrisma.projectPhase.update).toHaveBeenCalledWith({
        where: { id: phaseId },
        data: expect.objectContaining({
          ...updates,
          updatedBy: mockUser.id,
        }),
        include: expect.any(Object),
      });
    });

    it('should update status to COMPLETED when progress reaches 100%', async () => {
      const phaseId = 'phase-123';
      const updates = {
        progressPercentage: 100,
      };

      const existingPhase = {
        id: phaseId,
        ...mockPhaseData,
        status: PhaseStatus.IN_PROGRESS,
        progressPercentage: 75,
      };

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(existingPhase);
      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (mockPrisma.projectPhase.update as jest.Mock).mockResolvedValue({
        ...existingPhase,
        ...updates,
        status: PhaseStatus.COMPLETED,
        actualEndDate: expect.any(Date),
      });

      await PhaseService.updatePhase(phaseId, updates, mockUser.id);

      expect(mockPrisma.projectPhase.update).toHaveBeenCalledWith({
        where: { id: phaseId },
        data: expect.objectContaining({
          progressPercentage: 100,
          status: PhaseStatus.COMPLETED,
          actualEndDate: expect.any(Date),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw error if phase not found', async () => {
      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(PhaseService.updatePhase('invalid-id', {}, mockUser.id))
        .rejects
        .toThrow('Phase not found');
    });
  });

  describe('createBulkPhases', () => {
    it('should create multiple phases successfully', async () => {
      const phases = [
        { ...mockPhaseData, phaseNumber: 1, name: 'Phase 1' },
        { ...mockPhaseData, phaseNumber: 2, name: 'Phase 2' },
        { ...mockPhaseData, phaseNumber: 3, name: 'Phase 3' },
      ];

      (mockPrisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
      (mockPrisma.projectPhase.createMany as jest.Mock).mockResolvedValue({ count: 3 });
      (mockPrisma.projectPhase.findMany as jest.Mock).mockResolvedValue(
        phases.map((p, i) => ({ ...p, id: `phase-${i + 1}` }))
      );

      const result = await PhaseService.createBulkPhases(
        mockProject.id,
        phases,
        mockUser.id
      );

      expect(result).toHaveLength(3);
      expect(mockPrisma.projectPhase.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ name: 'Phase 1', phaseNumber: 1 }),
          expect.objectContaining({ name: 'Phase 2', phaseNumber: 2 }),
          expect.objectContaining({ name: 'Phase 3', phaseNumber: 3 }),
        ])
      });
    });
  });

  describe('getPhases', () => {
    it('should return filtered phases', async () => {
      const filters = {
        projectId: 'project-123',
        status: PhaseStatus.IN_PROGRESS,
      };

      const mockPhases = [
        { id: 'phase-1', ...mockPhaseData, status: PhaseStatus.IN_PROGRESS },
        { id: 'phase-2', ...mockPhaseData, status: PhaseStatus.IN_PROGRESS },
      ];

      (mockPrisma.projectPhase.findMany as jest.Mock).mockResolvedValue(mockPhases);

      const result = await PhaseService.getPhases(filters);

      expect(result).toEqual(mockPhases);
      expect(mockPrisma.projectPhase.findMany).toHaveBeenCalledWith({
        where: {
          projectId: filters.projectId,
          status: filters.status,
        },
        include: expect.any(Object),
        orderBy: [
          { projectId: 'asc' },
          { phaseNumber: 'asc' }
        ],
      });
    });
  });

  describe('updateProgress', () => {
    it('should update progress and calculate completion', async () => {
      const phaseId = 'phase-123';
      const existingPhase = {
        id: phaseId,
        ...mockPhaseData,
        status: PhaseStatus.IN_PROGRESS,
        progressPercentage: 25,
        actualStartDate: new Date('2024-01-15'),
      };

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(existingPhase);
      (mockPrisma.projectPhase.update as jest.Mock).mockResolvedValue({
        ...existingPhase,
        progressPercentage: 75,
      });

      const result = await PhaseService.updateProgress(phaseId, 75, mockUser.id);

      expect(result.progressPercentage).toBe(75);
      expect(mockPrisma.projectPhase.update).toHaveBeenCalledWith({
        where: { id: phaseId },
        data: expect.objectContaining({
          progressPercentage: 75,
          status: PhaseStatus.IN_PROGRESS,
        }),
        include: expect.any(Object),
      });
    });

    it('should mark phase as completed when progress reaches 100%', async () => {
      const phaseId = 'phase-123';
      const existingPhase = {
        id: phaseId,
        ...mockPhaseData,
        status: PhaseStatus.IN_PROGRESS,
        progressPercentage: 90,
        actualStartDate: new Date('2024-01-15'),
      };

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(existingPhase);
      (mockPrisma.projectPhase.update as jest.Mock).mockResolvedValue({
        ...existingPhase,
        progressPercentage: 100,
        status: PhaseStatus.COMPLETED,
        actualEndDate: new Date(),
      });

      const result = await PhaseService.updateProgress(phaseId, 100, mockUser.id);

      expect(result.status).toBe(PhaseStatus.COMPLETED);
      expect(result.actualEndDate).toBeDefined();
    });

    it('should detect if phase is delayed', async () => {
      const phaseId = 'phase-123';
      const existingPhase = {
        id: phaseId,
        ...mockPhaseData,
        status: PhaseStatus.IN_PROGRESS,
        progressPercentage: 20,
        actualStartDate: new Date('2024-01-15'),
        endDate: new Date('2024-01-20'), // Past due
      };

      const now = new Date('2024-02-01');
      jest.useFakeTimers().setSystemTime(now);

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(existingPhase);
      (mockPrisma.projectPhase.update as jest.Mock).mockResolvedValue({
        ...existingPhase,
        progressPercentage: 25,
        status: PhaseStatus.DELAYED,
      });

      const result = await PhaseService.updateProgress(phaseId, 25, mockUser.id);

      expect(result.status).toBe(PhaseStatus.DELAYED);

      jest.useRealTimers();
    });
  });

  describe('deletePhase', () => {
    it('should delete phase successfully', async () => {
      const phaseId = 'phase-123';
      const mockPhase = {
        id: phaseId,
        ...mockPhaseData,
        status: PhaseStatus.NOT_STARTED,
      };

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(mockPhase);
      (mockPrisma.projectPhase.delete as jest.Mock).mockResolvedValue(mockPhase);

      const result = await PhaseService.deletePhase(phaseId, mockUser.id);

      expect(result).toBe(true);
      expect(mockPrisma.projectPhase.delete).toHaveBeenCalledWith({
        where: { id: phaseId },
      });
    });

    it('should throw error if phase is in progress', async () => {
      const mockPhase = {
        id: 'phase-123',
        status: PhaseStatus.IN_PROGRESS,
        progressPercentage: 50,
      };

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue(mockPhase);

      await expect(PhaseService.deletePhase('phase-123', mockUser.id))
        .rejects
        .toThrow('Cannot delete a phase that is in progress or completed');
    });
  });
});