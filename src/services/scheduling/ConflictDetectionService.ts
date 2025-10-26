import { prisma } from '@/lib/prisma/client';
import { DoubleBookingDetector } from './DoubleBookingDetector';
import { CapacityValidator } from './CapacityValidator';
import { ConflictResolver } from './ConflictResolver';
import { startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

export enum ConflictType {
  DOUBLE_BOOKING = 'DOUBLE_BOOKING',
  OVER_CAPACITY = 'OVER_CAPACITY',
  MISSING_FOREMAN = 'MISSING_FOREMAN',
  INSUFFICIENT_CREW = 'INSUFFICIENT_CREW',
  SKILL_MISMATCH = 'SKILL_MISMATCH',
  DIVISION_MISMATCH = 'DIVISION_MISMATCH',
  HOURS_EXCEEDED = 'HOURS_EXCEEDED',
  UNAVAILABLE = 'UNAVAILABLE',
  MULTIPLE_LEADS = 'MULTIPLE_LEADS',
  OVERLAPPING_PHASES = 'OVERLAPPING_PHASES',
}

export enum ConflictSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: ConflictSeverity;
  description: string;
  entityType: 'PROJECT' | 'PHASE' | 'EMPLOYEE' | 'ASSIGNMENT';
  entityId: string;
  relatedEntities: string[];
  detectedAt: Date;
  resolvedAt?: Date;
  resolutionSuggestions?: any[];
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  conflicts: Conflict[];
  warnings: string[];
}

export class ConflictDetectionService {
  private doubleBookingDetector: DoubleBookingDetector;
  private capacityValidator: CapacityValidator;
  private conflictResolver: ConflictResolver;
  private conflictCache: Map<string, { conflicts: Conflict[]; timestamp: Date }>;
  private cacheExpiration = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.doubleBookingDetector = new DoubleBookingDetector();
    this.capacityValidator = new CapacityValidator();
    this.conflictResolver = new ConflictResolver();
    this.conflictCache = new Map();
  }

  /**
   * Scan all assignments for conflicts
   */
  async scanAllConflicts(): Promise<Conflict[]> {
    const cacheKey = 'all-conflicts';
    const cached = this.getCachedConflicts(cacheKey);
    if (cached) return cached;

    const conflicts: Conflict[] = [];

    // Get all active phases
    const phases = await prisma.projectPhase.findMany({
      where: {
        status: {
          in: ['NOT_STARTED', 'IN_PROGRESS', 'DELAYED'],
        },
      },
      include: {
        assignments: {
          include: {
            employee: true,
          },
        },
        project: true,
      },
    });

    // Check each phase for conflicts
    for (const phase of phases) {
      conflicts.push(...(await this.detectPhaseConflicts(phase)));
    }

    // Check division capacity conflicts
    const divisions = await prisma.employee.findMany({
      select: { division: true },
      distinct: ['division'],
    });

    for (const { division } of divisions) {
      conflicts.push(...(await this.detectCapacityConflicts(division)));
    }

    // Check employee-specific conflicts
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      include: {
        assignments: true,
      },
    });

    for (const employee of employees) {
      conflicts.push(...(await this.detectEmployeeConflicts(employee)));
    }

    this.cacheConflicts(cacheKey, conflicts);
    return conflicts;
  }

  /**
   * Validate assignment before creation
   */
  async validateAssignment(
    phaseId: string,
    employeeId: string,
    assignmentDate: Date,
    hoursAllocated: number
  ): Promise<ValidationResult> {
    const conflicts: Conflict[] = [];
    const warnings: string[] = [];

    // Get phase and employee details
    const [phase, employee] = await Promise.all([
      prisma.projectPhase.findUnique({
        where: { id: phaseId },
        include: { project: true, assignments: true },
      }),
      prisma.employee.findUnique({
        where: { id: employeeId },
        include: { assignments: true },
      }),
    ]);

    if (!phase || !employee) {
      return {
        isValid: false,
        conflicts: [],
        warnings: ['Phase or employee not found'],
      };
    }

    // Check double booking
    const doubleBooking = await this.doubleBookingDetector.checkDoubleBooking(
      employeeId,
      assignmentDate,
      hoursAllocated
    );

    if (doubleBooking) {
      conflicts.push({
        id: `conflict-${Date.now()}-db`,
        type: ConflictType.DOUBLE_BOOKING,
        severity: ConflictSeverity.CRITICAL,
        description: `Employee ${employee.firstName} ${employee.lastName} is already assigned on ${assignmentDate.toDateString()}`,
        entityType: 'ASSIGNMENT',
        entityId: employeeId,
        relatedEntities: [phaseId],
        detectedAt: new Date(),
      });
    }

    // Check division mismatch
    if (employee.division !== phase.division) {
      conflicts.push({
        id: `conflict-${Date.now()}-dm`,
        type: ConflictType.DIVISION_MISMATCH,
        severity: ConflictSeverity.HIGH,
        description: `Employee division (${employee.division}) doesn't match phase division (${phase.division})`,
        entityType: 'ASSIGNMENT',
        entityId: employeeId,
        relatedEntities: [phaseId],
        detectedAt: new Date(),
      });
    }

    // Check employee availability
    if (!this.isEmployeeAvailable(employee, assignmentDate)) {
      conflicts.push({
        id: `conflict-${Date.now()}-ua`,
        type: ConflictType.UNAVAILABLE,
        severity: ConflictSeverity.CRITICAL,
        description: `Employee is not available on ${assignmentDate.toDateString()}`,
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        relatedEntities: [phaseId],
        detectedAt: new Date(),
      });
    }

    // Check weekly hours limit
    const weeklyHours = await this.calculateWeeklyHours(employeeId, assignmentDate);
    if (weeklyHours + hoursAllocated > employee.maxHoursPerWeek) {
      conflicts.push({
        id: `conflict-${Date.now()}-he`,
        type: ConflictType.HOURS_EXCEEDED,
        severity: ConflictSeverity.MEDIUM,
        description: `Assignment would exceed employee's weekly hours limit (${employee.maxHoursPerWeek}h)`,
        entityType: 'EMPLOYEE',
        entityId: employeeId,
        relatedEntities: [phaseId],
        detectedAt: new Date(),
        metadata: {
          currentHours: weeklyHours,
          additionalHours: hoursAllocated,
          maxHours: employee.maxHoursPerWeek,
        },
      });
    }

    // Check capacity
    const capacityCheck = await this.capacityValidator.validateDivisionCapacity(
      phase.division,
      assignmentDate,
      hoursAllocated
    );

    if (!capacityCheck.hasCapacity) {
      conflicts.push({
        id: `conflict-${Date.now()}-oc`,
        type: ConflictType.OVER_CAPACITY,
        severity: ConflictSeverity.HIGH,
        description: `Division capacity exceeded for ${assignmentDate.toDateString()}`,
        entityType: 'PHASE',
        entityId: phaseId,
        relatedEntities: [],
        detectedAt: new Date(),
        metadata: capacityCheck,
      });
    }

    // Add warnings for non-critical issues
    if (weeklyHours + hoursAllocated > employee.maxHoursPerWeek * 0.9) {
      warnings.push('Employee approaching weekly hours limit');
    }

    if (capacityCheck.utilizationPercentage > 90) {
      warnings.push('Division approaching capacity limit');
    }

    const isValid = conflicts.filter(c =>
      c.severity === ConflictSeverity.CRITICAL ||
      c.severity === ConflictSeverity.HIGH
    ).length === 0;

    return { isValid, conflicts, warnings };
  }

  /**
   * Detect conflicts for a specific phase
   */
  private async detectPhaseConflicts(phase: any): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Check for missing foreman
    if (phase.requiredForeman) {
      const hasForeman = phase.assignments.some(
        (a: any) => a.employee.employeeType === 'FOREMAN' && a.isLead
      );

      if (!hasForeman) {
        conflicts.push({
          id: `conflict-${phase.id}-mf`,
          type: ConflictType.MISSING_FOREMAN,
          severity: ConflictSeverity.HIGH,
          description: `Phase "${phase.name}" requires a foreman but none assigned`,
          entityType: 'PHASE',
          entityId: phase.id,
          relatedEntities: [phase.projectId],
          detectedAt: new Date(),
        });
      }
    }

    // Check for insufficient crew
    const currentCrewSize = new Set(phase.assignments.map((a: any) => a.employeeId)).size;
    if (currentCrewSize < phase.requiredCrewSize) {
      conflicts.push({
        id: `conflict-${phase.id}-ic`,
        type: ConflictType.INSUFFICIENT_CREW,
        severity: ConflictSeverity.MEDIUM,
        description: `Phase "${phase.name}" has ${currentCrewSize}/${phase.requiredCrewSize} required crew members`,
        entityType: 'PHASE',
        entityId: phase.id,
        relatedEntities: [phase.projectId],
        detectedAt: new Date(),
        metadata: {
          current: currentCrewSize,
          required: phase.requiredCrewSize,
        },
      });
    }

    // Check for multiple leads on same day
    const leadsByDate = new Map<string, number>();
    phase.assignments
      .filter((a: any) => a.isLead)
      .forEach((a: any) => {
        const dateKey = a.assignmentDate.toDateString();
        leadsByDate.set(dateKey, (leadsByDate.get(dateKey) || 0) + 1);
      });

    leadsByDate.forEach((count, date) => {
      if (count > 1) {
        conflicts.push({
          id: `conflict-${phase.id}-ml-${date}`,
          type: ConflictType.MULTIPLE_LEADS,
          severity: ConflictSeverity.MEDIUM,
          description: `Multiple leads assigned to phase "${phase.name}" on ${date}`,
          entityType: 'PHASE',
          entityId: phase.id,
          relatedEntities: [],
          detectedAt: new Date(),
        });
      }
    });

    return conflicts;
  }

  /**
   * Detect capacity conflicts for a division
   */
  private async detectCapacityConflicts(division: string): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    // Check capacity for the next week
    for (let d = new Date(today); d <= nextWeek; d.setDate(d.getDate() + 1)) {
      const capacityCheck = await this.capacityValidator.validateDivisionCapacity(
        division as any,
        new Date(d),
        0
      );

      if (capacityCheck.utilizationPercentage > 100) {
        conflicts.push({
          id: `conflict-cap-${division}-${d.toISOString()}`,
          type: ConflictType.OVER_CAPACITY,
          severity: ConflictSeverity.HIGH,
          description: `${division} division over capacity (${capacityCheck.utilizationPercentage.toFixed(1)}%) on ${d.toDateString()}`,
          entityType: 'PHASE',
          entityId: division,
          relatedEntities: [],
          detectedAt: new Date(),
          metadata: capacityCheck,
        });
      }
    }

    return conflicts;
  }

  /**
   * Detect conflicts for a specific employee
   */
  private async detectEmployeeConflicts(employee: any): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Group assignments by date
    const assignmentsByDate = new Map<string, any[]>();
    employee.assignments.forEach((a: any) => {
      const dateKey = new Date(a.assignmentDate).toDateString();
      if (!assignmentsByDate.has(dateKey)) {
        assignmentsByDate.set(dateKey, []);
      }
      assignmentsByDate.get(dateKey)!.push(a);
    });

    // Check for double bookings
    assignmentsByDate.forEach((assignments, date) => {
      if (assignments.length > 1) {
        conflicts.push({
          id: `conflict-db-${employee.id}-${date}`,
          type: ConflictType.DOUBLE_BOOKING,
          severity: ConflictSeverity.CRITICAL,
          description: `${employee.firstName} ${employee.lastName} is double-booked on ${date}`,
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          relatedEntities: assignments.map(a => a.phaseId),
          detectedAt: new Date(),
          metadata: {
            assignmentCount: assignments.length,
            totalHours: assignments.reduce((sum, a) => sum + a.hoursAllocated, 0),
          },
        });
      }
    });

    // Check weekly hours
    const weeks = new Set(
      employee.assignments.map((a: any) =>
        startOfWeek(new Date(a.assignmentDate)).toISOString()
      )
    );

    for (const weekStart of weeks) {
      const weeklyHours = await this.calculateWeeklyHours(
        employee.id,
        new Date(weekStart)
      );

      if (weeklyHours > employee.maxHoursPerWeek) {
        conflicts.push({
          id: `conflict-he-${employee.id}-${weekStart}`,
          type: ConflictType.HOURS_EXCEEDED,
          severity: ConflictSeverity.MEDIUM,
          description: `${employee.firstName} ${employee.lastName} exceeds weekly hours limit (${weeklyHours}h > ${employee.maxHoursPerWeek}h)`,
          entityType: 'EMPLOYEE',
          entityId: employee.id,
          relatedEntities: [],
          detectedAt: new Date(),
          metadata: {
            actualHours: weeklyHours,
            maxHours: employee.maxHoursPerWeek,
            week: weekStart,
          },
        });
      }
    }

    return conflicts;
  }

  /**
   * Check if employee is available on a given date
   */
  private isEmployeeAvailable(employee: any, date: Date): boolean {
    const availStart = new Date(employee.availabilityStart);
    const availEnd = employee.availabilityEnd
      ? new Date(employee.availabilityEnd)
      : new Date('2100-01-01');

    return isWithinInterval(date, { start: availStart, end: availEnd });
  }

  /**
   * Calculate total hours for an employee in a week
   */
  private async calculateWeeklyHours(
    employeeId: string,
    date: Date
  ): Promise<number> {
    const weekStart = startOfWeek(date);
    const weekEnd = endOfWeek(date);

    const assignments = await prisma.crewAssignment.findMany({
      where: {
        employeeId,
        assignmentDate: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });

    return assignments.reduce((sum, a) => sum + a.hoursAllocated, 0);
  }

  /**
   * Get cached conflicts if not expired
   */
  private getCachedConflicts(key: string): Conflict[] | null {
    const cached = this.conflictCache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.cacheExpiration) {
      this.conflictCache.delete(key);
      return null;
    }

    return cached.conflicts;
  }

  /**
   * Cache conflicts with timestamp
   */
  private cacheConflicts(key: string, conflicts: Conflict[]): void {
    this.conflictCache.set(key, {
      conflicts,
      timestamp: new Date(),
    });
  }

  /**
   * Clear conflict cache
   */
  clearCache(): void {
    this.conflictCache.clear();
  }

  /**
   * Get resolution suggestions for a conflict
   */
  async getResolutionSuggestions(conflict: Conflict): Promise<any[]> {
    return this.conflictResolver.suggestResolutions(conflict);
  }
}