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

function makeRoundRepository() {
  return {
    createNext: jest.fn(),
    findActiveByCompetition: jest.fn(),
    findLatestCompletedByCompetition: jest.fn(),
    updateEvent: jest.fn(),
  };
}

function makeResultRepository() {
  return {
    findByRound: jest.fn(),
    countByRound: jest.fn(),
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
    const roundRepository = makeRoundRepository();
    const resultRepository = makeResultRepository();
    repository.findByCode.mockResolvedValue(makeRow());
    repository.setGuestAndActivate.mockResolvedValue(makeRow({
      status: 'active',
      guest_user_id: 'guest-id',
      guest: { id: 'guest-id', username: 'guest' },
    }));
    roundRepository.createNext.mockResolvedValue({
      id: 'round-id',
      round_number: 1,
      scramble: 'R U R\' U\'',
      status: 'active',
    });
    roundRepository.findActiveByCompetition.mockResolvedValue({
      id: 'round-id',
      round_number: 1,
      event: '3x3',
      scramble: 'R U R\' U\'',
      status: 'active',
    });
    roundRepository.findLatestCompletedByCompetition.mockResolvedValue(null);

    const service = new CompetitionService(repository, roundRepository, resultRepository);
    const result = await service.joinRoom({ userId: 'guest-id', code: 'abc234' });

    expect(repository.setGuestAndActivate).toHaveBeenCalledWith('competition-id', 'guest-id');
    expect(roundRepository.createNext).toHaveBeenCalledWith('competition-id', '3x3');
    expect(result.status).toBe('active');
    expect(result.guest).toEqual({ id: 'guest-id', username: 'guest' });
    expect(result.activeRound).toMatchObject({
      number: 1,
      event: '3x3',
      scramble: 'R U R\' U\'',
      status: 'active',
    });
  });

  it('updates the active round event before results are submitted', async () => {
    const repository = makeRepository();
    const roundRepository = makeRoundRepository();
    const resultRepository = makeResultRepository();
    repository.findByCode.mockResolvedValue(makeRow({
      status: 'active',
      guest_user_id: 'guest-id',
      guest: { id: 'guest-id', username: 'guest' },
    }));
    roundRepository.findActiveByCompetition
      .mockResolvedValueOnce({
        id: 'round-id',
        round_number: 1,
        event: '3x3',
        scramble: 'R U R\' U\'',
        status: 'active',
      })
      .mockResolvedValueOnce({
        id: 'round-id',
        round_number: 1,
        event: '2x2',
        scramble: 'R U F',
        status: 'active',
      });
    roundRepository.findLatestCompletedByCompetition.mockResolvedValue(null);
    roundRepository.updateEvent.mockResolvedValue({
      id: 'round-id',
      round_number: 1,
      event: '2x2',
      scramble: 'R U F',
      status: 'active',
    });
    resultRepository.countByRound.mockResolvedValue(0);

    const service = new CompetitionService(repository, roundRepository, resultRepository);
    const result = await service.updateActiveRoundEvent({ userId: 'host-id', code: 'ABC234', event: '2x2' });

    expect(roundRepository.updateEvent).toHaveBeenCalledWith('round-id', '2x2');
    expect(result.activeRound).toMatchObject({ event: '2x2', scramble: 'R U F' });
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
