/**
 * @jest-environment node
 */

// Mock Prisma before imports
jest.mock('@/lib/prisma/client', () => {
  const mockPrisma = {
    crewAssignment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
    projectPhase: {
      findUnique: jest.fn(),
    },
  };

  return {
    __esModule: true,
    default: mockPrisma,
    prisma: mockPrisma,
  };
});

import { ConflictDetector } from '../ConflictDetector';
import { EmployeeType, Division } from '@prisma/client';
import prisma from '@/lib/prisma/client';

const mockPrisma = prisma as any;

describe('ConflictDetector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectConflicts', () => {
    const baseParams = {
      phaseId: 'phase-123',
      employeeId: 'emp-123',
      assignmentDate: new Date('2024-03-15'),
      hoursAllocated: 40,
      role: EmployeeType.JOURNEYMAN,
    };

    it('should detect double booking conflicts', async () => {
      // Mock existing assignment on same date
      (mockPrisma.crewAssignment.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-assignment',
        phaseId: 'phase-456',
        employeeId: 'emp-123',
        assignmentDate: new Date('2024-03-15'),
        hoursAllocated: 40,
      });

      const conflicts = await ConflictDetector.detectConflicts(baseParams);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('DOUBLE_BOOKING');
      expect(conflicts[0].severity).toBe('HIGH');
    });

    it('should detect weekly hours exceeded', async () => {
      // Mock no double booking
      (mockPrisma.crewAssignment.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock employee with 40 hour limit
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-123',
        maxHoursPerWeek: 40,
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Mock existing assignments in the same week totaling 30 hours
      (mockPrisma.crewAssignment.findMany as jest.Mock).mockResolvedValue([
        { hoursAllocated: 15, assignmentDate: new Date('2024-03-11') },
        { hoursAllocated: 15, assignmentDate: new Date('2024-03-13') },
      ]);

      const conflictParams = {
        ...baseParams,
        hoursAllocated: 20, // Would exceed 40 hours
      };

      const conflicts = await ConflictDetector.detectConflicts(conflictParams);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('WEEKLY_HOURS_EXCEEDED');
      expect(conflicts[0].severity).toBe('MEDIUM');
      expect(conflicts[0].details).toContain('50 hours (max: 40)');
    });

    it('should detect division mismatch', async () => {
      // Mock no other conflicts
      (mockPrisma.crewAssignment.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.crewAssignment.findMany as jest.Mock).mockResolvedValue([]);

      // Mock employee with different division
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-123',
        division: Division.PLUMBING_COMMERCIAL,
        maxHoursPerWeek: 40,
      });

      // Mock phase with different division
      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue({
        id: 'phase-123',
        division: Division.HVAC_COMMERCIAL,
      });

      const conflicts = await ConflictDetector.detectConflicts(baseParams);

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].type).toBe('DIVISION_MISMATCH');
      expect(conflicts[0].severity).toBe('HIGH');
    });

    it('should return no conflicts when all validations pass', async () => {
      // Mock no double booking
      (mockPrisma.crewAssignment.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock matching employee and phase divisions
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-123',
        division: Division.PLUMBING_COMMERCIAL,
        maxHoursPerWeek: 40,
      });

      (mockPrisma.projectPhase.findUnique as jest.Mock).mockResolvedValue({
        id: 'phase-123',
        division: Division.PLUMBING_COMMERCIAL,
      });

      // Mock no existing assignments
      (mockPrisma.crewAssignment.findMany as jest.Mock).mockResolvedValue([]);

      const conflicts = await ConflictDetector.detectConflicts(baseParams);

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('checkDoubleBooking', () => {
    it('should detect when employee is already assigned on the same date', async () => {
      const params = {
        employeeId: 'emp-123',
        assignmentDate: new Date('2024-03-15'),
        excludeAssignmentId: undefined,
      };

      (mockPrisma.crewAssignment.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-assignment',
        phaseId: 'phase-456',
      });

      const conflict = await ConflictDetector.checkDoubleBooking(params);

      expect(conflict).toBeDefined();
      expect(conflict?.type).toBe('DOUBLE_BOOKING');
      expect(mockPrisma.crewAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          employeeId: 'emp-123',
          assignmentDate: new Date('2024-03-15'),
          id: { not: undefined },
        },
      });
    });

    it('should not detect conflict when checking same assignment (update case)', async () => {
      const params = {
        employeeId: 'emp-123',
        assignmentDate: new Date('2024-03-15'),
        excludeAssignmentId: 'current-assignment',
      };

      (mockPrisma.crewAssignment.findFirst as jest.Mock).mockResolvedValue(null);

      const conflict = await ConflictDetector.checkDoubleBooking(params);

      expect(conflict).toBeNull();
      expect(mockPrisma.crewAssignment.findFirst).toHaveBeenCalledWith({
        where: {
          employeeId: 'emp-123',
          assignmentDate: new Date('2024-03-15'),
          id: { not: 'current-assignment' },
        },
      });
    });
  });

  describe('checkWeeklyHours', () => {
    it('should calculate total weekly hours correctly', async () => {
      const params = {
        employeeId: 'emp-123',
        assignmentDate: new Date('2024-03-15'), // Friday
        hoursAllocated: 8,
        excludeAssignmentId: undefined,
      };

      // Mock employee
      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-123',
        maxHoursPerWeek: 40,
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
      });

      // Mock existing assignments in the week
      (mockPrisma.crewAssignment.findMany as jest.Mock).mockResolvedValue([
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-11') }, // Monday
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-12') }, // Tuesday
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-13') }, // Wednesday
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-14') }, // Thursday
      ]);

      const conflict = await ConflictDetector.checkWeeklyHours(params);

      // 32 existing + 8 new = 40 total (at limit, no conflict)
      expect(conflict).toBeNull();
    });

    it('should detect when weekly hours exceed limit', async () => {
      const params = {
        employeeId: 'emp-123',
        assignmentDate: new Date('2024-03-15'),
        hoursAllocated: 16, // This will exceed
        excludeAssignmentId: undefined,
      };

      (mockPrisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-123',
        maxHoursPerWeek: 40,
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
      });

      (mockPrisma.crewAssignment.findMany as jest.Mock).mockResolvedValue([
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-11') },
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-12') },
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-13') },
        { hoursAllocated: 8, assignmentDate: new Date('2024-03-14') },
      ]);

      const conflict = await ConflictDetector.checkWeeklyHours(params);

      expect(conflict).toBeDefined();
      expect(conflict?.type).toBe('WEEKLY_HOURS_EXCEEDED');
      expect(conflict?.details).toContain('48 hours'); // 32 + 16
    });
  });
});