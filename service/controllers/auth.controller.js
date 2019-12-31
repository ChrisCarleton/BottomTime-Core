import { badRequest, serverError, unauthorized } from '../utils/error-response';
import Joi from 'joi';
import { LoginSchema } from '../validation/user';
import passport from 'passport';
import User from '../data/user';

export function AuthenticateUser(req, res, next) {
	const { error } = Joi.validate(req.body, LoginSchema);
	if (error) {
		return badRequest(
			'Could not authenticate user: request was invalid.',
			error,
			res
		);
	}

	passport.authenticate('local', (err, user) => {
		if (err) {
			const logId = req.logError(
				'Failed to authenticate user',
				err
			);
			return serverError(res, logId);
		}

		if (!user) {
			return unauthorized(
				res,
				'User could not be authenticated',
				'Check the username and password to verify that they are correct.');
		}

		req.login(user, loginErr => {
			if (loginErr) {
				const logId = req.logError(
					'An error occurred while trying to authenticate a user.',
					loginErr);
				return serverError(res, logId);
			}

			next();
		});
	})(req, res, next);
}

export function Login(req, res) {
	res.json(req.user.getAccountJSON());
}

export function Logout(req, res) {
	req.logout();
	return res.sendStatus(204);
}

export function GetCurrentUser(req, res) {
	res.json(User.cleanUpUser(req.user));
}
