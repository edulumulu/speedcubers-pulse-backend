import { jest } from '@jest/globals';
import { CompetitionService } from '../../../src/application/services/CompetitionService.js';

function makeRow(overrides = {}) {
  return {
    id: 'competition-id',
    code: 'ABC234',
    channel_name: 'match-abc234',
    event: '3x3',
    status: 'waiting',
    host_user_id: 'host-id',
    guest_user_id: null,
    host: { id: 'host-id', username: 'host' },
    guest: null,
    created_at: new Date('2026-06-11T12:00:00.000Z'),
    updated_at: new Date('2026-06-11T12:00:00.000Z'),
    ...overrides,
  };
}

function makeRepository() {
  return {
    findByCode: jest.fn(),
    create: jest.fn(),
    setGuestAndActivate: jest.fn(),
  };
}

describe('CompetitionService', () => {
  it('creates a waiting competition room with a safe channel name', async () => {
    const repository = makeRepository();
    repository.findByCode.mockResolvedValue(null);
    repository.create.mockResolvedValue(makeRow());

    const service = new CompetitionService(repository);
    const result = await service.createRoom({ userId: 'host-id', event: '3x3' });

    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
      channel_name: expect.stringMatching(/^match-[a-z2-9]{6}$/),
      event: '3x3',
      host_user_id: 'host-id',
    }));
    expect(result).toMatchObject({
      code: 'ABC234',
      channelName: 'match-abc234',
      status: 'waiting',
      host: { id: 'host-id', username: 'host' },
    });
  });

  it('activates a waiting room when a guest joins', async () => {
    const repository = makeRepository();
    repository.findByCode.mockResolvedValue(makeRow());
    repository.setGuestAndActivate.mockResolvedValue(makeRow({
      status: 'active',
      guest_user_id: 'guest-id',
      guest: { id: 'guest-id', username: 'guest' },
    }));

    const service = new CompetitionService(repository);
    const result = await service.joinRoom({ userId: 'guest-id', code: 'abc234' });

    expect(repository.setGuestAndActivate).toHaveBeenCalledWith('competition-id', 'guest-id');
    expect(result.status).toBe('active');
    expect(result.guest).toEqual({ id: 'guest-id', username: 'guest' });
  });

  it('rejects joining a full room', async () => {
    const repository = makeRepository();
    repository.findByCode.mockResolvedValue(makeRow({
      status: 'active',
      guest_user_id: 'other-guest-id',
      guest: { id: 'other-guest-id', username: 'other' },
    }));

    const service = new CompetitionService(repository);

    await expect(service.joinRoom({ userId: 'guest-id', code: 'ABC234' }))
      .rejects.toMatchObject({ code: 'COMPETITION_FULL', status: 409 });
  });

  it('rejects when another guest takes the room before activation completes', async () => {
    const repository = makeRepository();
    repository.findByCode
      .mockResolvedValueOnce(makeRow())
      .mockResolvedValueOnce(makeRow({
        status: 'active',
        guest_user_id: 'other-guest-id',
        guest: { id: 'other-guest-id', username: 'other' },
      }));
    repository.setGuestAndActivate.mockResolvedValue(null);

    const service = new CompetitionService(repository);

    await expect(service.joinRoom({ userId: 'guest-id', code: 'ABC234' }))
      .rejects.toMatchObject({ code: 'COMPETITION_FULL', status: 409 });
  });
});
