import Joi from 'joi';

export const TankProfileSchema = Joi.object().keys({
	name: Joi.string().max(200).required(),
	size: Joi.number().positive().allow(null),
	workingPressure: Joi.number().positive().allow(null),
	material: Joi.string().valid('al', 'fe', null),
	isCustom: Joi.boolean().strip()
});
