import Joi from 'joi';

const PasswordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.]).*$/;

export const LoginSchema = Joi.object().keys({
	username: Joi.string().max(50).required(),
	password: Joi.string().max(50).required()
}).required();

export const UsernameSchema = Joi
	.string()
	.regex(/^[a-zA-Z0-9_.-]+$/)
	.min(5)
	.max(50)
	.required();

export const UserAccountSchema = Joi.object().keys({
	email: Joi.string().email().required(),
	password: Joi
		.string()
		.regex(PasswordStrengthRegex)
		.min(7)
		.max(50)
		.required(),
	role: Joi.string().valid([ 'user', 'admin' ]).required()
}).required();

export const ChangePasswordSchema = Joi.object().keys({
	oldPassword: Joi.string(),
	newPassword: Joi
		.string()
		.regex(PasswordStrengthRegex)
		.min(7)
		.max(50)
		.required()
}).required();
