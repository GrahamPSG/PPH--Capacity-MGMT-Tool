import prisma from '@/lib/prisma/client';

interface DependencyValidation {
  valid: boolean;
  reason?: string;
}

interface PhaseNode {
  id: string;
  phaseNumber: number;
  name: string;
  dependencies: string[];
  startDate: Date;
  endDate: Date;
  duration: number;
}

export class DependencyResolver {
  /**
   * Validate phase dependencies
   */
  static async validateDependencies(
    projectId: string,
    dependencies: string[],
    currentPhaseId?: string
  ): Promise<DependencyValidation> {
    if (!dependencies || dependencies.length === 0) {
      return { valid: true };
    }

    // Check all dependencies exist and belong to the same project
    const dependencyPhases = await prisma.projectPhase.findMany({
      where: {
        id: { in: dependencies }
      },
      select: {
        id: true,
        projectId: true,
        name: true,
        dependencies: true
      }
    });

    if (dependencyPhases.length !== dependencies.length) {
      return {
        valid: false,
        reason: 'One or more dependency phases not found'
      };
    }

    // Verify all dependencies belong to the same project
    const invalidProjectDeps = dependencyPhases.filter(phase => phase.projectId !== projectId);
    if (invalidProjectDeps.length > 0) {
      return {
        valid: false,
        reason: 'Dependencies must belong to the same project'
      };
    }

    // Check for circular dependencies
    if (currentPhaseId) {
      const hasCircular = await this.detectCircularDependency(
        currentPhaseId,
        dependencies,
        projectId
      );
      if (hasCircular) {
        return {
          valid: false,
          reason: 'Circular dependency detected'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Detect circular dependencies
   */
  private static async detectCircularDependency(
    phaseId: string,
    newDependencies: string[],
    projectId: string
  ): Promise<boolean> {
    // Build dependency graph
    const allPhases = await prisma.projectPhase.findMany({
      where: { projectId },
      select: {
        id: true,
        dependencies: true
      }
    });

    // Create adjacency list
    const graph: Record<string, string[]> = {};
    for (const phase of allPhases) {
      if (phase.id === phaseId) {
        graph[phase.id] = newDependencies;
      } else {
        graph[phase.id] = phase.dependencies;
      }
    }

    // DFS to detect cycle
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph[node] || [];
      for (const dep of dependencies) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) return true;
        } else if (recursionStack.has(dep)) {
          return true; // Cycle detected
        }
      }

      recursionStack.delete(node);
      return false;
    };

    return hasCycle(phaseId);
  }

  /**
   * Calculate critical path for project
   */
  static async calculateCriticalPath(projectId: string): Promise<PhaseNode[]> {
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      orderBy: { phaseNumber: 'asc' }
    });

    if (phases.length === 0) return [];

    // Convert to PhaseNode format
    const nodes: PhaseNode[] = phases.map(phase => ({
      id: phase.id,
      phaseNumber: phase.phaseNumber,
      name: phase.name,
      dependencies: phase.dependencies,
      startDate: phase.startDate,
      endDate: phase.endDate,
      duration: phase.duration
    }));

    // Topological sort to get execution order
    const sorted = await this.topologicalSort(nodes);

    // Calculate earliest start and finish times
    const earliestTimes: Record<string, { start: number; finish: number }> = {};

    for (const node of sorted) {
      let earliestStart = 0;

      // Find latest finish time of all dependencies
      for (const depId of node.dependencies) {
        if (earliestTimes[depId]) {
          earliestStart = Math.max(earliestStart, earliestTimes[depId].finish);
        }
      }

      earliestTimes[node.id] = {
        start: earliestStart,
        finish: earliestStart + node.duration
      };
    }

    // Calculate latest start and finish times (backward pass)
    const projectFinish = Math.max(...Object.values(earliestTimes).map(t => t.finish));
    const latestTimes: Record<string, { start: number; finish: number }> = {};

    for (let i = sorted.length - 1; i >= 0; i--) {
      const node = sorted[i];
      let latestFinish = projectFinish;

      // Find earliest start time of all dependents
      for (const otherNode of nodes) {
        if (otherNode.dependencies.includes(node.id) && latestTimes[otherNode.id]) {
          latestFinish = Math.min(latestFinish, latestTimes[otherNode.id].start);
        }
      }

      latestTimes[node.id] = {
        finish: latestFinish,
        start: latestFinish - node.duration
      };
    }

    // Find critical path (phases with zero slack)
    const criticalPath: PhaseNode[] = [];
    for (const node of sorted) {
      const slack = latestTimes[node.id].start - earliestTimes[node.id].start;
      if (Math.abs(slack) < 0.001) { // Float comparison tolerance
        criticalPath.push(node);
      }
    }

    return criticalPath;
  }

  /**
   * Topological sort of phases
   */
  static async topologicalSort(nodes: PhaseNode[]): Promise<PhaseNode[]> {
    const graph: Record<string, string[]> = {};
    const inDegree: Record<string, number> = {};

    // Initialize graph and in-degree count
    for (const node of nodes) {
      graph[node.id] = [];
      inDegree[node.id] = node.dependencies.length;
    }

    // Build reverse adjacency list
    for (const node of nodes) {
      for (const dep of node.dependencies) {
        if (graph[dep]) {
          graph[dep].push(node.id);
        }
      }
    }

    // Find nodes with no dependencies
    const queue: string[] = [];
    for (const node of nodes) {
      if (inDegree[node.id] === 0) {
        queue.push(node.id);
      }
    }

    const sorted: PhaseNode[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentNode = nodes.find(n => n.id === currentId)!;
      sorted.push(currentNode);

      // Process dependent nodes
      for (const dependentId of graph[currentId]) {
        inDegree[dependentId]--;
        if (inDegree[dependentId] === 0) {
          queue.push(dependentId);
        }
      }
    }

    if (sorted.length !== nodes.length) {
      throw new Error('Circular dependency detected in phase dependencies');
    }

    return sorted;
  }

  /**
   * Get dependency graph data for visualization
   */
  static async getDependencyGraph(projectId: string) {
    const phases = await prisma.projectPhase.findMany({
      where: { projectId },
      select: {
        id: true,
        phaseNumber: true,
        name: true,
        dependencies: true,
        status: true,
        progressPercentage: true,
        startDate: true,
        endDate: true
      },
      orderBy: { phaseNumber: 'asc' }
    });

    const nodes = phases.map(phase => ({
      id: phase.id,
      label: `${phase.phaseNumber}. ${phase.name}`,
      status: phase.status,
      progress: phase.progressPercentage,
      startDate: phase.startDate.toISOString(),
      endDate: phase.endDate.toISOString()
    }));

    const edges: any[] = [];
    for (const phase of phases) {
      for (const depId of phase.dependencies) {
        edges.push({
          source: depId,
          target: phase.id
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Auto-adjust dependent phase dates
   */
  static async adjustDependentDates(phaseId: string, newEndDate: Date) {
    const dependentPhases = await prisma.projectPhase.findMany({
      where: {
        dependencies: { has: phaseId }
      },
      orderBy: { phaseNumber: 'asc' }
    });

    for (const dependent of dependentPhases) {
      const daysDiff = Math.ceil(
        (dependent.startDate.getTime() - newEndDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff < 1) {
        // Need to push out dependent phase
        const adjustment = 1 - daysDiff;
        const newStartDate = new Date(dependent.startDate);
        newStartDate.setDate(newStartDate.getDate() + adjustment);

        const newEndDateDep = new Date(dependent.endDate);
        newEndDateDep.setDate(newEndDateDep.getDate() + adjustment);

        await prisma.projectPhase.update({
          where: { id: dependent.id },
          data: {
            startDate: newStartDate,
            endDate: newEndDateDep
          }
        });

        // Recursively adjust dependents of this phase
        await this.adjustDependentDates(dependent.id, newEndDateDep);
      }
    }
  }
}