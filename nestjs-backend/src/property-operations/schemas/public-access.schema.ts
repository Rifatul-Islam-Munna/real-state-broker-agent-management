import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { OperationsRecord, OperationsWorkspace } from './operations.schema';

@Schema({ timestamps: true, collection: 'property_operations_settings' })
export class OperationsSettings {
  @Prop({ default: 'Property Operations' }) businessName: string;
  @Prop({ default: '' }) logoUrl: string;
  @Prop({ default: '#111827' }) brandColor: string;
  @Prop({ default: '' }) publicBaseUrl: string;
  @Prop({ default: 168 }) defaultExpiryHours: number;
  @Prop({ default: 1 }) defaultMaxUses: number;
  @Prop({ default: true }) defaultOneTime: boolean;
  @Prop({ default: true }) requireName: boolean;
  @Prop({ default: false }) requireEmail: boolean;
  @Prop({ default: false }) requirePhone: boolean;
  @Prop({ default: true }) allowFileUploads: boolean;
  @Prop({ default: true }) showPropertyAddress: boolean;
  @Prop({ default: false }) autoCloseRecordOnSubmit: boolean;
  @Prop({ default: true }) notifyAdminOnSubmit: boolean;
  @Prop({ default: 'Please review the request and submit the requested information.' }) welcomeMessage: string;
  @Prop({ default: '' }) termsText: string;
  @Prop({ default: 'Property request: {{title}}' }) emailSubjectTemplate: string;
  @Prop({ default: 'Open this secure link to complete the property request: {{link}}' }) emailBodyTemplate: string;
  @Prop({ default: 'Property request: {{title}} {{link}}' }) smsTemplate: string;
}

export type OperationsSettingsDocument = HydratedDocument<OperationsSettings>;
export const OperationsSettingsSchema = SchemaFactory.createForClass(OperationsSettings);

@Schema({ timestamps: true, collection: 'property_operations_public_access' })
export class PublicAccess {
  @Prop({ type: Types.ObjectId, ref: OperationsWorkspace.name, required: true, index: true }) workspaceId: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: OperationsRecord.name, default: null }) recordId: Types.ObjectId | null;
  @Prop({ required: true, index: true }) moduleKey: string;
  @Prop({ required: true }) title: string;
  @Prop({ default: '' }) instructions: string;
  @Prop({ default: 'External participant' }) recipientLabel: string;
  @Prop({ default: '' }) recipientName: string;
  @Prop({ default: '' }) recipientEmail: string;
  @Prop({ default: '' }) recipientPhone: string;
  @Prop({ required: true, unique: true, index: true }) tokenHash: string;
  @Prop({ default: 'Active', index: true }) status: string;
  @Prop({ type: [MongooseSchema.Types.Mixed], default: [] }) formSchema: Array<Record<string, unknown>>;
  @Prop({ required: true, index: true }) expiresAt: Date;
  @Prop({ default: 1 }) maxUses: number;
  @Prop({ default: 0 }) useCount: number;
  @Prop({ default: true }) oneTime: boolean;
  @Prop({ default: true }) allowFileUploads: boolean;
  @Prop({ default: null }) lastAccessedAt: Date | null;
  @Prop({ default: null }) completedAt: Date | null;
  @Prop({ default: null }) revokedAt: Date | null;
}

export type PublicAccessDocument = HydratedDocument<PublicAccess>;
export const PublicAccessSchema = SchemaFactory.createForClass(PublicAccess);
PublicAccessSchema.index({ workspaceId: 1, moduleKey: 1, createdAt: -1 });

@Schema({ timestamps: { createdAt: 'submittedAt', updatedAt: false }, collection: 'property_operations_submissions' })
export class PublicSubmission {
  @Prop({ type: Types.ObjectId, ref: PublicAccess.name, required: true, index: true }) publicAccessId: Types.ObjectId;
  @Prop({ default: '' }) responderName: string;
  @Prop({ default: '' }) responderEmail: string;
  @Prop({ default: '' }) responderPhone: string;
  @Prop({ default: '' }) notes: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) response: Record<string, unknown>;
  @Prop({ type: [String], default: [] }) attachmentUrls: string[];
}

export type PublicSubmissionDocument = HydratedDocument<PublicSubmission>;
export const PublicSubmissionSchema = SchemaFactory.createForClass(PublicSubmission);

@Schema({ timestamps: { createdAt: true, updatedAt: false }, collection: 'property_operations_activity' })
export class OperationsActivity {
  @Prop({ type: Types.ObjectId, ref: OperationsWorkspace.name, default: null, index: true }) workspaceId: Types.ObjectId | null;
  @Prop({ default: '', index: true }) moduleKey: string;
  @Prop({ required: true }) action: string;
  @Prop({ required: true }) entityType: string;
  @Prop({ default: '' }) entityId: string;
  @Prop({ default: 'Admin' }) actorType: string;
  @Prop({ required: true }) summary: string;
  @Prop({ type: MongooseSchema.Types.Mixed, default: {} }) metadata: Record<string, unknown>;
}

export type OperationsActivityDocument = HydratedDocument<OperationsActivity>;
export const OperationsActivitySchema = SchemaFactory.createForClass(OperationsActivity);
OperationsActivitySchema.index({ workspaceId: 1, createdAt: -1 });
