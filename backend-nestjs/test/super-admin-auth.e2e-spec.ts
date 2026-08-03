import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { UserRole } from '../src/users/enums/user-role.enum';

describe('Super Admin authentication (e2e)', () => {
  let app: INestApplication;
  const authService = {
    validateSuperAdmin: jest.fn(),
    login: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: {} },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  beforeEach(() => jest.clearAllMocks());
  afterAll(async () => app.close());

  it('POST /api/auth/super-admin/login returns an Admin session', async () => {
    const admin = {
      id: 1,
      email: 'owner@example.com',
      role: UserRole.Admin,
      isActive: true,
    };
    const session = {
      id: 1,
      email: admin.email,
      role: UserRole.Admin,
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };
    authService.validateSuperAdmin.mockResolvedValue(admin);
    authService.login.mockResolvedValue(session);

    await request(app.getHttpServer())
      .post('/api/auth/super-admin/login')
      .send({ email: admin.email, password: 'correct-password' })
      .expect(200)
      .expect(session);

    expect(authService.validateSuperAdmin).toHaveBeenCalledWith(admin.email, 'correct-password');
    expect(authService.login).toHaveBeenCalledWith(admin);
  });

  it('POST /api/auth/super-admin/login rejects non-admin or invalid credentials', async () => {
    authService.validateSuperAdmin.mockResolvedValue(null);

    const response = await request(app.getHttpServer())
      .post('/api/auth/super-admin/login')
      .send({ email: 'agent@example.com', password: 'correct-password' })
      .expect(400);

    expect(response.body.message).toBe('Invalid Super Admin email or password');
    expect(authService.login).not.toHaveBeenCalled();
  });
});
