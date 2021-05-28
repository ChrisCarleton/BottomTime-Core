import { badRequest, serverError, unauthorized } from '../utils/error-response';
import Joi from 'joi';
import { LoginSchema } from '../validation/user';
import mailer from '../mail/mailer';
import moment from 'moment';
import passport from 'passport';
import templates from '../mail/templates';
import User from '../data/user';
import { v4 as uuid } from 'uuid';

export function AuthenticateUser(req, res, next) {
	const { error } = LoginSchema.validate(req.body);
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
	res.json(req.user.getFullAccountJSON());
}

export function Logout(req, res) {
	req.logout();
	return res.sendStatus(204);
}

export function GetCurrentUser(req, res) {
	res.json(User.cleanUpUser(req.user, true));
}

export async function ResetPassword(req, res) {
	const testSchema = Joi.object({
		email: Joi.string().email().required()
	}).required();
	const { error } = testSchema.validate(req.body);
	if (error) {
		return badRequest(
			'Invalid request body was provided. See error details for more information.',
			error,
			res
		);
	}

	try {
		const user = await User.findByEmail(req.body.email);
		if (!user) {
			return res.sendStatus(204);
		}

		user.passwordResetToken = uuid();
		user.passwordResetExpiration = moment().add(1, 'd').utc().toDate();
		await user.save();

		const mailTemplate = templates.ResetPasswordEmail(
			user.username,
			user.username,
			user.passwordResetToken
		);

		await mailer.sendMail({
			to: user.email,
			subject: 'Reset BottomTime password',
            html: mailTemplate
		});

		return res.sendStatus(204);
	} catch (err) {
		const logId = req.logError(
			'A server error occurred while trying to create a password reset token or send it by e-mail',
			err);
		return serverError(res, logId);
	}
}
