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
		process.env.BT_MONGO_ENDPOINT || 'mongodb://localhost/dev',
		{
			autoIndex: false,
			family: 4,
			useNewUrlParser: true
		});

	const friendRequestExpiration = moment().subtract(
		process.env.BT_FRIEND_REQUEST_EXPIRATION_PERIOD || 240,
		'h'
	).toDate();

	await Promise.all([
		Session.deleteMany({
			expires: { $lte: moment().utc().toDate() }
		}),
		Friend.deleteMany({
			approved: false,
			evaluatedOn: { $lte: friendRequestExpiration }
		})
	]);

	await mongoose.connection.close();
};
