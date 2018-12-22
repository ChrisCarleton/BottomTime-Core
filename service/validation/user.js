import Joi from 'joi';

const PasswordStrengthRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.]).*$/;
const PasswordValidation = Joi.string().regex(PasswordStrengthRegex).min(7).max(50).required();

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
	password: PasswordValidation,
	role: Joi.string().valid([ 'user', 'admin' ]).required()
}).required();

export const ChangePasswordSchema = Joi.object().keys({
	oldPassword: Joi.string(),
	newPassword: PasswordValidation
}).required();

export const ConfirmResetPasswordSchema = Joi.object().keys({
	resetToken: Joi.string().uuid().required(),
	newPassword: PasswordValidation
}).required();
