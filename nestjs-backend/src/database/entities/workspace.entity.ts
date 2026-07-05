import { EntitySchema } from 'typeorm';

export type WorkspaceRow = {
  id: number;
  propertyId: number;
  status: string;
  propertySnapshot: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export const WorkspaceEntity = new EntitySchema<WorkspaceRow>({
  name: 'WorkspaceRow',
  tableName: 'property_operations_workspace',
  columns: {
    id: { type: Number, primary: true, generated: true },
    propertyId: { name: 'property_id', type: Number, unique: true },
    status: { type: String, length: 40, default: 'Active' },
    propertySnapshot: { name: 'property_snapshot', type: 'jsonb', default: {} },
    createdAt: { name: 'created_at', type: 'timestamptz', createDate: true },
    updatedAt: { name: 'updated_at', type: 'timestamptz', updateDate: true },
  },
});
