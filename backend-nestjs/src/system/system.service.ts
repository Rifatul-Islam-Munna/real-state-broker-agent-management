import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class SystemService {
  constructor(private dataSource: DataSource) {}

  async migrate() {
    const pendingBefore = await this.dataSource.showMigrations();
    const applied = await this.dataSource.runMigrations();
    return {
      baselineRecorded: false,
      appliedMigrations: applied.map((migration) => migration.name),
      pendingMigrations: [],
      message: pendingBefore ? 'Database migrations applied successfully.' : 'Database schema is already up to date.',
    };
  }
}
