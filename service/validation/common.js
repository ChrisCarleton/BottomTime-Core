import Joi from 'joi';

export const MongoIdSchema = Joi.string().hex().length(24);

export const TagsArraySchema = Joi.array().items(
	Joi.string().regex(/^[a-z0-9 ]+$/i).max(25).required()
).max(50);
