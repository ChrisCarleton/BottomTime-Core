import { badRequest, serverError, unauthorized } from '../utils/error-response';
import config from '../config';
import Joi from 'joi';
import jwt from 'jsonwebtoken';
import { LoginSchema } from '../validation/user';
import passport from 'passport';
import { cleanUpUser } from '../data/user';

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
	const token = jwt.sign(
		{
			username: req.user.username
		},
		config.sessionSecret
	);

	req.user.loggedOut = false;
	await req.user.save();

	res.json({
		user: cleanUpUser(req.user),
		token
	});
}

export async function Logout(req, res) {
	try {
		req.user.isLoggedOut = true;
		await req.user.save();

		req.logout();
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Unable to log out user', err);
		serverError(res, logId);
	}
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
