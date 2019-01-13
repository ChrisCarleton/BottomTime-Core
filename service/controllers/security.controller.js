import { forbidden, notFound, serverError, unauthorized } from '../utils/error-response';
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
		const logId = req.logError('Failed to retrieve user account from the database.', err);
		serverError(res, logId);
	}
}

export function AssertUserReadPermission(req, res, next) {
	if (req.user && (req.user.role === 'admin' || req.user.id === req.account.id)) {
		return next();
	}

	if (req.account.logsVisibility === 'public') {
		return next();
	}

	forbidden(res, 'You are not permitted to perform the requested action on this log entry');
}

export function AssertUserWritePermission(req, res, next) {
	const forbiddenMessage = 'You are not permitted to create or update entries in the specified log book';
	if (!req.user) {
		return forbidden(
			res,
			forbiddenMessage);
	}

	if (req.user.id !== req.account.id && req.user.role !== 'admin') {
		return forbidden(
			res,
			forbiddenMessage);
	}

	next();
}
