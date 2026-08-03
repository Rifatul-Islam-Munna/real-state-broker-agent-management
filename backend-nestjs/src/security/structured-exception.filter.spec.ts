import { BadRequestException } from '@nestjs/common';
import { StructuredExceptionFilter } from './structured-exception.filter';

function host() {
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const response = { status, json };
  const request = {
    method: 'POST',
    originalUrl: '/api/test',
    headers: { 'x-request-id': 'req-123' },
    user: { userId: 7 },
    tenant: { id: 9 },
  };
  return {
    response,
    request,
    host: { switchToHttp: () => ({ getResponse: () => response, getRequest: () => request }) } as any,
  };
}

describe('StructuredExceptionFilter', () => {
  it('returns structured client errors with request correlation data', () => {
    const setup = host();
    new StructuredExceptionFilter().catch(new BadRequestException('Invalid input'), setup.host);

    expect(setup.response.status).toHaveBeenCalledWith(400);
    expect(setup.response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 400,
      message: 'Invalid input',
      path: '/api/test',
      requestId: 'req-123',
      timestamp: expect.any(String),
    }));
  });

  it('does not expose internal server exception messages to clients', () => {
    const setup = host();
    new StructuredExceptionFilter().catch(new Error('database password leaked here'), setup.host);

    expect(setup.response.status).toHaveBeenCalledWith(500);
    expect(setup.response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: 500,
      message: 'Internal server error',
    }));
  });
});
