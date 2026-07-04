import { ShowingFeedbackAutomationService } from './showing-feedback-automation.service';

describe('ShowingFeedbackAutomationService', () => {
  test('sends an unsent positive and negative batch and advances the cursor', async () => {
    const rows = [{ propertyId: '4', latestFeedbackId: '8' }];
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => rows),
    };
    const feedbackRepo: any = {
      createQueryBuilder: jest.fn(() => qb),
      find: jest.fn(async () => [
        { id: 7, propertyId: 4, sentiment: 'positive' },
        { id: 8, propertyId: 4, sentiment: 'negative' },
      ]),
    };
    const automation = {
      enabled: true,
      channels: ['Email'],
      templateId: 'owner-feedback-summary',
      compressWithAi: true,
      maxFeedback: 10,
      deliveryState: {},
    };
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => automation),
      saveShowingFeedbackDeliveryState: jest.fn(
        async (_propertyId, state) => state,
      ),
    };
    const reports: any = {
      sendAutomaticReport: jest.fn(async () => ({
        latestFeedbackId: 8,
        sent: ['Email'],
      })),
    };
    const runner: any = {
      connect: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) =>
        sql.includes('try_advisory') ? [{ locked: true }] : [],
      ),
    };
    const dataSource: any = { createQueryRunner: jest.fn(() => runner) };
    const service = new ShowingFeedbackAutomationService(
      feedbackRepo,
      settings,
      reports,
      dataSource,
    );

    await service.processDueReports();

    expect(qb.where).toHaveBeenCalledWith(
      'feedback.sentiment IN (:...sentiments)',
      { sentiments: ['positive', 'negative'] },
    );
    expect(reports.sendAutomaticReport).toHaveBeenCalledWith(
      expect.objectContaining({
        propertyId: 4,
        afterFeedbackId: 0,
        compressWithAi: true,
      }),
    );
    expect(settings.saveShowingFeedbackDeliveryState).toHaveBeenLastCalledWith(
      4,
      expect.objectContaining({
        lastFeedbackId: 8,
        processingThroughId: 0,
      }),
    );
  });

  test('clears the processing claim when the selected weekday is not due', async () => {
    const qb: any = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(async () => [
        { propertyId: '5', latestFeedbackId: '11' },
      ]),
    };
    const feedbackRepo: any = {
      createQueryBuilder: jest.fn(() => qb),
      find: jest.fn(async () => [
        { id: 11, propertyId: 5, sentiment: 'positive' },
      ]),
    };
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => ({
        enabled: true,
        channels: ['SMS'],
        templateId: 'owner-feedback-summary',
        compressWithAi: false,
        maxFeedback: 10,
        deliveryState: {},
      })),
      saveShowingFeedbackDeliveryState: jest.fn(
        async (_propertyId, state) => state,
      ),
    };
    const reports: any = {
      sendAutomaticReport: jest.fn(async () => null),
    };
    const runner: any = {
      connect: jest.fn(),
      release: jest.fn(),
      query: jest.fn(async (sql: string) =>
        sql.includes('try_advisory') ? [{ locked: true }] : [],
      ),
    };
    const service = new ShowingFeedbackAutomationService(
      feedbackRepo,
      settings,
      reports,
      { createQueryRunner: jest.fn(() => runner) } as any,
    );

    await service.processDueReports();

    expect(settings.saveShowingFeedbackDeliveryState).toHaveBeenLastCalledWith(
      5,
      expect.objectContaining({
        processingStartedAt: null,
        processingThroughId: 0,
      }),
    );
  });
});
