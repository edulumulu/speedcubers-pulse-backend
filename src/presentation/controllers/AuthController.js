export class AuthController {
  constructor(authService, wcaService) {
    this.authService = authService;
    this.wcaService = wcaService;
  }

  register = async (req, res) => {
    try {
      const { email, username, password, wca_id } = req.body;
      const result = await this.authService.register({ email, username, password });

      if (wca_id) {
        try {
          await this.wcaService.validateAndLink(result.user.id, wca_id);
        } catch {
          // WCA link failure does not abort registration
        }
      }

      return res.status(201).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });
      return res.status(200).json(result);
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  refresh = async (req, res) => {
    try {
      const { refresh_token } = req.body;
      const tokens = this.authService.refreshTokens(refresh_token);
      return res.status(200).json({ tokens });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  logout = async (_req, res) => {
    // Stateless JWT — client drops the token.
    // If a token blacklist is needed in future, add it here.
    return res.status(204).send();
  };

  linkWca = async (req, res) => {
    try {
      const { wca_id } = req.body;
      const profile = await this.wcaService.validateAndLink(req.userId, wca_id);
      return res.status(200).json({ wcaProfile: profile });
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message, code: err.code });
      }
      return res.status(500).json({ error: 'Internal server error' });
    }
  };

  unlinkWca = async (req, res) => {
    try {
      await this.wcaService.unlink(req.userId);
      return res.status(204).send();
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
