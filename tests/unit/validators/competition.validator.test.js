import {
  createCompetitionSchema,
  getCompetitionParamsSchema,
  joinCompetitionSchema,
} from '../../../src/presentation/validators/competition.validator.js';

describe('competition validators', () => {
  it('accepts default create competition body', () => {
    const { error, value } = createCompetitionSchema.validate({});

    expect(error).toBeUndefined();
    expect(value.event).toBe('3x3');
  });

  it('accepts a safe join code', () => {
    const { error } = joinCompetitionSchema.validate({ code: 'ABC234' });

    expect(error).toBeUndefined();
  });

  it('rejects unsafe join codes', () => {
    const { error } = joinCompetitionSchema.validate({ code: '../bad' });

    expect(error).toBeDefined();
  });

  it('accepts route params for room lookup', () => {
    const { error } = getCompetitionParamsSchema.validate({ code: 'ABC234' });

    expect(error).toBeUndefined();
  });
});
