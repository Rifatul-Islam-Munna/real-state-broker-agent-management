import { composeVerifiedAnswer } from './verified-answer-composer';

describe('composeVerifiedAnswer', () => {
  it('combines complementary verified income requirements into one human answer', () => {
    const answer = composeVerifiedAnswer(
      'what will be at last income for need for this propraty?',
      [
        { title: 'Income requirement', answer: 'Income requirement: Minimum 3x the rent' },
        { title: 'Minimum monthly income', answer: 'Minimum monthly income: $4,650' },
        { title: 'HOA income criteria', answer: 'HOA income criteria: $40,000 yearly' },
        { title: 'Debt to income ratio', answer: 'Debt to income ratio: must not exceed 40%' },
        { title: 'Proof of income', answer: 'Proof of income: required' },
        { title: 'Income documents', answer: 'Income documents: 2 years of W-2 and tax returns' },
      ],
    );
    expect(answer).toContain('3x the rent');
    expect(answer).toContain('$4,650');
    expect(answer).toContain('$40,000');
    expect(answer).toContain('40%');
    expect(answer).toContain('W-2');
    expect(answer).not.toContain('conflict');
  });

  it('returns null for non-income questions so normal single-fact wording is retained', () => {
    expect(composeVerifiedAnswer('can i park?', [{ title: 'Parking', answer: 'Parking: 1 spot' }])).toBeNull();
  });
});
