import { jest } from '@jest/globals';
import { UserController } from '../../../src/presentation/controllers/UserController.js';

const mockUserService = {
  getByUsername: jest.fn(),
  getMe: jest.fn(),
  updateMe: jest.fn(),
  deleteMe: jest.fn(),
};

const makeController = () => new UserController(mockUserService);

const res = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  r.send = jest.fn().mockReturnValue(r);
  return r;
};

beforeEach(() => jest.clearAllMocks());

describe('UserController.getByUsername', () => {
  it('returns 200 with result on success', async () => {
    mockUserService.getByUsername.mockResolvedValue({ user: { username: 'alice' } });
    const req = { params: { username: 'alice' } };
    const response = res();

    await makeController().getByUsername(req, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({ user: { username: 'alice' } });
  });

  it('returns err.status when service throws with status', async () => {
    const err = new Error('Not found'); err.status = 404; err.code = 'USER_NOT_FOUND';
    mockUserService.getByUsername.mockRejectedValue(err);
    const req = { params: { username: 'nobody' } };
    const response = res();

    await makeController().getByUsername(req, response);
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 when service throws without status', async () => {
    mockUserService.getByUsername.mockRejectedValue(new Error('DB error'));
    const req = { params: { username: 'alice' } };
    const response = res();

    await makeController().getByUsername(req, response);
    expect(response.status).toHaveBeenCalledWith(500);
  });
});

describe('UserController.getMe', () => {
  it('returns 200 on success', async () => {
    mockUserService.getMe.mockResolvedValue({ user: { email: 'alice@test.com' } });
    const req = { userId: 'uid-1' };
    const response = res();

    await makeController().getMe(req, response);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns err.status when service throws with status', async () => {
    const err = new Error('Not found'); err.status = 404; err.code = 'USER_NOT_FOUND';
    mockUserService.getMe.mockRejectedValue(err);
    const response = res();

    await makeController().getMe({ userId: 'uid-x' }, response);
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 when service throws without status', async () => {
    mockUserService.getMe.mockRejectedValue(new Error('DB error'));
    const response = res();

    await makeController().getMe({ userId: 'uid-1' }, response);
    expect(response.status).toHaveBeenCalledWith(500);
  });
});

describe('UserController.updateMe', () => {
  it('returns 200 on success', async () => {
    mockUserService.updateMe.mockResolvedValue({ id: 'uid-1' });
    const req = { userId: 'uid-1', body: { email: 'new@test.com' } };
    const response = res();

    await makeController().updateMe(req, response);
    expect(response.status).toHaveBeenCalledWith(200);
  });

  it('returns err.status when service throws with status', async () => {
    const err = new Error('Too soon'); err.status = 422; err.code = 'USERNAME_CHANGE_TOO_SOON';
    mockUserService.updateMe.mockRejectedValue(err);
    const response = res();

    await makeController().updateMe({ userId: 'uid-1', body: { username: 'new' } }, response);
    expect(response.status).toHaveBeenCalledWith(422);
  });

  it('returns 500 when service throws without status', async () => {
    mockUserService.updateMe.mockRejectedValue(new Error('DB error'));
    const response = res();

    await makeController().updateMe({ userId: 'uid-1', body: {} }, response);
    expect(response.status).toHaveBeenCalledWith(500);
  });
});

describe('UserController.deleteMe', () => {
  it('returns 204 on success', async () => {
    mockUserService.deleteMe.mockResolvedValue();
    const response = res();

    await makeController().deleteMe({ userId: 'uid-1' }, response);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.send).toHaveBeenCalled();
  });

  it('returns err.status when service throws with status', async () => {
    const err = new Error('Not found'); err.status = 404; err.code = 'USER_NOT_FOUND';
    mockUserService.deleteMe.mockRejectedValue(err);
    const response = res();

    await makeController().deleteMe({ userId: 'uid-x' }, response);
    expect(response.status).toHaveBeenCalledWith(404);
  });

  it('returns 500 when service throws without status', async () => {
    mockUserService.deleteMe.mockRejectedValue(new Error('DB error'));
    const response = res();

    await makeController().deleteMe({ userId: 'uid-1' }, response);
    expect(response.status).toHaveBeenCalledWith(500);
  });
});
