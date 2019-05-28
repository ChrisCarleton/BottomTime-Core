import Joi from 'joi';
import { MongoIdSchema, TagsArraySchema } from './common';

export const DiveSiteSchema = Joi.object().keys({
	name: Joi.string().required().max(200),
	location: Joi.string().max(100).allow(null),
	country: Joi.string().max(100).allow(null),
	description: Joi.string().max(1000).allow(null),
	tags: TagsArraySchema,
	gps: Joi.object().keys({
		lat: Joi.number().min(-90.0).max(90.0).required(),
		lon: Joi.number().min(-180.0).max(180.0).required()
	})
});

export const DiveSiteSearchSchema = Joi.object().keys({
	query: Joi.string().allow(''),
	closeTo: Joi.array().ordered(
		Joi.number().min(-180.0).max(180.0).required(),
		Joi.number().min(-90.0).max(90.0).required()
	).length(2),
	distance: Joi.number().positive().max(1000),
	count: Joi.number().integer().positive().max(1000),
	skip: Joi.number().integer().min(0),
	sortBy: Joi.string().only([ 'name' ]),
	sortOrder: Joi.string().only([ 'asc', 'desc' ]),
	lastSeen: Joi.string(),
	seenIds: Joi.array().items(MongoIdSchema).min(1).single()
}).with('distance', 'closeTo');
