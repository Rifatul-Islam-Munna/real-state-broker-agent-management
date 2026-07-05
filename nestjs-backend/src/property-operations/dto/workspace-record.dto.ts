import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEmail, IsInt, IsMongoId, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

export class PropertySnapshotDto {
  @IsInt() propertyId: number;
  @IsString() title: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() propertyType?: string;
  @IsOptional() @IsString() listingType?: string;
  @IsOptional() @IsString() propertyStatus?: string;
  @IsOptional() @IsString() propertySlug?: string;
  @IsOptional() @IsString() thumbnailUrl?: string;
}

export class ImportPropertiesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PropertySnapshotDto)
  properties: PropertySnapshotDto[];
}

export class UpdateModuleStateDto {
  @IsInt() propertyId: number;
  @IsString() moduleKey: string;
  @IsString() status: string;
  @IsOptional() @IsString() notes?: string;
}

export class SaveRecordDto {
  @IsOptional() @IsMongoId() id?: string;
  @IsInt() propertyId: number;
  @IsString() moduleKey: string;
  @IsString() recordType: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() priority?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsEmail() contactEmail?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsString() contactLabel?: string;
  @IsOptional() @IsNumber() amount?: number;
  @IsOptional() @IsDateString() dueAt?: string;
  @IsOptional() @IsArray() attachments?: string[];
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @IsOptional() @IsObject() recurrence?: Record<string, unknown>;
  @IsOptional() @IsString() assignedTo?: string;
}

export class RecordActionDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @IsString() assignedTo?: string;
  @IsOptional() @IsObject() payload?: Record<string, unknown>;
  @IsOptional() @IsString() note?: string;
}
