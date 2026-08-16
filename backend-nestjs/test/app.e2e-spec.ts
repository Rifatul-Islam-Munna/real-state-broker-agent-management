import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({}).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('does not expose the removed legacy root controller', () => {
    return request(app.getHttpServer())
      .get('/api/')
      .expect(404);
  });

  afterEach(async () => {
    if (app) await app.close();
  });
});
