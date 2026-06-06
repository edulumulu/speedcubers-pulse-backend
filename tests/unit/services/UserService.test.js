import { jest } from '@jest/globals';
import { UserService } from '../../../src/application/services/UserService.js';

const mockUser = {
  id: 'uid-1',
  email: 'alice@test.com',
  username: 'alice',
  passwordHash: 'hash',
  usernameChangedAt: null,
  canChangeUsername: jest.fn().mockReturnValue(true),
  toPublic: jest.fn().mockReturnValue({ id: 'uid-1', username: 'alice' }),
  toPrivate: jest.fn().mockReturnValue({ id: 'uid-1', email: 'alice@test.com', username: 'alice' }),
};

const mockUserRepository = {
  findById: jest.fn(),
  findByUsername: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockWcaService = {
  getProfile: jest.fn(),
  getLiveData: jest.fn(),
};

const makeService = () => new UserService(mockUserRepository, mockWcaService);

beforeEach(() => jest.clearAllMocks());

describe('UserService.getByUsername', () => {
  it('returns public profile without wca when not linked', async () => {
    mockUserRepository.findByUsername.mockResolvedValue(mockUser);
    mockWcaService.getProfile.mockResolvedValue(null);

    const result = await makeService().getByUsername('alice');
    expect(result.user.username).toBe('alice');
    expect(result.wcaProfile).toBeNull();
    expect(result.wcaLiveData).toBeNull();
  });

  it('returns profile with live WCA data when linked', async () => {
    mockUserRepository.findByUsername.mockResolvedValue(mockUser);
    mockWcaService.getProfile.mockResolvedValue({ wcaId: '2022LUCA04' });
    mockWcaService.getLiveData.mockResolvedValue({ name: 'Eduardo Lucas' });

    const result = await makeService().getByUsername('alice');
    expect(result.wcaLiveData.name).toBe('Eduardo Lucas');
  });

  it('returns profile even when WCA live data fetch fails', async () => {
    mockUserRepository.findByUsername.mockResolvedValue(mockUser);
    mockWcaService.getProfile.mockResolvedValue({ wcaId: '2022LUCA04' });
    mockWcaService.getLiveData.mockRejectedValue(new Error('WCA API down'));

    const result = await makeService().getByUsername('alice');
    expect(result.wcaLiveData).toBeNull();
    expect(result.user.username).toBe('alice');
  });

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockUserRepository.findByUsername.mockResolvedValue(null);

    await expect(makeService().getByUsername('nobody'))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
  });
});

describe('UserService.getMe', () => {
  it('returns private profile', async () => {
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockWcaService.getProfile.mockResolvedValue(null);

    const result = await makeService().getMe('uid-1');
    expect(result.user.email).toBe('alice@test.com');
  });

  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(makeService().getMe('uid-x'))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
  });

  it('returns wcaLiveData when profile is linked', async () => {
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockWcaService.getProfile.mockResolvedValue({ wcaId: '2022LUCA04' });
    mockWcaService.getLiveData.mockResolvedValue({ name: 'Eduardo' });

    const result = await makeService().getMe('uid-1');
    expect(result.wcaLiveData.name).toBe('Eduardo');
  });

  it('returns null wcaLiveData when live fetch fails', async () => {
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockWcaService.getProfile.mockResolvedValue({ wcaId: '2022LUCA04' });
    mockWcaService.getLiveData.mockRejectedValue(new Error('timeout'));

    const result = await makeService().getMe('uid-1');
    expect(result.wcaLiveData).toBeNull();
  });
});

describe('UserService.updateMe', () => {
  it('throws USER_NOT_FOUND when user does not exist', async () => {
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(makeService().updateMe('uid-x', { email: 'new@test.com' }))
      .rejects.toMatchObject({ code: 'USER_NOT_FOUND', status: 404 });
  });

  it('throws USERNAME_CHANGE_TOO_SOON when cooldown not met', async () => {
    const user = { ...mockUser, canChangeUsername: jest.fn().mockReturnValue(false) };
    mockUserRepository.findById.mockResolvedValue(user);

    await expect(makeService().updateMe('uid-1', { username: 'newname' }))
      .rejects.toMatchObject({ code: 'USERNAME_CHANGE_TOO_SOON', status: 422 });
  });

  it('updates email and returns private profile', async () => {
    mockUserRepository.findById.mockResolvedValue(mockUser);
    mockUserRepository.update.mockResolvedValue(mockUser);

    const result = await makeService().updateMe('uid-1', { email: 'new@test.com' });
    expect(result.email).toBe('alice@test.com');
    expect(mockUserRepository.update).toHaveBeenCalledWith('uid-1', { email: 'new@test.com' });
  });
});

describe('UserService.deleteMe', () => {
  it('anonymizes and soft-deletes the user', async () => {
    mockUserRepository.update.mockResolvedValue(mockUser);
    mockUserRepository.delete.mockResolvedValue(true);

    await makeService().deleteMe('uid-1');
    expect(mockUserRepository.update).toHaveBeenCalledWith('uid-1', expect.objectContaining({
      email: expect.stringContaining('@deleted.invalid'),
      username: expect.stringContaining('del_'),
    }));
    expect(mockUserRepository.delete).toHaveBeenCalledWith('uid-1');
  });
});
