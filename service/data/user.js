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
	}
});

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
		hasPassword: user.passwordHash ? true : false,
		createdAt: moment(user.createdAt).utc().toISOString()
	};

	return clean;
}
