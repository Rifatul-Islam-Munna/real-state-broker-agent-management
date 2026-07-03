import { BadRequestException, Injectable } from '@nestjs/common';
import { SchedulingSettingsService } from '../settings/scheduling-settings.service';
import { parseDateTimeInZone } from './time-zone';

@Injectable()
export class AgencyTimeNormalizerService {
  constructor(
    private readonly schedulingSettingsService: SchedulingSettingsService,
  ) {}

  async normalizeField(input: any, field: string) {
    if (!input || !Object.prototype.hasOwnProperty.call(input, field)) return input;
    if (!input[field]) return { ...input, [field]: null };

    const zone = await this.schedulingSettingsService.getTimeZone();
    const date = parseDateTimeInZone(input[field], zone);
    if (!date) throw new BadRequestException(`${field} is invalid.`);

    return { ...input, [field]: date.toISOString() };
  }
}
