export class UserController {
  constructor(userService) {
    this.userService = userService;
  }

  getByUsername = async (req, res) => {
    try {
      const result = await this.userService.getByUsername(req.params.username);
      return res.status(200).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  getMe = async (req, res) => {
    try {
      const result = await this.userService.getMe(req.userId);
      return res.status(200).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  updateMe = async (req, res) => {
    try {
      const user = await this.userService.updateMe(req.userId, req.body);
      return res.status(200).json({ user });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  deleteMe = async (req, res) => {
    try {
      await this.userService.deleteMe(req.userId);
      return res.status(204).send();
    } catch (err) {
if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
