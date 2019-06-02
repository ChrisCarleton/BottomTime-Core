import Joi from 'joi';
import { PasswordValidation, UsernameSchema } from './common';

export const LoginSchema = Joi.object().keys({
	username: Joi.string().max(50).required(),
	password: Joi.string().max(50).required()
}).required();

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

export const UserQuerySchema = Joi.alternatives().try([
	UsernameSchema.required(),
	Joi.string().email()
]).required();

export const AdminUserQuerySchema = Joi.object().keys({
	query: Joi.string(),
	count: Joi.number().integer().min(1).max(1000),
	sortBy: Joi.string().only([ 'username' ]),
	sortOrder: Joi.string().only([ 'asc', 'desc' ]),
	lastSeen: Joi.string()
});
