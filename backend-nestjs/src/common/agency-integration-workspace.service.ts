import { Injectable, Logger } from '@nestjs/common';

export interface IntegrationWorkspace {
  id: string;
  agencyId: number;
  name: string;
  description?: string;
  integrations: Array<{
    id: string;
    type: string;
    status: 'active' | 'inactive';
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agency Integration Workspace Service
 * Manages integration workspace configurations and metadata
 */
@Injectable()
export class AgencyIntegrationWorkspaceService {
  private readonly logger = new Logger(AgencyIntegrationWorkspaceService.name);
  private workspaces: Map<string, IntegrationWorkspace> = new Map();

  /**
   * Create a new integration workspace
   */
  async createWorkspace(dto: {
    agencyId: number;
    name: string;
    description?: string;
  }): Promise<IntegrationWorkspace> {
    const id = `workspace_${Date.now()}`;

    const workspace: IntegrationWorkspace = {
      id,
      agencyId: dto.agencyId,
      name: dto.name,
      description: dto.description,
      integrations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workspaces.set(id, workspace);
    this.logger.log(`Workspace created: ${id} for agency ${dto.agencyId}`);

    return workspace;
  }

  /**
   * Get workspace by ID
   */
  async getWorkspace(id: string): Promise<IntegrationWorkspace> {
    const workspace = this.workspaces.get(id);

    if (!workspace) {
      throw new Error(`Workspace not found: ${id}`);
    }

    return workspace;
  }

  /**
   * Get all workspaces for agency
   */
  async getWorkspacesByAgency(agencyId: number): Promise<IntegrationWorkspace[]> {
    return Array.from(this.workspaces.values()).filter((w) => w.agencyId === agencyId);
  }

  /**
   * Update workspace
   */
  async updateWorkspace(id: string, dto: { name?: string; description?: string }): Promise<IntegrationWorkspace> {
    const workspace = await this.getWorkspace(id);

    if (dto.name) workspace.name = dto.name;
    if (dto.description !== undefined) workspace.description = dto.description;
    workspace.updatedAt = new Date();

    this.workspaces.set(id, workspace);
    this.logger.log(`Workspace updated: ${id}`);

    return workspace;
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(id: string): Promise<void> {
    const workspace = await this.getWorkspace(id);
    this.workspaces.delete(id);
    this.logger.log(`Workspace deleted: ${id}`);
  }

  /**
   * Add integration to workspace
   */
  async addIntegration(
    workspaceId: string,
    integration: {
      id: string;
      type: string;
    },
  ): Promise<IntegrationWorkspace> {
    const workspace = await this.getWorkspace(workspaceId);

    workspace.integrations.push({
      ...integration,
      status: 'inactive',
    });

    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    this.logger.log(`Integration ${integration.id} added to workspace ${workspaceId}`);

    return workspace;
  }

  /**
   * Remove integration from workspace
   */
  async removeIntegration(workspaceId: string, integrationId: string): Promise<IntegrationWorkspace> {
    const workspace = await this.getWorkspace(workspaceId);

    workspace.integrations = workspace.integrations.filter((i) => i.id !== integrationId);
    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    this.logger.log(`Integration ${integrationId} removed from workspace ${workspaceId}`);

    return workspace;
  }

  /**
   * Update integration status
   */
  async updateIntegrationStatus(
    workspaceId: string,
    integrationId: string,
    status: 'active' | 'inactive',
  ): Promise<IntegrationWorkspace> {
    const workspace = await this.getWorkspace(workspaceId);

    const integration = workspace.integrations.find((i) => i.id === integrationId);

    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    integration.status = status;
    workspace.updatedAt = new Date();
    this.workspaces.set(workspaceId, workspace);

    this.logger.log(`Integration ${integrationId} status changed to ${status}`);

    return workspace;
  }

  /**
   * Get active integrations
   */
  async getActiveIntegrations(workspaceId: string): Promise<
    Array<{
      id: string;
      type: string;
    }>
  > {
    const workspace = await this.getWorkspace(workspaceId);

    return workspace.integrations.filter((i) => i.status === 'active').map((i) => ({ id: i.id, type: i.type }));
  }

  /**
   * List supported integration types
   */
  getSupportedIntegrationTypes(): string[] {
    return [
      'Email',
      'GoogleCalendar',
      'MicrosoftOutlook',
      'Slack',
      'Twilio',
      'HubSpot',
      'Salesforce',
      'Zapier',
      'MakeIntegration',
    ];
  }

  /**
   * Get integration health status
   */
  async getWorkspaceHealth(workspaceId: string): Promise<{
    workspaceId: string;
    healthStatus: 'healthy' | 'warning' | 'error';
    activeIntegrations: number;
    totalIntegrations: number;
    details: object;
  }> {
    const workspace = await this.getWorkspace(workspaceId);

    const activeCount = workspace.integrations.filter((i) => i.status === 'active').length;
    const totalCount = workspace.integrations.length;

    let healthStatus: 'healthy' | 'warning' | 'error' = 'healthy';

    if (totalCount > 0 && activeCount === 0) {
      healthStatus = 'error';
    } else if (activeCount < totalCount * 0.5) {
      healthStatus = 'warning';
    }

    return {
      workspaceId,
      healthStatus,
      activeIntegrations: activeCount,
      totalIntegrations: totalCount,
      details: {
        integrationTypes: workspace.integrations.map((i) => i.type),
      },
    };
  }

  /**
   * Bulk add integrations
   */
  async bulkAddIntegrations(
    workspaceId: string,
    integrations: Array<{
      id: string;
      type: string;
    }>,
  ): Promise<IntegrationWorkspace> {
    let workspace = await this.getWorkspace(workspaceId);

    for (const integration of integrations) {
      workspace = await this.addIntegration(workspaceId, integration);
    }

    this.logger.log(`Bulk added ${integrations.length} integrations to workspace ${workspaceId}`);

    return workspace;
  }
}
