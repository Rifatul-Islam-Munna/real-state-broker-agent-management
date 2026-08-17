import { TenantShowingFeedbackAutomationService } from './tenant-showing-feedback-automation.service';

function tenant() {
  return { id: 7, databaseName: 'tenant_7_blue', isActive: true, isBlocked: false } as any;
}

describe('TenantShowingFeedbackAutomationService', () => {
  function build(rows: any[], agency: any, enqueueResult: any) {
    const query = jest.fn(async (sql: string) => {
      if (sql.includes("resource = 'showing-feedback'")) {
        return { rowCount: rows.length, rows };
      }
      if (sql.includes('FROM tenant_property')) {
        return {
          rowCount: 1,
          rows: [
            {
              title: '2500 Parkview Dr Unit #1216',
              payload: {
                ownerName: 'Jane Owner',
                ownerEmail: 'jane@example.com',
                ownerPhone: '+1 555 010 2200',
              },
            },
          ],
        };
      }
      return { rowCount: 0, rows: [] };
    });
    const databases = {
      withTenantClient: jest.fn((_name: string, callback: any) => callback({ query })),
    };
    const settings = {
      getAgencySettings: jest.fn().mockResolvedValue(agency),
      updateAgencySettings: jest.fn().mockResolvedValue(agency),
    };
    const enqueue = jest.fn().mockResolvedValue(enqueueResult);
    const service = new TenantShowingFeedbackAutomationService(
      {} as any,
      databases as any,
      settings as any,
      { enqueue } as any,
    );
    return { service, query, settings, enqueue };
  }

  const automation = {
    enabled: true,
    channels: ['Email', 'SMS'],
    templateId: 'owner-feedback',
    sentimentFilter: 'all',
    maxFeedback: 50,
    gapDays: 1,
    positiveKnowledge: '',
    negativeKnowledge: '',
    deliveryState: {},
  };

  const agency = {
    profile: { agencyName: 'Blue Realty' },
    showingFeedbackAutomation: automation,
    communicationTemplates: [
      {
        id: 'owner-feedback',
        name: 'Owner Feedback Report',
        subject: 'Feedback for {{property_address}}',
        body: '{{positive_summary}}\n\n{{negative_summary}}',
        channels: ['Email', 'SMS'],
        sequenceType: 'Direct',
        audience: 'OwnerFeedback',
        isActive: true,
      },
    ],
  };

  test('classifies unlabeled feedback and sends the owner report', async () => {
    const { service, query, enqueue } = build(
      [
        {
          id: 11,
          payload: {
            propertyId: 3,
            feedbackText: 'The client loved the apartment and wants to apply.',
          },
        },
        {
          id: 12,
          payload: {
            propertyId: 3,
            feedbackText: 'Too expensive, client will pass.',
          },
        },
      ],
      agency,
      [{ id: 201, channel: 'Email', status: 'scheduled' }],
    );
    const result = await (service as any).processTenant(tenant());
    expect(result.classified).toBe(2);
    const updates = query.mock.calls.filter((call: any[]) =>
      `${call[0]}`.includes('SET payload'),
    );
    expect(updates).toHaveLength(2);
    const sentiments = updates.map((call: any[]) => JSON.parse(call[1][1]).sentiment).sort();
    expect(sentiments).toEqual(['negative', 'positive']);
    expect(enqueue).toHaveBeenCalledTimes(1);
    const input = enqueue.mock.calls[0][1];
    expect(input.sourceType).toBe('owner-feedback-report');
    expect(input.recipientEmail).toBe('jane@example.com');
    expect(input.channels).toEqual(['Email', 'SMS']);
    expect(input.title).toBe('Feedback for 2500 Parkview Dr Unit #1216');
    expect(input.body).toContain('loved the apartment');
    expect(input.body).toContain('Too expensive');
  });

  test('does nothing when automation is disabled', async () => {
    const { service, enqueue } = build(
      [{ id: 11, payload: { propertyId: 3, feedbackText: 'Great showing', sentiment: 'positive' } }],
      { ...agency, showingFeedbackAutomation: { ...automation, enabled: false } },
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).processTenant(tenant());
    expect(result.sent).toBe(0);
    expect(enqueue).not.toHaveBeenCalled();
  });

  test('only reports negative feedback when the filter is negative', async () => {
    const { service, enqueue } = build(
      [
        { id: 11, payload: { propertyId: 3, feedbackText: 'Great showing', sentiment: 'positive' } },
        { id: 12, payload: { propertyId: 3, feedbackText: 'Bad experience', sentiment: 'negative' } },
      ],
      { ...agency, showingFeedbackAutomation: { ...automation, sentimentFilter: 'negative' } },
      [{ status: 'scheduled' }],
    );
    const result = await (service as any).processTenant(tenant());
    expect(result.sent).toBe(1);
    const body = enqueue.mock.calls[0][1].body as string;
    expect(body).toContain('Bad experience');
    expect(body).not.toContain('Great showing');
  });
});
