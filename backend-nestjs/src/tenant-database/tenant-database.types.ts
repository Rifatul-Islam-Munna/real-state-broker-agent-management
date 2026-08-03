export type TenantDatabaseRecord = {
  tenantId: number;
  databaseName: string;
};

export type TenantDatabaseMigration = {
  version: number;
  name: string;
  statements: string[];
};
