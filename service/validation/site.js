import Joi from 'joi';
import { TagsArraySchema, UsernameSchema } from './common';

export const DiveSiteSchema = Joi.object().keys({
	name: Joi.string().required().max(200),
	location: Joi.string().max(100).allow(null),
	country: Joi.string().max(100).allow(null),
	water: Joi.string().only([ 'salt', 'fresh', null ]),
	accessibility: Joi.string().only([ 'shore', 'boat', null ]),
	entryFee: Joi.boolean().allow(null),
	difficulty: Joi.number().min(1.0).max(5.0).allow(null),
	description: Joi.string().max(1000).allow(null),
	tags: TagsArraySchema,
	gps: Joi.object().keys({
		lat: Joi.number().min(-90.0).max(90.0).required(),
		lon: Joi.number().min(-180.0).max(180.0).required()
	})
});

export const DiveSiteCollectionSchema = Joi
	.array()
	.items(DiveSiteSchema)
	.min(1)
	.max(250);

export const DiveSiteSearchSchema = Joi.object().keys({
	query: Joi.string().allow(''),
	water: Joi.string().only([ 'salt', 'fresh' ]),
	accessibility: Joi.string().only([ 'shore', 'boat' ]),
	avoidEntryFee: Joi.boolean(),
	maxDifficulty: Joi.number().min(1.0).max(5.0),
	minRating: Joi.number().min(1.0).max(5.0),
	owner: UsernameSchema,
	closeTo: Joi.array().ordered(
		Joi.number().min(-180.0).max(180.0).required(),
		Joi.number().min(-90.0).max(90.0).required()
	).length(2),
	distance: Joi.number().positive().max(1000),
	count: Joi.number().integer().positive().max(1000),
	skip: Joi.number().integer().min(0),
	sortBy: Joi.string().only([ 'relevance', 'difficulty', 'rating' ]),
	sortOrder: Joi.string().only([ 'asc', 'desc' ])
}).with('distance', 'closeTo');
