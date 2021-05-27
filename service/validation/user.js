import Joi from 'joi';
import { PasswordValidation, UsernameSchema } from './common';

export const LoginSchema = Joi.object().keys({
	username: Joi.string().max(50).required(),
	password: Joi.string().max(50).required()
}).required();

export const UserAccountSchema = Joi.object().keys({
	email: Joi.string().email().required(),
	password: PasswordValidation,
	role: Joi.string().valid('user', 'admin').required()
}).required();

export const CompleteRegistrationSchema = Joi.object().keys({
	username: UsernameSchema.required(),
	email: Joi.string().email().required(),
	firstName: Joi.string().max(50),
	lastName: Joi.string().max(50),
	logsVisibility: Joi.string().valid('private', 'public', 'friends-only'),
	weightUnit: Joi.string().valid('kg', 'lbs'),
	temperatureUnit: Joi.string().valid('c', 'f'),
	distanceUnit: Joi.string().valid('m', 'ft'),
	pressureUnit: Joi.string().valid('bar', 'psi'),
	uiComplexity: Joi.string().valid('basic', 'advanced', 'technical')
});

export const ChangePasswordSchema = Joi.object().keys({
	oldPassword: Joi.string(),
	newPassword: PasswordValidation
}).required();

export const ConfirmResetPasswordSchema = Joi.object().keys({
	resetToken: Joi.string().uuid().required(),
	newPassword: PasswordValidation
}).required();

export const UserQuerySchema = Joi.alternatives().try(
	UsernameSchema,
	Joi.string().email()
).required();

export const AdminUserQuerySchema = Joi.object().keys({
	query: Joi.string(),
	count: Joi.number().integer().positive().max(1000),
	skip: Joi.number().integer().min(0),
	sortBy: Joi.string().valid('relevance', 'username', 'created'),
	sortOrder: Joi.string().valid('asc', 'desc'),
	lockedOut: Joi.boolean(),
	role: Joi.string().valid('user', 'admin'),
	logsVisibility: Joi.string().valid('private', 'public', 'friends-only')
});
