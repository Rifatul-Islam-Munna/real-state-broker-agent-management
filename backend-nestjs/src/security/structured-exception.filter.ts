import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

@Catch()
export class StructuredExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const requestId = `${request.headers['x-request-id'] ?? randomUUID()}`.slice(0, 128);
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : null;
    const message = status >= 500
      ? 'Internal server error'
      : typeof raw === 'string'
        ? raw
        : Array.isArray((raw as any)?.message)
          ? (raw as any).message
          : (raw as any)?.message ?? (exception instanceof Error ? exception.message : 'Request failed');

    const log = {
      requestId,
      method: request.method,
      path: request.originalUrl,
      status,
      userId: (request as any).user?.userId ?? null,
      tenantId: (request as any).tenant?.id ?? null,
      error: exception instanceof Error ? exception.name : 'UnknownError',
      message: exception instanceof Error ? exception.message : String(exception),
    };
    if (status >= 500) this.logger.error(JSON.stringify(log), exception instanceof Error ? exception.stack : undefined);
    else this.logger.warn(JSON.stringify(log));

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status] ?? 'Error',
      path: request.originalUrl,
      requestId,
      timestamp: new Date().toISOString(),
    });
  }
}
