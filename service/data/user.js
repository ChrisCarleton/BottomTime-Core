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
	passwordHash: String
});

export default mongoose.model('User', userSchema);

export function cleanUpUser(user) {
	if (!user) {
		return {
			username: 'Anonymous_User',
			email: '',
			createdAt: null,
			isAnonymous: true
		};
	}

	const clean = {
		..._.pick(
			user.toJSON(),
			[
				'username',
				'email',
				'role'
			]),
		isAnonymous: false,
		createdAt: moment(user.createdAt).utc().toISOString()
	};

	return clean;
}
