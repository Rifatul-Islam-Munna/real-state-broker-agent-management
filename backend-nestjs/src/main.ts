import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { json, urlencoded } from 'express';

const DEFAULT_BODY_LIMIT = '25mb';

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
  app.use(json({ limit: bodyLimit }));
  app.use(urlencoded({ extended: true, limit: bodyLimit }));
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.enableCors();

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
