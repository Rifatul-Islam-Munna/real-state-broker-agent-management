export enum UserRole {
  Admin = 'Admin',
  Agent = 'Agent',
  Client = 'Client',
}

export const AgentRoutePermissionsList = {
  Dashboard: 'dashboard',
  Properties: 'properties',
  DealPipeline: 'deal-pipeline',
  Lead: 'lead',
  Mail: 'mail',
  Settings: 'settings',
};

export const AllAgentRoutePermissions = Object.values(AgentRoutePermissionsList);
