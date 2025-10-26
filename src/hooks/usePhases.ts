/**
 * React Query hooks for Phase management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ProjectPhase, PhaseStatus } from '@prisma/client';

// API client functions
const phasesAPI = {
  // Get phases with filters
  getPhases: async (filters?: {
    projectId?: string;
    status?: PhaseStatus;
    division?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<ProjectPhase[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value instanceof Date ? value.toISOString() : String(value));
        }
      });
    }

    const response = await fetch(`/api/phases?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch phases');
    }
    return response.json();
  },

  // Get single phase
  getPhase: async (id: string): Promise<ProjectPhase> => {
    const response = await fetch(`/api/phases/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch phase');
    }
    return response.json();
  },

  // Create phase
  createPhase: async (data: any): Promise<ProjectPhase> => {
    const response = await fetch('/api/phases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create phase');
    }
    return response.json();
  },

  // Create bulk phases
  createBulkPhases: async (projectId: string, phases: any[]): Promise<ProjectPhase[]> => {
    const response = await fetch('/api/phases', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, phases })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create phases');
    }
    return response.json();
  },

  // Update phase
  updatePhase: async ({ id, data }: { id: string; data: any }): Promise<ProjectPhase> => {
    const response = await fetch(`/api/phases/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update phase');
    }
    return response.json();
  },

  // Update phase progress
  updatePhaseProgress: async ({ id, progress }: { id: string; progress: number }): Promise<ProjectPhase> => {
    const response = await fetch(`/api/phases/${id}/progress`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ progressPercentage: progress })
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update progress');
    }
    return response.json();
  },

  // Delete phase
  deletePhase: async (id: string): Promise<void> => {
    const response = await fetch(`/api/phases/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete phase');
    }
  },

  // Get phase assignments
  getPhaseAssignments: async (phaseId: string) => {
    const response = await fetch(`/api/phases/${phaseId}/assignments`);
    if (!response.ok) {
      throw new Error('Failed to fetch phase assignments');
    }
    return response.json();
  },

  // Check phase dependencies
  checkDependencies: async (phaseId: string, dependencies: string[]) => {
    const response = await fetch(`/api/phases/${phaseId}/dependencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dependencies })
    });
    if (!response.ok) {
      throw new Error('Failed to check dependencies');
    }
    return response.json();
  }
};

// Query Keys
export const phaseKeys = {
  all: ['phases'] as const,
  lists: () => [...phaseKeys.all, 'list'] as const,
  list: (filters?: any) => [...phaseKeys.lists(), filters] as const,
  details: () => [...phaseKeys.all, 'detail'] as const,
  detail: (id: string) => [...phaseKeys.details(), id] as const,
  assignments: (id: string) => [...phaseKeys.detail(id), 'assignments'] as const,
  projectPhases: (projectId: string) => [...phaseKeys.all, 'project', projectId] as const,
};

// Hooks

/**
 * Get all phases with optional filters
 */
export function usePhases(filters?: {
  projectId?: string;
  status?: PhaseStatus;
  division?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  return useQuery({
    queryKey: phaseKeys.list(filters),
    queryFn: () => phasesAPI.getPhases(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get phases for a specific project
 */
export function useProjectPhases(projectId: string) {
  return useQuery({
    queryKey: phaseKeys.projectPhases(projectId),
    queryFn: () => phasesAPI.getPhases({ projectId }),
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * Get single phase by ID
 */
export function usePhase(id: string) {
  return useQuery({
    queryKey: phaseKeys.detail(id),
    queryFn: () => phasesAPI.getPhase(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Create new phase
 */
export function useCreatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: phasesAPI.createPhase,
    onSuccess: (newPhase) => {
      // Invalidate and refetch phases list
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
      // Invalidate project phases if projectId exists
      if (newPhase.projectId) {
        queryClient.invalidateQueries({
          queryKey: phaseKeys.projectPhases(newPhase.projectId)
        });
      }
      // Add the new phase to the cache
      queryClient.setQueryData(phaseKeys.detail(newPhase.id), newPhase);
    },
  });
}

/**
 * Create multiple phases at once
 */
export function useCreateBulkPhases() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, phases }: { projectId: string; phases: any[] }) =>
      phasesAPI.createBulkPhases(projectId, phases),
    onSuccess: (newPhases, variables) => {
      // Invalidate and refetch phases list
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
      // Invalidate project phases
      queryClient.invalidateQueries({
        queryKey: phaseKeys.projectPhases(variables.projectId)
      });
      // Add each new phase to the cache
      newPhases.forEach(phase => {
        queryClient.setQueryData(phaseKeys.detail(phase.id), phase);
      });
    },
  });
}

/**
 * Update existing phase
 */
export function useUpdatePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: phasesAPI.updatePhase,
    onSuccess: (updatedPhase) => {
      // Update the phase in the cache
      queryClient.setQueryData(phaseKeys.detail(updatedPhase.id), updatedPhase);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
      if (updatedPhase.projectId) {
        queryClient.invalidateQueries({
          queryKey: phaseKeys.projectPhases(updatedPhase.projectId)
        });
      }
    },
  });
}

/**
 * Update phase progress
 */
export function useUpdatePhaseProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: phasesAPI.updatePhaseProgress,
    onSuccess: (updatedPhase) => {
      // Update the phase in the cache
      queryClient.setQueryData(phaseKeys.detail(updatedPhase.id), updatedPhase);
      // Invalidate lists to reflect progress change
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
      if (updatedPhase.projectId) {
        queryClient.invalidateQueries({
          queryKey: phaseKeys.projectPhases(updatedPhase.projectId)
        });
      }
    },
  });
}

/**
 * Delete phase
 */
export function useDeletePhase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: phasesAPI.deletePhase,
    onSuccess: (_, phaseId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: phaseKeys.detail(phaseId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
      // Invalidate all project phases (since we don't know the projectId here)
      queryClient.invalidateQueries({
        queryKey: phaseKeys.all,
        predicate: (query) => query.queryKey.includes('project')
      });
    },
  });
}

/**
 * Get phase assignments
 */
export function usePhaseAssignments(phaseId: string) {
  return useQuery({
    queryKey: phaseKeys.assignments(phaseId),
    queryFn: () => phasesAPI.getPhaseAssignments(phaseId),
    enabled: !!phaseId,
    staleTime: 30000,
  });
}

/**
 * Check phase dependencies
 */
export function useCheckDependencies() {
  return useMutation({
    mutationFn: ({ phaseId, dependencies }: { phaseId: string; dependencies: string[] }) =>
      phasesAPI.checkDependencies(phaseId, dependencies),
  });
}

/**
 * Prefetch phase data
 */
export function usePrefetchPhase() {
  const queryClient = useQueryClient();

  return async (phaseId: string) => {
    await queryClient.prefetchQuery({
      queryKey: phaseKeys.detail(phaseId),
      queryFn: () => phasesAPI.getPhase(phaseId),
      staleTime: 30000,
    });
  };
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticPhaseUpdate() {
  const queryClient = useQueryClient();

  return {
    updateOptimistically: (phaseId: string, updates: Partial<ProjectPhase>) => {
      queryClient.setQueryData<ProjectPhase>(
        phaseKeys.detail(phaseId),
        (old) => old ? { ...old, ...updates } : old
      );

      // Also update in lists
      queryClient.setQueriesData<ProjectPhase[]>(
        { queryKey: phaseKeys.lists() },
        (old) => old?.map(p => p.id === phaseId ? { ...p, ...updates } : p)
      );
    },
    rollback: (phaseId: string) => {
      queryClient.invalidateQueries({ queryKey: phaseKeys.detail(phaseId) });
      queryClient.invalidateQueries({ queryKey: phaseKeys.lists() });
    }
  };
}