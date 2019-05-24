import Joi from 'joi';

export const MongoIdSchema = Joi.string().hex().length(24);
