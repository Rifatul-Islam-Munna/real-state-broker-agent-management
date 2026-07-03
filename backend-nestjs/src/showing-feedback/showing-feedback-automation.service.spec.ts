import { ShowingFeedbackAutomationService } from './showing-feedback-automation.service';

describe('ShowingFeedbackAutomationService', () => {
  test('sends a due unsent batch and advances the property cursor', async () => {
    const oldDate = new Date(Date.now() - 3 * 86_400_000);
    const rows = [{ propertyId: '4', latestFeedbackId: '8' }];
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => rows),
    };
    const feedbackRepo: any = {
      createQueryBuilder: jest.fn(() => qb),
      findOne: jest.fn(async () => ({ id: 7, propertyId: 4, receivedAt: oldDate })),
      find: jest.fn(async () => [
        { id: 7, propertyId: 4, receivedAt: oldDate },
        { id: 8, propertyId: 4, receivedAt: oldDate },
      ]),
    };
    const automation = {
      enabled: true,
      gapDays: 2,
      channels: ['Email'],
      templateId: 'owner-feedback-summary',
      compressWithAi: true,
      maxFeedback: 10,
      deliveryState: {},
    };
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => automation),
      saveShowingFeedbackDeliveryState: jest.fn(async (_propertyId, state) => state),
    };
    const reports: any = {
      sendAutomaticReport: jest.fn(async () => ({ latestFeedbackId: 8, sent: ['Email'] })),
    };
    const runner: any = {
      connect: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) => sql.includes('try_advisory') ? [{ locked: true }] : []),
    };
    const dataSource: any = { createQueryRunner: jest.fn(() => runner) };
    const service = new ShowingFeedbackAutomationService(feedbackRepo, settings, reports, dataSource);

    await service.processDueReports();

    expect(reports.sendAutomaticReport).toHaveBeenCalledWith(expect.objectContaining({
      propertyId: 4,
      afterFeedbackId: 0,
      compressWithAi: true,
    }));
    expect(settings.saveShowingFeedbackDeliveryState).toHaveBeenLastCalledWith(4, expect.objectContaining({
      lastFeedbackId: 8,
      processingThroughId: 0,
    }));
  });
});
