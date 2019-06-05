import Joi from 'joi';

export const MongoIdSchema = Joi.string().hex().length(24);

export const PasswordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.]).*$/;
export const PasswordValidation = Joi.string().regex(PasswordStrengthRegex).min(7).max(50).required();

export const UsernameRegex = /^[a-z0-9_.-]+$/i;
export const UsernameSchema = Joi
	.string()
	.regex(UsernameRegex)
	.min(5)
	.max(50);

export const TagsArraySchema = Joi.array().items(
	Joi.string().regex(/^[a-z0-9 ]+$/i).max(25).required()
).max(50);
