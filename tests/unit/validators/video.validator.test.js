import { videoTokenSchema } from '../../../src/presentation/validators/video.validator.js';

describe('videoTokenSchema', () => {
  it('accepts a safe channel name and optional uid', () => {
    const { error } = videoTokenSchema.validate({ channelName: 'match_abc-123', uid: 42 });

    expect(error).toBeUndefined();
  });

  it('rejects unsafe channel names', () => {
    const { error } = videoTokenSchema.validate({ channelName: '../match', uid: 42 });

    expect(error).toBeDefined();
  });

  it('rejects out-of-range Agora uids', () => {
    const { error } = videoTokenSchema.validate({ channelName: 'match_1', uid: 2 ** 32 });

    expect(error).toBeDefined();
  });

  it('rejects zero as Agora uid', () => {
    const { error } = videoTokenSchema.validate({ channelName: 'match_1', uid: 0 });

    expect(error).toBeDefined();
  });
});
