import { Injectable } from '@nestjs/common';

@Injectable()
export class LeadOutreachService {
  async getTemplates() {
    return [
      { id: 1, name: 'Welcome Email', body: 'Hello {name}, welcome to Elite Estates!' },
      { id: 2, name: 'Follow-up Call', body: 'Just calling to follow up on your interest in {property}.' },
    ];
  }

  async getSchedule() {
    return [];
  }

  async getCallScript() {
    return { script: 'Hello, this is {agentName} from Elite Estates...' };
  }

  async sendOutreach(dto: any) {
    return { success: true };
  }

  async sendBulkOutreach(dto: any) {
    return { success: true, count: dto.leadIds?.length || 0 };
  }
}
