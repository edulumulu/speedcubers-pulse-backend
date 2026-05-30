import { jest } from '@jest/globals';

// Mock WcaClient before importing WcaService
const mockFetchWcaPerson = jest.fn();
jest.unstable_mockModule(
  '../../../src/infrastructure/external_api/WcaClient.js',
  () => ({ fetchWcaPerson: mockFetchWcaPerson }),
);

const { WcaService } = await import('../../../src/application/services/WcaService.js');

const mockRepo = {
  findByWcaId: jest.fn(),
  findByUserId: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const makeService = () => new WcaService(mockRepo);

beforeEach(() => {
  jest.clearAllMocks();
});

describe('WcaService.validateAndLink', () => {
  it('creates a new wca_profile when user has none', async () => {
    mockRepo.findByWcaId.mockResolvedValue(null);
    mockRepo.findByUserId.mockResolvedValue(null);
    mockFetchWcaPerson.mockResolvedValue({ wcaId: '2022LUCA04', countryIso2: 'ES', name: 'Eduardo' });
    mockRepo.create.mockResolvedValue({ userId: 'u1', wcaId: '2022LUCA04', countryIso2: 'ES' });

    const svc = makeService();
    const result = await svc.validateAndLink('u1', '2022LUCA04');

    expect(mockRepo.create).toHaveBeenCalledWith({ userId: 'u1', wcaId: '2022LUCA04', countryIso2: 'ES' });
    expect(result.wcaId).toBe('2022LUCA04');
  });

  it('updates existing profile when user already has one', async () => {
    mockRepo.findByWcaId.mockResolvedValue(null);
    mockRepo.findByUserId.mockResolvedValue({ userId: 'u1', wcaId: 'OLD' });
    mockFetchWcaPerson.mockResolvedValue({ wcaId: '2022LUCA04', countryIso2: 'ES' });
    mockRepo.update.mockResolvedValue({ userId: 'u1', wcaId: '2022LUCA04', countryIso2: 'ES' });

    const svc = makeService();
    await svc.validateAndLink('u1', '2022LUCA04');

    expect(mockRepo.update).toHaveBeenCalledTimes(1);
    expect(mockRepo.create).not.toHaveBeenCalled();
  });

  it('throws WCA_ID_TAKEN when wca_id belongs to another user', async () => {
    mockRepo.findByWcaId.mockResolvedValue({ userId: 'other-user', wcaId: '2022LUCA04' });

    const svc = makeService();
    await expect(svc.validateAndLink('u1', '2022LUCA04'))
      .rejects.toMatchObject({ code: 'WCA_ID_TAKEN', status: 409 });
  });

  it('throws WCA_ID_NOT_FOUND when WCA API returns null', async () => {
    mockRepo.findByWcaId.mockResolvedValue(null);
    mockFetchWcaPerson.mockResolvedValue(null);

    const svc = makeService();
    await expect(svc.validateAndLink('u1', '2022LUCA04'))
      .rejects.toMatchObject({ code: 'WCA_ID_NOT_FOUND', status: 404 });
  });
});

describe('WcaService.unlink', () => {
  it('calls repository delete', async () => {
    mockRepo.delete.mockResolvedValue(true);
    const svc = makeService();
    await svc.unlink('u1');
    expect(mockRepo.delete).toHaveBeenCalledWith('u1');
  });
});

describe('WcaService.getLiveData', () => {
  it('returns live data from WCA API without persisting', async () => {
    mockFetchWcaPerson.mockResolvedValue({ wcaId: '2022LUCA04', name: 'Eduardo', countryIso2: 'ES' });
    const svc = makeService();
    const data = await svc.getLiveData('2022LUCA04');
    expect(data.name).toBe('Eduardo');
    expect(mockRepo.create).not.toHaveBeenCalled();
  });
});
