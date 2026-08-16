import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { StructuredExceptionFilter } from './security/structured-exception.filter';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { json, raw, urlencoded } from 'express';
import { PlatformDomainService } from './platform-domain/platform-domain.service';

const DEFAULT_BODY_LIMIT = '1mb';

function validateProductionConfiguration() {
  if (process.env.NODE_ENV !== 'production') return;

  const jwtSecret = `${process.env.JWT_SECRET ?? ''}`.trim();
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production.');
  }
}

async function bootstrap() {
  validateProductionConfiguration();

  const app = await NestFactory.create(AppModule, { bodyParser: false });

  const bodyLimit = process.env.API_BODY_LIMIT || DEFAULT_BODY_LIMIT;
  app.use('/api/public-saas/stripe-webhook', raw({ type: 'application/json', limit: bodyLimit }));
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.setGlobalPrefix('api');
  app.useGlobalFilters(new StructuredExceptionFilter());
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  const allowedOrigins = `${process.env.CORS_ORIGINS ?? 'http://localhost:3000'}`
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const platformDomain = app.get(PlatformDomainService);
  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      try {
        const host = new URL(origin).hostname.toLowerCase();
        const primary = platformDomain.getPrimaryDomain();
        const tenantPrefix = host.endsWith(`.${primary}`) ? host.slice(0, -(primary.length + 1)) : '';
        if (host === primary || host === `www.${primary}` || (tenantPrefix && !tenantPrefix.includes('.'))) {
          return callback(null, true);
        }
      } catch {
        // Invalid origins are rejected below.
      }
      return callback(new Error('Origin is not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'access_token', 'Idempotency-Key', 'X-Request-Id', 'X-Tenant-Host'],
  });

  const config = new DocumentBuilder()
    .setTitle('Real Estate API')
    .setDescription('The Real Estate API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  app.use(
    '/scalar',
    apiReference({
      spec: {
        content: document,
      },
    } as any),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}/api`);
  console.log(`Scalar API Reference: http://localhost:${port}/scalar`);
}
bootstrap();
