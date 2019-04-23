import Joi from 'joi';
import { UsernameSchema } from './user';

export const UserQuery = Joi.alternatives().try([
	UsernameSchema,
	Joi.string().email()
]).required();
