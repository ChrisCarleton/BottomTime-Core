/* eslint camelcase: 0 */

import _ from 'lodash';
import config from '../config';
import mexp from 'mongoose-elasticsearch-xp';
import moment from 'moment';
import mongoose from './database';
import search from '../search';

const userSchema = mongoose.Schema({
	usernameLower: {
		type: String,
		unique: true,
		required: true,
		es_indexed: true,
		es_type: 'keyword'
	},
	emailLower: {
		type: String,
		unique: true,
		required: true,
		es_indexed: true,
		es_type: 'keyword'
	},
	username: {
		type: String,
		required: true,
		es_indexed: true,
		es_type: 'text'
	},
	email: {
		type: String,
		required: true,
		es_indexed: true,
		es_type: 'text'
	},
	googleId: {
		type: String,
		unique: true,
		sparse: true
	},
	role: {
		type: String,
		required: true,
		index: true,
		default: 'user',
		es_indexed: true,
		es_type: 'keyword'
	},
	createdAt: {
		type: Date,
		required: true,
		es_indexed: true,
		es_type: 'date'
	},
	passwordHash: String,
	passwordResetToken: String,
	passwordResetExpiration: Date,
	isRegistrationIncomplete: {
		type: Boolean,
		default: false,
		required: true
	},
	isLockedOut: {
		type: Boolean,
		required: true,
		default: false,
		es_indexed: true,
		es_type: 'boolean'
	},
	logsVisibility: {
		type: String,
		required: true,
		default: 'friends-only',
		es_indexed: true,
		es_type: 'keyword'
	},
	weightUnit: {
		type: String,
		default: 'kg',
		required: true
	},
	distanceUnit: {
		type: String,
		default: 'm',
		required: true
	},
	temperatureUnit: {
		type: String,
		default: 'c',
		required: true
	},
	pressureUnit: {
		type: String,
		default: 'bar',
		required: true
	},
	uiComplexity: {
		type: String,
		default: 'basic',
		required: true
	},
	firstName: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	lastName: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	location: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	occupation: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	birthdate: {
		type: Date,
		es_indexed: true,
		es_type: 'date'
	},
	typeOfDiver: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	startedDiving: {
		type: Number,
		es_indexed: true,
		es_type: 'integer'
	},
	certificationLevel: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	certificationAgencies: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	specialties: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	},
	about: {
		type: String,
		es_indexed: true,
		es_type: 'text'
	}
});

userSchema.plugin(mexp, {
	index: `${ config.elasticSearchIndex }_users`,
	client: search
});

userSchema.statics.findByUsername = function (username, done) {
	return this.findOne({ usernameLower: username.toLowerCase() }, done);
};

userSchema.statics.findByEmail = function (email, done) {
	return this.findOne({ emailLower: email.toLowerCase() }, done);
};

userSchema.statics.cleanUpUser = function (user, fullProfile) {
	if (!user) {
		return {
			username: 'Anonymous_User',
			email: '',
			createdAt: null,
			role: 'user',
			isAnonymous: true,
			isRegistrationIncomplete: false,
			isLockedOut: false
		};
	}

	return fullProfile ? user.getFullAccountJSON() : user.getAccountJSON();
};

userSchema.methods.getAccountJSON = function () {
	const hasPassword = typeof this.passwordHash === 'string';

	const clean = {
		..._.pick(
			this.toJSON(),
			[
				'username',
				'email',
				'role',
				'isLockedOut',
				'isRegistrationIncomplete',
				'weightUnit',
				'distanceUnit',
				'pressureUnit',
				'temperatureUnit',
				'uiComplexity'
			]),
		isAnonymous: false,
		hasPassword,
		createdAt: moment(this.createdAt).utc().toISOString()
	};

	return clean;
};

userSchema.methods.getProfileJSON = function () {
	const json = {
		..._.pick(
			this.toJSON(),
			[
				'logsVisibility',
				'firstName',
				'lastName',
				'location',
				'occupation',
				'typeOfDiver',
				'startedDiving',
				'certificationLevel',
				'certificationAgencies',
				'specialties',
				'about',
				'weightUnit',
				'distanceUnit',
				'temperatureUnit',
				'pressureUnit',
				'uiComplexity'
			]
		),
		memberSince: moment(this.createdAt).toISOString()
	};

	if (this.birthdate) {
		json.birthdate = moment(this.birthdate).format('YYYY-MM-DD');
	}

	return json;
};

userSchema.methods.getFullAccountJSON = function () {
	return {
		...this.getAccountJSON(),
		...this.getProfileJSON()
	};
};

userSchema.methods.getFriendlyName = function () {
	return this.firstName || this.username;
};

userSchema.methods.getFullName = function () {
	if (this.firstName && this.lastName) {
		return `${ this.firstName } ${ this.lastName }`;
	}

	return this.firstName || this.username;
};

const model = mongoose.model('User', userSchema);
export default model;
module.exports = model;
