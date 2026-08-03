import { HttpException, HttpStatus, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class SecurityRateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, { count: number; resetAt: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    const path = req.path;
    const rule = this.ruleFor(path, req.method);
    if (!rule) return next();

    const forwarded = process.env.TRUST_PROXY === 'true'
      ? `${req.headers['x-forwarded-for'] ?? ''}`.split(',')[0].trim()
      : '';
    const ip = forwarded || req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${rule.name}:${ip}`;
    const now = Date.now();
    let bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + rule.windowMs };
      this.buckets.set(key, bucket);
    }
    bucket.count += 1;
    res.setHeader('X-RateLimit-Limit', String(rule.limit));
    res.setHeader('X-RateLimit-Remaining', String(Math.max(0, rule.limit - bucket.count)));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > rule.limit) throw new HttpException('Too many requests. Please try again later.', HttpStatus.TOO_MANY_REQUESTS);
    if (this.buckets.size > 10000) this.cleanup(now);
    return next();
  }

  private ruleFor(path: string, method: string) {
    if (method === 'POST' && (path.endsWith('/auth/login') || path.endsWith('/auth/super-admin/login'))) return { name: 'auth-login', limit: 10, windowMs: 15 * 60_000 };
    if (method === 'POST' && path.endsWith('/auth/register')) return { name: 'auth-register', limit: 5, windowMs: 60 * 60_000 };
    if (method === 'POST' && path.endsWith('/public-saas/purchase')) return { name: 'purchase', limit: 5, windowMs: 60 * 60_000 };
    if (method === 'POST' && path.endsWith('/tenant-domain/verify')) return { name: 'domain-verify', limit: 10, windowMs: 60 * 60_000 };
    return null;
  }

  private cleanup(now: number) {
    for (const [key, bucket] of this.buckets) if (bucket.resetAt <= now) this.buckets.delete(key);
  }
}
