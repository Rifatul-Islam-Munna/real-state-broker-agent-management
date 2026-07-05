import { Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'crypto';

@Injectable()
export class AccessCodeService {
  issue() {
    const code = `${randomUUID()}${randomUUID()}`.replace(/-/g, '');
    return { code, checksum: this.checksum(code) };
  }

  checksum(code: string) {
    return createHash('sha256').update(code).digest('hex');
  }
}
