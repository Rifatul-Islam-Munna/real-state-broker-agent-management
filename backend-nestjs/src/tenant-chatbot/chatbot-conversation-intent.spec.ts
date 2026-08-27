import { detectPropertyIntents } from './property-question-intent';
import {
  parseChatbotRole,
  parseQualificationReply,
  parseQualificationValues,
  parseShowingIntent,
  readPropertyQualification,
  qualificationResult,
} from './chatbot-conversation-intent';

describe('chatbot conversation intent', () => {
  it.each([
    ['I am a tenant looking to rent', 'LEAD'],
    ['tenant', 'LEAD'],
    ['im a tenent', 'LEAD'],
    ['I wanna rent this place for myself', 'LEAD'],
    ['rent this condo myself', 'LEAD'],
    ['my family and i want to move in', 'LEAD'],
    ['we are prospective renters', 'LEAD'],
    ["I'm the Realtor for my client", 'REALTOR'],
    ['realtor', 'REALTOR'],
    ['im a realter', 'REALTOR'],
    ['broker here', 'REALTOR'],
    ['I represent my buyer', 'REALTOR'],
    ['I am acting for a client', 'REALTOR'],
    ['agent representing my tenant', 'REALTOR'],
  ])('understands role wording %s', (message, expected) => {
    expect(parseChatbotRole(message)).toBe(expected);
  });

  it.each([
    'not sure yet',
    'who is the listing agent?',
    'what is the agent phone number?',
    'is tenant insurance required?',
    'what does the renter pay for electricity?',
  ])('does not invent a role from a property question: %s', (message) => {
    expect(parseChatbotRole(message)).toBeNull();
  });

  it('collects credit and income in natural self reports', () => {
    expect(parseQualificationReply('my credit score is 735', 'creditScore')).toEqual({ creditScore: 735 });
    expect(parseQualificationReply('my creidt scroe is around 742', 'creditScore')).toEqual({ creditScore: 742 });
    expect(parseQualificationReply('I make $5,200 per month', 'monthlyEarning')).toEqual({ monthlyEarning: 5200 });
    expect(parseQualificationReply('we make 9k combined', 'monthlyEarning')).toEqual({ monthlyEarning: 9000 });
    expect(parseQualificationReply('6 grand', 'monthlyEarning')).toEqual({ monthlyEarning: 6000 });
  });

  it('collects proactive values even when the bot did not ask first', () => {
    expect(parseQualificationValues('FYI my FICO is 760 and I make $5,500 per month')).toEqual({ creditScore: 760, monthlyEarning: 5500 });
    expect(parseQualificationValues('our creidt is 745. combined inocme is 7.5k monthly')).toEqual({ creditScore: 745, monthlyEarning: 7500 });
    expect(parseQualificationValues('my score is 780 and annual salary is 60k')).toEqual({ creditScore: 780, monthlyEarning: 5000 });
    expect(parseQualificationValues('I earn $1,200 weekly')).toEqual({ monthlyEarning: 5200 });
    expect(parseQualificationValues('we make 2400 biweekly')).toEqual({ monthlyEarning: 5200 });
  });

  it('does not mistake property numbers or requirement questions for qualification answers', () => {
    expect(parseQualificationReply('Is apartment 315 on the top floor?', 'creditScore')).toEqual({});
    expect(parseQualificationReply('Is the rent $1,550 per month?', 'monthlyEarning')).toEqual({});
    expect(parseQualificationReply('What is the $500 HOA deposit?', 'monthlyEarning')).toEqual({});
    expect(parseQualificationReply('What minimum credit score do I need, is it 720?', 'creditScore')).toEqual({});
    expect(parseQualificationReply('how much creidt do i nead maybe 720?', 'creditScore')).toEqual({});
    expect(parseQualificationReply('Is the minimum monthly income $4,650?', 'monthlyEarning')).toEqual({});
    expect(parseQualificationValues('rent is $1550 monthly and minimum credit is 720')).toEqual({});
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

  it.each([
    ['when can i move in?', 'available'],
    ['whn is it avaliable to move?', 'available'],
    ['can i vape in here?', 'smoking'],
    ['is smokng okay inside?', 'smoking'],
    ['how mnay creidt score need ?', 'credit'],
    ['where do i park my suv?', 'parking'],
    ['is parknig for guests included?', 'guest-parking'],
    ['do i need insurence?', 'insurance'],
    ['how long hoa aproval take?', 'hoa-approval'],
    ['what utilites are included?', 'utilities'],
    ['where is the proprty adress?', 'address'],
    ['can i bring my puppy?', 'pets'],
  ])('maps typo-heavy property wording %s to %s', (message, expectedIntent) => {
    expect(detectPropertyIntents(message).map((item) => item.id)).toContain(expectedIntent);
  });
});

describe('showing conversation intent', () => {
  it.each([
    'I wanna rent this, can you give me the showing form?',
    'how do I request a showing?',
    'can I see the property?',
    'I want to schedule a tour',
    'book a viewing for this place',
    'can i have a shwoing tommorw?',
    'can we do a showng saturday?',
    'i wanna vewing this weekend',
    'can i visit?',
    'I want to visit the condo',
    'can i come by tomorrow?',
    'when can i come over',
    'can i stop by friday?',
    'can i drop by this evening?',
    'can someone show me the apartment?',
    'show me around please',
    'i want to see it in person',
    'can i physically see this?',
    'i would like to take a look',
    'can i check it out?',
    'can we arrange an appointment?',
    'book me a visit please',
    'set up a time to see the unit',
    'reserve a slot for tomorrow',
    'is there an open house?',
    'meet there tomorrow?',
    'can i see it monday?',
    'i want to rent this condo',
    'ready to lease the place',
    'want to rent',
  ])('recognizes showing/rental intent: %s', (message) => {
    expect(parseShowingIntent(message)).toBe(true);
  });

  it.each([
    'what is the monthly income requirement?',
    'when is the property available?',
    'can i see the photos?',
    'what is the rent?',
    'is parking included?',
    'what floor is the unit on?',
    'who is the realtor?',
  ])('does not treat ordinary property questions as showing requests: %s', (message) => {
    expect(parseShowingIntent(message)).toBe(false);
  });
});