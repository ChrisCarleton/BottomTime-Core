import { badRequest, conflict, serverError, unauthorized } from '../utils/error-response';
import { cleanUpUser } from '../data/user';
import Joi from 'joi';
import { LoginSchema } from '../validation/user';
import passport from 'passport';
import Session from '../data/session';
import sessionManager from '../utils/session-manager';

export function AuthenticateUser(req, res, next) {
	passport.authenticate('local', { session: false }, (err, user) => {
		if (err) {
			const logId = req.logError(
				'An error occurred while trying to authenticate a user.',
				err);
			return serverError(res, logId);
		}

		const isValid = Joi.validate(req.body, LoginSchema);
		if (isValid.error) {
			return badRequest(
				'Could not authenticate user: request was invalid.',
				isValid.error,
				res);
		}

		if (!user) {
			return unauthorized(
				res,
				'User could not be authenticated',
				'Check the username and password to verify that they are correct.');
		}

		req.login(user, { session: false }, loginErr => {
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

export async function Login(req, res) {
	if (req.user === 'email-taken') {
		return conflict(
			res,
			'email',
			'Unable to create account. The e-mail address is already associated with another user account.');
	}

	try {
		const token = await sessionManager.createSessionToken(
			req.user.username,
			`${ req.useragent.platform } / ${ req.useragent.os } / ${ req.useragent.browser }`
		);
		res.json({
			user: cleanUpUser(req.user),
			token
		});
	} catch (err) {
		const logId = req.logError('Unable to login user', err);
		serverError(res, logId);
	}
}

export async function Logout(req, res) {
	if (!req.sessionId) {
		return res.sendStatus(204);
	}

	try {
		await Session.deleteOne({ _id: req.sessionId });
		req.logout();
		return res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Unable to log out user', err);
		return serverError(res, logId);
	}
}

export function GetCurrentUser(req, res) {
	res.json(cleanUpUser(req.user));
}

export function GoogleCallback(req, res) {
	// Authenticated! Create session token.
	res.sendStatus(501);
}
