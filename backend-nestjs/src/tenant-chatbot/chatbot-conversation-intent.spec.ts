import { selectAnswerEvidence } from './evidence-selection';
import { detectPropertyIntents } from './property-question-intent';
import {
  chatbotConversationReply,
  parseChatbotRole,
  parseQualificationReply,
  parseQualificationValues,
  parseQualificationWithApprovedHint,
  parseShowingIntent,
  qualificationClarificationPrompt,
  readPropertyQualification,
  qualificationResult,
} from './chatbot-conversation-intent';

describe('chatbot conversation intent', () => {
  it.each([
    ['hello', /here to help/i],
    ['good morning', /here to help/i],
    ['how are you?', /here to help/i],
    ['thanks', /welcome/i],
    ['who are you?', /property assistant/i],
  ])(
    'handles conversational message %s without property retrieval',
    (message, expected) => {
      expect(chatbotConversationReply(message)).toMatch(expected);
    },
  );

  it('does not swallow a greeting that also contains a property question', () => {
    expect(
      chatbotConversationReply('Hi, what is the monthly rent?'),
    ).toBeNull();
  });

  it('does not answer an explicit property topic with evidence from another topic', () => {
    const evidence = [
      {
        match: { score: 0.97 },
        record: {
          title: 'Minimum credit score',
          answer: 'Minimum credit score: 720',
        },
      },
    ];
    expect(selectAnswerEvidence('Is parking included?', evidence)).toEqual([]);
  });

  it.each([
    ['I am a tenant looking to rent', 'LEAD'],
    ['tenant', 'LEAD'],
    ['im a tenent', 'LEAD'],
    ['I wanna rent this place for myself', 'LEAD'],
    ['rent this condo myself', 'LEAD'],
    ['my family and i want to move in', 'LEAD'],
    ['we had 4 member of family will it fit?', 'LEAD'],
    ['family of 4 will fit here?', 'LEAD'],
    ['we are prospective renters', 'LEAD'],
    ["I'm the Realtor for my client", 'REALTOR'],
    ['realtor', 'REALTOR'],
    ['im a realter', 'REALTOR'],
    ['broker here', 'REALTOR'],
    ['I represent my buyer', 'REALTOR'],
    ['I am acting for a client', 'REALTOR'],
    ['agent representing my tenant', 'REALTOR'],
    ['just me and my wife, we wanna move in', 'LEAD'],
    ['need a place for me n my gf', 'LEAD'],
    ['trying to find an apt for myself', 'LEAD'],
    ['not a realtor, this place is for me', 'LEAD'],
    ['im their agent', 'REALTOR'],
    ['showing this for my client', 'REALTOR'],
    ['messaging on behalf of my buyer', 'REALTOR'],
    ['i got a client interested in this unit', 'REALTOR'],
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
    expect(
      parseQualificationReply('my credit score is 735', 'creditScore'),
    ).toEqual({ creditScore: 735 });
    expect(
      parseQualificationReply('my creidt scroe is around 742', 'creditScore'),
    ).toEqual({ creditScore: 742 });
    expect(
      parseQualificationReply('I make $5,200 per month', 'monthlyEarning'),
    ).toEqual({ monthlyEarning: 5200 });
    expect(
      parseQualificationReply('we make 9k combined', 'monthlyEarning'),
    ).toEqual({ monthlyEarning: 9000 });
    expect(parseQualificationReply('6 grand', 'monthlyEarning')).toEqual({
      monthlyEarning: 6000,
    });
    expect(parseQualificationReply('seven forty', 'creditScore')).toEqual({
      creditScore: 740,
    });
    expect(
      parseQualificationReply('seven hundred forty', 'creditScore'),
    ).toEqual({ creditScore: 740 });
    expect(parseQualificationReply('5k monthly', 'monthlyEarning')).toEqual({
      monthlyEarning: 5000,
    });
    expect(parseQualificationReply('$75k/yr', 'monthlyEarning')).toEqual({
      monthlyEarning: 6250,
    });
    expect(parseQualificationReply('1200/wk', 'monthlyEarning')).toEqual({
      monthlyEarning: 5200,
    });
    expect(parseQualificationReply('five grand', 'monthlyEarning')).toEqual({
      monthlyEarning: 5000,
    });
  });

  it('collects proactive values even when the bot did not ask first', () => {
    expect(
      parseQualificationValues(
        'FYI my FICO is 760 and I make $5,500 per month',
      ),
    ).toEqual({ creditScore: 760, monthlyEarning: 5500 });
    expect(
      parseQualificationValues(
        'our creidt is 745. combined inocme is 7.5k monthly',
      ),
    ).toEqual({ creditScore: 745, monthlyEarning: 7500 });
    expect(
      parseQualificationValues('my score is 780 and annual salary is 60k'),
    ).toEqual({ creditScore: 780, monthlyEarning: 5000 });
    expect(parseQualificationValues('I earn $1,200 weekly')).toEqual({
      monthlyEarning: 5200,
    });
    expect(parseQualificationValues('we make 2400 biweekly')).toEqual({
      monthlyEarning: 5200,
    });
    expect(
      parseQualificationValues(
        'my score is seven forty and my income is five grand monthly',
      ),
    ).toEqual({ creditScore: 740, monthlyEarning: 5000 });
    expect(
      parseQualificationValues(
        'my fico is seven hundred forty and i bring in 6k a month',
      ),
    ).toEqual({ creditScore: 740, monthlyEarning: 6000 });
  });

  it('does not mistake property numbers or requirement questions for qualification answers', () => {
    expect(
      parseQualificationReply(
        'Is apartment 315 on the top floor?',
        'creditScore',
      ),
    ).toEqual({});
    expect(
      parseQualificationReply(
        'Is the rent $1,550 per month?',
        'monthlyEarning',
      ),
    ).toEqual({});
    expect(
      parseQualificationReply(
        'What is the $500 HOA deposit?',
        'monthlyEarning',
      ),
    ).toEqual({});
    expect(
      parseQualificationReply(
        'What minimum credit score do I need, is it 720?',
        'creditScore',
      ),
    ).toEqual({});
    expect(
      parseQualificationReply(
        'how much creidt do i nead maybe 720?',
        'creditScore',
      ),
    ).toEqual({});
    expect(
      parseQualificationReply(
        'Is the minimum monthly income $4,650?',
        'monthlyEarning',
      ),
    ).toEqual({});
    expect(
      parseQualificationValues(
        'rent is $1550 monthly and minimum credit is 720',
      ),
    ).toEqual({});
    expect(
      parseQualificationValues('is the minimum score seven forty?'),
    ).toEqual({});
  });

  it('reads qualification requirements from structured fields or listing description', () => {
    expect(
      readPropertyQualification({
        minimumCreditScore: '720',
        minimumMonthlyIncome: '4650',
      }),
    ).toEqual({ minimumCreditScore: 720, minimumMonthlyIncome: 4650 });
    expect(
      readPropertyQualification({
        description:
          'Credit Score >> 720\nVerifiable income of >> Min 3x the rent ($4,650 Monthly income)',
      }),
    ).toEqual({ minimumCreditScore: 720, minimumMonthlyIncome: 4650 });
  });

  it('qualifies against both credit and monthly income', () => {
    expect(
      qualificationResult(
        { creditScore: 730, monthlyEarning: 5000 },
        { minimumCreditScore: 720, minimumMonthlyIncome: 4650 },
      ),
    ).toEqual({ qualified: true, missing: null, failed: null });
    expect(
      qualificationResult(
        { creditScore: 700, monthlyEarning: 5000 },
        { minimumCreditScore: 720, minimumMonthlyIncome: 4650 },
      ).failed,
    ).toBe('creditScore');
    expect(
      qualificationResult(
        { creditScore: 730, monthlyEarning: 4000 },
        { minimumCreditScore: 720, minimumMonthlyIncome: 4650 },
      ).failed,
    ).toBe('monthlyEarning');
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
    ['still up?', 'available'],
    ['what are they asking?', 'rent'],
    ['what bills r on me?', 'utilities'],
    ['is it pet friendly?', 'pets'],
    ['where do i put my car?', 'parking'],
    ['send me the app', 'apply-url'],
    ['how long i gotta stay?', 'lease'],
    ['guest spot?', 'guest-parking'],
    ['what fico do i need?', 'credit'],
  ])('maps typo-heavy property wording %s to %s', (message, expectedIntent) => {
    expect(detectPropertyIntents(message).map((item) => item.id)).toContain(
      expectedIntent,
    );
  });

  it('understands generic listing contact language without forcing phone or email wording', () => {
    const intents = detectPropertyIntents(
      'who do i talk to about this place?',
    ).map((item) => item.id);
    expect(intents).toContain('phone');
    expect(intents).toContain('email');
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
    'when can we take a look?',
    'cud i swing by tmr?',
    'any openings 4 a tour sat?',
    'wud love to see it this wknd',
    'can i pull up tonite?',
    'cn i sched a shwng fri?',
    'would it be possible to see the unit this week?',
    'what time could we come see it?',
    'got any slots for a viewing tomorrow?',
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
  ])(
    'does not treat ordinary property questions as showing requests: %s',
    (message) => {
      expect(parseShowingIntent(message)).toBe(false);
    },
  );
});
describe('human qualification language expansion', () => {
  it.each([
    ['not great maybe 690', 'creditScore', { creditScore: 690 }],
    ['my score is low 700s', 'creditScore', { creditScore: 710 }],
    [
      'last i checked it was seven forty two',
      'creditScore',
      { creditScore: 742 },
    ],
    ['seven oh five', 'creditScore', { creditScore: 705 }],
    ['my score is just under 720', 'creditScore', { creditScore: 719 }],
    ['not much maybe 4500', 'monthlyEarning', { monthlyEarning: 4500 }],
    ['between 5 and 6k', 'monthlyEarning', { monthlyEarning: 5000 }],
    ['five and a half grand', 'monthlyEarning', { monthlyEarning: 5500 }],
  ])('understands human qualification reply %s', (message, field, expected) => {
    expect(
      parseQualificationReply(
        message,
        field as 'creditScore' | 'monthlyEarning',
      ),
    ).toEqual(expected);
  });

  it('recognizes invalid self reports as clarification instead of a property requirement question', () => {
    expect(
      parseQualificationReply(
        'ahhh, my credit score is like 900',
        'creditScore',
      ),
    ).toEqual({});
    expect(
      qualificationClarificationPrompt(
        'ahhh, my credit score is like 900',
        'creditScore',
      ),
    ).toMatch(/300–850/);
    expect(
      qualificationClarificationPrompt(
        'my crenti score is like 7090',
        'creditScore',
      ),
    ).toMatch(/Did you mean/);
    expect(
      qualificationClarificationPrompt('i make like 50', 'monthlyEarning'),
    ).toMatch(/rough amount/i);
  });

  it('uses an approved semantic hint only to parse the current visitor value', () => {
    expect(
      parseQualificationWithApprovedHint(
        'score hovering around 712',
        'creditScore',
      ),
    ).toEqual({ creditScore: 712 });
    expect(
      parseQualificationWithApprovedHint(
        'roughly 5.5k every month',
        'monthlyEarning',
      ),
    ).toEqual({ monthlyEarning: 5500 });
    expect(
      parseQualificationWithApprovedHint(
        'is the minimum score 720?',
        'creditScore',
      ),
    ).toEqual({});
    expect(
      parseQualificationWithApprovedHint(
        'is rent 1550 monthly?',
        'monthlyEarning',
      ),
    ).toEqual({});
  });
});

describe('indirect human showing wording', () => {
  it('understands the typo-heavy visit wording from the test UI', () => {
    expect(
      parseShowingIntent(
        'i wanna visit this propraty tommor is it possibale to do it can you give me details',
      ),
    ).toBe(true);
    expect(parseShowingIntent('can i go there tomorrow and take a peek?')).toBe(
      true,
    );
    expect(parseShowingIntent('can you send me more details and photos?')).toBe(
      false,
    );
  });
});
