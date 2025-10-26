/**
 * React Query hooks for Crew Assignment management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CrewAssignment, EmployeeType } from '@prisma/client';

// API client functions
const assignmentsAPI = {
  // Get assignments with filters
  getAssignments: async (filters?: {
    phaseId?: string;
    employeeId?: string;
    projectId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<CrewAssignment[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value instanceof Date ? value.toISOString() : String(value));
        }
      });
    }

    const response = await fetch(`/api/assignments?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch assignments');
    }
    return response.json();
  },

  // Get single assignment
  getAssignment: async (id: string): Promise<CrewAssignment> => {
    const response = await fetch(`/api/assignments/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch assignment');
    }
    return response.json();
  },

  // Create assignment
  createAssignment: async (data: {
    phaseId: string;
    employeeId: string;
    assignmentDate: Date;
    hoursAllocated: number;
    role: EmployeeType;
    isLead?: boolean;
    notes?: string;
  }): Promise<CrewAssignment> => {
    const response = await fetch('/api/assignments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create assignment');
    }
    return response.json();
  },

  // Bulk assign crew
  bulkAssignCrew: async (phaseId: string, assignments: Array<{
    employeeId: string;
    hoursAllocated: number;
    role: EmployeeType;
    isLead?: boolean;
  }>): Promise<CrewAssignment[]> => {
    const response = await fetch('/api/assignments', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseId, assignments })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create assignments');
    }
    return response.json();
  },

  // Update assignment
  updateAssignment: async ({ id, data }: {
    id: string;
    data: {
      hoursAllocated?: number;
      actualHoursWorked?: number;
      isLead?: boolean;
      notes?: string;
    };
  }): Promise<CrewAssignment> => {
    const response = await fetch(`/api/assignments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update assignment');
    }
    return response.json();
  },

  // Delete assignment
  deleteAssignment: async (id: string): Promise<void> => {
    const response = await fetch(`/api/assignments/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete assignment');
    }
  },

  // Validate assignment (check conflicts)
  validateAssignment: async (data: {
    phaseId: string;
    employeeId: string;
    assignmentDate: Date;
    hoursAllocated: number;
  }) => {
    const response = await fetch('/api/assignments/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      throw new Error('Failed to validate assignment');
    }
    return response.json();
  },

  // Get employee availability
  getEmployeeAvailability: async (employeeId: string, startDate: Date, endDate: Date) => {
    const params = new URLSearchParams({
      employeeId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
    const response = await fetch(`/api/employees/${employeeId}/availability?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch availability');
    }
    return response.json();
  }
};

// Query Keys
export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  list: (filters?: any) => [...assignmentKeys.lists(), filters] as const,
  details: () => [...assignmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...assignmentKeys.details(), id] as const,
  phase: (phaseId: string) => [...assignmentKeys.all, 'phase', phaseId] as const,
  employee: (employeeId: string) => [...assignmentKeys.all, 'employee', employeeId] as const,
  validation: (data: any) => [...assignmentKeys.all, 'validation', data] as const,
};

// Hooks

/**
 * Get all assignments with optional filters
 */
export function useAssignments(filters?: {
  phaseId?: string;
  employeeId?: string;
  projectId?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: assignmentKeys.list(filters),
    queryFn: () => assignmentsAPI.getAssignments(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get assignments for a specific phase
 */
export function usePhaseAssignments(phaseId: string) {
  return useQuery({
    queryKey: assignmentKeys.phase(phaseId),
    queryFn: () => assignmentsAPI.getAssignments({ phaseId }),
    enabled: !!phaseId,
    staleTime: 30000,
  });
}

/**
 * Get assignments for a specific employee
 */
export function useEmployeeAssignments(employeeId: string) {
  return useQuery({
    queryKey: assignmentKeys.employee(employeeId),
    queryFn: () => assignmentsAPI.getAssignments({ employeeId }),
    enabled: !!employeeId,
    staleTime: 30000,
  });
}

/**
 * Get single assignment by ID
 */
export function useAssignment(id: string) {
  return useQuery({
    queryKey: assignmentKeys.detail(id),
    queryFn: () => assignmentsAPI.getAssignment(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Create new assignment
 */
export function useCreateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignmentsAPI.createAssignment,
    onSuccess: (newAssignment) => {
      // Invalidate and refetch assignments list
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      // Invalidate phase assignments
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.phase(newAssignment.phaseId)
      });
      // Invalidate employee assignments
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.employee(newAssignment.employeeId)
      });
      // Add the new assignment to the cache
      queryClient.setQueryData(assignmentKeys.detail(newAssignment.id), newAssignment);
    },
  });
}

/**
 * Bulk assign crew to a phase
 */
export function useBulkAssignCrew() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ phaseId, assignments }: {
      phaseId: string;
      assignments: Array<{
        employeeId: string;
        hoursAllocated: number;
        role: EmployeeType;
        isLead?: boolean;
      }>;
    }) => assignmentsAPI.bulkAssignCrew(phaseId, assignments),
    onSuccess: (newAssignments, variables) => {
      // Invalidate and refetch assignments list
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      // Invalidate phase assignments
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.phase(variables.phaseId)
      });
      // Invalidate employee assignments for all assigned employees
      variables.assignments.forEach(assignment => {
        queryClient.invalidateQueries({
          queryKey: assignmentKeys.employee(assignment.employeeId)
        });
      });
    },
  });
}

/**
 * Update existing assignment
 */
export function useUpdateAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignmentsAPI.updateAssignment,
    onSuccess: (updatedAssignment) => {
      // Update the assignment in the cache
      queryClient.setQueryData(assignmentKeys.detail(updatedAssignment.id), updatedAssignment);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.phase(updatedAssignment.phaseId)
      });
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.employee(updatedAssignment.employeeId)
      });
    },
  });
}

/**
 * Delete assignment
 */
export function useDeleteAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: assignmentsAPI.deleteAssignment,
    onSuccess: (_, assignmentId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: assignmentKeys.detail(assignmentId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
      // Invalidate all phase and employee assignments
      queryClient.invalidateQueries({
        queryKey: assignmentKeys.all,
        predicate: (query) =>
          query.queryKey.includes('phase') || query.queryKey.includes('employee')
      });
    },
  });
}

/**
 * Validate assignment (check for conflicts)
 */
export function useValidateAssignment() {
  return useMutation({
    mutationFn: assignmentsAPI.validateAssignment,
  });
}

/**
 * Get employee availability
 */
export function useEmployeeAvailability(
  employeeId: string,
  startDate: Date,
  endDate: Date
) {
  return useQuery({
    queryKey: ['employee-availability', employeeId, startDate, endDate],
    queryFn: () => assignmentsAPI.getEmployeeAvailability(employeeId, startDate, endDate),
    enabled: !!employeeId && !!startDate && !!endDate,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Prefetch assignment data
 */
export function usePrefetchAssignment() {
  const queryClient = useQueryClient();

  return async (assignmentId: string) => {
    await queryClient.prefetchQuery({
      queryKey: assignmentKeys.detail(assignmentId),
      queryFn: () => assignmentsAPI.getAssignment(assignmentId),
      staleTime: 30000,
    });
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticAssignmentUpdate() {
  const queryClient = useQueryClient();

  return {
    updateOptimistically: (assignmentId: string, updates: Partial<CrewAssignment>) => {
      queryClient.setQueryData<CrewAssignment>(
        assignmentKeys.detail(assignmentId),
        (old) => old ? { ...old, ...updates } : old
      );

      // Also update in lists
      queryClient.setQueriesData<CrewAssignment[]>(
        { queryKey: assignmentKeys.lists() },
        (old) => old?.map(a => a.id === assignmentId ? { ...a, ...updates } : a)
      );
    },
    rollback: (assignmentId: string) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.detail(assignmentId) });
      queryClient.invalidateQueries({ queryKey: assignmentKeys.lists() });
    }
  };
}