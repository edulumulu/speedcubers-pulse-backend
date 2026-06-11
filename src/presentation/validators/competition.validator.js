import Joi from 'joi';

export const competitionCodeSchema = Joi.string()
  .trim()
  .uppercase()
  .length(6)
  .pattern(/^[A-Z2-9]+$/)
  .required()
  .messages({
    'string.pattern.base': 'Competition code can only contain uppercase letters and numbers',
  });

export const createCompetitionSchema = Joi.object({
  event: Joi.string()
    .valid('2x2', '3x3', '4x4', '5x5', '6x6', '7x7', 'oh', 'pyraminx', 'skewb')
    .default('3x3'),
});

export const joinCompetitionSchema = Joi.object({
  code: competitionCodeSchema,
});

export const getCompetitionParamsSchema = Joi.object({
  code: competitionCodeSchema,
});
