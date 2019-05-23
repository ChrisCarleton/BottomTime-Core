import Joi from 'joi';

export const DiveSiteSchema = Joi.object().keys({
	name: Joi.string().required().max(200),
	location: Joi.string().max(100).allow(null),
	country: Joi.string().max(100).allow(null),
	description: Joi.string().max(1000).allow(null),
	tags: Joi.array().items(Joi.string().alphanum().max(25)).max(50),
	gps: Joi.object().keys({
		latitude: Joi.number().min(-90.0).max(90.0).required(),
		longitude: Joi.number().min(-180.0).max(180.0).required()
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
	sortBy: Joi.string().only([ 'relevance', 'name' ]),
	sortOrder: Joi.string().only([ 'asc', 'desc' ]),
	lastSeen: Joi.string()
});
