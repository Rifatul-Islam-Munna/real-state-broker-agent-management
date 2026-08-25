import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '../users/enums/user-role.enum';
import { PlatformChatbotKnowledgeController } from './platform-chatbot-knowledge.controller';

describe('PlatformChatbotKnowledgeController', () => {
  const adminRequest = { user: { role: UserRole.Admin, userId: 17 } } as any;

  it('passes the authenticated admin actor to every platform knowledge write', async () => {
    const service = {
      create: jest.fn().mockResolvedValue({ id: 'one' }),
      update: jest.fn().mockResolvedValue({ id: 'one' }),
      delete: jest.fn().mockResolvedValue({ deleted: true }),
      reindex: jest.fn().mockResolvedValue({ total: 1, indexed: 1 }),
    };
    const controller = new PlatformChatbotKnowledgeController(service as any);

    await controller.create(adminRequest, {
      audience: 'LEAD', title: 'Policy', answer: 'Verified policy text.',
    });
    await controller.update(adminRequest, 'one', { active: false });
    await controller.delete(adminRequest, 'one');
    await controller.reindex(adminRequest);

    expect(service.create).toHaveBeenCalledWith(expect.objectContaining({ title: 'Policy' }), 17);
    expect(service.update).toHaveBeenCalledWith('one', { active: false }, 17);
    expect(service.delete).toHaveBeenCalledWith('one', 17);
    expect(service.reindex).toHaveBeenCalledWith(17);
  });

  it('rejects non-admin platform knowledge access', async () => {
    const controller = new PlatformChatbotKnowledgeController({ list: jest.fn() } as any);
    const request = { user: { role: UserRole.Agent, userId: 22 } } as any;

    expect(() => controller.list(request)).toThrow(ForbiddenException);
  });
});