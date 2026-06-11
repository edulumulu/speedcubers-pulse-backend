import { handleError } from '../utils/handleError.js';

export class CompetitionController {
  constructor(competitionService) {
    this.competitionService = competitionService;
  }

  createRoom = async (req, res) => {
    try {
      const room = await this.competitionService.createRoom({
        userId: req.userId,
        event: req.body.event,
      });
      return res.status(201).json({ competition: room });
    } catch (err) {
      return handleError(err, res);
    }
  };

  joinRoom = async (req, res) => {
    try {
      const room = await this.competitionService.joinRoom({
        userId: req.userId,
        code: req.body.code,
      });
      return res.status(200).json({ competition: room });
    } catch (err) {
      return handleError(err, res);
    }
  };

  getRoom = async (req, res) => {
    try {
      const room = await this.competitionService.getRoom({
        userId: req.userId,
        code: req.params.code,
      });
      return res.status(200).json({ competition: room });
    } catch (err) {
      return handleError(err, res);
    }
  };
}
