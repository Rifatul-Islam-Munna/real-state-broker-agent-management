import { ShowingFeedbackAutomationService } from './showing-feedback-automation.service';

describe('ShowingFeedbackAutomationService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-07-04T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('sends the primary and selected follow-up templates on the selected weekday', async () => {
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
      gapDays: 6,
      channels: ['Email'],
      templateId: 'owner-feedback-summary',
      compressWithAi: true,
      maxFeedback: 10,
      deliveryState: {},
    };
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => automation),
      getAdminSettings: jest.fn(async () => ({
        communicationTemplates: [
          {
            id: 'owner-feedback-summary',
            audience: 'OwnerFeedback',
            isActive: true,
            sequenceType: 'Direct',
          },
          {
            id: 'owner-feedback-follow-up',
            audience: 'OwnerFeedback',
            isActive: true,
            sequenceType: 'FollowUp1',
            gapDays: 2,
          },
        ],
      })),
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
    const scheduling: any = { getTimeZone: jest.fn(async () => 'UTC') };
    const service = new ShowingFeedbackAutomationService(
      feedbackRepo,
      settings,
      reports,
      dataSource,
      scheduling,
    );

    await service.processDueReports();

    expect(qb.where).toHaveBeenCalledWith(
      'feedback.sentiment IN (:...sentiments)',
      { sentiments: ['positive', 'negative'] },
    );
    expect(reports.sendAutomaticReport).toHaveBeenCalledTimes(2);
    expect(reports.sendAutomaticReport).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        propertyId: 4,
        templateId: 'owner-feedback-summary',
        afterFeedbackId: 0,
        compressWithAi: true,
      }),
    );
    expect(reports.sendAutomaticReport).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        propertyId: 4,
        templateId: 'owner-feedback-follow-up',
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

  test('does not scan or send outside the selected weekday', async () => {
    const feedbackRepo: any = {
      createQueryBuilder: jest.fn(),
    };
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => ({
        enabled: true,
        gapDays: 1,
        deliveryState: {},
      })),
    };
    const reports: any = { sendAutomaticReport: jest.fn() };
    const dataSource: any = { createQueryRunner: jest.fn() };
    const scheduling: any = { getTimeZone: jest.fn(async () => 'UTC') };
    const service = new ShowingFeedbackAutomationService(
      feedbackRepo,
      settings,
      reports,
      dataSource,
      scheduling,
    );

    await service.processDueReports();

    expect(feedbackRepo.createQueryBuilder).not.toHaveBeenCalled();
    expect(reports.sendAutomaticReport).not.toHaveBeenCalled();
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  test('does not send the same property twice in one local week', async () => {
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
    };
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => ({
        enabled: true,
        gapDays: 6,
        deliveryState: {
          '5': {
            lastFeedbackId: 10,
            lastSentAt: '2026-07-03T12:00:00.000Z',
          },
        },
      })),
    };
    const reports: any = { sendAutomaticReport: jest.fn() };
    const dataSource: any = { createQueryRunner: jest.fn() };
    const scheduling: any = { getTimeZone: jest.fn(async () => 'UTC') };
    const service = new ShowingFeedbackAutomationService(
      feedbackRepo,
      settings,
      reports,
      dataSource,
      scheduling,
    );

    await service.processDueReports();

    expect(reports.sendAutomaticReport).not.toHaveBeenCalled();
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });
});
