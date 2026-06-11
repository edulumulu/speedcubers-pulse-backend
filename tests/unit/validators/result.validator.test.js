import {
  submitResultParamsSchema,
  submitResultSchema,
} from '../../../src/presentation/validators/result.validator.js';

describe('result validators', () => {
  it('accepts route params for result submission', () => {
    const { error } = submitResultParamsSchema.validate({ code: 'ABC234' });

    expect(error).toBeUndefined();
  });

  it('accepts a timed result with default penalty', () => {
    const { error, value } = submitResultSchema.validate({ timeMs: 15000 });

    expect(error).toBeUndefined();
    expect(value.penalty).toBe('none');
  });

  it('accepts DNF without a time', () => {
    const { error } = submitResultSchema.validate({ penalty: 'dnf' });

    expect(error).toBeUndefined();
  });

  it('rejects missing time for non-DNF penalties', () => {
    const { error } = submitResultSchema.validate({ penalty: '+2' });

    expect(error).toBeDefined();
  });

  it('rejects out-of-range time values', () => {
    const { error } = submitResultSchema.validate({ timeMs: 600001 });

    expect(error).toBeDefined();
  });
});
