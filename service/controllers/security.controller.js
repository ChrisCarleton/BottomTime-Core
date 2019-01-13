import { notFound, serverError, unauthorized } from '../utils/error-response';
import User from '../data/user';

export function RequireUser(req, res, next) {
	if (!req.user) {
		return unauthorized(res);
	}

	next();
}

export async function RetrieveUserAccount(req, res, next) {
	try {
		const user = await User.findByUsername(req.params.username);
		if (!user) {
			return notFound(req, res);
		}

		req.account = user;
		return next();
	} catch (err) {
		console.log(req.logError);
		const logId = req.logError('Failed to retrieve user account from the database.', err);
		serverError(res, logId);
	}
}
