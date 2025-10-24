import prisma from '@/lib/prisma/client';
import { ProjectType, ProjectStatus, Division, Prisma } from '@prisma/client';
import { ProjectValidator } from './ProjectValidator';
import { ProjectLifecycle } from './ProjectLifecycle';

export interface CreateProjectInput {
  name: string;
  type: ProjectType;
  division: Division;
  status?: ProjectStatus;
  contractAmount: number;
  startDate: Date;
  endDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  foremanId?: string;
  crewSize?: number;
  address?: string;
  clientName: string;
  clientContact?: string;
  mondayBoardId?: string;
  mondayItemId?: string;
  notes?: string;
}

export interface UpdateProjectInput {
  name?: string;
  type?: ProjectType;
  division?: Division;
  contractAmount?: number;
  startDate?: Date;
  endDate?: Date;
  actualStartDate?: Date | null;
  actualEndDate?: Date | null;
  foremanId?: string | null;
  crewSize?: number;
  address?: string | null;
  clientName?: string;
  clientContact?: string | null;
  mondayBoardId?: string | null;
  mondayItemId?: string | null;
  notes?: string | null;
}

export class ProjectService {
  /**
   * Generate next project code
   */
  private static async generateProjectCode(): Promise<string> {
    const lastProject = await prisma.project.findFirst({
      orderBy: { projectCode: 'desc' },
      select: { projectCode: true }
    });

    let nextNumber = 1;
    if (lastProject?.projectCode) {
      const match = lastProject.projectCode.match(/PRJ-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1]) + 1;
      }
    }

    return `PRJ-${nextNumber.toString().padStart(3, '0')}`;
  }

  /**
   * Create a new project
   */
  static async createProject(data: CreateProjectInput, userId: string) {
    const validation = ProjectValidator.validateCreate(data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Verify foreman exists if provided
    if (data.foremanId) {
      const foreman = await prisma.employee.findUnique({
        where: { id: data.foremanId }
      });
      if (!foreman) {
        throw new Error('Invalid foreman ID');
      }
    }

    const projectCode = await this.generateProjectCode();

    return await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          projectCode,
          name: data.name,
          type: data.type,
          division: data.division,
          status: data.status || ProjectStatus.QUOTED,
          contractAmount: data.contractAmount,
          startDate: data.startDate,
          endDate: data.endDate,
          actualStartDate: data.actualStartDate,
          actualEndDate: data.actualEndDate,
          foremanId: data.foremanId,
          crewSize: data.crewSize || 0,
          address: data.address,
          clientName: data.clientName,
          clientContact: data.clientContact,
          mondayBoardId: data.mondayBoardId,
          mondayItemId: data.mondayItemId,
          notes: data.notes,
          createdById: userId,
          modifiedById: userId
        },
        include: {
          foreman: true,
          createdBy: true,
          modifiedBy: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'Project',
          entityId: project.id,
          action: 'CREATE',
          userId,
          changes: { created: data },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return project;
    });
  }

  /**
   * Get all projects with optional filters
   */
  static async getAllProjects(
    filters?: {
      status?: ProjectStatus;
      division?: Division;
      foremanId?: string;
      type?: ProjectType;
    },
    page = 1,
    pageSize = 50
  ) {
    const where: Prisma.ProjectWhereInput = {};

    if (filters) {
      if (filters.status) where.status = filters.status;
      if (filters.division) where.division = filters.division;
      if (filters.foremanId) where.foremanId = filters.foremanId;
      if (filters.type) where.type = filters.type;
    }

    const [projects, total] = await prisma.$transaction([
      prisma.project.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          foreman: true,
          phases: {
            select: {
              id: true,
              name: true,
              status: true,
              progressPercentage: true
            }
          }
        }
      }),
      prisma.project.count({ where })
    ]);

    return {
      projects,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
  }

  /**
   * Get a single project by ID
   */
  static async getProjectById(id: string) {
    return await prisma.project.findUnique({
      where: { id },
      include: {
        foreman: true,
        createdBy: true,
        modifiedBy: true,
        phases: {
          orderBy: { phaseNumber: 'asc' }
        },
        scheduleOfValues: {
          orderBy: { lineNumber: 'asc' }
        },
        expenses: {
          orderBy: { date: 'desc' },
          take: 10
        }
      }
    });
  }

  /**
   * Get a project by project code
   */
  static async getProjectByCode(projectCode: string) {
    return await prisma.project.findUnique({
      where: { projectCode },
      include: {
        foreman: true,
        createdBy: true,
        modifiedBy: true,
        phases: true
      }
    });
  }

  /**
   * Update a project
   */
  static async updateProject(id: string, data: UpdateProjectInput, userId: string) {
    const validation = ProjectValidator.validateUpdate(data);
    if (!validation.success) {
      throw new Error(`Validation failed: ${validation.errors?.join(', ')}`);
    }

    // Check if project exists
    const existingProject = await prisma.project.findUnique({
      where: { id }
    });

    if (!existingProject) {
      return null;
    }

    // Verify foreman if provided
    if (data.foremanId !== undefined && data.foremanId !== null) {
      const foreman = await prisma.employee.findUnique({
        where: { id: data.foremanId }
      });
      if (!foreman) {
        throw new Error('Invalid foreman ID');
      }
    }

    return await prisma.$transaction(async (tx) => {
      const project = await tx.project.update({
        where: { id },
        data: {
          ...data,
          modifiedById: userId
        },
        include: {
          foreman: true,
          createdBy: true,
          modifiedBy: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'Project',
          entityId: id,
          action: 'UPDATE',
          userId,
          changes: { before: existingProject, after: data },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      return project;
    });
  }

  /**
   * Update project status with lifecycle validation
   */
  static async updateProjectStatus(id: string, newStatus: ProjectStatus, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id }
    });

    if (!project) {
      throw new Error('Project not found');
    }

    // Validate status transition
    const validation = await ProjectLifecycle.validateStatusTransition(
      project,
      newStatus
    );

    if (!validation.valid) {
      throw new Error(`Invalid status transition: ${validation.reason}`);
    }

    return await prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: { id },
        data: {
          status: newStatus,
          modifiedById: userId,
          actualStartDate: newStatus === ProjectStatus.IN_PROGRESS && !project.actualStartDate
            ? new Date()
            : project.actualStartDate,
          actualEndDate: newStatus === ProjectStatus.COMPLETED && !project.actualEndDate
            ? new Date()
            : project.actualEndDate
        },
        include: {
          foreman: true,
          createdBy: true,
          modifiedBy: true
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          entityType: 'Project',
          entityId: id,
          action: 'UPDATE',
          userId,
          changes: {
            statusChange: {
              from: project.status,
              to: newStatus
            }
          },
          ipAddress: '0.0.0.0',
          userAgent: 'API'
        }
      });

      // Create alert for critical status changes
      if (newStatus === ProjectStatus.ON_HOLD || newStatus === ProjectStatus.CANCELLED) {
        await tx.alert.create({
          data: {
            type: 'PROJECT_DELAY',
            severity: 'HIGH',
            title: `Project ${project.projectCode} ${newStatus.toLowerCase()}`,
            message: `Project "${project.name}" has been ${newStatus.toLowerCase()}.`,
            projectId: id,
            userId
          }
        });
      }

      return updatedProject;
    });
  }

  /**
   * Soft delete a project (set status to CANCELLED)
   */
  static async cancelProject(id: string, userId: string, reason?: string) {
    return await this.updateProjectStatus(id, ProjectStatus.CANCELLED, userId);
  }

  /**
   * Get project schedule of values
   */
  static async getProjectScheduleOfValues(projectId: string) {
    return await prisma.scheduleOfValues.findMany({
      where: { projectId },
      orderBy: { lineNumber: 'asc' }
    });
  }

  /**
   * Get project expenses
   */
  static async getProjectExpenses(projectId: string, limit = 100) {
    const [expenses, total] = await prisma.$transaction([
      prisma.projectExpense.findMany({
        where: { projectId },
        orderBy: { date: 'desc' },
        take: limit,
        include: {
          phase: true,
          creator: true,
          approver: true
        }
      }),
      prisma.projectExpense.aggregate({
        where: { projectId },
        _sum: { amount: true }
      })
    ]);

    return {
      expenses,
      totalAmount: total._sum.amount || 0
    };
  }

  /**
   * Get projects by foreman
   */
  static async getProjectsByForeman(foremanId: string) {
    return await prisma.project.findMany({
      where: {
        foremanId,
        status: {
          in: [ProjectStatus.AWARDED, ProjectStatus.IN_PROGRESS]
        }
      },
      orderBy: { startDate: 'asc' },
      include: {
        phases: {
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      }
    });
  }

  /**
   * Get project statistics
   */
  static async getProjectStatistics() {
    const [statusCounts, divisionCounts, totalValue] = await prisma.$transaction([
      prisma.project.groupBy({
        by: ['status'],
        _count: { id: true }
      }),
      prisma.project.groupBy({
        by: ['division'],
        _count: { id: true },
        where: {
          status: {
            in: [ProjectStatus.AWARDED, ProjectStatus.IN_PROGRESS]
          }
        }
      }),
      prisma.project.aggregate({
        where: {
          status: {
            in: [ProjectStatus.AWARDED, ProjectStatus.IN_PROGRESS]
          }
        },
        _sum: { contractAmount: true }
      })
    ]);

    return {
      byStatus: statusCounts.reduce((acc, item) => ({
        ...acc,
        [item.status]: item._count.id
      }), {}),
      byDivision: divisionCounts.reduce((acc, item) => ({
        ...acc,
        [item.division]: item._count.id
      }), {}),
      totalContractValue: totalValue._sum.contractAmount || 0
    };
  }
}