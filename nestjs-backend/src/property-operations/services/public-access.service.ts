import { Injectable } from '@nestjs/common';
import { ExternalAdminService } from '../../core/external-admin.service';
import { ExternalPublicService } from '../../core/external-public.service';
import { CreatePublicAccessDto, SubmitPublicRequestDto } from '../dto/public-access.dto';

@Injectable()
export class PublicAccessService {
  constructor(private readonly admin: ExternalAdminService, private readonly external: ExternalPublicService) {}
  create(dto: CreatePublicAccessDto) { return this.admin.create(dto); }
  list(propertyId?: number) { return this.admin.list(propertyId); }
  revoke(id: string) { return this.admin.revoke(id); }
  listSubmissions(id: string) { return this.admin.responses(id); }
  getPublic(code: string) { return this.external.getRequest(code); }
  submit(code: string, dto: SubmitPublicRequestDto) { return this.external.submit(code, dto); }
}
