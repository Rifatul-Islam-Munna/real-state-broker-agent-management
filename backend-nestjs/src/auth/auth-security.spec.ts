import { JwtService } from '@nestjs/jwt';
import * as crypto from 'node:crypto';
import { AuthService } from './auth.service';
import { UserRole } from '../users/enums/user-role.enum';

function createService() {
  const users: any = {
    update: jest.fn(async () => ({})),
    findOneByRefreshToken: jest.fn(),
  };
  const jwt: any = { sign: jest.fn(() => 'signed-access-token') };
  return { service: new AuthService(users, jwt as JwtService), users, jwt };
}

const user: any = {
  id: 7,
  firstName: 'Asha',
  lastName: 'Rahman',
  email: 'asha@example.com',
  role: UserRole.Agent,
  isActive: true,
};

const admin: any = {
  ...user,
  id: 1,
  email: 'admin@example.com',
  role: UserRole.Admin,
};

describe('AuthService token security', () => {
  it('stores only a SHA-256 refresh-token hash and keeps tenant users signed in for at least 30 days', async () => {
    const { service, users, jwt } = createService();
    const before = Date.now();
    const result = await service.login(user);

    const update = users.update.mock.calls[0][1];
    expect(update.refreshToken).toHaveLength(64);
    expect(update.refreshToken).toBe(crypto.createHash('sha256').update(result.refreshToken).digest('hex'));
    expect(update.refreshToken).not.toBe(result.refreshToken);
    expect(result.accessTokenExpiry.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(result.refreshTokenExpiry.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(jwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ expiresIn: 30 * 24 * 60 * 60 }));
  });

  it('keeps Super Admin signed in for at least 30 days', async () => {
    const { service, jwt } = createService();
    const before = Date.now();
    const result = await service.login(admin);

    expect(result.accessTokenExpiry.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(result.refreshTokenExpiry.getTime()).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000 - 1000);
    expect(jwt.sign).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ expiresIn: 30 * 24 * 60 * 60 }));
  });

  it('hashes the presented refresh token before lookup and rotates it on success', async () => {
    const { service, users } = createService();
    users.findOneByRefreshToken.mockResolvedValue({
      ...user,
      refreshTokenExpiry: new Date(Date.now() + 60_000),
    });

    const refreshed = await service.refresh('raw-refresh-token');

    expect(users.findOneByRefreshToken).toHaveBeenCalledWith(
      crypto.createHash('sha256').update('raw-refresh-token').digest('hex'),
    );
    expect(refreshed.refreshToken).not.toBe('raw-refresh-token');
    expect(users.update).toHaveBeenCalledTimes(1);
  });
});
