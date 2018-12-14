import Joi from 'joi';

export const LoginSchema = Joi.object().keys({
	username: Joi.string().max(200).required(),
	password: Joi.string().max(70).required()
}).required();
