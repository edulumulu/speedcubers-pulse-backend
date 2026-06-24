import Joi from 'joi';
import { WCA_ID_REGEX } from '../../infrastructure/config/constants.js';

const passwordField = () =>
  Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.pattern.name': 'Password must contain at least one {#name} letter',
    });

export const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  username: Joi.string().alphanum().min(2).max(20).required(),
  password: passwordField(),
  wca_id: Joi.string()
    .pattern(WCA_ID_REGEX)
    .optional()
    .messages({
      'string.pattern.base': 'Invalid WCA ID format (e.g. 2022LUCA04)',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const refreshSchema = Joi.object({
  refresh_token: Joi.string().optional(),
});

export const linkWcaSchema = Joi.object({
  wca_id: Joi.string()
    .pattern(WCA_ID_REGEX)
    .required()
    .messages({
      'string.pattern.base': 'Invalid WCA ID format (e.g. 2022LUCA04)',
    }),
});

export const checkAvailabilitySchema = Joi.object({
  username: Joi.string().alphanum().min(2).max(20),
  email: Joi.string().email().max(255),
}).min(1);

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.pattern.name': 'Password must contain at least one {#name} letter',
    }),
});

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error } = schema.validate(req[source], { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }
    next();
  };
}
