import { videoTokenSchema } from '../../../src/presentation/validators/video.validator.js';

describe('videoTokenSchema', () => {
  it('accepts a safe channel name', () => {
    const { error } = videoTokenSchema.validate({ channelName: 'match_abc-123' });

    expect(error).toBeUndefined();
  });

  it('rejects unsafe channel names', () => {
    const { error } = videoTokenSchema.validate({ channelName: '../match', uid: 42 });

    expect(error).toBeDefined();
  });

  it('rejects client-provided Agora uids', () => {
    const { error } = videoTokenSchema.validate({ channelName: 'match_1', uid: 42 });

    expect(error).toBeDefined();
  });

  it('rejects 64-character channel names', () => {
    const { error } = videoTokenSchema.validate({ channelName: 'a'.repeat(64) });

    expect(error).toBeDefined();
  });
});
