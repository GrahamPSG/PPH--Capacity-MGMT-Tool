/**
 * @jest-environment node
 */

import { ProjectLifecycle } from '../ProjectLifecycle';
import { ProjectStatus } from '@prisma/client';

describe('ProjectLifecycle', () => {
  describe('canTransitionTo', () => {
    it('should allow valid status transitions', () => {
      // QUOTED can transition to AWARDED or CANCELLED
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.QUOTED, ProjectStatus.AWARDED)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.QUOTED, ProjectStatus.CANCELLED)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.QUOTED, ProjectStatus.IN_PROGRESS)).toBe(false);

      // AWARDED can transition to IN_PROGRESS, ON_HOLD, or CANCELLED
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.AWARDED, ProjectStatus.IN_PROGRESS)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.AWARDED, ProjectStatus.ON_HOLD)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.AWARDED, ProjectStatus.CANCELLED)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.AWARDED, ProjectStatus.COMPLETED)).toBe(false);

      // IN_PROGRESS can transition to ON_HOLD or COMPLETED
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.IN_PROGRESS, ProjectStatus.COMPLETED)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.IN_PROGRESS, ProjectStatus.AWARDED)).toBe(false);

      // ON_HOLD can transition to IN_PROGRESS or CANCELLED
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.ON_HOLD, ProjectStatus.IN_PROGRESS)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED)).toBe(true);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED)).toBe(false);

      // COMPLETED cannot transition to any status
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.COMPLETED, ProjectStatus.IN_PROGRESS)).toBe(false);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.COMPLETED, ProjectStatus.CANCELLED)).toBe(false);

      // CANCELLED cannot transition to any status
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.CANCELLED, ProjectStatus.IN_PROGRESS)).toBe(false);
      expect(ProjectLifecycle.canTransitionTo(ProjectStatus.CANCELLED, ProjectStatus.QUOTED)).toBe(false);
    });
  });

  describe('getAvailableTransitions', () => {
    it('should return available transitions for each status', () => {
      expect(ProjectLifecycle.getAvailableTransitions(ProjectStatus.QUOTED))
        .toEqual([ProjectStatus.AWARDED, ProjectStatus.CANCELLED]);

      expect(ProjectLifecycle.getAvailableTransitions(ProjectStatus.AWARDED))
        .toEqual([ProjectStatus.IN_PROGRESS, ProjectStatus.ON_HOLD, ProjectStatus.CANCELLED]);

      expect(ProjectLifecycle.getAvailableTransitions(ProjectStatus.IN_PROGRESS))
        .toEqual([ProjectStatus.ON_HOLD, ProjectStatus.COMPLETED]);

      expect(ProjectLifecycle.getAvailableTransitions(ProjectStatus.ON_HOLD))
        .toEqual([ProjectStatus.IN_PROGRESS, ProjectStatus.CANCELLED]);

      expect(ProjectLifecycle.getAvailableTransitions(ProjectStatus.COMPLETED))
        .toEqual([]);

      expect(ProjectLifecycle.getAvailableTransitions(ProjectStatus.CANCELLED))
        .toEqual([]);
    });
  });

  describe('validateStatusChange', () => {
    const mockProject = {
      id: 'project-123',
      status: ProjectStatus.AWARDED,
      phases: [],
    };

    it('should validate successful status change', async () => {
      const result = await ProjectLifecycle.validateStatusChange(
        mockProject as any,
        ProjectStatus.IN_PROGRESS
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should return error for invalid transition', async () => {
      const result = await ProjectLifecycle.validateStatusChange(
        mockProject as any,
        ProjectStatus.COMPLETED
      );

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Cannot transition from AWARDED to COMPLETED');
    });

    it('should warn about incomplete phases when completing', async () => {
      const projectWithPhases = {
        ...mockProject,
        status: ProjectStatus.IN_PROGRESS,
        phases: [
          { id: 'phase-1', progressPercentage: 100 },
          { id: 'phase-2', progressPercentage: 50 },
        ],
      };

      const result = await ProjectLifecycle.validateStatusChange(
        projectWithPhases as any,
        ProjectStatus.COMPLETED
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Some phases are not 100% complete');
    });

    it('should handle projects with no phases', async () => {
      const projectNoPhases = {
        ...mockProject,
        status: ProjectStatus.IN_PROGRESS,
        phases: [],
      };

      const result = await ProjectLifecycle.validateStatusChange(
        projectNoPhases as any,
        ProjectStatus.COMPLETED
      );

      expect(result.valid).toBe(true);
      expect(result.warnings).toContain('Project has no phases defined');
    });
  });

  describe('getStatusMetrics', () => {
    it('should calculate correct metrics for each status', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-06-30');
      const currentDate = new Date('2024-03-15');

      // For IN_PROGRESS status
      const inProgressMetrics = ProjectLifecycle.getStatusMetrics(
        ProjectStatus.IN_PROGRESS,
        startDate,
        endDate,
        currentDate
      );

      expect(inProgressMetrics.daysElapsed).toBeGreaterThan(0);
      expect(inProgressMetrics.daysRemaining).toBeGreaterThan(0);
      expect(inProgressMetrics.progressExpected).toBeGreaterThan(0);
      expect(inProgressMetrics.progressExpected).toBeLessThan(100);
      expect(inProgressMetrics.isDelayed).toBe(false);

      // For COMPLETED status
      const completedMetrics = ProjectLifecycle.getStatusMetrics(
        ProjectStatus.COMPLETED,
        startDate,
        endDate
      );

      expect(completedMetrics.progressExpected).toBe(100);
      expect(completedMetrics.isDelayed).toBe(false);

      // For QUOTED status
      const quotedMetrics = ProjectLifecycle.getStatusMetrics(
        ProjectStatus.QUOTED,
        startDate,
        endDate
      );

      expect(quotedMetrics.daysElapsed).toBe(0);
      expect(quotedMetrics.progressExpected).toBe(0);
    });

    it('should detect delayed projects', () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-01');
      const currentDate = new Date('2024-04-01'); // Past end date

      const metrics = ProjectLifecycle.getStatusMetrics(
        ProjectStatus.IN_PROGRESS,
        startDate,
        endDate,
        undefined,
        currentDate
      );

      expect(metrics.isDelayed).toBe(true);
      expect(metrics.daysRemaining).toBeLessThan(0);
    });
  });

  describe('getRequiredFieldsForStatus', () => {
    it('should return required fields for each status', () => {
      expect(ProjectLifecycle.getRequiredFieldsForStatus(ProjectStatus.QUOTED))
        .toEqual(['name', 'clientName', 'contractAmount', 'startDate', 'endDate']);

      expect(ProjectLifecycle.getRequiredFieldsForStatus(ProjectStatus.AWARDED))
        .toEqual(['foremanId', 'crewSize', 'address']);

      expect(ProjectLifecycle.getRequiredFieldsForStatus(ProjectStatus.IN_PROGRESS))
        .toEqual(['actualStartDate', 'phases']);

      expect(ProjectLifecycle.getRequiredFieldsForStatus(ProjectStatus.COMPLETED))
        .toEqual(['actualEndDate']);

      expect(ProjectLifecycle.getRequiredFieldsForStatus(ProjectStatus.ON_HOLD))
        .toEqual([]);

      expect(ProjectLifecycle.getRequiredFieldsForStatus(ProjectStatus.CANCELLED))
        .toEqual([]);
    });
  });

  describe('getStatusActions', () => {
    it('should return available actions for each status', () => {
      const quotedActions = ProjectLifecycle.getStatusActions(ProjectStatus.QUOTED);
      expect(quotedActions).toContain('Edit Quote');
      expect(quotedActions).toContain('Accept Award');
      expect(quotedActions).toContain('Cancel Project');

      const inProgressActions = ProjectLifecycle.getStatusActions(ProjectStatus.IN_PROGRESS);
      expect(inProgressActions).toContain('Update Progress');
      expect(inProgressActions).toContain('Manage Crew');
      expect(inProgressActions).toContain('Put On Hold');
      expect(inProgressActions).toContain('Mark Complete');

      const completedActions = ProjectLifecycle.getStatusActions(ProjectStatus.COMPLETED);
      expect(completedActions).toContain('Generate Report');
      expect(completedActions).toContain('View Financials');

      const cancelledActions = ProjectLifecycle.getStatusActions(ProjectStatus.CANCELLED);
      expect(cancelledActions).toContain('Archive');
      expect(cancelledActions).toContain('View History');
    });
  });
});