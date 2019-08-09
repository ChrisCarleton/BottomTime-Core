import Joi from 'joi';

export const ImageMetadataSchema = Joi.object().keys({
	title: Joi.string().max(100).allow(null),
	description: Joi.string().max(500).allow(null),
	timestamp: Joi.string().isoDate().allow(null),
	location: Joi.object().keys({
		lat: Joi.number().min(-90.0).max(90.0).required(),
		lon: Joi.number().min(-180.0).max(180.0).required()
	}).allow(null)
});
