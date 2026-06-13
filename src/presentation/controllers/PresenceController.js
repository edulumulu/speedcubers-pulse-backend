export class PresenceController {
  constructor(presenceService) {
    this.presenceService = presenceService;
  }

  getOnlineUsers = async (_req, res) => {
    try {
      const users = await this.presenceService.listOnlineUsers();
      return res.status(200).json({ users });
    } catch {
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
