import { handleError } from '../utils/handleError.js';

export class VideoController {
  constructor(videoService, videoQuotaService) {
    this.videoService = videoService;
    this.videoQuotaService = videoQuotaService;
  }

  createToken = async (req, res) => {
    try {
      const quota = await this.videoQuotaService.ensureAvailable(req.userId);
      const token = this.videoService.createRtcToken({
        userId: req.userId,
        channelName: req.body.channelName,
        ttlSeconds: Math.min(this.videoService.ttlSeconds, quota.remainingSeconds),
      });

      return res.status(200).json({ ...token, quota });
    } catch (err) {
      return handleError(err, res);
    }
  };

  reportUsage = async (req, res) => {
    try {
      const quota = await this.videoQuotaService.consume(req.userId, req.body.seconds);
      return res.status(200).json({ quota });
    } catch (err) {
      return handleError(err, res);
    }
  };
}
