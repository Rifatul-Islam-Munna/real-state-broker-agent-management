import { LeadFollowUpStatus } from './entities/lead.entity';
import { LeadOutreachBackgroundService } from './lead-outreach-background-v2.service';

describe('LeadOutreachBackgroundService', () => {
  test('does not send a realtor showing follow-up after a reply', async () => {
    const builder: any = {
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      execute: jest.fn(async () => ({ affected: 1 })),
    };
    const historyRepo: any = {
      createQueryBuilder: jest.fn(() => builder),
      update: jest.fn(async () => ({ affected: 1 })),
    };
    const leadRepo: any = {
      findOne: jest.fn(async () => ({
        id: 4,
        followUpStatus: LeadFollowUpStatus.Completed,
      })),
    };
    const outreach: any = { sendOutreach: jest.fn() };
    const service = new LeadOutreachBackgroundService(
      leadRepo,
      historyRepo,
      outreach,
      {} as any,
      {} as any,
    );

    await (service as any).claimAndSend({
      id: 22,
      leadId: 4,
      kind: 'Email',
      title: 'Follow-up',
      body: 'Any feedback?',
      summary: 'Scheduled',
      createdBy: 'Realtor Showing #17 Follow-up',
      lead: { id: 4, inBoard: false },
    });

    expect(outreach.sendOutreach).not.toHaveBeenCalled();
    expect(historyRepo.update).toHaveBeenCalledWith(
      22,
      expect.objectContaining({ status: 'Failed' }),
    );
  });
});
