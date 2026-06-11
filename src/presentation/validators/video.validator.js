import Joi from 'joi';

export const videoTokenSchema = Joi.object({
  channelName: Joi.string()
    .trim()
    .min(3)
    .max(63)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .required()
    .messages({
      'string.pattern.base': 'Channel name can only contain letters, numbers, hyphens and underscores',
    }),
});
