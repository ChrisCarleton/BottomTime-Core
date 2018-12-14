import { ErrorIds, badRequest } from '../utils/error-response';
import Joi from 'joi';
import { logError } from '../logger';
import { LoginSchema } from '../validation/user';
import passport from 'passport';
import { serverError } from '../utils/error-response';

export function AuthenticateUser(req, res, next) {
	passport.authenticate('local', (err, user) => {
		const isValid = Joi.validate(req.body, LoginSchema);
		if (isValid.error) {
			// return badRequest(
			// 	'Could not authenticate user: request was invalid.',
			// 	isValid.error,
			// 	res);
		}

		if (err) {
			const logId = logError(
				'An error occurred while trying to authenticate a user.',
				err);
			return serverError(res, logId);
		}

		if (!user) {
			return res.status(401).json({
				errorId: ErrorIds.notAuthorized,
				status: 401,
				message: 'Authentication failed',
				details: 'Either the specified username does not exist, or the password is incorrect. Please check and try again.'
			});		
		}

		next();
	})(req, res, next);
}

export function Login(req, res) {
	res.sendStatus(204);
}

export function Logout(req, res) {
	req.logout();
	res.sendStatus(204);
}

export function GoogleAuth(req, res) {
	res.sendStatus(501);
}

export function GoogleCallback(req, res) {
	res.sendStatus(501);
}
