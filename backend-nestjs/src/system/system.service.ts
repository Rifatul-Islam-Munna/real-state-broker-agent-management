import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SystemService {
  constructor(private dataSource: DataSource) {}

  async migrate() {
    await this.dataSource.runMigrations();
    return { success: true, message: 'Migrations executed' };
  }
}
