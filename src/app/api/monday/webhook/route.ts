import { NextRequest, NextResponse } from 'next/server';
import { getMondayService } from '@/services/monday/MondayService';
import { prisma } from '@/lib/prisma/client';

// Monday.com sends a challenge when setting up webhooks
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle webhook challenge (Monday.com webhook setup)
    if (body.challenge) {
      return NextResponse.json({ challenge: body.challenge });
    }

    // Verify webhook signature (optional but recommended)
    const signature = request.headers.get('authorization');
    if (!verifyMondaySignature(signature, JSON.stringify(body))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Handle the webhook event
    const { event } = body;

    if (!event) {
      return NextResponse.json({ error: 'No event data' }, { status: 400 });
    }

    // Process different event types
    switch (event.type) {
      case 'change_column_value':
        await handleColumnValueChange(event);
        break;

      case 'create_item':
        await handleItemCreated(event);
        break;

      case 'change_status_column_value':
        await handleStatusChange(event);
        break;

      case 'item_deleted':
        await handleItemDeleted(event);
        break;

      default:
        console.log(`Unhandled Monday.com event type: ${event.type}`);
    }

    // Log the sync event
    await prisma.mondaySync.create({
      data: {
        syncType: 'WEBHOOK',
        status: 'COMPLETED',
        boardId: event.boardId,
        itemsProcessed: 1,
        itemsFailed: 0,
        triggeredBy: 'monday_webhook',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Monday webhook error:', error);

    // Log failed sync
    await prisma.mondaySync.create({
      data: {
        syncType: 'WEBHOOK',
        status: 'FAILED',
        boardId: 'unknown',
        itemsProcessed: 0,
        itemsFailed: 1,
        errorLog: error instanceof Error ? error.message : 'Unknown error',
        triggeredBy: 'monday_webhook',
      },
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Verify Monday.com webhook signature
function verifyMondaySignature(signature: string | null, body: string): boolean {
  if (!signature) return false;

  const secret = process.env.MONDAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('MONDAY_WEBHOOK_SECRET not set, skipping signature verification');
    return true; // Skip verification if secret not set (development)
  }

  // Monday.com uses HMAC SHA256 for webhook signatures
  const crypto = require('crypto');
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(body);
  const calculatedSignature = hmac.digest('hex');

  return signature === calculatedSignature;
}

// Handle column value changes
async function handleColumnValueChange(event: any) {
  const { boardId, itemId, columnId, value, previousValue } = event;

  // Map Monday.com column IDs to our database fields
  const columnMapping: Record<string, string> = {
    'status': 'status',
    'contract_amount': 'contractAmount',
    'start_date': 'startDate',
    'end_date': 'endDate',
    'foreman': 'foremanName',
  };

  const field = columnMapping[columnId];
  if (!field) {
    console.log(`Unmapped column: ${columnId}`);
    return;
  }

  // Find the project by Monday item ID
  const project = await prisma.project.findFirst({
    where: {
      mondayItemId: itemId,
    },
  });

  if (!project) {
    console.log(`Project not found for Monday item: ${itemId}`);
    return;
  }

  // Update the project based on the changed column
  const updateData: any = {};

  switch (field) {
    case 'status':
      updateData.status = mapMondayStatusToProjectStatus(value.label);
      break;
    case 'contractAmount':
      updateData.contractAmount = parseFloat(value);
      break;
    case 'startDate':
    case 'endDate':
      updateData[field] = new Date(value.date);
      break;
    default:
      updateData[field] = value;
  }

  await prisma.project.update({
    where: { id: project.id },
    data: {
      ...updateData,
      lastMondaySync: new Date(),
    },
  });

  console.log(`Updated project ${project.id} from Monday.com webhook`);
}

// Handle new item creation
async function handleItemCreated(event: any) {
  const { boardId, itemId, itemName, columnValues } = event;

  // Check if project already exists
  const existingProject = await prisma.project.findFirst({
    where: {
      mondayItemId: itemId,
    },
  });

  if (existingProject) {
    console.log(`Project already exists for Monday item: ${itemId}`);
    return;
  }

  // Parse column values
  const projectData = {
    projectCode: columnValues.project_code || generateProjectCode(),
    name: itemName,
    type: mapMondayTypeToProjectType(columnValues.type?.label),
    division: mapMondayDivisionToDivision(columnValues.division?.label),
    status: mapMondayStatusToProjectStatus(columnValues.status?.label),
    contractAmount: parseFloat(columnValues.contract_amount || '0'),
    startDate: new Date(columnValues.start_date?.date || Date.now()),
    endDate: new Date(columnValues.end_date?.date || Date.now()),
    clientName: columnValues.client_name || 'TBD',
    mondayBoardId: boardId,
    mondayItemId: itemId,
    lastMondaySync: new Date(),
    createdById: 'system', // You might want to map this to a real user
    modifiedById: 'system',
  };

  const newProject = await prisma.project.create({
    data: projectData,
  });

  console.log(`Created project ${newProject.id} from Monday.com item ${itemId}`);
}

// Handle status changes
async function handleStatusChange(event: any) {
  const { itemId, value, previousValue } = event;

  const project = await prisma.project.findFirst({
    where: {
      mondayItemId: itemId,
    },
  });

  if (!project) {
    console.log(`Project not found for Monday item: ${itemId}`);
    return;
  }

  const newStatus = mapMondayStatusToProjectStatus(value.label);

  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: newStatus,
      lastMondaySync: new Date(),
    },
  });

  // Create an alert if project is delayed
  if (newStatus === 'ON_HOLD' || value.label?.toLowerCase().includes('delayed')) {
    await prisma.alert.create({
      data: {
        type: 'PROJECT_DELAY',
        severity: 'MEDIUM',
        title: 'Project Status Changed',
        message: `Project ${project.name} status changed from ${previousValue?.label} to ${value.label}`,
        projectId: project.id,
        isRead: false,
        isResolved: false,
      },
    });
  }

  console.log(`Updated project ${project.id} status to ${newStatus}`);
}

// Handle item deletion
async function handleItemDeleted(event: any) {
  const { itemId } = event;

  const project = await prisma.project.findFirst({
    where: {
      mondayItemId: itemId,
    },
  });

  if (!project) {
    console.log(`Project not found for deleted Monday item: ${itemId}`);
    return;
  }

  // Soft delete by updating status
  await prisma.project.update({
    where: { id: project.id },
    data: {
      status: 'CANCELLED',
      lastMondaySync: new Date(),
      notes: `Deleted from Monday.com on ${new Date().toISOString()}`,
    },
  });

  console.log(`Marked project ${project.id} as cancelled due to Monday.com deletion`);
}

// Helper functions for mapping Monday.com values to our enums
function mapMondayStatusToProjectStatus(mondayStatus: string): any {
  const statusMap: Record<string, string> = {
    'quoted': 'QUOTED',
    'awarded': 'AWARDED',
    'in progress': 'IN_PROGRESS',
    'on hold': 'ON_HOLD',
    'completed': 'COMPLETED',
    'cancelled': 'CANCELLED',
  };

  return statusMap[mondayStatus?.toLowerCase()] || 'QUOTED';
}

function mapMondayTypeToProjectType(mondayType: string): any {
  const typeMap: Record<string, string> = {
    'multifamily': 'MULTIFAMILY',
    'commercial': 'COMMERCIAL',
    'custom home': 'CUSTOM_HOME',
    'custom': 'CUSTOM_HOME',
  };

  return typeMap[mondayType?.toLowerCase()] || 'COMMERCIAL';
}

function mapMondayDivisionToDivision(mondayDivision: string): any {
  const divisionMap: Record<string, string> = {
    'plumbing multifamily': 'PLUMBING_MULTIFAMILY',
    'plumbing commercial': 'PLUMBING_COMMERCIAL',
    'plumbing custom': 'PLUMBING_CUSTOM',
    'hvac multifamily': 'HVAC_MULTIFAMILY',
    'hvac commercial': 'HVAC_COMMERCIAL',
    'hvac custom': 'HVAC_CUSTOM',
  };

  return divisionMap[mondayDivision?.toLowerCase()] || 'PLUMBING_COMMERCIAL';
}

function generateProjectCode(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `PRJ-${timestamp}-${random}`.toUpperCase();
}