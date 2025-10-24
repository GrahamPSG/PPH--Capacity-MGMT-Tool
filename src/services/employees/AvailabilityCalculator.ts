import prisma from '@/lib/prisma/client';
import { Division } from '@prisma/client';

export interface AvailabilityReport {
  employeeId: string;
  employeeName: string;
  division: Division;
  weekStarting: Date;
  maxHours: number;
  assignedHours: number;
  availableHours: number;
  utilizationPercentage: number;
  assignments: {
    projectName: string;
    phaseName: string;
    date: Date;
    hours: number;
  }[];
}

export interface DivisionAvailability {
  division: Division;
  date: Date;
  totalEmployees: number;
  totalMaxHours: number;
  totalAssignedHours: number;
  totalAvailableHours: number;
  utilizationPercentage: number;
  employeeBreakdown: {
    foremen: { count: number; availableHours: number };
    journeymen: { count: number; availableHours: number };
    apprentices: { count: number; availableHours: number };
  };
}

export class AvailabilityCalculator {
  /**
   * Calculate availability for a specific employee for a week
   */
  static async calculateEmployeeAvailability(
    employeeId: string,
    weekStartDate: Date
  ): Promise<AvailabilityReport | null> {
    const weekEndDate = new Date(weekStartDate);
    weekEndDate.setDate(weekEndDate.getDate() + 6);

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: weekStartDate,
              lte: weekEndDate,
            },
          },
          include: {
            phase: {
              include: {
                project: true,
              },
            },
          },
        },
      },
    });

    if (!employee) return null;

    // Check if employee is available during this period
    if (employee.availabilityStart > weekEndDate) return null;
    if (employee.availabilityEnd && employee.availabilityEnd < weekStartDate) return null;

    const assignedHours = employee.assignments.reduce(
      (sum, a) => sum + a.hoursAllocated,
      0
    );

    const availableHours = Math.max(0, employee.maxHoursPerWeek - assignedHours);
    const utilizationPercentage = employee.maxHoursPerWeek > 0
      ? Math.round((assignedHours / employee.maxHoursPerWeek) * 100)
      : 0;

    return {
      employeeId: employee.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      division: employee.division,
      weekStarting: weekStartDate,
      maxHours: employee.maxHoursPerWeek,
      assignedHours,
      availableHours,
      utilizationPercentage,
      assignments: employee.assignments.map(a => ({
        projectName: a.phase.project.name,
        phaseName: a.phase.name,
        date: a.assignmentDate,
        hours: a.hoursAllocated,
      })),
    };
  }

  /**
   * Calculate availability for all employees in a division
   */
  static async calculateDivisionAvailability(
    division: Division,
    date: Date
  ): Promise<DivisionAvailability> {
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const employees = await prisma.employee.findMany({
      where: {
        division,
        isActive: true,
        availabilityStart: { lte: weekEnd },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: weekStart } },
        ],
      },
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
        },
      },
    });

    let totalMaxHours = 0;
    let totalAssignedHours = 0;
    const breakdown = {
      foremen: { count: 0, availableHours: 0 },
      journeymen: { count: 0, availableHours: 0 },
      apprentices: { count: 0, availableHours: 0 },
    };

    employees.forEach(emp => {
      const assignedHours = emp.assignments.reduce(
        (sum, a) => sum + a.hoursAllocated,
        0
      );
      const availableHours = Math.max(0, emp.maxHoursPerWeek - assignedHours);

      totalMaxHours += emp.maxHoursPerWeek;
      totalAssignedHours += assignedHours;

      switch (emp.employeeType) {
        case 'FOREMAN':
          breakdown.foremen.count++;
          breakdown.foremen.availableHours += availableHours;
          break;
        case 'JOURNEYMAN':
          breakdown.journeymen.count++;
          breakdown.journeymen.availableHours += availableHours;
          break;
        case 'APPRENTICE':
          breakdown.apprentices.count++;
          breakdown.apprentices.availableHours += availableHours;
          break;
      }
    });

    const totalAvailableHours = totalMaxHours - totalAssignedHours;
    const utilizationPercentage = totalMaxHours > 0
      ? Math.round((totalAssignedHours / totalMaxHours) * 100)
      : 0;

    return {
      division,
      date: weekStart,
      totalEmployees: employees.length,
      totalMaxHours,
      totalAssignedHours,
      totalAvailableHours: Math.max(0, totalAvailableHours),
      utilizationPercentage,
      employeeBreakdown: breakdown,
    };
  }

  /**
   * Find employees available for a specific time slot
   */
  static async findAvailableEmployees(
    division: Division,
    date: Date,
    requiredHours: number,
    employeeType?: string
  ) {
    const employees = await prisma.employee.findMany({
      where: {
        division,
        isActive: true,
        employeeType: employeeType as any,
        availabilityStart: { lte: date },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: date } },
        ],
      },
      include: {
        assignments: {
          where: {
            assignmentDate: date,
          },
        },
      },
    });

    // Filter by available hours
    const available = employees.filter(emp => {
      const dayAssignedHours = emp.assignments.reduce(
        (sum, a) => sum + a.hoursAllocated,
        0
      );
      const dayAvailableHours = Math.min(
        8, // Max 8 hours per day
        emp.maxHoursPerWeek / 5, // Distribute weekly hours
        emp.maxHoursPerWeek - dayAssignedHours
      );
      return dayAvailableHours >= requiredHours;
    });

    return available.map(emp => ({
      ...emp,
      availableHoursForDate: Math.min(
        8,
        emp.maxHoursPerWeek / 5,
        emp.maxHoursPerWeek - emp.assignments.reduce((sum, a) => sum + a.hoursAllocated, 0)
      ),
    }));
  }

  /**
   * Generate weekly availability forecast
   */
  static async generateWeeklyForecast(division: Division, weeksAhead: number = 4) {
    const forecasts = [];
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() - currentDate.getDay()); // Start of current week

    for (let week = 0; week < weeksAhead; week++) {
      const weekStart = new Date(currentDate);
      weekStart.setDate(weekStart.getDate() + (week * 7));

      const availability = await this.calculateDivisionAvailability(division, weekStart);
      forecasts.push(availability);
    }

    return forecasts;
  }
}