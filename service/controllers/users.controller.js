import bcrypt from 'bcrypt';
import { badRequest, conflict, forbidden, serverError } from '../utils/error-response';
import {
	AdminUserQuerySchema,
	ConfirmResetPasswordSchema,
	ChangePasswordSchema,
	UserAccountSchema,
	UsernameRegex,
	UsernameSchema,
	UserQuerySchema
} from '../validation/user';
import Joi from 'joi';
import mailer from '../mail/mailer';
import moment from 'moment';
import sessionManager from '../utils/session-manager';
import templates from '../mail/templates';
import User, { cleanUpUser } from '../data/user';
import uuid from 'uuid/v4';

export async function GetUsers(req, res, next) {
	if (req.user.role === 'admin') {
		next();
		return;
	}

	try {
		const { error } = Joi.validate(req.query.query, UserQuerySchema);
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

export async function AdminGetUsers(req, res) {
	const { error } = Joi.validate(req.query, AdminUserQuerySchema);
	if (error) {
		return badRequest(
			'Could not complete query. Query string was invalid.',
			error,
			res);
	}

	try {
		const query = {};
		req.query.sortBy = req.query.sortBy || 'username';
		req.query.sortOrder = req.query.sortOrder || 'asc';

		if (req.query.query) {
			req.query.query = req.query.query.toLowerCase();
			query.$or = [
				{ usernameLower: req.query.query },
				{ emailLower: req.query.query }
			];
		} else if (req.query.lastSeen) {
			if (req.query.sortOrder === 'asc') {
				query.username = { $gt: req.query.lastSeen };
			} else {
				query.username = { $lt: req.query.lastSeen };
			}
		}

		const results = await User
			.find(query)
			.sort(`${ req.query.sortOrder === 'asc' ? '' : '-' }${ req.query.sortBy }`)
			.limit(req.query.count ? parseInt(req.query.count, 10) : 500)
			.select([
				'username',
				'email',
				'role',
				'isLockedOut',
				'passwordHash',
				'createdAt'
			])
			.exec();

		const json = results.map(u => u.getAccountJSON());
		return res.json(json);
	} catch (err) {
		const logId = req.logError('Failed to search users.', err);
		return serverError(res, logId);
	}
}

export async function RequireAccountPermission(req, res, next) {
	if (!req.user) {
		return forbidden(res, 'You must be authenticated to perform this action');
	}

	if (req.user.role !== 'admin' && req.user.usernameLower !== req.params.username.toLowerCase()) {
		return forbidden(
			res,
			'You do not have permission to change the password for the desired account');
	}

	try {
		const user = await User.findByUsername(req.params.username);
		if (!user) {
			return forbidden(
				res,
				'You do not have permission to change the password for the desired account');
		}

		req.account = user;
		return next();
	} catch (err) {
		const logId = req.logError('Failed to retrieve user account from database', err);
		serverError(res, logId);
	}
}

function validateCreateUserAccount(req, res) {
	const isUsernameValid = Joi.validate(req.params.username, UsernameSchema);
	const isBodyValid = Joi.validate(req.body, UserAccountSchema);

	if (isUsernameValid.error) {
		badRequest(
			'Username is invlaid - unable to create user account.',
			isUsernameValid.error.details,
			res);
		return false;
	}

	if (isBodyValid.error) {
		badRequest(
			'Unable to create user account. Validation errors follow.',
			isBodyValid.error.details,
			res);
		return false;
	}

	if (!req.user && req.body.role !== 'user') {
		forbidden(
			res,
			'Anonymous users can only create accounts with the role set to "user".');
		return false;
	}

	if (req.user && req.user.role !== 'admin') {
		forbidden(
			res,
			`You are already signed in as "${ req.user.username }" and are not authorized to create a new account.`);
		return false;
	}

	return true;
}

export async function CreateUserAccount(req, res) {
	if (!validateCreateUserAccount(req, res)) {
		return;
	}

	try {
		const user = new User({
			email: req.body.email,
			role: req.body.role,
			username: req.params.username,
			usernameLower: req.params.username.toLowerCase(),
			emailLower: req.body.email.toLowerCase(),
			passwordHash: await bcrypt.hash(req.body.password, 10),
			createdAt: moment().utc().toDate()
		});

		const [ usernameConflict, emailConflict ] = await Promise.all(
			[
				User.findByUsername(req.params.username),
				User.findByEmail(req.body.email)
			]
		);

		if (usernameConflict) {
			return conflict(
				res,
				'username',
				'The account could not be created because the specified username is already taken.');
		}

		if (emailConflict) {
			return conflict(
				res,
				'email',
				'The account could not be created because the specified email address is already taken.');
		}

		const entity = await user.save();

		if (req.user && req.user.role === 'admin') {
			return res.status(201).json({
				user: cleanUpUser(req.user)
			});
		}

		req.log.info('Created account for and logged in user ', entity.username);
		res.status(201).json({
			user: cleanUpUser(entity),
			token: await sessionManager.createSessionToken(entity.username)
		});

	} catch (err) {
		const logId = req.logError('Failed to create user account due to server error', err);
		serverError(res, logId);
	}
}

export function ChangeEmail(req, res) {
	res.sendStatus(501);
}

export async function ChangePassword(req, res) {
	try {
		const isValid = Joi.validate(req.body, ChangePasswordSchema);
		if (isValid.error) {
			return badRequest(
				'Request was invalid. Mostly likely, the new password did not meet strength requirements.',
				isValid.error,
				res);
		}

		if (req.user.role !== 'admin'
			&& req.account.passwordHash
			&& !(await bcrypt.compare(req.body.oldPassword, req.account.passwordHash))) {

			return forbidden(
				res,
				'Unable to change the password. Old password was incorrect.');
		}

		req.account.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
		await req.account.save();
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Failed to save new password', err);
		serverError(res, logId);
	}
}

export async function RequestPasswordReset(req, res) {
	try {
		let token = null;
		let userEntity = null;

		const user = await User.findByUsername(req.params.username);
		if (!user) {
			return res.sendStatus(204);
		}

		userEntity = user;
		token = uuid();
		user.passwordResetToken = token;
		user.passwordResetExpiration = moment().add(1, 'd').utc().toDate();

		const entity = await user.save();
		if (!entity) {
			return res.sendStatus(204);
		}

		const mailTemplate = templates.ResetPasswordEmail(
			userEntity.username,
			userEntity.username,
			token);

		await mailer.sendMail({
			to: userEntity.email,
			subject: 'Reset BottomTime password',
			html: mailTemplate
		});

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Failed establish password reset window. See details.', err);
		serverError(res, logId);
	}
}

export async function ConfirmPasswordReset(req, res) {
	const isUsernameValid = Joi.validate(req.params.username, UsernameSchema);
	if (isUsernameValid.error) {
		return badRequest(
			'Unable to reset password. The username specified in the request URL is invalid',
			isUsernameValid.error,
			res);
	}

	const isRequestValid = Joi.validate(req.body, ConfirmResetPasswordSchema);
	if (isRequestValid.error) {
		return badRequest(
			'Unable to reset password. The request was invalid. See details.',
			isRequestValid.error,
			res);
	}

	try {
		const user = await User.findByUsername(req.params.username);

		if (!user
			|| !user.passwordResetToken
			|| user.passwordResetToken !== req.body.resetToken
			|| !user.passwordResetExpiration
			|| moment().diff(moment(user.passwordResetExpiration), 's') >= 0) {

			return forbidden(
				res,
				'You are not permitted to reset the password on the request account');
		}

		user.passwordHash = await bcrypt.hash(req.body.newPassword, 10);
		user.passwordResetToken = null;
		user.passwordResetExpiration = null;

		await user.save();

		res.sendStatus(204);

	} catch (err) {
		const logId = req.logError('Failed to update user\'s password in the database', err);
		serverError(res, logId);
	}
}
