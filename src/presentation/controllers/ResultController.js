import { handleError } from '../utils/handleError.js';

export class ResultController {
  constructor(resultService) {
    this.resultService = resultService;
  }

  submitResult = async (req, res) => {
    try {
      const result = await this.resultService.submitResult({
        userId: req.userId,
        code: req.params.code,
        timeMs: req.body.timeMs,
        penalty: req.body.penalty,
      });
      return res.status(201).json({ result });
    } catch (err) {
      return handleError(err, res);
    }
  };
}
