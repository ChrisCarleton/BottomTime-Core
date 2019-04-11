import Joi from 'joi';
import moment from 'moment';

const year = moment().year();

export const UpdateProfileSchema = Joi.object().keys({
	logsVisibility: Joi.string().only([ 'private', 'friends-only', 'public' ]),
	firstName: Joi.string().max(50).allow(null),
	lastName: Joi.string().max(50).allow(null),
	location: Joi.string().max(100).allow(null),
	occupation: Joi.string().max(50).allow(null),
	gender: Joi.string().only([ 'male', 'female' ]).allow(null),
	birthdate: Joi.string().regex(/^\d\d\d\d-\d\d-\d\d$/).allow(null),
	typeOfDiver: Joi.string().max(100).allow(null),
	startedDiving: Joi.number().integer().min(year - 100).max(year).allow(null),
	certificationLevel: Joi.string().max(100).allow(null),
	certificationAgencies: Joi.string().max(100).allow(null),
	specialties: Joi.string().max(200).allow(null),
	about: Joi.string().max(1000).allow(null),
	weightUnit: Joi.string().only([ 'kg', 'lb' ]),
	temperatureUnit: Joi.string().only([ 'c', 'f' ]),
	distanceUnit: Joi.string().only([ 'm', 'ft' ])
});
