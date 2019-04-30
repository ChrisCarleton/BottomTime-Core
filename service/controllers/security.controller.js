import { forbidden, notFound, serverError, unauthorized } from '../utils/error-response';
import Friend from '../data/friend';
import User from '../data/user';

export function RequireUser(req, res, next) {
	if (!req.user) {
		return unauthorized(res);
	}

	next();
}

export function RequireAdminUser(req, res, next) {
	if (!req.user) {
		return unauthorized(res);
	}

	if (req.user.role !== 'admin') {
		return forbidden(res, 'You do not have sufficient privileges to perform this action.');
	}

	return next();
}

export async function RetrieveUserAccount(req, res, next) {
	try {
		const user = await User.findByUsername(req.params.username);
		if (!user) {
			return notFound(req, res);
		}

		const friends = await Friend
			.find({
				user: user.username,
				approved: true
			})
			.sort('friend')
			.select('friend')
			.exec();
		req.friends = {};
		friends.forEach(f => {
			req.friends[f.friend] = true;
		});

		req.account = user;
		return next();
	} catch (err) {
		const logId = req.logError('Failed to retrieve user account from the database.', err);
		serverError(res, logId);
	}
}

export function AssertUserReadPermission(req, res, next) {
	if (req.user && (req.user.role === 'admin' || req.user.id === req.account.id)) {
		req.readOnlyResource = false;
		return next();
	}

	if (req.account.logsVisibility === 'public') {
		req.readOnlyResource = true;
		return next();
	}

	if (
		req.account.logsVisibility === 'friends-only'
		&& req.user
		&& req.friends
		&& req.friends[req.user.username]
	) {
		req.readOnlyResource = true;
		return next();
	}

	return forbidden(res, 'You are not permitted to perform the requested action.');
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

	req.readOnlyResource = false;
	next();
}
