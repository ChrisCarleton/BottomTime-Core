import Joi from 'joi';

export const LoginSchema = Joi.object().keys({
	username: Joi.string().max(200).required(),
	password: Joi.string().max(70).required()
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
		.regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*.]).*$/)
		.min(7)
		.max(50)
		.required(),
	role: Joi.string().valid(['user', 'admin']).required()
}).required();
