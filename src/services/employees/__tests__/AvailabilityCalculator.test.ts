/**
 * @jest-environment node
 */

import { AvailabilityCalculator } from '../AvailabilityCalculator';
import { Division, EmploymentType } from '@prisma/client';
import { addWeeks, startOfWeek } from 'date-fns';

// Mock Prisma client
const mockPrismaEmployee = {
  findMany: jest.fn(),
};

const mockPrismaCrewAssignment = {
  findMany: jest.fn(),
};

const mockPrisma = {
  employee: mockPrismaEmployee,
  crewAssignment: mockPrismaCrewAssignment,
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('AvailabilityCalculator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateWeeklyAvailability', () => {
    it('should calculate weekly availability for employees', () => {
      const employees = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          employmentType: EmploymentType.FULL_TIME,
          maxWeeklyHours: 40,
        },
        {
          id: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          employmentType: EmploymentType.PART_TIME,
          maxWeeklyHours: 20,
        },
      ];

      const assignments = [
        {
          employeeId: 'emp-1',
          projectId: 'proj-1',
          hoursPerWeek: 20,
          startDate: new Date(),
          endDate: addWeeks(new Date(), 2),
        },
      ];

      const result = AvailabilityCalculator.calculateWeeklyAvailability(
        employees as any,
        assignments as any
      );

      expect(result).toHaveLength(2);
      expect(result[0].employeeId).toBe('emp-1');
      expect(result[0].availableHours).toBe(20); // 40 - 20
      expect(result[1].employeeId).toBe('emp-2');
      expect(result[1].availableHours).toBe(20); // No assignments
    });

    it('should handle multiple assignments per employee', () => {
      const employees = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          employmentType: EmploymentType.FULL_TIME,
          maxWeeklyHours: 40,
        },
      ];

      const assignments = [
        {
          employeeId: 'emp-1',
          projectId: 'proj-1',
          hoursPerWeek: 15,
          startDate: new Date(),
          endDate: addWeeks(new Date(), 2),
        },
        {
          employeeId: 'emp-1',
          projectId: 'proj-2',
          hoursPerWeek: 10,
          startDate: new Date(),
          endDate: addWeeks(new Date(), 2),
        },
      ];

      const result = AvailabilityCalculator.calculateWeeklyAvailability(
        employees as any,
        assignments as any
      );

      expect(result[0].availableHours).toBe(15); // 40 - 15 - 10
      expect(result[0].currentProjects).toHaveLength(2);
    });
  });

  describe('getDivisionCapacity', () => {
    it('should calculate division capacity', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          primaryDivision: Division.PLUMBING,
          employmentType: EmploymentType.FULL_TIME,
          maxWeeklyHours: 40,
          isActive: true,
        },
        {
          id: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          primaryDivision: Division.PLUMBING,
          employmentType: EmploymentType.FULL_TIME,
          maxWeeklyHours: 40,
          isActive: true,
        },
      ];

      const mockAssignments = [
        {
          employeeId: 'emp-1',
          projectId: 'proj-1',
          hoursPerWeek: 30,
          startDate: new Date(),
          endDate: addWeeks(new Date(), 2),
        },
      ];

      mockPrismaEmployee.findMany.mockResolvedValue(mockEmployees);
      mockPrismaCrewAssignment.findMany.mockResolvedValue(mockAssignments);

      const result = await AvailabilityCalculator.getDivisionCapacity(
        Division.PLUMBING,
        4
      );

      expect(result.division).toBe(Division.PLUMBING);
      expect(result.totalEmployees).toBe(2);
      expect(result.totalCapacity).toBe(80); // 2 * 40
      expect(result.utilizedCapacity).toBe(30);
      expect(result.availableCapacity).toBe(50);
      expect(result.utilizationRate).toBe(0.375); // 30/80
      expect(result.forecast).toHaveLength(4);
    });

    it('should handle no employees in division', async () => {
      mockPrismaEmployee.findMany.mockResolvedValue([]);
      mockPrismaCrewAssignment.findMany.mockResolvedValue([]);

      const result = await AvailabilityCalculator.getDivisionCapacity(
        Division.HVAC,
        4
      );

      expect(result.totalEmployees).toBe(0);
      expect(result.totalCapacity).toBe(0);
      expect(result.availableCapacity).toBe(0);
      expect(result.utilizationRate).toBe(0);
    });
  });

  describe('generateCapacityForecast', () => {
    it('should generate weekly capacity forecast', () => {
      const employees = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          employmentType: EmploymentType.FULL_TIME,
          maxWeeklyHours: 40,
        },
      ];

      const assignments = [
        {
          employeeId: 'emp-1',
          projectId: 'proj-1',
          hoursPerWeek: 20,
          startDate: new Date(),
          endDate: addWeeks(new Date(), 2),
        },
      ];

      const result = AvailabilityCalculator.generateCapacityForecast(
        employees as any,
        assignments as any,
        4
      );

      expect(result).toHaveLength(4);
      expect(result[0].weekStart).toEqual(startOfWeek(new Date()));
      expect(result[0].totalCapacity).toBe(40);
      expect(result[0].utilizedCapacity).toBe(20);
      expect(result[0].availableCapacity).toBe(20);

      // Week 3 should have no assignments (past end date)
      expect(result[2].utilizedCapacity).toBe(0);
      expect(result[2].availableCapacity).toBe(40);
    });
  });
});