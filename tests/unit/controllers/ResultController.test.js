import { jest } from '@jest/globals';
import { ResultController } from '../../../src/presentation/controllers/ResultController.js';

const resultService = {
  submitResult: jest.fn(),
};

const makeController = () => new ResultController(resultService);

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('ResultController', () => {
  it('returns created result', async () => {
    const result = { id: 'result-id', finalTimeMs: 15000 };
    resultService.submitResult.mockResolvedValue(result);
    const response = res();

    await makeController().submitResult({
      userId: 'host-id',
      params: { code: 'ABC234' },
      body: { timeMs: 15000, penalty: 'none' },
    }, response);

    expect(resultService.submitResult).toHaveBeenCalledWith({
      userId: 'host-id',
      code: 'ABC234',
      timeMs: 15000,
      penalty: 'none',
    });
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.json).toHaveBeenCalledWith({ result });
  });
});
