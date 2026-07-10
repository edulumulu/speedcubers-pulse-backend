import Joi from 'joi';

const VALID_EVENTS = ['2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'oh', 'pyraminx', 'skewb'];

export const rankingQuerySchema = Joi.object({
  event: Joi.string()
    .valid(...VALID_EVENTS)
    .default('3x3'),
});
