import _ from 'lodash';
import moment from 'moment';
import mongoose from './database';

const userSchema = mongoose.Schema({
	usernameLower: {
		type: String,
		unique: true,
		required: true
	},
	emailLower: {
		type: String,
		unique: true,
		required: true
	},
	username: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true
	},
	role: {
		type: String,
		required: true,
		index: true,
		default: 'user'
	},
	createdAt: {
		type: Date,
		required: true
	},
	passwordHash: String,
	passwordResetToken: String,
	passwordResetExpiration: Date,
	isLockedOut: {
		type: Boolean,
		required: true,
		default: false
	},
	logsVisibility: {
		type: String,
		required: true,
		default: 'friends-only'
	},
	firstName: String,
	lastName: String
});

userSchema.statics.findByUsername = function (username, done) {
	return this.findOne({ usernameLower: username.toLowerCase() }, done);
};

userSchema.statics.findByEmail = function (email, done) {
	return this.findOne({ emailLower: email.toLowerCase() }, done);
};

export default mongoose.model('User', userSchema);

export function cleanUpUser(user) {
	if (!user) {
		return {
			username: 'Anonymous_User',
			email: '',
			createdAt: null,
			role: 'user',
			isAnonymous: true,
			isLockedOut: false
		};
	}

	let hasPassword = false;
	if (user.passwordHash) {
		hasPassword = true;
	}

	const clean = {
		..._.pick(
			user.toJSON(),
			[
				'username',
				'email',
				'role',
				'isLockedOut'
			]),
		isAnonymous: false,
		hasPassword,
		createdAt: moment(user.createdAt).utc().toISOString()
	};

	return clean;
}
