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

export const CompleteRegistrationSchema = Joi.object().keys({
	username: UsernameSchema.required(),
	email: Joi.string().email().required(),
	firstName: Joi.string().max(50),
	lastName: Joi.string().max(50),
	logsVisibility: Joi.string().only([ 'private', 'public', 'friends-only' ]),
	weightUnit: Joi.string().only([ 'kg', 'lbs' ]),
	temperatureUnit: Joi.string().only([ 'c', 'f' ]),
	distanceUnit: Joi.string().only([ 'm', 'ft' ]),
	pressureUnit: Joi.string().only([ 'bar', 'psi' ])
});

export const ChangePasswordSchema = Joi.object().keys({
	oldPassword: Joi.string(),
	newPassword: PasswordValidation
}).required();

export const ConfirmResetPasswordSchema = Joi.object().keys({
	resetToken: Joi.string().uuid().required(),
	newPassword: PasswordValidation
}).required();

export const UserQuerySchema = Joi.alternatives().try([
	UsernameSchema,
	Joi.string().email()
]).required();

export const AdminUserQuerySchema = Joi.object().keys({
	query: Joi.string(),
	count: Joi.number().integer().positive().max(1000),
	skip: Joi.number().integer().min(0),
	sortBy: Joi.string().only([ 'relevance', 'username', 'created' ]),
	sortOrder: Joi.string().only([ 'asc', 'desc' ]),
	lockedOut: Joi.boolean(),
	role: Joi.string().only([ 'user', 'admin' ]),
	logsVisibility: Joi.string().only([ 'private', 'public', 'friends-only' ])
});
