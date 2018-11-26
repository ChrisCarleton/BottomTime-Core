import Joi from 'joi';

const logEntryBaseSchema = {
	// Basic info
	entryTime: Joi.date().iso().required(),
	bottomTime: Joi.number().integer().positive(),
	totalTime: Joi.number().integer().positive().min(Joi.ref('bottomTime')),
	location: Joi.string().max(200).required(),
	site: Joi.string().max(200).required(),
	avgDepth: Joi.number().positive(),
	maxDepth: Joi.number().positive(),
	gps: Joi.object().keys({
		latitude: Joi.number().min(-90.0).max(90.0).required(),
		longitude: Joi.number().min(-180.0).max(180.0).required()
	}),

	gas: Joi.array().items(Joi.object().keys({
		capacity: Joi.number().positive().required(),
		type: Joi.string().allow(['Steel', 'Aluminum']).required(),
		doubles: Joi.boolean().default(false).required()
	}).min(1).max(10)),
	
	// Weighting
	weight: Joi.object().keys({
		amount: Joi.number().min(0.0),
		accuracy: Joi.string().allow(['Good', 'TooLittle', 'TooMuch']),
		trim: Joi.string().allow(['Good', 'HeadDown', 'FeetDown']),
		notes: Joi.string().max(200)	
	}),

	// Exposure
	exposure: Joi.object().keys({
		suit: Joi.string().allow(['Wetsuit', 'Shorty', 'Drysuit', 'None']),
		thickness: Joi.number().integer().positive()
	}),

	equipment: Joi.object().keys({

	}),

	// Conditions
	conditions: Joi.object().keys({

	}),

	diveType: Joi.object().keys({

	}),

};

export const NewEntrySchema = Joi.object().keys({
	...logEntryBaseSchema
});

export const UpdateEntrySchema = Joi.object().keys({
	//entryId: Joi.string().required(),
	...logEntryBaseSchema
});
