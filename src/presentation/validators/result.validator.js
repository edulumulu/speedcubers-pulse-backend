import Joi from 'joi';
import { competitionCodeSchema } from './competition.validator.js';

export const submitResultParamsSchema = Joi.object({
  code: competitionCodeSchema,
});

export const submitResultSchema = Joi.object({
  timeMs: Joi.when('penalty', {
    is: 'dnf',
    then: Joi.number().integer().min(0).max(600000).allow(null).optional(),
    otherwise: Joi.number().integer().min(0).max(600000).required(),
  }),
  penalty: Joi.string().valid('none', '+2', '+4', 'dnf').default('none'),
});
