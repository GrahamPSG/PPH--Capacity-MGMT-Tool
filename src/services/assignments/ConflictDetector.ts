import prisma from '@/lib/prisma/client';
import { startOfWeek, endOfWeek } from 'date-fns';

export interface ConflictCheckParams {
  employeeId: string;
  phaseId: string;
  assignmentDate: Date;
  hoursAllocated: number;
  excludeAssignmentId?: string;
}

export interface AssignmentConflict {
  type: 'DOUBLE_BOOKING' | 'EXCEEDS_MAX_HOURS' | 'DIVISION_MISMATCH' | 'AVAILABILITY' | 'OVERTIME';
  reason: string;
  severity: 'ERROR' | 'WARNING';
  details?: any;
}

export class ConflictDetector {
  /**
   * Detect all conflicts for a potential assignment
   */
  static async detectConflicts(params: ConflictCheckParams): Promise<AssignmentConflict[]> {
    const conflicts: AssignmentConflict[] = [];

    // Check for double-booking
    const doubleBooking = await this.checkDoubleBooking(params);
    if (doubleBooking) conflicts.push(doubleBooking);

    // Check weekly hours limit
    const hoursConflict = await this.checkWeeklyHours(params);
    if (hoursConflict) conflicts.push(hoursConflict);

    // Check division matching
    const divisionConflict = await this.checkDivisionMatch(params);
    if (divisionConflict) conflicts.push(divisionConflict);

    // Check employee availability
    const availabilityConflict = await this.checkEmployeeAvailability(params);
    if (availabilityConflict) conflicts.push(availabilityConflict);

    // Check for overtime
    const overtimeWarning = await this.checkOvertime(params);
    if (overtimeWarning) conflicts.push(overtimeWarning);

    return conflicts;
  }

  /**
   * Check for double-booking
   */
  private static async checkDoubleBooking(
    params: ConflictCheckParams
  ): Promise<AssignmentConflict | null> {
    const existingAssignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId: params.employeeId,
        assignmentDate: params.assignmentDate,
        id: params.excludeAssignmentId ? { not: params.excludeAssignmentId } : undefined
      },
      include: {
        phase: {
          include: {
            project: true
          }
        }
      }
    });

    if (existingAssignments.length === 0) return null;

    // Calculate total hours for the day
    const totalDayHours = existingAssignments.reduce(
      (sum, a) => sum + a.hoursAllocated,
      params.hoursAllocated
    );

    if (totalDayHours > 16) {
      return {
        type: 'DOUBLE_BOOKING',
        reason: `Employee already assigned ${totalDayHours - params.hoursAllocated} hours on this date. Total would exceed 16 hours.`,
        severity: 'ERROR',
        details: {
          existingAssignments: existingAssignments.map(a => ({
            project: a.phase.project.name,
            phase: a.phase.name,
            hours: a.hoursAllocated
          }))
        }
      };
    }

    return null;
  }

  /**
   * Check weekly hours limit
   */
  private static async checkWeeklyHours(
    params: ConflictCheckParams
  ): Promise<AssignmentConflict | null> {
    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId }
    });

    if (!employee) return null;

    const weekStart = startOfWeek(params.assignmentDate);
    const weekEnd = endOfWeek(params.assignmentDate);

    const weekAssignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId: params.employeeId,
        assignmentDate: {
          gte: weekStart,
          lte: weekEnd
        },
        id: params.excludeAssignmentId ? { not: params.excludeAssignmentId } : undefined
      }
    });

    const totalWeekHours = weekAssignments.reduce(
      (sum, a) => sum + a.hoursAllocated,
      params.hoursAllocated
    );

    if (totalWeekHours > employee.maxHoursPerWeek) {
      return {
        type: 'EXCEEDS_MAX_HOURS',
        reason: `Assignment would exceed employee's maximum weekly hours (${employee.maxHoursPerWeek})`,
        severity: 'ERROR',
        details: {
          currentWeekHours: totalWeekHours - params.hoursAllocated,
          proposedTotal: totalWeekHours,
          maxHours: employee.maxHoursPerWeek
        }
      };
    }

    return null;
  }

  /**
   * Check division matching
   */
  private static async checkDivisionMatch(
    params: ConflictCheckParams
  ): Promise<AssignmentConflict | null> {
    const [employee, phase] = await prisma.$transaction([
      prisma.employee.findUnique({
        where: { id: params.employeeId }
      }),
      prisma.projectPhase.findUnique({
        where: { id: params.phaseId }
      })
    ]);

    if (!employee || !phase) return null;

    // Check if divisions are compatible
    const employeeDivisionBase = employee.division.split('_')[0]; // PLUMBING or HVAC
    const phaseDivisionBase = phase.division.split('_')[0];

    if (employeeDivisionBase !== phaseDivisionBase) {
      return {
        type: 'DIVISION_MISMATCH',
        reason: `Employee division (${employee.division}) doesn't match phase division (${phase.division})`,
        severity: 'WARNING',
        details: {
          employeeDivision: employee.division,
          phaseDivision: phase.division
        }
      };
    }

    return null;
  }

  /**
   * Check employee availability
   */
  private static async checkEmployeeAvailability(
    params: ConflictCheckParams
  ): Promise<AssignmentConflict | null> {
    const employee = await prisma.employee.findUnique({
      where: { id: params.employeeId }
    });

    if (!employee) return null;

    // Check if assignment date is within employee availability
    if (params.assignmentDate < employee.availabilityStart) {
      return {
        type: 'AVAILABILITY',
        reason: `Employee not available until ${employee.availabilityStart.toDateString()}`,
        severity: 'ERROR',
        details: {
          availabilityStart: employee.availabilityStart,
          assignmentDate: params.assignmentDate
        }
      };
    }

    if (employee.availabilityEnd && params.assignmentDate > employee.availabilityEnd) {
      return {
        type: 'AVAILABILITY',
        reason: `Employee availability ended on ${employee.availabilityEnd.toDateString()}`,
        severity: 'ERROR',
        details: {
          availabilityEnd: employee.availabilityEnd,
          assignmentDate: params.assignmentDate
        }
      };
    }

    return null;
  }

  /**
   * Check for overtime (warning)
   */
  private static async checkOvertime(
    params: ConflictCheckParams
  ): Promise<AssignmentConflict | null> {
    const weekStart = startOfWeek(params.assignmentDate);
    const weekEnd = endOfWeek(params.assignmentDate);

    const weekAssignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId: params.employeeId,
        assignmentDate: {
          gte: weekStart,
          lte: weekEnd
        },
        id: params.excludeAssignmentId ? { not: params.excludeAssignmentId } : undefined
      }
    });

    const totalWeekHours = weekAssignments.reduce(
      (sum, a) => sum + a.hoursAllocated,
      params.hoursAllocated
    );

    if (totalWeekHours > 40) {
      const overtimeHours = totalWeekHours - 40;
      return {
        type: 'OVERTIME',
        reason: `Assignment will result in ${overtimeHours.toFixed(1)} hours of overtime`,
        severity: 'WARNING',
        details: {
          regularHours: 40,
          overtimeHours,
          totalHours: totalWeekHours
        }
      };
    }

    return null;
  }

  /**
   * Check conflicts for multiple assignments
   */
  static async checkBulkConflicts(
    assignments: ConflictCheckParams[]
  ): Promise<Map<number, AssignmentConflict[]>> {
    const conflictMap = new Map<number, AssignmentConflict[]>();

    for (let i = 0; i < assignments.length; i++) {
      const conflicts = await this.detectConflicts(assignments[i]);
      if (conflicts.length > 0) {
        conflictMap.set(i, conflicts);
      }
    }

    return conflictMap;
  }

  /**
   * Get employee availability for a date range
   */
  static async getEmployeeAvailability(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      throw new Error('Employee not found');
    }

    const assignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId,
        assignmentDate: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { assignmentDate: 'asc' }
    });

    // Group assignments by date
    const assignmentsByDate = new Map<string, number>();
    assignments.forEach(a => {
      const dateKey = a.assignmentDate.toISOString().split('T')[0];
      const current = assignmentsByDate.get(dateKey) || 0;
      assignmentsByDate.set(dateKey, current + a.hoursAllocated);
    });

    // Calculate availability for each day
    const availability = [];
    const current = new Date(startDate);
    while (current <= endDate) {
      const dateKey = current.toISOString().split('T')[0];
      const assignedHours = assignmentsByDate.get(dateKey) || 0;
      const availableHours = Math.max(0, 8 - assignedHours); // Assume 8-hour workday

      availability.push({
        date: new Date(current),
        assignedHours,
        availableHours,
        isAvailable: availableHours > 0
      });

      current.setDate(current.getDate() + 1);
    }

    return {
      employeeId,
      employee,
      availability,
      totalAssignedHours: assignments.reduce((sum, a) => sum + a.hoursAllocated, 0),
      maxWeeklyHours: employee.maxHoursPerWeek
    };
  }
}