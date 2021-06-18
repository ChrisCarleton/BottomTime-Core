import Joi from 'joi';
import { MongoIdSchema, TagsArraySchema } from './common';

const logEntryBaseSchema = {
	// Basic info
	entryTime: Joi.string().isoDate().required(),
	bottomTime: Joi.number().positive().required(),
	diveNumber: Joi.number().integer().positive().allow(null),
	totalTime: Joi.number().positive().min(Joi.ref('bottomTime')).allow(null),
	surfaceInterval: Joi.number().positive().allow(null),
	location: Joi.string().max(200).required(),
	site: Joi.string().max(200).required(),
	averageDepth: Joi.number().positive().allow(null),
	maxDepth: Joi.when(
		'averageDepth',
		{
			is: Joi.exist(),
			then: Joi.number().min(Joi.ref('averageDepth')).allow(null),
			otherwise: Joi.number().positive()
		}
	).required(),

	gps: Joi.object().keys({
		latitude: Joi.number().min(-90.0).max(90.0).required(),
		longitude: Joi.number().min(-180.0).max(180.0).required()
	}),

	air: Joi.array().items(
		Joi.object().keys({
			in: Joi.number().positive().allow(null),
			out: Joi.when(
				'in',
				{
					is: Joi.exist(),
					then: Joi.number().positive().max(Joi.ref('in')),
					otherwise: Joi.number().positive()
				}
			).allow(null),
			count: Joi.number().integer().positive().max(10).allow(null),
			name: Joi.string().max(200).allow(null),
			size: Joi.number().positive().allow(null),
			workingPressure: Joi.number().positive().allow(null),
			material: Joi.string().valid('al', 'fe', null),
			oxygen: Joi.number().positive().max(100).allow(null),
			helium: Joi.number().min(0).max(95).allow(null)
		})
	).max(20).allow(null),

	decoStops: Joi.array().items(
		Joi.object().keys({
			depth: Joi.number().positive().allow(null),
			duration: Joi.number().positive().allow(null)
		})
	).max(15),

	temperature: Joi.object().keys({
		surface: Joi.number().min(-2).max(50).allow(null),
		water: Joi.number().min(-2).max(50).allow(null),
		thermoclines: Joi.array().items(Joi.object().keys({
			temperature: Joi.number().min(-2).max(50).required(),
			depth: Joi.number().positive().allow(null)
		})).max(4)
	}),

	// Weighting
	weight: Joi.object().keys({
		belt: Joi.number().min(0).allow(null),
		integrated: Joi.number().min(0).allow(null),
		backplate: Joi.number().min(0).allow(null),
		ankles: Joi.number().min(0).allow(null),
		other: Joi.number().min(0).allow(null),
		correctness: Joi.string().valid('good', 'too little', 'too much', null),
		trim: Joi.string().valid('good', 'feet down', 'feet up', null)
	}),
	rating: Joi.number().min(1).max(5).allow(null),
	visibility: Joi.number().min(1).max(5).allow(null),
	wind: Joi.number().min(1).max(5).allow(null),
	current: Joi.number().min(1).max(5).allow(null),
	waterChoppiness: Joi.number().min(1).max(5).allow(null),
	weather: Joi.string().max(100).allow(null),
	suit: Joi.string().max(100).allow(null),
	tags: TagsArraySchema,
	comments: Joi.string().max(1000).allow(null)
};

export const NewEntrySchema = Joi.object().keys({
	...logEntryBaseSchema
});

export const EntryId = Joi.string().hex().length(24).required();

export const UpdateEntrySchema = Joi.object().keys({
	entryId: MongoIdSchema.required(),
	...logEntryBaseSchema
});

export const EntryQueryParamsSchema = Joi.object().keys({
    query: Joi.string(),
	count: Joi.number().integer().min(1).max(1000),
	sortBy: Joi.string().valid('entryTime', 'maxDepth', 'bottomTime'),
	sortOrder: Joi.string().valid('asc', 'desc'),
    skip: Joi.number().integer().min(0),
}).and('sortBy', 'sortOrder');
