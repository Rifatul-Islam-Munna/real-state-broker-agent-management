import { IsArray, IsBoolean, IsEmail, IsInt, IsMongoId, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreatePublicAccessDto {
  @IsInt() propertyId: number;
  @IsOptional() @IsMongoId() recordId?: string;
  @IsString() moduleKey: string;
  @IsString() title: string;
  @IsOptional() @IsString() instructions?: string;
  @IsOptional() @IsString() recipientLabel?: string;
  @IsOptional() @IsString() recipientName?: string;
  @IsOptional() @IsEmail() recipientEmail?: string;
  @IsOptional() @IsString() recipientPhone?: string;
  @IsOptional() @IsArray() formSchema?: Array<Record<string, unknown>>;
  @IsOptional() @IsInt() @Min(1) @Max(8760) expiryHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) maxUses?: number;
  @IsOptional() @IsBoolean() oneTime?: boolean;
  @IsOptional() @IsBoolean() allowFileUploads?: boolean;
}

export class SubmitPublicRequestDto {
  @IsOptional() @IsString() responderName?: string;
  @IsOptional() @IsEmail() responderEmail?: string;
  @IsOptional() @IsString() responderPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsObject() response?: Record<string, unknown>;
  @IsOptional() @IsArray() attachmentUrls?: string[];
}
