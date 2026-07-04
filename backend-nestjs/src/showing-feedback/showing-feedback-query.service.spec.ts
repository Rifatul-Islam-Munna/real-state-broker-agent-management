import { ShowingFeedbackQueryService } from './showing-feedback-query.service';

describe('ShowingFeedbackQueryService', () => {
  const property = {
    id: 4,
    title: '12 Lake Street',
    ownerEmail: 'owner@example.com',
    ownerPhone: '+15555550123',
  };
  const feedback = [
    {
      id: 7,
      propertyId: 4,
      sentiment: 'positive',
      feedbackText: 'The client loved the natural light and layout.',
      receivedAt: new Date('2026-07-01T10:00:00.000Z'),
    },
    {
      id: 8,
      propertyId: 4,
      sentiment: 'negative',
      feedbackText: 'The buyer felt the kitchen needed too much work.',
      receivedAt: new Date('2026-07-02T10:00:00.000Z'),
    },
  ];

  function createService(templateBody: string) {
    const reportQuery: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getMany: jest.fn(async () => feedback),
    };
    const feedbackRepo: any = {
      createQueryBuilder: jest.fn(() => reportQuery),
      find: jest.fn(async () => feedback),
    };
    const propertyRepo: any = {
      findOne: jest.fn(async () => property),
    };
    const settings: any = {
      getAdminSettings: jest.fn(async () => ({
        communicationTemplates: [
          {
            id: 'owner-feedback-summary',
            audience: 'OwnerFeedback',
            isActive: true,
            subject: 'Feedback for {{property_address}}',
            body: templateBody,
          },
        ],
      })),
      getAiProviderConfig: jest.fn(async () => null),
      getShowingFeedbackAutomation: jest.fn(async () => ({
        gapDays: 6,
        deliveryState: {},
      })),
    };
    const scheduling: any = { getTimeZone: jest.fn(async () => 'UTC') };
    const sms: any = { send: jest.fn() };
    return {
      feedbackRepo,
      service: new ShowingFeedbackQueryService(
        feedbackRepo,
        propertyRepo,
        settings,
        scheduling,
        sms,
      ),
    };
  }

  test('renders positive and negative feedback in separate template sections', async () => {
    const { service } = createService(
      'Positive\n{{positive_feedback}}\n\nNegative\n{{negative_feedback}}',
    );

    const result = await service.previewReport({
      propertyId: 4,
      fromDate: '2026-07-01',
      toDate: '2026-07-07',
      templateId: 'owner-feedback-summary',
      maxFeedback: 10,
      summarize: false,
    });

    expect(result.positiveCount).toBe(1);
    expect(result.negativeCount).toBe(1);
    expect(result.body).toContain(
      'Positive\n1. The client loved the natural light and layout.',
    );
    expect(result.body).toContain(
      'Negative\n1. The buyer felt the kitchen needed too much work.',
    );
  });

  test('keeps legacy feedback templates separated without duplicating tokens', async () => {
    const { service } = createService(
      'Summary\n{{feedback_summary}}\n\n{{feedback1}}\n{{feedback2}}',
    );

    const result = await service.previewReport({
      propertyId: 4,
      fromDate: '2026-07-01',
      toDate: '2026-07-07',
      templateId: 'owner-feedback-summary',
      maxFeedback: 10,
      summarize: false,
    });

    expect(result.body).toContain('Positive feedback');
    expect(result.body).toContain('Negative feedback');
    expect(result.body.match(/natural light/g)).toHaveLength(1);
    expect(result.body.match(/kitchen needed/g)).toHaveLength(1);
  });
});
