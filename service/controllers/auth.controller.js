import { badRequest, serverError, unauthorized } from '../utils/error-response';
import Joi from 'joi';
import { LoginSchema } from '../validation/user';
import passport from 'passport';
import { cleanUpUser } from '../data/user';

export function AuthenticateUser(req, res, next) {
	passport.authenticate('local', (err, user) => {
		const isValid = Joi.validate(req.body, LoginSchema);
		if (isValid.error) {
			return badRequest(
				'Could not authenticate user: request was invalid.',
				isValid.error,
				res);
		}

		if (err) {
			const logId = req.logError(
				'An error occurred while trying to authenticate a user.',
				err);
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
	res.sendStatus(204);
}

export function Logout(req, res) {
	req.logout();
	res.sendStatus(204);
}

export function GetCurrentUser(req, res) {
	res.json(cleanUpUser(req.user));
}

export function GoogleAuth(req, res) {
	res.sendStatus(501);
}

export function GoogleCallback(req, res) {
	res.sendStatus(501);
}
