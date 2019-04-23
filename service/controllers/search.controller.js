import Joi from 'joi';
import moment from 'moment';
import { badRequest, serverError } from '../utils/error-response';
import User from '../data/user';
import { UsernameRegex } from '../validation/user';
import { UserQuery } from '../validation/search';

export async function SearchUsers(req, res) {
	try {
		const { error } = Joi.validate(req.query.query, UserQuery);
		if (error) {
			badRequest(
				'Search query was invalid. It should be a username or e-mail address',
				error,
				res);
			return;
		}

		const isUsername = UsernameRegex.test(req.query.query);

		const results = await User
			.find({
				$or: [
					{ usernameLower: req.query.query.toLowerCase() },
					{ emailLower: req.query.query.toLowerCase() }
				]
			});

		res.json(results.map(r => ({
			username: r.username,
			email: isUsername ? undefined : r.email, // eslint-disable-line no-undefined
			memberSince: moment(r.createdAt).utc().toISOString()
		})));
	} catch (err) {
		const logId = req.logError('Failed to perform search for user', err);
		serverError(res, logId);
	}
}
