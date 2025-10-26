import { prisma } from '@/lib/prisma/client';
import { isSameDay, addHours } from 'date-fns';

export interface DoubleBooking {
  employeeId: string;
  date: Date;
  assignments: Assignment[];
  totalHours: number;
  hasConflict: boolean;
  overlappingTimeRanges: TimeRange[];
}

interface Assignment {
  id: string;
  phaseId: string;
  phaseName: string;
  projectName: string;
  startTime?: Date;
  endTime?: Date;
  hoursAllocated: number;
}

interface TimeRange {
  start: Date;
  end: Date;
}

interface AlternateEmployee {
  id: string;
  name: string;
  employeeType: string;
  division: string;
  availableHours: number;
  skills: string[];
}

export class DoubleBookingDetector {
  private travelTimeMinutes = 30; // Default travel time between sites

  /**
   * Check if an employee is double-booked on a specific date
   */
  async checkDoubleBooking(
    employeeId: string,
    date: Date,
    additionalHours: number = 0
  ): Promise<DoubleBooking | null> {
    // Get all assignments for the employee on the given date
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const assignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId,
        assignmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        phase: {
          include: {
            project: true,
          },
        },
      },
    });

    if (assignments.length === 0 && additionalHours === 0) {
      return null;
    }

    // Map assignments to our internal format
    const mappedAssignments: Assignment[] = assignments.map(a => ({
      id: a.id,
      phaseId: a.phaseId,
      phaseName: a.phase.name,
      projectName: a.phase.project.name,
      hoursAllocated: a.hoursAllocated,
      startTime: this.calculateStartTime(a.assignmentDate, 8), // Default 8 AM start
      endTime: this.calculateEndTime(a.assignmentDate, 8, a.hoursAllocated),
    }));

    const totalHours = mappedAssignments.reduce(
      (sum, a) => sum + a.hoursAllocated,
      0
    ) + additionalHours;

    // Check for time overlaps if assignments have specific times
    const overlappingTimeRanges = this.findOverlappingTimeRanges(mappedAssignments);

    // Consider it a conflict if:
    // 1. Total hours exceed 8 hours (standard work day)
    // 2. There are overlapping time ranges
    // 3. Multiple assignments exist (even if hours are within limits)
    const hasConflict =
      totalHours > 8 ||
      overlappingTimeRanges.length > 0 ||
      (assignments.length > 1 || (assignments.length === 1 && additionalHours > 0));

    return {
      employeeId,
      date,
      assignments: mappedAssignments,
      totalHours,
      hasConflict,
      overlappingTimeRanges,
    };
  }

  /**
   * Check for double bookings across multiple employees
   */
  async checkMultipleEmployees(
    employeeIds: string[],
    date: Date
  ): Promise<Map<string, DoubleBooking>> {
    const results = new Map<string, DoubleBooking>();

    await Promise.all(
      employeeIds.map(async (employeeId) => {
        const booking = await this.checkDoubleBooking(employeeId, date);
        if (booking && booking.hasConflict) {
          results.set(employeeId, booking);
        }
      })
    );

    return results;
  }

  /**
   * Find all double bookings for a date range
   */
  async findAllDoubleBookings(
    startDate: Date,
    endDate: Date,
    division?: string
  ): Promise<DoubleBooking[]> {
    // Get all assignments in the date range
    const assignments = await prisma.crewAssignment.findMany({
      where: {
        assignmentDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(division && {
          employee: {
            division: division as any,
          },
        }),
      },
      include: {
        employee: true,
        phase: {
          include: {
            project: true,
          },
        },
      },
    });

    // Group assignments by employee and date
    const groupedAssignments = new Map<string, Assignment[]>();

    assignments.forEach(a => {
      const key = `${a.employeeId}-${a.assignmentDate.toDateString()}`;
      if (!groupedAssignments.has(key)) {
        groupedAssignments.set(key, []);
      }

      groupedAssignments.get(key)!.push({
        id: a.id,
        phaseId: a.phaseId,
        phaseName: a.phase.name,
        projectName: a.phase.project.name,
        hoursAllocated: a.hoursAllocated,
      });
    });

    // Check each group for conflicts
    const doubleBookings: DoubleBooking[] = [];

    groupedAssignments.forEach((assignments, key) => {
      if (assignments.length > 1) {
        const [employeeId, dateStr] = key.split('-');
        const totalHours = assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);

        doubleBookings.push({
          employeeId,
          date: new Date(dateStr),
          assignments,
          totalHours,
          hasConflict: true,
          overlappingTimeRanges: [],
        });
      }
    });

    return doubleBookings;
  }

  /**
   * Suggest alternate employees for a double-booked assignment
   */
  async suggestAlternateEmployees(
    phaseId: string,
    date: Date,
    requiredRole: string,
    division: string
  ): Promise<AlternateEmployee[]> {
    // Get phase requirements
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
    });

    if (!phase) return [];

    // Find available employees with matching role and division
    const availableEmployees = await prisma.employee.findMany({
      where: {
        division: division as any,
        employeeType: requiredRole as any,
        isActive: true,
        availabilityStart: { lte: date },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: date } },
        ],
      },
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: new Date(date.setHours(0, 0, 0, 0)),
              lte: new Date(date.setHours(23, 59, 59, 999)),
            },
          },
        },
      },
    });

    // Calculate available hours for each employee
    const alternates: AlternateEmployee[] = [];

    for (const employee of availableEmployees) {
      const totalAssignedHours = employee.assignments.reduce(
        (sum, a) => sum + a.hoursAllocated,
        0
      );

      const availableHours = 8 - totalAssignedHours; // Assuming 8-hour work day

      if (availableHours >= phase.laborHours / phase.duration) {
        alternates.push({
          id: employee.id,
          name: `${employee.firstName} ${employee.lastName}`,
          employeeType: employee.employeeType,
          division: employee.division,
          availableHours,
          skills: employee.skills,
        });
      }
    }

    // Sort by available hours (most available first)
    return alternates.sort((a, b) => b.availableHours - a.availableHours);
  }

  /**
   * Calculate impact of double booking on affected phases
   */
  async calculateImpact(doubleBooking: DoubleBooking): Promise<any> {
    const impactedPhases = await Promise.all(
      doubleBooking.assignments.map(async (assignment) => {
        const phase = await prisma.projectPhase.findUnique({
          where: { id: assignment.phaseId },
          include: {
            project: true,
            assignments: true,
          },
        });

        if (!phase) return null;

        // Calculate completion risk
        const totalAssignedHours = phase.assignments.reduce(
          (sum, a) => sum + a.hoursAllocated,
          0
        );

        const requiredHours = phase.laborHours;
        const completionPercentage = (totalAssignedHours / requiredHours) * 100;

        return {
          phaseId: phase.id,
          phaseName: phase.name,
          projectName: phase.project.name,
          completionRisk: completionPercentage < 50 ? 'HIGH' : 'MEDIUM',
          requiredHours,
          assignedHours: totalAssignedHours,
          shortfall: requiredHours - totalAssignedHours,
        };
      })
    );

    return {
      affectedPhases: impactedPhases.filter(p => p !== null),
      totalImpact: this.calculateTotalImpact(impactedPhases),
    };
  }

  /**
   * Find overlapping time ranges in assignments
   */
  private findOverlappingTimeRanges(assignments: Assignment[]): TimeRange[] {
    const overlaps: TimeRange[] = [];

    for (let i = 0; i < assignments.length; i++) {
      for (let j = i + 1; j < assignments.length; j++) {
        const a1 = assignments[i];
        const a2 = assignments[j];

        if (a1.startTime && a1.endTime && a2.startTime && a2.endTime) {
          // Add travel time buffer
          const a1EndWithTravel = addHours(a1.endTime, this.travelTimeMinutes / 60);
          const a2EndWithTravel = addHours(a2.endTime, this.travelTimeMinutes / 60);

          // Check for overlap
          if (
            (a1.startTime >= a2.startTime && a1.startTime < a2EndWithTravel) ||
            (a2.startTime >= a1.startTime && a2.startTime < a1EndWithTravel)
          ) {
            overlaps.push({
              start: new Date(Math.max(a1.startTime.getTime(), a2.startTime.getTime())),
              end: new Date(Math.min(a1EndWithTravel.getTime(), a2EndWithTravel.getTime())),
            });
          }
        }
      }
    }

    return overlaps;
  }

  /**
   * Calculate start time for an assignment
   */
  private calculateStartTime(date: Date, defaultHour: number = 8): Date {
    const startTime = new Date(date);
    startTime.setHours(defaultHour, 0, 0, 0);
    return startTime;
  }

  /**
   * Calculate end time for an assignment
   */
  private calculateEndTime(date: Date, startHour: number, hoursAllocated: number): Date {
    const endTime = new Date(date);
    const endHour = startHour + hoursAllocated;
    endTime.setHours(Math.floor(endHour), (endHour % 1) * 60, 0, 0);
    return endTime;
  }

  /**
   * Calculate total impact score
   */
  private calculateTotalImpact(impactedPhases: any[]): string {
    const highRiskCount = impactedPhases.filter(
      p => p && p.completionRisk === 'HIGH'
    ).length;

    if (highRiskCount === 0) return 'LOW';
    if (highRiskCount <= 2) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * Get suggested alternate dates for an assignment
   */
  async suggestAlternateDates(
    employeeId: string,
    phaseId: string,
    hoursNeeded: number
  ): Promise<Date[]> {
    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
    });

    if (!phase) return [];

    const suggestedDates: Date[] = [];
    const checkDate = new Date(phase.startDate);
    const endDate = new Date(phase.endDate);

    // Check each day in the phase duration
    while (checkDate <= endDate && suggestedDates.length < 5) {
      const booking = await this.checkDoubleBooking(employeeId, checkDate, hoursNeeded);

      if (!booking || !booking.hasConflict) {
        suggestedDates.push(new Date(checkDate));
      }

      checkDate.setDate(checkDate.getDate() + 1);
    }

    return suggestedDates;
  }
}