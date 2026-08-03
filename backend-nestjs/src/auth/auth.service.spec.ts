import { Test } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/enums/user-role.enum';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService Super Admin authentication', () => {
  let service: AuthService;
  let usersService: { findOneByEmail: jest.Mock };

  beforeEach(async () => {
    usersService = {
      findOneByEmail: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: { sign: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
    jest.clearAllMocks();
  });

  it('accepts an active Admin account with the correct password', async () => {
    usersService.findOneByEmail.mockResolvedValue({
      id: 1,
      email: 'owner@example.com',
      passwordHash: 'hash',
      firstName: 'Platform',
      lastName: 'Owner',
      role: UserRole.Admin,
      isActive: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const user = await service.validateSuperAdmin('owner@example.com', 'correct-password');

    expect(user).toMatchObject({ email: 'owner@example.com', role: UserRole.Admin });
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('rejects a valid Agent account from the Super Admin flow', async () => {
    usersService.findOneByEmail.mockResolvedValue({
      id: 2,
      email: 'agent@example.com',
      passwordHash: 'hash',
      firstName: 'Tenant',
      lastName: 'Agent',
      role: UserRole.Agent,
      isActive: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    await expect(service.validateSuperAdmin('agent@example.com', 'correct-password')).resolves.toBeNull();
  });

  it('rejects invalid credentials', async () => {
    usersService.findOneByEmail.mockResolvedValue({
      id: 1,
      email: 'owner@example.com',
      passwordHash: 'hash',
      firstName: 'Platform',
      lastName: 'Owner',
      role: UserRole.Admin,
      isActive: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(service.validateSuperAdmin('owner@example.com', 'wrong-password')).resolves.toBeNull();
  });
});
