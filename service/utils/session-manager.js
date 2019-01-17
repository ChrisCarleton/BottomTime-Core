import config from '../config';
import jwt from 'jsonwebtoken';
import { logError } from '../logger';
import moment from 'moment';
import Session from '../data/session';
import User from '../data/user';

class SessionManager {
	constructor() {
		setTimeout(SessionManager.purgeExpiredSessions, 0);
	}

	static async purgeExpiredSessions() {
		try {
			await Session.deleteMany({
				expires: { $lt: moment().valueOf() }
			});
		} catch (err) {
			logError('Failed to purge expired sessions.', err);
		}

		setTimeout(
			SessionManager.purgeExpiredSessions,
			moment.duration(1, 'm').milliseconds());
	}

	async createSessionToken(username, device) {
		const session = new Session({
			username,
			device,
			expires: moment().add(3, 'd').valueOf()
		});

		await session.save();
		return jwt.sign(
			{
				sessionId: session.id,
				username,
				device,
				expires: session.expires
			},
			config.sessionSecret
		);
	}

	async getSessionFromToken(token) {
		const session = await Session.findById(token.sessionId);
		if (!session || session.expires < moment().valueOf()) {
			return null;
		}

		return await User.findByUsername(session.username);
	}
}

export default new SessionManager();
