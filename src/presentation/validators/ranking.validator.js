import Joi from 'joi';

const VALID_EVENTS = ['3x3', '2x2', '4x4', '5x5', '6x6', '7x7', '3x3oh', 'mega', 'pyra', 'skewb', 'sq1', 'clock'];

export const rankingQuerySchema = Joi.object({
  event: Joi.string()
    .valid(...VALID_EVENTS)
    .default('3x3'),
});
