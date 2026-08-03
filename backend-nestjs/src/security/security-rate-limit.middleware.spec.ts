import { SecurityRateLimitMiddleware } from './security-rate-limit.middleware';

describe('SecurityRateLimitMiddleware', () => {
  function response() {
    return { setHeader: jest.fn() } as any;
  }

  it('rate limits login requests by IP and sets response headers', () => {
    const middleware = new SecurityRateLimitMiddleware();
    const req: any = { path: '/api/auth/login', method: 'POST', headers: {}, ip: '10.0.0.1', socket: {} };
    const res = response();
    const next = jest.fn();

    for (let index = 0; index < 10; index += 1) middleware.use(req, res, next);
    expect(() => middleware.use(req, res, next)).toThrow('Too many requests');
    expect(next).toHaveBeenCalledTimes(10);
    expect(res.setHeader).toHaveBeenCalledWith('X-RateLimit-Limit', '10');
  });

  it('uses stricter purchase limits and leaves unrelated endpoints untouched', () => {
    const middleware = new SecurityRateLimitMiddleware();
    const purchase: any = { path: '/api/public-saas/purchase', method: 'POST', headers: {}, ip: '10.0.0.2', socket: {} };
    const next = jest.fn();
    for (let index = 0; index < 5; index += 1) middleware.use(purchase, response(), next);
    expect(() => middleware.use(purchase, response(), next)).toThrow();

    const unrelated: any = { path: '/api/public-saas/plans', method: 'GET', headers: {}, ip: '10.0.0.2', socket: {} };
    expect(() => middleware.use(unrelated, response(), next)).not.toThrow();
  });
});
