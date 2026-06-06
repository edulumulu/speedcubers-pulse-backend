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
      const tokens = await this.authService.refreshTokens(refresh_token);
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

  forgotPassword = async (req, res) => {
    try {
      await this.authService.forgotPassword(req.body.email);
      res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };

  resetPassword = async (req, res) => {
    try {
      await this.authService.resetPassword(req.body.token, req.body.password);
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };

  checkAvailability = async (req, res) => {
    try {
      const { username, email } = req.query;
      const result = {};
      const checks = [];
      if (username) checks.push(
        this.authService.isUsernameTaken(username).then(taken => { result.username = { taken }; }),
      );
      if (email) checks.push(
        this.authService.isEmailTaken(email).then(taken => { result.email = { taken }; }),
      );
      if (!checks.length) return res.status(400).json({ error: 'Provide username or email' });
      await Promise.all(checks);
      res.json(result);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
}
