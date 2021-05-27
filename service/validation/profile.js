import Joi from 'joi';
import moment from 'moment';

const year = moment().year();

export const UpdateProfileSchema = Joi.object().keys({
	logsVisibility: Joi.string().valid('private', 'friends-only', 'public'),
	firstName: Joi.string().max(50).allow(null),
	lastName: Joi.string().max(50).allow(null),
	location: Joi.string().max(100).allow(null),
	occupation: Joi.string().max(50).allow(null),
	birthdate: Joi.string().regex(/^\d\d\d\d-\d\d-\d\d$/).allow(null),
	typeOfDiver: Joi.string().max(100).allow(null),
	startedDiving: Joi.number().integer().min(year - 100).max(year).allow(null),
	certificationLevel: Joi.string().max(100).allow(null),
	certificationAgencies: Joi.string().max(100).allow(null),
	specialties: Joi.string().max(200).allow(null),
	about: Joi.string().max(1000).allow(null),
	weightUnit: Joi.string().valid('kg', 'lbs'),
	temperatureUnit: Joi.string().valid('c', 'f'),
	distanceUnit: Joi.string().valid('m', 'ft'),
	pressureUnit: Joi.string().valid('bar', 'psi'),
	uiComplexity: Joi.string().valid('basic', 'advanced', 'technical')
});
