import Joi from 'joi';

const logEntryBaseSchema = {
	// Basic info
	entryTime: Joi.string().isoDate().required(),
	bottomTime: Joi.number().positive().required(),
	diveNumber: Joi.number().integer().positive(),
	totalTime: Joi.number().positive().min(Joi.ref('bottomTime')),
	surfaceInterval: Joi.number().positive(),
	location: Joi.string().max(200).required(),
	site: Joi.string().max(200).required(),
	averageDepth: Joi.number().positive(),
	maxDepth: Joi.number().positive().required().min(Joi.ref('averageDepth')),

	gps: Joi.object().keys({
		latitude: Joi.number().min(-90.0).max(90.0).required(),
		longitude: Joi.number().min(-180.0).max(180.0).required()
	}),

	air: Joi.object().keys({
		in: Joi.number().positive(),
		out: Joi.when(
			'in',
			{
				is: Joi.exist(),
				then: Joi.number().positive().max(Joi.ref('in')),
				otherwise: Joi.number().positive()
			}
		),
		doubles: Joi.boolean(),
		volume: Joi.number().positive(),
		volumeUnit: Joi.string().only([ 'L', 'cf' ]),
		material: Joi.string().only([ 'aluminum', 'steel' ]),
		oxygen: Joi.number().positive().max(100),
		helium: Joi.number().min(0).max(95)
	}).and('volume', 'volumeUnit'),

	decoStops: Joi.array().items(
		Joi.object().keys({
			depth: Joi.number().positive(),
			duration: Joi.number().positive()
		})
	).max(15),

	temperature: Joi.object().keys({
		surface: Joi.number().min(-2).max(50),
		water: Joi.number().min(-2).max(50),
		thermoclines: Joi.array().items(Joi.object().keys({
			temperature: Joi.number().required().min(-2).max(50),
			depth: Joi.number().positive()
		})).max(4)
	}),

	// Weighting
	weight: Joi.object().keys({
		amount: Joi.number().min(0),
		correctness: Joi.string().only([ 'good', 'too little', 'too much' ]),
		trim: Joi.string().only([ 'good', 'feet down', 'feet up' ])
	}),

	tags: Joi.array().items(Joi.string().alphanum().max(25)).max(50),
	comments: Joi.string().allow([ '', null ]).max(1000)
};

export const NewEntrySchema = Joi.object().keys({
	...logEntryBaseSchema
});

export const EntryId = Joi.string().hex().length(24).required();

export const UpdateEntrySchema = Joi.object().keys({
	entryId: Joi.string().hex().length(24).required(),
	...logEntryBaseSchema
});

export const EntryQueryParamsSchema = Joi.object().keys({
	count: Joi.number().integer().min(1).max(1000),
	sortBy: Joi.string().only([ 'entryTime', 'maxDepth', 'bottomTime' ]),
	sortOrder: Joi.string().only([ 'asc', 'desc' ]),
	lastSeen: Joi.alternatives().when(
		'sortBy',
		{
			is: 'entryTime',
			then: Joi.string().isoDate(),
			otherwise: Joi.number().positive()
		}
	),
	seenIds: Joi.alternatives().try(
		Joi.string().hex().length(24),
		Joi.array().items(Joi.string().hex().length(24))
	)
}).and([ 'sortBy', 'sortOrder' ]).with('seenIds', 'lastSeen');
