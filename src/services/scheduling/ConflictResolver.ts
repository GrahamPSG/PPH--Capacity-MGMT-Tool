import { prisma } from '@/lib/prisma/client';
import { ConflictType, ConflictSeverity, Conflict } from './ConflictDetectionService';
import { DoubleBookingDetector } from './DoubleBookingDetector';
import { CapacityValidator } from './CapacityValidator';
import { addDays, startOfWeek, endOfWeek } from 'date-fns';

export interface ResolutionSuggestion {
  id: string;
  type: ResolutionType;
  description: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  autoApplicable: boolean;
  estimatedCost?: number;
  confidence: number; // 0-100
  implementation?: ResolutionImplementation;
}

export enum ResolutionType {
  ALTERNATE_EMPLOYEE = 'ALTERNATE_EMPLOYEE',
  ALTERNATE_DATE = 'ALTERNATE_DATE',
  ADJUST_HOURS = 'ADJUST_HOURS',
  SPLIT_ASSIGNMENT = 'SPLIT_ASSIGNMENT',
  HIRE_CONTRACTOR = 'HIRE_CONTRACTOR',
  RESCHEDULE_PHASE = 'RESCHEDULE_PHASE',
  EXTEND_TIMELINE = 'EXTEND_TIMELINE',
  APPROVE_OVERTIME = 'APPROVE_OVERTIME',
  ASSIGN_FOREMAN = 'ASSIGN_FOREMAN',
  INCREASE_CREW = 'INCREASE_CREW',
  SWAP_EMPLOYEES = 'SWAP_EMPLOYEES',
  DELAY_START = 'DELAY_START',
}

interface ResolutionImplementation {
  action: string;
  params: Record<string, any>;
  prerequisites?: string[];
  sideEffects?: string[];
}

export class ConflictResolver {
  private doubleBookingDetector: DoubleBookingDetector;
  private capacityValidator: CapacityValidator;

  constructor() {
    this.doubleBookingDetector = new DoubleBookingDetector();
    this.capacityValidator = new CapacityValidator();
  }

  /**
   * Suggest resolutions for a specific conflict
   */
  async suggestResolutions(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    switch (conflict.type) {
      case ConflictType.DOUBLE_BOOKING:
        return this.resolveDoubleBooking(conflict);
      case ConflictType.OVER_CAPACITY:
        return this.resolveOverCapacity(conflict);
      case ConflictType.MISSING_FOREMAN:
        return this.resolveMissingForeman(conflict);
      case ConflictType.INSUFFICIENT_CREW:
        return this.resolveInsufficientCrew(conflict);
      case ConflictType.HOURS_EXCEEDED:
        return this.resolveHoursExceeded(conflict);
      case ConflictType.DIVISION_MISMATCH:
        return this.resolveDivisionMismatch(conflict);
      case ConflictType.UNAVAILABLE:
        return this.resolveUnavailable(conflict);
      case ConflictType.MULTIPLE_LEADS:
        return this.resolveMultipleLeads(conflict);
      case ConflictType.SKILL_MISMATCH:
        return this.resolveSkillMismatch(conflict);
      case ConflictType.OVERLAPPING_PHASES:
        return this.resolveOverlappingPhases(conflict);
      default:
        return [];
    }
  }

  /**
   * Resolve double booking conflicts
   */
  private async resolveDoubleBooking(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];
    const { entityId: employeeId, relatedEntities: phaseIds, metadata } = conflict;

    // Get employee and phase details
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) return suggestions;

    // Suggest alternate employees
    for (const phaseId of phaseIds) {
      const phase = await prisma.projectPhase.findUnique({
        where: { id: phaseId },
      });

      if (!phase) continue;

      const alternates = await this.doubleBookingDetector.suggestAlternateEmployees(
        phaseId,
        metadata?.date || new Date(),
        employee.employeeType,
        employee.division
      );

      if (alternates.length > 0) {
        suggestions.push({
          id: `res-alt-emp-${phaseId}`,
          type: ResolutionType.ALTERNATE_EMPLOYEE,
          description: `Assign ${alternates[0].name} instead (${alternates[0].availableHours}h available)`,
          impact: 'LOW',
          autoApplicable: true,
          confidence: 90,
          implementation: {
            action: 'reassignEmployee',
            params: {
              phaseId,
              fromEmployeeId: employeeId,
              toEmployeeId: alternates[0].id,
              date: metadata?.date,
            },
            prerequisites: ['Verify employee skills match phase requirements'],
            sideEffects: ['Update project schedule', 'Notify affected parties'],
          },
        });
      }

      // Suggest alternate dates
      const alternateDates = await this.doubleBookingDetector.suggestAlternateDates(
        employeeId,
        phaseId,
        metadata?.hoursNeeded || 8
      );

      if (alternateDates.length > 0) {
        suggestions.push({
          id: `res-alt-date-${phaseId}`,
          type: ResolutionType.ALTERNATE_DATE,
          description: `Reschedule to ${alternateDates[0].toDateString()}`,
          impact: 'MEDIUM',
          autoApplicable: false,
          confidence: 75,
          implementation: {
            action: 'rescheduleAssignment',
            params: {
              phaseId,
              employeeId,
              fromDate: metadata?.date,
              toDate: alternateDates[0],
            },
            prerequisites: ['Check phase dependencies', 'Verify project timeline'],
            sideEffects: ['May impact project completion date'],
          },
        });
      }
    }

    // Suggest splitting the assignment
    if (metadata?.totalHours && metadata.totalHours > 8) {
      suggestions.push({
        id: `res-split-${employeeId}`,
        type: ResolutionType.SPLIT_ASSIGNMENT,
        description: 'Split work across multiple days',
        impact: 'LOW',
        autoApplicable: false,
        confidence: 85,
        implementation: {
          action: 'splitAssignment',
          params: {
            employeeId,
            phaseIds,
            totalHours: metadata.totalHours,
            suggestedSplit: Math.ceil(metadata.totalHours / 8),
          },
          prerequisites: ['Phase allows partial completion'],
          sideEffects: ['Extended phase duration'],
        },
      });
    }

    return this.rankSuggestions(suggestions);
  }

  /**
   * Resolve over capacity conflicts
   */
  private async resolveOverCapacity(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];
    const { metadata } = conflict;

    if (!metadata) return suggestions;

    // Suggest hiring contractors
    const contractorHours = metadata.scheduledHours - metadata.availableHours;
    suggestions.push({
      id: 'res-contractor',
      type: ResolutionType.HIRE_CONTRACTOR,
      description: `Hire contractor for ${contractorHours.toFixed(0)} hours`,
      impact: 'MEDIUM',
      autoApplicable: false,
      estimatedCost: contractorHours * 75, // $75/hour contractor rate
      confidence: 80,
      implementation: {
        action: 'hireContractor',
        params: {
          division: metadata.division,
          hours: contractorHours,
          date: metadata.date,
        },
        prerequisites: ['Contractor availability', 'Budget approval'],
        sideEffects: ['Increased project cost'],
      },
    });

    // Suggest rescheduling low-priority phases
    const phases = await this.findReschedulablePhases(
      metadata.division,
      metadata.date
    );

    if (phases.length > 0) {
      suggestions.push({
        id: 'res-reschedule',
        type: ResolutionType.RESCHEDULE_PHASE,
        description: `Reschedule ${phases[0].name} to reduce load`,
        impact: 'HIGH',
        autoApplicable: false,
        confidence: 70,
        implementation: {
          action: 'reschedulePhase',
          params: {
            phaseId: phases[0].id,
            suggestedDate: addDays(metadata.date, 7),
          },
          prerequisites: ['Client approval', 'Update dependencies'],
          sideEffects: ['May delay project completion'],
        },
      });
    }

    // Suggest overtime approval
    suggestions.push({
      id: 'res-overtime',
      type: ResolutionType.APPROVE_OVERTIME,
      description: 'Approve overtime for existing crew',
      impact: 'LOW',
      autoApplicable: false,
      estimatedCost: contractorHours * 60 * 1.5, // Time and a half
      confidence: 85,
      implementation: {
        action: 'approveOvertime',
        params: {
          division: metadata.division,
          hours: Math.min(contractorHours, 10), // Max 10 hours overtime
          date: metadata.date,
        },
        prerequisites: ['Employee consent', 'Budget approval'],
        sideEffects: ['Potential employee fatigue'],
      },
    });

    return this.rankSuggestions(suggestions);
  }

  /**
   * Resolve missing foreman conflicts
   */
  private async resolveMissingForeman(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];
    const phaseId = conflict.entityId;

    const phase = await prisma.projectPhase.findUnique({
      where: { id: phaseId },
      include: { project: true },
    });

    if (!phase) return suggestions;

    // Find available foremen
    const availableForemen = await prisma.employee.findMany({
      where: {
        division: phase.division,
        employeeType: 'FOREMAN',
        isActive: true,
        availabilityStart: { lte: phase.startDate },
        OR: [
          { availabilityEnd: null },
          { availabilityEnd: { gte: phase.endDate } },
        ],
      },
      include: {
        assignments: {
          where: {
            assignmentDate: {
              gte: phase.startDate,
              lte: phase.endDate,
            },
          },
        },
      },
    });

    // Sort by availability
    const sortedForemen = availableForemen
      .map(f => ({
        ...f,
        availability: this.calculateAvailability(f.assignments, phase.startDate, phase.endDate),
      }))
      .sort((a, b) => b.availability - a.availability);

    if (sortedForemen.length > 0) {
      suggestions.push({
        id: 'res-assign-foreman',
        type: ResolutionType.ASSIGN_FOREMAN,
        description: `Assign ${sortedForemen[0].firstName} ${sortedForemen[0].lastName} as foreman`,
        impact: 'LOW',
        autoApplicable: true,
        confidence: 95,
        implementation: {
          action: 'assignForeman',
          params: {
            phaseId,
            foremanId: sortedForemen[0].id,
            startDate: phase.startDate,
            endDate: phase.endDate,
          },
          prerequisites: [],
          sideEffects: ['Update crew assignments'],
        },
      });
    }

    // Suggest promoting a journeyman
    const journeymen = await prisma.employee.findMany({
      where: {
        division: phase.division,
        employeeType: 'JOURNEYMAN',
        isActive: true,
      },
    });

    if (journeymen.length > 0) {
      suggestions.push({
        id: 'res-promote-journeyman',
        type: ResolutionType.ALTERNATE_EMPLOYEE,
        description: 'Promote experienced journeyman to lead role',
        impact: 'MEDIUM',
        autoApplicable: false,
        confidence: 70,
        implementation: {
          action: 'promoteToLead',
          params: {
            phaseId,
            employeeId: journeymen[0].id,
          },
          prerequisites: ['Verify journeyman experience', 'Management approval'],
          sideEffects: ['Temporary role change'],
        },
      });
    }

    // Suggest delaying phase start
    suggestions.push({
      id: 'res-delay-start',
      type: ResolutionType.DELAY_START,
      description: 'Delay phase start until foreman available',
      impact: 'HIGH',
      autoApplicable: false,
      confidence: 60,
      implementation: {
        action: 'delayPhase',
        params: {
          phaseId,
          suggestedStart: addDays(phase.startDate, 7),
        },
        prerequisites: ['Client notification', 'Update dependencies'],
        sideEffects: ['Project delay', 'Possible penalties'],
      },
    });

    return this.rankSuggestions(suggestions);
  }

  /**
   * Resolve insufficient crew conflicts
   */
  private async resolveInsufficientCrew(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];
    const { metadata } = conflict;

    if (!metadata) return suggestions;

    const shortfall = metadata.required - metadata.current;

    suggestions.push({
      id: 'res-increase-crew',
      type: ResolutionType.INCREASE_CREW,
      description: `Add ${shortfall} more crew member(s)`,
      impact: 'LOW',
      autoApplicable: true,
      confidence: 90,
      implementation: {
        action: 'increaseCrew',
        params: {
          phaseId: conflict.entityId,
          additionalCrew: shortfall,
        },
        prerequisites: ['Check employee availability'],
        sideEffects: ['Increased labor cost'],
      },
    });

    // Suggest adjusting phase requirements if possible
    suggestions.push({
      id: 'res-adjust-requirements',
      type: ResolutionType.ADJUST_HOURS,
      description: 'Adjust crew requirements if phase allows',
      impact: 'MEDIUM',
      autoApplicable: false,
      confidence: 65,
      implementation: {
        action: 'adjustRequirements',
        params: {
          phaseId: conflict.entityId,
          newCrewSize: metadata.current,
        },
        prerequisites: ['Engineering review', 'Safety assessment'],
        sideEffects: ['Possible timeline extension'],
      },
    });

    return this.rankSuggestions(suggestions);
  }

  /**
   * Resolve hours exceeded conflicts
   */
  private async resolveHoursExceeded(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];
    const { metadata } = conflict;

    if (!metadata) return suggestions;

    const excessHours = metadata.actualHours - metadata.maxHours;

    // Suggest reducing hours
    suggestions.push({
      id: 'res-reduce-hours',
      type: ResolutionType.ADJUST_HOURS,
      description: `Reduce assignment by ${excessHours} hours`,
      impact: 'LOW',
      autoApplicable: true,
      confidence: 85,
      implementation: {
        action: 'reduceHours',
        params: {
          employeeId: conflict.entityId,
          reduction: excessHours,
          week: metadata.week,
        },
        prerequisites: [],
        sideEffects: ['May need additional resources'],
      },
    });

    // Suggest alternate employee
    suggestions.push({
      id: 'res-swap-employee',
      type: ResolutionType.SWAP_EMPLOYEES,
      description: 'Swap with employee who has available hours',
      impact: 'LOW',
      autoApplicable: true,
      confidence: 80,
      implementation: {
        action: 'swapEmployees',
        params: {
          fromEmployeeId: conflict.entityId,
          hours: excessHours,
        },
        prerequisites: ['Find available employee'],
        sideEffects: ['Update schedules'],
      },
    });

    // Suggest overtime approval
    suggestions.push({
      id: 'res-approve-ot',
      type: ResolutionType.APPROVE_OVERTIME,
      description: `Approve ${excessHours} hours overtime`,
      impact: 'MEDIUM',
      autoApplicable: false,
      estimatedCost: excessHours * 75, // $75/hour overtime rate
      confidence: 75,
      implementation: {
        action: 'approveOvertime',
        params: {
          employeeId: conflict.entityId,
          hours: excessHours,
        },
        prerequisites: ['Budget approval', 'Employee consent'],
        sideEffects: ['Increased cost', 'Potential fatigue'],
      },
    });

    return this.rankSuggestions(suggestions);
  }

  /**
   * Resolve division mismatch conflicts
   */
  private async resolveDivisionMismatch(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    const suggestions: ResolutionSuggestion[] = [];

    suggestions.push({
      id: 'res-find-correct-division',
      type: ResolutionType.ALTERNATE_EMPLOYEE,
      description: 'Find employee from correct division',
      impact: 'LOW',
      autoApplicable: true,
      confidence: 95,
      implementation: {
        action: 'replaceWithCorrectDivision',
        params: {
          phaseId: conflict.relatedEntities[0],
          currentEmployeeId: conflict.entityId,
        },
        prerequisites: [],
        sideEffects: [],
      },
    });

    return suggestions;
  }

  /**
   * Resolve employee unavailable conflicts
   */
  private async resolveUnavailable(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    return [
      {
        id: 'res-alt-employee',
        type: ResolutionType.ALTERNATE_EMPLOYEE,
        description: 'Assign available employee',
        impact: 'LOW',
        autoApplicable: true,
        confidence: 90,
        implementation: {
          action: 'replaceUnavailable',
          params: {
            phaseId: conflict.relatedEntities[0],
            unavailableEmployeeId: conflict.entityId,
          },
          prerequisites: [],
          sideEffects: [],
        },
      },
    ];
  }

  /**
   * Resolve multiple leads conflicts
   */
  private async resolveMultipleLeads(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    return [
      {
        id: 'res-single-lead',
        type: ResolutionType.ALTERNATE_EMPLOYEE,
        description: 'Designate single lead, reassign others as crew',
        impact: 'LOW',
        autoApplicable: true,
        confidence: 95,
        implementation: {
          action: 'designateSingleLead',
          params: {
            phaseId: conflict.entityId,
          },
          prerequisites: [],
          sideEffects: ['Update crew hierarchy'],
        },
      },
    ];
  }

  /**
   * Resolve skill mismatch conflicts
   */
  private async resolveSkillMismatch(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    return [
      {
        id: 'res-skilled-employee',
        type: ResolutionType.ALTERNATE_EMPLOYEE,
        description: 'Assign employee with required skills',
        impact: 'LOW',
        autoApplicable: true,
        confidence: 90,
        implementation: {
          action: 'replaceWithSkilled',
          params: {
            phaseId: conflict.relatedEntities[0],
            currentEmployeeId: conflict.entityId,
          },
          prerequisites: ['Verify skill requirements'],
          sideEffects: [],
        },
      },
    ];
  }

  /**
   * Resolve overlapping phases conflicts
   */
  private async resolveOverlappingPhases(conflict: Conflict): Promise<ResolutionSuggestion[]> {
    return [
      {
        id: 'res-adjust-timeline',
        type: ResolutionType.EXTEND_TIMELINE,
        description: 'Adjust phase timeline to resolve overlap',
        impact: 'HIGH',
        autoApplicable: false,
        confidence: 70,
        implementation: {
          action: 'adjustPhaseTimeline',
          params: {
            phaseId: conflict.entityId,
          },
          prerequisites: ['Review dependencies', 'Client approval'],
          sideEffects: ['Project timeline impact'],
        },
      },
    ];
  }

  /**
   * Find phases that can be rescheduled
   */
  private async findReschedulablePhases(division: string, date: Date): Promise<any[]> {
    const phases = await prisma.projectPhase.findMany({
      where: {
        division: division as any,
        startDate: {
          gte: date,
          lte: addDays(date, 7),
        },
        status: 'NOT_STARTED',
      },
      orderBy: {
        progressPercentage: 'asc', // Prioritize phases with least progress
      },
      take: 3,
    });

    return phases;
  }

  /**
   * Calculate employee availability percentage
   */
  private calculateAvailability(assignments: any[], startDate: Date, endDate: Date): number {
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const assignedDays = assignments.filter(
      a => a.assignmentDate >= startDate && a.assignmentDate <= endDate
    ).length;

    return ((totalDays - assignedDays) / totalDays) * 100;
  }

  /**
   * Rank suggestions by feasibility and impact
   */
  private rankSuggestions(suggestions: ResolutionSuggestion[]): ResolutionSuggestion[] {
    return suggestions.sort((a, b) => {
      // Prioritize by confidence first
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }

      // Then by impact (prefer lower impact)
      const impactScore = { LOW: 3, MEDIUM: 2, HIGH: 1 };
      if (a.impact !== b.impact) {
        return impactScore[a.impact] - impactScore[b.impact];
      }

      // Then by auto-applicability
      if (a.autoApplicable !== b.autoApplicable) {
        return a.autoApplicable ? -1 : 1;
      }

      // Finally by cost (if available)
      if (a.estimatedCost !== undefined && b.estimatedCost !== undefined) {
        return a.estimatedCost - b.estimatedCost;
      }

      return 0;
    });
  }

  /**
   * Apply a resolution suggestion automatically
   */
  async applyResolution(suggestion: ResolutionSuggestion): Promise<boolean> {
    if (!suggestion.autoApplicable || !suggestion.implementation) {
      return false;
    }

    try {
      const { action, params } = suggestion.implementation;

      switch (action) {
        case 'reassignEmployee':
          await this.reassignEmployee(params);
          break;
        case 'assignForeman':
          await this.assignForeman(params);
          break;
        case 'increaseCrew':
          await this.increaseCrew(params);
          break;
        case 'reduceHours':
          await this.reduceHours(params);
          break;
        default:
          console.log(`Unsupported auto-apply action: ${action}`);
          return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to apply resolution:', error);
      return false;
    }
  }

  // Implementation methods for auto-applicable resolutions
  private async reassignEmployee(params: any): Promise<void> {
    // Implementation would update database
    console.log('Reassigning employee:', params);
  }

  private async assignForeman(params: any): Promise<void> {
    // Implementation would update database
    console.log('Assigning foreman:', params);
  }

  private async increaseCrew(params: any): Promise<void> {
    // Implementation would update database
    console.log('Increasing crew:', params);
  }

  private async reduceHours(params: any): Promise<void> {
    // Implementation would update database
    console.log('Reducing hours:', params);
  }
}