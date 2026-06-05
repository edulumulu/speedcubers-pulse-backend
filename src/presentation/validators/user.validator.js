import Joi from 'joi';
export { validate } from './auth.validator.js';

export const updateMeSchema = Joi.object({
  email: Joi.string().email().max(255),
  username: Joi.string().alphanum().min(2).max(20),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .messages({
      'string.pattern.name': 'Password must contain at least one {#name} letter',
    }),
}).min(1).messages({
  'object.min': 'At least one field (email, username, or password) must be provided',
});
