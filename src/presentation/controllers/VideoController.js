import { handleError } from '../utils/handleError.js';

export class VideoController {
  constructor(videoService) {
    this.videoService = videoService;
  }

  createToken = async (req, res) => {
    try {
      const token = this.videoService.createRtcToken({
        userId: req.userId,
        channelName: req.body.channelName,
      });

      return res.status(200).json(token);
    } catch (err) {
      return handleError(err, res);
    }
  };
}
