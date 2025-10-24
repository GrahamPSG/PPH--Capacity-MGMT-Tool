/**
 * @jest-environment node
 */

import { EmployeeService } from '../EmployeeService';
import { Division, EmploymentType } from '@prisma/client';

// Mock Prisma client
const mockPrismaEmployee = {
  create: jest.fn(),
  findMany: jest.fn(),
  findUnique: jest.fn(),
  update: jest.fn(),
};

const mockPrismaAuditLog = {
  create: jest.fn(),
};

const mockPrisma = {
  employee: mockPrismaEmployee,
  auditLog: mockPrismaAuditLog,
  $transaction: jest.fn((fn: any) => fn(mockPrisma)),
};

jest.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('EmployeeService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createEmployee', () => {
    it('should create an employee with valid data', async () => {
      const mockEmployee = {
        id: 'emp-1',
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '555-1234',
        primaryDivision: Division.PLUMBING,
        employmentType: EmploymentType.FULL_TIME,
        hourlyRate: 50,
        overtimeRate: 75,
        targetUtilization: 0.85,
        maxWeeklyHours: 40,
        skills: ['Pipe Fitting', 'Soldering'],
        certifications: ['Licensed Plumber'],
        startDate: new Date('2024-01-01'),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaEmployee.create.mockResolvedValue(mockEmployee);

      const result = await EmployeeService.createEmployee(
        {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@example.com',
          phone: '555-1234',
          primaryDivision: Division.PLUMBING,
          employmentType: EmploymentType.FULL_TIME,
          hourlyRate: 50,
          overtimeRate: 75,
          targetUtilization: 0.85,
          maxWeeklyHours: 40,
          skills: ['Pipe Fitting', 'Soldering'],
          certifications: ['Licensed Plumber'],
          startDate: new Date('2024-01-01'),
        },
        'user-1'
      );

      expect(result).toEqual(mockEmployee);
      expect(mockPrismaEmployee.create).toHaveBeenCalledTimes(1);
      expect(mockPrismaAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it('should throw an error for invalid data', async () => {
      await expect(
        EmployeeService.createEmployee(
          {
            firstName: '',
            lastName: 'Doe',
            email: 'invalid-email',
            primaryDivision: Division.PLUMBING,
            employmentType: EmploymentType.FULL_TIME,
            hourlyRate: -50,
          } as any,
          'user-1'
        )
      ).rejects.toThrow();
    });
  });

  describe('getAllEmployees', () => {
    it('should return all active employees', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          primaryDivision: Division.PLUMBING,
          isActive: true,
        },
        {
          id: 'emp-2',
          firstName: 'Jane',
          lastName: 'Smith',
          primaryDivision: Division.HVAC,
          isActive: true,
        },
      ];

      mockPrismaEmployee.findMany.mockResolvedValue(mockEmployees);

      const result = await EmployeeService.getAllEmployees();

      expect(result).toEqual(mockEmployees);
      expect(mockPrismaEmployee.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { lastName: 'asc' },
      });
    });

    it('should filter by division', async () => {
      const mockEmployees = [
        {
          id: 'emp-1',
          firstName: 'John',
          lastName: 'Doe',
          primaryDivision: Division.PLUMBING,
          isActive: true,
        },
      ];

      mockPrismaEmployee.findMany.mockResolvedValue(mockEmployees);

      const result = await EmployeeService.getAllEmployees(Division.PLUMBING);

      expect(result).toEqual(mockEmployees);
      expect(mockPrismaEmployee.findMany).toHaveBeenCalledWith({
        where: {
          primaryDivision: Division.PLUMBING,
          isActive: true,
        },
        orderBy: { lastName: 'asc' },
      });
    });
  });

  describe('updateEmployee', () => {
    it('should update an employee', async () => {
      const existingEmployee = {
        id: 'emp-1',
        employeeCode: 'EMP001',
        firstName: 'John',
        lastName: 'Doe',
        isActive: true,
      };

      const updatedEmployee = {
        ...existingEmployee,
        phone: '555-5678',
      };

      mockPrismaEmployee.findUnique.mockResolvedValue(existingEmployee);
      mockPrismaEmployee.update.mockResolvedValue(updatedEmployee);

      const result = await EmployeeService.updateEmployee(
        'emp-1',
        { phone: '555-5678' },
        'user-1'
      );

      expect(result).toEqual(updatedEmployee);
      expect(mockPrismaEmployee.update).toHaveBeenCalledTimes(1);
      expect(mockPrismaAuditLog.create).toHaveBeenCalledTimes(1);
    });

    it('should return null for non-existent employee', async () => {
      mockPrismaEmployee.findUnique.mockResolvedValue(null);

      const result = await EmployeeService.updateEmployee(
        'non-existent',
        { phone: '555-5678' },
        'user-1'
      );

      expect(result).toBeNull();
      expect(mockPrismaEmployee.update).not.toHaveBeenCalled();
    });
  });

  describe('softDeleteEmployee', () => {
    it('should soft delete an employee', async () => {
      const deletedEmployee = {
        id: 'emp-1',
        isActive: false,
        deletedAt: new Date(),
      };

      mockPrismaEmployee.update.mockResolvedValue(deletedEmployee);

      await EmployeeService.softDeleteEmployee('emp-1', 'user-1');

      expect(mockPrismaEmployee.update).toHaveBeenCalledWith({
        where: { id: 'emp-1' },
        data: {
          isActive: false,
          deletedAt: expect.any(Date),
          deletedBy: 'user-1',
        },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });
  });
});