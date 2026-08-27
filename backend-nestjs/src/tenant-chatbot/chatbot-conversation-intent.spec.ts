import { detectPropertyIntents } from './property-question-intent';
import {
  parseChatbotRole,
  parseQualificationReply,
  parseShowingIntent,
  readPropertyQualification,
  qualificationResult,
} from './chatbot-conversation-intent';

describe('chatbot conversation intent', () => {
  it('understands tenant and realtor role replies', () => {
    expect(parseChatbotRole('I am a tenant looking to rent')).toBe('LEAD');
    expect(parseChatbotRole("I'm the Realtor for my client")).toBe('REALTOR');
    expect(parseChatbotRole('not sure yet')).toBeNull();
  });

  it('collects only credit score and monthly earning', () => {
    expect(parseQualificationReply('my credit score is 735', 'creditScore')).toEqual({ creditScore: 735 });
    expect(parseQualificationReply('I make $5,200 per month', 'monthlyEarning')).toEqual({ monthlyEarning: 5200 });
    expect(parseQualificationReply('we make 9k combined', 'monthlyEarning')).toEqual({ monthlyEarning: 9000 });
  });

  it('does not mistake property numbers or requirement questions for qualification answers', () => {
    expect(parseQualificationReply('Is apartment 315 on the top floor?', 'creditScore')).toEqual({});
    expect(parseQualificationReply('Is the rent $1,550 per month?', 'monthlyEarning')).toEqual({});
    expect(parseQualificationReply('What is the $500 HOA deposit?', 'monthlyEarning')).toEqual({});
    expect(parseQualificationReply('What minimum credit score do I need, is it 720?', 'creditScore')).toEqual({});
    expect(parseQualificationReply('Is the minimum monthly income $4,650?', 'monthlyEarning')).toEqual({});
  });

  it('reads qualification requirements from structured fields or listing description', () => {
    expect(readPropertyQualification({ minimumCreditScore: '720', minimumMonthlyIncome: '4650' })).toEqual({ minimumCreditScore: 720, minimumMonthlyIncome: 4650 });
    expect(readPropertyQualification({ description: 'Credit Score >> 720\nVerifiable income of >> Min 3x the rent ($4,650 Monthly income)' })).toEqual({ minimumCreditScore: 720, minimumMonthlyIncome: 4650 });
  });

  it('qualifies against both credit and monthly income', () => {
    expect(qualificationResult({ creditScore: 730, monthlyEarning: 5000 }, { minimumCreditScore: 720, minimumMonthlyIncome: 4650 })).toEqual({ qualified: true, missing: null, failed: null });
    expect(qualificationResult({ creditScore: 700, monthlyEarning: 5000 }, { minimumCreditScore: 720, minimumMonthlyIncome: 4650 }).failed).toBe('creditScore');
    expect(qualificationResult({ creditScore: 730, monthlyEarning: 4000 }, { minimumCreditScore: 720, minimumMonthlyIncome: 4650 }).failed).toBe('monthlyEarning');
  });

  it('maps natural move-in and vape wording to verified property topics', () => {
    expect(detectPropertyIntents('when can i move in?').map((item) => item.id)).toContain('available');
    expect(detectPropertyIntents('can i vape in here?').map((item) => item.id)).toContain('smoking');
  });
});

describe('showing conversation intent', () => {
  it.each([
    'I wanna rent this, can you give me the showing form?',
    'how do I request a showing?',
    'can I see the property?',
    'I want to schedule a tour',
    'book a viewing for this place',
  ])('recognizes showing/rental intent: %s', (message) => {
    expect(parseShowingIntent(message)).toBe(true);
  });

  it('does not treat ordinary property questions as showing requests', () => {
    expect(parseShowingIntent('what is the monthly income requirement?')).toBe(false);
    expect(parseShowingIntent('when is the property available?')).toBe(false);
  });
});
