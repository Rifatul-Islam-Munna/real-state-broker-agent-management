import { ShowingFeedbackService } from './showing-feedback.service';

describe('ShowingFeedbackService classification', () => {
  test('uses the configured AI fallback for an unusual reply instead of exact examples', async () => {
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => ({
        autoClassifyMinConfidence: 72,
        aiFallbackMinConfidence: 0,
        negativeKnowledge: '',
        positiveKnowledge: '',
      })),
    };
    const aiJsonClient: any = {
      call: jest.fn(async () => ({
        provider: 'TestAI',
        value: {
          isFeedback: true,
          feedbackText: 'The space has the right feeling for the client.',
          sentiment: 'positive',
          confidence: 0.93,
        },
      })),
    };
    const service = new ShowingFeedbackService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      settings,
      {} as any,
      aiJsonClient,
      {} as any,
    );

    const result = await (service as any).classifyFeedback(
      '',
      'The space has a certain feeling that works for them.',
    );

    expect(aiJsonClient.call).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        classifier: 'AI Fallback:TestAI',
        isFeedback: true,
        sentiment: 'positive',
      }),
    );
  });

  test('does not store a thanks-only reply as property feedback', async () => {
    const settings: any = {
      getShowingFeedbackAutomation: jest.fn(async () => ({
        autoClassifyMinConfidence: 72,
        aiFallbackMinConfidence: 0,
        negativeKnowledge: '',
        positiveKnowledge: '',
      })),
    };
    const aiJsonClient: any = {
      call: jest.fn(async () => ({
        provider: 'TestAI',
        value: {
          isFeedback: false,
          feedbackText: 'Thank you, received.',
          sentiment: 'neutral',
          confidence: 0.98,
        },
      })),
    };
    const service = new ShowingFeedbackService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      settings,
      {} as any,
      aiJsonClient,
      {} as any,
    );

    const result = await (service as any).classifyFeedback(
      '',
      'Thank you, received.',
    );

    expect(result.isFeedback).toBe(false);
    expect(result.sentiment).toBe('neutral');
  });
});
