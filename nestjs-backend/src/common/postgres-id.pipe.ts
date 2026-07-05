import { Injectable, type ArgumentMetadata, type PipeTransform } from '@nestjs/common';

@Injectable()
export class PostgresIdPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body' || !value || typeof value !== 'object') return value;
    const data = value as Record<string, unknown>;
    for (const key of ['id', 'recordId']) {
      if (data[key] != null && /^\d+$/.test(String(data[key]))) data[key] = String(data[key]).padStart(24, '0');
    }
    return data;
  }
}
