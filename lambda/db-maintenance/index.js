/* eslint no-process-env: 0 */

const moment = require('moment');
const mongoose = require('mongoose');

const sessionsSchema = new mongoose.Schema({
	username: {
		type: String,
		index: true
	},
	expires: {
		type: Date,
		index: true
	}
});

const friendsSchema = new mongoose.Schema({
	user: {
		type: String,
		index: true
	},
	friend: {
		type: String,
		index: true
	},
	approved: {
		type: Boolean,
		index: true,
		sparse: true
	},
	evaluatedOn: {
		type: Date,
		index: true,
		sparse: true
	}
});

const Session = mongoose.model('Session', sessionsSchema);
const Friend = mongoose.model('Friend', friendsSchema);

exports.handler = async () => {
	await mongoose.connect(
		process.env.CONNECTION_STRING,
		{
			autoIndex: false,
			family: 4,
			useNewUrlParser: true
		});

	const sessionExpiration = moment().subtract(
		process.env.SESSION_EXPIRATION_PERIOD,
		'h'
	).toDate();
	const friendRequestExpiration = moment().subtract(
		process.env.FRIEND_REQUEST_EXPIRATION_PERIOD,
		'h'
	).toDate();

	await Promise.all([
		Session.deleteMany({
			expires: { $lte: sessionExpiration }
		}),
		Friend.deleteMany({
			approved: false,
			evaluatedOn: { $lte: friendRequestExpiration }
		})
	]);
};
