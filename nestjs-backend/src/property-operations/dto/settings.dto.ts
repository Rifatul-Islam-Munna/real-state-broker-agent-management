import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() brandColor?: string;
  @IsOptional() @IsString() publicBaseUrl?: string;
  @IsOptional() @IsInt() @Min(1) @Max(8760) defaultExpiryHours?: number;
  @IsOptional() @IsInt() @Min(1) @Max(1000) defaultMaxUses?: number;
  @IsOptional() @IsBoolean() defaultOneTime?: boolean;
  @IsOptional() @IsBoolean() requireName?: boolean;
  @IsOptional() @IsBoolean() requireEmail?: boolean;
  @IsOptional() @IsBoolean() requirePhone?: boolean;
  @IsOptional() @IsBoolean() allowFileUploads?: boolean;
  @IsOptional() @IsBoolean() showPropertyAddress?: boolean;
  @IsOptional() @IsBoolean() autoCloseRecordOnSubmit?: boolean;
  @IsOptional() @IsBoolean() notifyAdminOnSubmit?: boolean;
  @IsOptional() @IsString() welcomeMessage?: string;
  @IsOptional() @IsString() termsText?: string;
  @IsOptional() @IsString() emailSubjectTemplate?: string;
  @IsOptional() @IsString() emailBodyTemplate?: string;
  @IsOptional() @IsString() smsTemplate?: string;
}
