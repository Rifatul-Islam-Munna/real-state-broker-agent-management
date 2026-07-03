import { SettingsService } from './settings.service';

describe('showing feedback automation settings', () => {
  test('keeps internal delivery state when the UI updates settings', async () => {
    const entity: any = {
      id: 1,
      contentJson: JSON.stringify({
        profile: {},
        communicationTemplates: [],
        showingFeedbackAutomation: {
          enabled: true,
          gapDays: 3,
          channels: ['Email'],
          templateId: 'owner-feedback-summary',
          compressWithAi: true,
          maxFeedback: 10,
          deliveryState: { '7': { lastFeedbackId: 25, lastSentAt: '2026-07-01T00:00:00.000Z' } },
        },
      }),
      updatedAt: new Date(),
    };
    const agencyRepo: any = {
      findOne: jest.fn(async () => entity),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, updatedAt: new Date() })),
    };
    const service = new SettingsService(agencyRepo, {} as never);

    const result: any = await service.updateSettings({
      profile: {},
      communicationTemplates: [],
      showingFeedbackAutomation: {
        enabled: true,
        gapDays: 5,
        channels: ['Email', 'SMS'],
        templateId: 'owner-feedback-summary',
        compressWithAi: false,
        maxFeedback: 12,
      },
    });

    const stored = JSON.parse(entity.contentJson);
    expect(stored.showingFeedbackAutomation.deliveryState['7'].lastFeedbackId).toBe(25);
    expect(result.showingFeedbackAutomation.deliveryState).toBeUndefined();
    expect(result.showingFeedbackAutomation.gapDays).toBe(5);
    expect(result.showingFeedbackAutomation.compressWithAi).toBe(false);
  });
});
