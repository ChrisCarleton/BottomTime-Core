import config from '../config';
import jwt from 'jsonwebtoken';
import moment from 'moment';
import Session from '../data/session';
import User from '../data/user';

async function createSessionToken(username, device) {
	const session = new Session({
		username: username.toLowerCase(),
		device,
		expires: moment().utc().add(3, 'd').toDate()
	});

	await session.save();
	return jwt.sign(
		{
			sessionId: session.id,
			username: username.toLowerCase(),
			device,
			expires: session.expires
		},
		config.sessionSecret
	);
}

async function getSessionFromToken(token) {
	const session = await Session.findById(token.sessionId);
	if (!session || session.expires < moment().utc().toDate()) {
		return null;
	}

	const user = await User.findByUsername(session.username);
	return user;
}

export default {
	createSessionToken,
	getSessionFromToken
};
