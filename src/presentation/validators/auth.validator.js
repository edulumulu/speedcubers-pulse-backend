import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().max(255).required(),
  username: Joi.string().alphanum().min(2).max(20).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .required()
    .messages({
      'string.pattern.name': 'Password must contain at least one {#name} letter',
    }),
  wca_id: Joi.string()
    .pattern(/^[0-9]{4}[A-Z]{2,}[0-9]{2}$/)
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
  refresh_token: Joi.string().required(),
});

export const linkWcaSchema = Joi.object({
  wca_id: Joi.string()
    .pattern(/^[0-9]{4}[A-Z]{2,}[0-9]{2}$/)
    .required()
    .messages({
      'string.pattern.base': 'Invalid WCA ID format (e.g. 2022LUCA04)',
    }),
});

export function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map((d) => d.message),
      });
    }
    next();
  };
}
