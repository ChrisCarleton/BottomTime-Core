import bcrypt from 'bcrypt';
import Bluebird from 'bluebird';
import { badRequest, conflict, forbidden, serverError } from '../utils/error-response';
import { logError } from '../logger';
import Joi from 'joi';
import moment from 'moment';
import User, { cleanUpUser } from '../data/user';
import { UserAccountSchema, UsernameSchema } from '../validation/user';

export function CreateUserAccount(req, res) {
	const isUsernameValid = Joi.validate(req.params.username, UsernameSchema);
	const isBodyValid = Joi.validate(req.body, UserAccountSchema);

	if (isUsernameValid.error) {
		return badRequest(
			'Username is invlaid - unable to create user account.',
			isUsernameValid.error.details,
			res);
	}

	if (isBodyValid.error) {
		return badRequest(
			'Unable to create user account. Validation errors follow.',
			isBodyValid.error.details,
			res);
	}

	if (!req.user && req.body.role !== 'user') {
		return forbidden(
			res,
			'Anonymous users can only create accounts with the role set to "user".');
	}

	if (req.user && req.user.role !== 'admin') {
		return forbidden(
			res,
			`You are already signed in as "${req.user.username}" and are not authorized to create a new account.`);
	}

	const user = new User({
		email: req.body.email,
		role: req.body.role,
		username: req.params.username,
		usernameLower: req.params.username.toLowerCase(),
		emailLower: req.body.email.toLowerCase(),
		passwordHash: bcrypt.hashSync(req.body.password, 10),
		createdAt: moment().utc().toDate()
	});

	Bluebird.all([
			User.findOne({ usernameLower: req.params.username.toLowerCase() }),
			User.findOne({ emailLower: req.body.email.toLowerCase() })
		])
		.then(conflicts => {
			if (conflicts[0]) {
				return conflict(
					res,
					'username',
					'The account could not be created because the specified username is already taken.');
			}

			if (conflicts[1]) {
				return conflict(
					res,
					'email',
					'The account could not be created because the specified email address is already taken.');
			}

			return user.save();
		})
		.then(entity => {
			if (!entity) return;

			if (req.user && req.user.role === 'admin') {
				return res.status(201).json(cleanUpUser(req.user));
			}
			
			req.login(entity, err => {
				if (err) {
					const logId = logError('Failed to sign in user due to server error', err);
					return serverError(res, logId);
				}

				res.status(201).json(cleanUpUser(entity));
			});
		})
		.catch(err => {
			const logId = logError('Failed to create user account due to server error', err);
			serverError(res, logId);
		});
}

export function ChangeEmail(req, res) {
	res.sendStatus(501);
}

export function ChangePassword(req, res) {
	res.sendStatus(501);
}

export function RequestPasswordReset(req, res) {
	res.sendStatus(501);
}

export function ConfirmPasswordReset(req, res) {
	res.sendStatus(501);
}
