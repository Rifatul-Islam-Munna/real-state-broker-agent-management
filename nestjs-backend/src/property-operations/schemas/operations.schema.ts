import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { MODULE_KEYS, MODULE_STATUSES, RECORD_STATUSES } from '../module-catalog';

@Schema({ _id: false })
export class PropertySnapshot {
  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  location: string;

  @Prop({ default: '' })
  propertyType: string;

  @Prop({ default: '' })
  listingType: string;

  @Prop({ default: '' })
  propertyStatus: string;

  @Prop({ default: '' })
  propertySlug: string;

  @Prop({ default: '' })
  thumbnailUrl: string;
}

export const PropertySnapshotSchema = SchemaFactory.createForClass(PropertySnapshot);

@Schema({ _id: false })
export class ModuleState {
  @Prop({ required: true, enum: MODULE_KEYS })
  moduleKey: string;

  @Prop({ required: true, enum: MODULE_STATUSES, default: 'Not started' })
  status: string;

  @Prop({ default: '' })
  notes: string;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ModuleStateSchema = SchemaFactory.createForClass(ModuleState);

@Schema({ timestamps: true, collection: 'property_operations_workspaces' })
export class OperationsWorkspace {
  @Prop({ required: true, unique: true, index: true })
  propertyId: number;

  @Prop({ type: PropertySnapshotSchema, required: true })
  property: PropertySnapshot;

  @Prop({ default: 'Active', index: true })
  status: string;

  @Prop({ type: [ModuleStateSchema], default: [] })
  moduleStates: ModuleState[];
}

export type OperationsWorkspaceDocument = HydratedDocument<OperationsWorkspace>;
export const OperationsWorkspaceSchema = SchemaFactory.createForClass(OperationsWorkspace);

@Schema({ _id: false })
export class ContactDetails {
  @Prop({ default: '' })
  name: string;

  @Prop({ default: '' })
  email: string;

  @Prop({ default: '' })
  phone: string;

  @Prop({ default: '' })
  label: string;
}

export const ContactDetailsSchema = SchemaFactory.createForClass(ContactDetails);

@Schema({ timestamps: true, collection: 'property_operations_records' })
export class OperationsRecord {
  @Prop({ type: Types.ObjectId, ref: OperationsWorkspace.name, required: true, index: true })
  workspaceId: Types.ObjectId;

  @Prop({ required: true, enum: MODULE_KEYS, index: true })
  moduleKey: string;

  @Prop({ required: true, default: 'Item' })
  recordType: string;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ enum: RECORD_STATUSES, default: 'Open', index: true })
  status: string;

  @Prop({ enum: ['Low', 'Normal', 'High', 'Urgent'], default: 'Normal' })
  priority: string;

  @Prop({ type: ContactDetailsSchema, default: {} })
  contact: ContactDetails;

  @Prop({ type: Number, default: null })
  amount: number | null;

  @Prop({ type: Date, default: null, index: true })
  dueAt: Date | null;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  @Prop({ type: MongooseSchema.Types.Mixed, default: {} })
  payload: Record<string, unknown>;

  @Prop({ type: MongooseSchema.Types.Mixed, default: null })
  recurrence: Record<string, unknown> | null;

  @Prop({ type: Types.ObjectId, ref: OperationsRecord.name, default: null })
  parentRecordId: Types.ObjectId | null;

  @Prop({ default: '' })
  assignedTo: string;

  @Prop({ type: Date, default: null })
  completedAt: Date | null;
}

export type OperationsRecordDocument = HydratedDocument<OperationsRecord>;
export const OperationsRecordSchema = SchemaFactory.createForClass(OperationsRecord);
OperationsRecordSchema.index({ workspaceId: 1, moduleKey: 1, updatedAt: -1 });
OperationsRecordSchema.index({ status: 1, dueAt: 1 });
