import axios, { AxiosInstance } from 'axios';

export interface MondayConfig {
  apiToken: string;
  apiUrl?: string;
}

export interface MondayBoard {
  id: string;
  name: string;
  description?: string;
  state: 'active' | 'archived' | 'deleted';
}

export interface MondayItem {
  id: string;
  name: string;
  boardId: string;
  groupId: string;
  columnValues: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MondayColumn {
  id: string;
  title: string;
  type: string;
  settings?: any;
}

export interface MondayWebhookPayload {
  event: {
    type: string;
    id: string;
    boardId: string;
    groupId?: string;
    itemId?: string;
    columnId?: string;
    value?: any;
    previousValue?: any;
    createdAt: string;
  };
  board?: MondayBoard;
  item?: MondayItem;
}

export class MondayService {
  private client: AxiosInstance;
  private apiToken: string;

  constructor(config: MondayConfig) {
    this.apiToken = config.apiToken;
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.monday.com/v2',
      headers: {
        'Authorization': this.apiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  // Board Operations
  async getBoards(): Promise<MondayBoard[]> {
    const query = `
      query {
        boards {
          id
          name
          description
          state
        }
      }
    `;

    const response = await this.client.post('', { query });
    return response.data.data.boards;
  }

  async getBoardById(boardId: string): Promise<MondayBoard> {
    const query = `
      query ($id: ID!) {
        boards(ids: [$id]) {
          id
          name
          description
          state
          columns {
            id
            title
            type
            settings_str
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { id: boardId },
    });

    return response.data.data.boards[0];
  }

  // Item Operations
  async getItems(boardId: string, limit: number = 100): Promise<MondayItem[]> {
    const query = `
      query ($boardId: ID!, $limit: Int!) {
        boards(ids: [$boardId]) {
          items(limit: $limit) {
            id
            name
            group {
              id
              title
            }
            column_values {
              id
              title
              value
              text
            }
            created_at
            updated_at
          }
        }
      }
    `;

    const response = await this.client.post('', {
      query,
      variables: { boardId, limit },
    });

    const board = response.data.data.boards[0];
    if (!board) return [];

    return board.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      boardId: boardId,
      groupId: item.group.id,
      columnValues: this.parseColumnValues(item.column_values),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    }));
  }

  async createItem(
    boardId: string,
    groupId: string,
    itemName: string,
    columnValues: Record<string, any> = {}
  ): Promise<MondayItem> {
    const mutation = `
      mutation ($boardId: ID!, $groupId: String!, $itemName: String!, $columnValues: JSON!) {
        create_item(
          board_id: $boardId,
          group_id: $groupId,
          item_name: $itemName,
          column_values: $columnValues
        ) {
          id
          name
          created_at
          updated_at
        }
      }
    `;

    const response = await this.client.post('', {
      query: mutation,
      variables: {
        boardId,
        groupId,
        itemName,
        columnValues: JSON.stringify(columnValues),
      },
    });

    return response.data.data.create_item;
  }

  async updateItem(
    itemId: string,
    columnValues: Record<string, any>
  ): Promise<MondayItem> {
    const mutation = `
      mutation ($itemId: ID!, $columnValues: JSON!) {
        change_multiple_column_values(
          item_id: $itemId,
          board_id: $boardId,
          column_values: $columnValues
        ) {
          id
          name
          updated_at
        }
      }
    `;

    const response = await this.client.post('', {
      query: mutation,
      variables: {
        itemId,
        columnValues: JSON.stringify(columnValues),
      },
    });

    return response.data.data.change_multiple_column_values;
  }

  async updateColumnValue(
    boardId: string,
    itemId: string,
    columnId: string,
    value: any
  ): Promise<void> {
    const mutation = `
      mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
        change_column_value(
          board_id: $boardId,
          item_id: $itemId,
          column_id: $columnId,
          value: $value
        ) {
          id
        }
      }
    `;

    await this.client.post('', {
      query: mutation,
      variables: {
        boardId,
        itemId,
        columnId,
        value: JSON.stringify(value),
      },
    });
  }

  // Group Operations
  async createGroup(boardId: string, groupName: string): Promise<string> {
    const mutation = `
      mutation ($boardId: ID!, $groupName: String!) {
        create_group(board_id: $boardId, group_name: $groupName) {
          id
        }
      }
    `;

    const response = await this.client.post('', {
      query: mutation,
      variables: { boardId, groupName },
    });

    return response.data.data.create_group.id;
  }

  // Webhook Operations
  async createWebhook(
    boardId: string,
    url: string,
    event: 'change_column_value' | 'create_item' | 'change_status_column_value'
  ): Promise<string> {
    const mutation = `
      mutation ($boardId: ID!, $url: String!, $event: WebhookEventType!) {
        create_webhook(board_id: $boardId, url: $url, event: $event) {
          id
        }
      }
    `;

    const response = await this.client.post('', {
      query: mutation,
      variables: { boardId, url, event },
    });

    return response.data.data.create_webhook.id;
  }

  async deleteWebhook(webhookId: string): Promise<void> {
    const mutation = `
      mutation ($id: ID!) {
        delete_webhook(id: $id) {
          id
        }
      }
    `;

    await this.client.post('', {
      query: mutation,
      variables: { id: webhookId },
    });
  }

  // Helper Methods
  private parseColumnValues(columnValues: any[]): Record<string, any> {
    const result: Record<string, any> = {};

    for (const column of columnValues) {
      if (column.value) {
        try {
          result[column.id] = JSON.parse(column.value);
        } catch {
          result[column.id] = column.text || column.value;
        }
      } else {
        result[column.id] = column.text;
      }
    }

    return result;
  }

  // Project Sync Methods
  async syncProjectToMonday(project: any, boardId: string): Promise<void> {
    // Check if project already exists in Monday
    const items = await this.getItems(boardId);
    const existingItem = items.find(item =>
      item.columnValues['project_code'] === project.projectCode
    );

    const columnValues = {
      'project_code': project.projectCode,
      'status': { label: project.status },
      'contract_amount': project.contractAmount,
      'start_date': { date: project.startDate },
      'end_date': { date: project.endDate },
      'foreman': project.foremanName,
      'division': { label: project.division },
    };

    if (existingItem) {
      // Update existing item
      await this.updateItem(existingItem.id, columnValues);
    } else {
      // Create new item
      await this.createItem(
        boardId,
        'projects',
        project.name,
        columnValues
      );
    }
  }

  async syncProjectPhases(projectId: string, phases: any[], boardId: string): Promise<void> {
    // Create or update groups for each phase
    for (const phase of phases) {
      const groupName = `${phase.name} - Phase ${phase.phaseNumber}`;

      // Create group if it doesn't exist
      if (!phase.mondayGroupId) {
        phase.mondayGroupId = await this.createGroup(boardId, groupName);
      }

      // Create tasks for the phase
      const taskColumnValues = {
        'phase': phase.name,
        'status': { label: phase.status },
        'progress': phase.progressPercentage,
        'start_date': { date: phase.startDate },
        'end_date': { date: phase.endDate },
        'labor_hours': phase.laborHours,
      };

      await this.createItem(
        boardId,
        phase.mondayGroupId,
        `${phase.name} Tasks`,
        taskColumnValues
      );
    }
  }

  // Webhook Handler
  async handleWebhook(payload: MondayWebhookPayload): Promise<void> {
    const { event } = payload;

    switch (event.type) {
      case 'change_column_value':
        await this.handleColumnChange(event);
        break;
      case 'create_item':
        await this.handleItemCreated(event);
        break;
      case 'change_status_column_value':
        await this.handleStatusChange(event);
        break;
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleColumnChange(event: any): Promise<void> {
    // Implement logic to sync column changes back to our database
    console.log('Column changed:', event);
  }

  private async handleItemCreated(event: any): Promise<void> {
    // Implement logic to create corresponding project in our system
    console.log('Item created:', event);
  }

  private async handleStatusChange(event: any): Promise<void> {
    // Implement logic to update project status in our system
    console.log('Status changed:', event);
  }
}

// Export singleton instance
let mondayServiceInstance: MondayService | null = null;

export function getMondayService(): MondayService {
  if (!mondayServiceInstance) {
    const apiToken = process.env.MONDAY_API_TOKEN || '';
    if (!apiToken) {
      throw new Error('MONDAY_API_TOKEN environment variable is not set');
    }
    mondayServiceInstance = new MondayService({ apiToken });
  }
  return mondayServiceInstance;
}