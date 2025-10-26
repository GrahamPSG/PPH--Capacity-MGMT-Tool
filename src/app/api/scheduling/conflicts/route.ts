import { NextRequest, NextResponse } from 'next/server';
import { ConflictDetectionService, ConflictType, ConflictSeverity } from '@/services/scheduling/ConflictDetectionService';
import { withAuth } from '@/lib/auth/middleware';

const conflictService = new ConflictDetectionService();

/**
 * GET /api/scheduling/conflicts
 * List all active conflicts or filter by type/severity
 */
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as ConflictType | null;
    const severity = searchParams.get('severity') as ConflictSeverity | null;
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');

    // Get all conflicts
    let conflicts = await conflictService.scanAllConflicts();

    // Apply filters
    if (type) {
      conflicts = conflicts.filter(c => c.type === type);
    }

    if (severity) {
      conflicts = conflicts.filter(c => c.severity === severity);
    }

    if (entityType) {
      conflicts = conflicts.filter(c => c.entityType === entityType);
    }

    if (entityId) {
      conflicts = conflicts.filter(
        c => c.entityId === entityId || c.relatedEntities.includes(entityId)
      );
    }

    // Sort by severity (critical first) and date
    conflicts.sort((a, b) => {
      const severityOrder = {
        CRITICAL: 0,
        HIGH: 1,
        MEDIUM: 2,
        LOW: 3,
      };

      if (a.severity !== b.severity) {
        return severityOrder[a.severity] - severityOrder[b.severity];
      }

      return b.detectedAt.getTime() - a.detectedAt.getTime();
    });

    // Get resolution suggestions for each conflict
    const conflictsWithResolutions = await Promise.all(
      conflicts.map(async (conflict) => ({
        ...conflict,
        resolutionSuggestions: await conflictService.getResolutionSuggestions(conflict),
      }))
    );

    return NextResponse.json({
      success: true,
      count: conflictsWithResolutions.length,
      conflicts: conflictsWithResolutions,
      summary: {
        total: conflictsWithResolutions.length,
        critical: conflicts.filter(c => c.severity === 'CRITICAL').length,
        high: conflicts.filter(c => c.severity === 'HIGH').length,
        medium: conflicts.filter(c => c.severity === 'MEDIUM').length,
        low: conflicts.filter(c => c.severity === 'LOW').length,
        byType: Object.values(ConflictType).reduce((acc, type) => {
          acc[type] = conflicts.filter(c => c.type === type).length;
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    console.error('Error fetching conflicts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch conflicts',
      },
      { status: 500 }
    );
  }
});

/**
 * DELETE /api/scheduling/conflicts
 * Clear conflict cache to force rescan
 */
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    // Check if user has permission to clear cache
    const user = (request as any).user;
    if (!user || !['OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Insufficient permissions',
        },
        { status: 403 }
      );
    }

    conflictService.clearCache();

    return NextResponse.json({
      success: true,
      message: 'Conflict cache cleared successfully',
    });
  } catch (error) {
    console.error('Error clearing conflict cache:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to clear conflict cache',
      },
      { status: 500 }
    );
  }
});