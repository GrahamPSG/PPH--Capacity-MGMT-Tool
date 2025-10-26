/**
 * React Query hooks for Project management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CreateProjectInput,
  UpdateProjectInput,
  UpdateStatusInput,
  ProjectFilterInput
} from '@/services/projects/ProjectValidator';
import { Project, ProjectStatus } from '@prisma/client';

// API client functions
const projectsAPI = {
  // Get all projects with filters
  getProjects: async (filters?: ProjectFilterInput): Promise<Project[]> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      });
    }

    const response = await fetch(`/api/projects?${params.toString()}`);
    if (!response.ok) {
      throw new Error('Failed to fetch projects');
    }
    return response.json();
  },

  // Get single project
  getProject: async (id: string): Promise<Project> => {
    const response = await fetch(`/api/projects/${id}`);
    if (!response.ok) {
      throw new Error('Failed to fetch project');
    }
    return response.json();
  },

  // Create project
  createProject: async (data: CreateProjectInput): Promise<Project> => {
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create project');
    }
    return response.json();
  },

  // Update project
  updateProject: async ({ id, data }: { id: string; data: UpdateProjectInput }): Promise<Project> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update project');
    }
    return response.json();
  },

  // Update project status
  updateProjectStatus: async ({ id, data }: { id: string; data: UpdateStatusInput }): Promise<Project> => {
    const response = await fetch(`/api/projects/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update project status');
    }
    return response.json();
  },

  // Delete project
  deleteProject: async (id: string): Promise<void> => {
    const response = await fetch(`/api/projects/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete project');
    }
  },

  // Get project financials
  getProjectFinancials: async (id: string) => {
    const response = await fetch(`/api/projects/${id}/financials`);
    if (!response.ok) {
      throw new Error('Failed to fetch project financials');
    }
    return response.json();
  },

  // Get project phases
  getProjectPhases: async (id: string) => {
    const response = await fetch(`/api/projects/${id}/phases`);
    if (!response.ok) {
      throw new Error('Failed to fetch project phases');
    }
    return response.json();
  },

  // Get project crew
  getProjectCrew: async (id: string) => {
    const response = await fetch(`/api/projects/${id}/crew`);
    if (!response.ok) {
      throw new Error('Failed to fetch project crew');
    }
    return response.json();
  }
};

// Query Keys
export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilterInput) => [...projectKeys.lists(), filters] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  financials: (id: string) => [...projectKeys.detail(id), 'financials'] as const,
  phases: (id: string) => [...projectKeys.detail(id), 'phases'] as const,
  crew: (id: string) => [...projectKeys.detail(id), 'crew'] as const,
};

// Hooks

/**
 * Get all projects with optional filters
 */
export function useProjects(filters?: ProjectFilterInput) {
  return useQuery({
    queryKey: projectKeys.list(filters),
    queryFn: () => projectsAPI.getProjects(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get single project by ID
 */
export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => projectsAPI.getProject(id),
    enabled: !!id,
    staleTime: 30000,
  });
}

/**
 * Create new project
 */
export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsAPI.createProject,
    onSuccess: (newProject) => {
      // Invalidate and refetch projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
      // Add the new project to the cache
      queryClient.setQueryData(projectKeys.detail(newProject.id), newProject);
    },
  });
}

/**
 * Update existing project
 */
export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsAPI.updateProject,
    onSuccess: (updatedProject) => {
      // Update the project in the cache
      queryClient.setQueryData(projectKeys.detail(updatedProject.id), updatedProject);
      // Invalidate lists to reflect changes
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Update project status
 */
export function useUpdateProjectStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsAPI.updateProjectStatus,
    onSuccess: (updatedProject) => {
      // Update the project in the cache
      queryClient.setQueryData(projectKeys.detail(updatedProject.id), updatedProject);
      // Invalidate lists to reflect status change
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Delete project
 */
export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: projectsAPI.deleteProject,
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
  });
}

/**
 * Get project financials
 */
export function useProjectFinancials(projectId: string) {
  return useQuery({
    queryKey: projectKeys.financials(projectId),
    queryFn: () => projectsAPI.getProjectFinancials(projectId),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get project phases
 */
export function useProjectPhases(projectId: string) {
  return useQuery({
    queryKey: projectKeys.phases(projectId),
    queryFn: () => projectsAPI.getProjectPhases(projectId),
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * Get project crew assignments
 */
export function useProjectCrew(projectId: string) {
  return useQuery({
    queryKey: projectKeys.crew(projectId),
    queryFn: () => projectsAPI.getProjectCrew(projectId),
    enabled: !!projectId,
    staleTime: 30000,
  });
}

/**
 * Prefetch project data
 */
export function usePrefetchProject() {
  const queryClient = useQueryClient();

  return async (projectId: string) => {
    await queryClient.prefetchQuery({
      queryKey: projectKeys.detail(projectId),
      queryFn: () => projectsAPI.getProject(projectId),
      staleTime: 30000,
    });
  };
}

/**
 * Get project statistics
 */
export function useProjectStats() {
  return useQuery({
    queryKey: ['project-stats'],
    queryFn: async () => {
      const response = await fetch('/api/projects/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch project statistics');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });
}

/**
 * Hook for optimistic updates
 */
export function useOptimisticProjectUpdate() {
  const queryClient = useQueryClient();

  return {
    updateOptimistically: (projectId: string, updates: Partial<Project>) => {
      queryClient.setQueryData<Project>(
        projectKeys.detail(projectId),
        (old) => old ? { ...old, ...updates } : old
      );

      // Also update in lists
      queryClient.setQueriesData<Project[]>(
        { queryKey: projectKeys.lists() },
        (old) => old?.map(p => p.id === projectId ? { ...p, ...updates } : p)
      );
    },
    rollback: (projectId: string) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    }
  };
}