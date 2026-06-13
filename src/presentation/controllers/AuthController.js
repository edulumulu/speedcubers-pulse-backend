import { handleError } from '../utils/handleError.js';

const REFRESH_COOKIE_NAME = 'refresh_token';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function refreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    path: '/api/v1/auth',
  };
}

function readCookie(req, name) {
  const rawCookie = req.headers.cookie;
  if (!rawCookie) return null;

  const cookies = rawCookie.split(';').map((part) => part.trim());
  const cookie = cookies.find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;

  return decodeURIComponent(cookie.slice(name.length + 1));
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions(),
    maxAge: undefined,
  });
}

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

      setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(201).json(result);
    } catch (err) {
      handleError(err, res);
    }
  };

  login = async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await this.authService.login({ email, password });
      setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(200).json(result);
    } catch (err) {
      handleError(err, res);
    }
  };

  refresh = async (req, res) => {
    try {
      const refreshToken = req.body.refresh_token ?? readCookie(req, REFRESH_COOKIE_NAME);
      const result = await this.authService.refreshTokens(refreshToken);
      setRefreshCookie(res, result.tokens.refreshToken);
      return res.status(200).json(result);
    } catch (err) {
      handleError(err, res);
    }
  };

  logout = async (_req, res) => {
    clearRefreshCookie(res);
    return res.status(204).send();
  };

  linkWca = async (req, res) => {
    try {
      const { wca_id } = req.body;
      const profile = await this.wcaService.validateAndLink(req.userId, wca_id);
      return res.status(200).json({ wcaProfile: profile });
    } catch (err) {
      handleError(err, res);
    }
  };

  unlinkWca = async (req, res) => {
    try {
      await this.wcaService.unlink(req.userId);
      return res.status(204).send();
    } catch (err) {
      handleError(err, res);
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
