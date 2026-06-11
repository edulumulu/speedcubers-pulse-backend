import { jest } from '@jest/globals';
import { ResultService } from '../../../src/application/services/ResultService.js';

function makeCompetition(overrides = {}) {
  return {
    id: 'competition-id',
    code: 'ABC234',
    status: 'active',
    host_user_id: 'host-id',
    guest_user_id: 'guest-id',
    ...overrides,
  };
}

function makeResult(overrides = {}) {
  return {
    id: 'result-id',
    round_id: 'round-id',
    user_id: 'host-id',
    time_ms: 15000,
    penalty: 'none',
    final_time_ms: 15000,
    user: { id: 'host-id', username: 'host' },
    created_at: new Date('2026-06-11T12:00:00.000Z'),
    updated_at: new Date('2026-06-11T12:00:00.000Z'),
    ...overrides,
  };
}

function makeRound(overrides = {}) {
  return {
    id: 'round-id',
    competition_id: 'competition-id',
    round_number: 1,
    scramble: null,
    status: 'active',
    ...overrides,
  };
}

function makeRepositories() {
  return {
    resultRepository: {
      findByRoundAndUser: jest.fn(),
      countByRound: jest.fn(),
      create: jest.fn(),
    },
    competitionRepository: {
      findByCode: jest.fn(),
    },
    competitionRoundRepository: {
      findActiveByCompetition: jest.fn(),
      createNext: jest.fn(),
      complete: jest.fn(),
    },
  };
}

describe('ResultService', () => {
  it('submits a result for an active competition participant', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition());
    competitionRoundRepository.findActiveByCompetition.mockResolvedValue(makeRound());
    resultRepository.findByRoundAndUser.mockResolvedValue(null);
    resultRepository.create.mockResolvedValue(makeResult());
    resultRepository.countByRound.mockResolvedValue(1);

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);
    const result = await service.submitResult({ userId: 'host-id', code: 'abc234', timeMs: 15000 });

    expect(competitionRepository.findByCode).toHaveBeenCalledWith('ABC234');
    expect(resultRepository.create).toHaveBeenCalledWith({
      round_id: 'round-id',
      user_id: 'host-id',
      time_ms: 15000,
      penalty: 'none',
      final_time_ms: 15000,
    });
    expect(result).toMatchObject({
      roundId: 'round-id',
      round: { id: 'round-id', number: 1, scramble: null },
      timeMs: 15000,
      penalty: 'none',
      finalTimeMs: 15000,
    });
  });

  it('adds two seconds for +2 penalties', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition());
    competitionRoundRepository.findActiveByCompetition.mockResolvedValue(makeRound());
    resultRepository.findByRoundAndUser.mockResolvedValue(null);
    resultRepository.create.mockResolvedValue(makeResult({
      penalty: '+2',
      final_time_ms: 17000,
    }));
    resultRepository.countByRound.mockResolvedValue(1);

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);
    await service.submitResult({ userId: 'guest-id', code: 'ABC234', timeMs: 15000, penalty: '+2' });

    expect(resultRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'guest-id',
      penalty: '+2',
      final_time_ms: 17000,
    }));
  });

  it('stores null final time for DNF penalties', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition());
    competitionRoundRepository.findActiveByCompetition.mockResolvedValue(makeRound());
    resultRepository.findByRoundAndUser.mockResolvedValue(null);
    resultRepository.create.mockResolvedValue(makeResult({
      time_ms: null,
      penalty: 'dnf',
      final_time_ms: null,
    }));
    resultRepository.countByRound.mockResolvedValue(1);

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);
    await service.submitResult({ userId: 'host-id', code: 'ABC234', timeMs: null, penalty: 'dnf' });

    expect(resultRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      time_ms: null,
      penalty: 'dnf',
      final_time_ms: null,
    }));
  });

  it('rejects non participants', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition());

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);

    await expect(service.submitResult({ userId: 'third-id', code: 'ABC234', timeMs: 15000 }))
      .rejects.toMatchObject({ code: 'COMPETITION_NOT_FOUND', status: 404 });
  });

  it('rejects inactive competitions', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition({ status: 'waiting' }));

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);

    await expect(service.submitResult({ userId: 'host-id', code: 'ABC234', timeMs: 15000 }))
      .rejects.toMatchObject({ code: 'COMPETITION_NOT_ACTIVE', status: 409 });
  });

  it('rejects duplicate submissions', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition());
    competitionRoundRepository.findActiveByCompetition.mockResolvedValue(makeRound());
    resultRepository.findByRoundAndUser.mockResolvedValue(makeResult());

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);

    await expect(service.submitResult({ userId: 'host-id', code: 'ABC234', timeMs: 15000 }))
      .rejects.toMatchObject({ code: 'RESULT_ALREADY_SUBMITTED', status: 409 });
  });

  it('completes the round and opens the next one after two submitted results', async () => {
    const { resultRepository, competitionRepository, competitionRoundRepository } = makeRepositories();
    competitionRepository.findByCode.mockResolvedValue(makeCompetition());
    competitionRoundRepository.findActiveByCompetition.mockResolvedValue(makeRound());
    resultRepository.findByRoundAndUser.mockResolvedValue(null);
    resultRepository.create.mockResolvedValue(makeResult({ user_id: 'guest-id' }));
    resultRepository.countByRound.mockResolvedValue(2);

    const service = new ResultService(resultRepository, competitionRepository, competitionRoundRepository);
    await service.submitResult({ userId: 'guest-id', code: 'ABC234', timeMs: 16000 });

    expect(competitionRoundRepository.complete).toHaveBeenCalledWith('round-id');
    expect(competitionRoundRepository.createNext).toHaveBeenCalledWith('competition-id');
  });
});
