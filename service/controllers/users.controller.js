import bcrypt from 'bcrypt';
import { badRequest, conflict, forbidden, notFound, serverError, unauthorized } from '../utils/error-response';
import {
	AdminUserQuerySchema,
	ChangeEmailSchema,
	ChangePasswordSchema,
	CompleteRegistrationSchema,
	ConfirmResetPasswordSchema,
	UserAccountSchema,
	UserQuerySchema
} from '../validation/user';
import moment from 'moment';
import User from '../data/user';
import { UsernameRegex, UsernameSchema } from '../validation/common';
import searchUtils from '../utils/search-utils';

export async function GetUsers(req, res, next) {
	if (req.user.role === 'admin') {
		next();
		return;
	}

	try {
		const { error } = UserQuerySchema.validate(req.query.query);
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
			createdAt: moment(r.createdAt).utc().toISOString()
		})));
	} catch (err) {
		const logId = req.logError('Failed to perform search for user', err);
		serverError(res, logId);
	}
}

export async function AdminGetUsers(req, res) {
	const { error } = AdminUserQuerySchema.validate(req.query);
	if (error) {
		return badRequest(
			'Unable to perform search. There is a problem with the query string.',
			error,
			res
		);
	}

	try {
		const esQuery = searchUtils.getBaseQuery();
		searchUtils.setLimits(esQuery, req.query.skip, req.query.count);
		searchUtils.addSearchTerm(esQuery, req.query.query, [
			'username^4',
			'email^4',
			'firstName^2',
			'lastName^2',
			'about'
		]);
		searchUtils.selectFields(esQuery, [
			'username',
			'email',
			'role',
			'createdAt',
			'isLockedOut',
			'logsVisibility',
			'firstName',
			'lastName'
		]);
		searchUtils.addSorting(esQuery, req.query.sortBy, req.query.sortOrder, {
			username: 'usernameLower',
			created: 'createdAt'
		});

		if (req.query.lockedOut) {
			searchUtils.addFilter(esQuery, {
				term: {
					isLockedOut: req.query.lockedOut === 'true'
				}
			});
		}

		if (req.query.logsVisibility) {
			searchUtils.addFilter(esQuery, {
				term: {
					logsVisibility: req.query.logsVisibility
				}
			});
		}

		if (req.query.role) {
			searchUtils.addFilter(esQuery, {
				term: {
					role: req.query.role
				}
			});
		}

		const results = await User.esSearch(esQuery);
		res.json(results.body.hits.hits.map(hit => ({
			...hit._source,
			score: hit._score
		})));
	} catch (err) {
		const logId = req.logError('Unable to search for users', err);
		serverError(res, logId);
	}
}

export async function RequireAccountPermission(req, res, next) {
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

export function RequireUserForRegistration(req, res, next) {
	if (!req.user) {
		return unauthorized(res);
	}

	next();
}

function validateCreateUserAccount(req, res) {
	const isUsernameValid = UsernameSchema.required().validate(req.params.username);
	const isBodyValid = UserAccountSchema.validate(req.body);

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

export async function GetUserAccount(req, res) {
	try {
		const user = await User.findByUsername(req.params.username);

		if (user) {
			res.json(user.getAccountJSON());
		} else {
			notFound(req, res);
		}
	} catch (err) {
		const logId = req.logError('Failed to retrieve user account information from database', err);
		serverError(res, logId);
	}
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

		await user.save();

		if (req.user && req.user.role === 'admin') {
			return res.status(201).json(user.getAccountJSON());
		}

		req.log.info('Created account for and logged in user ', user.username);
		req.login(user, err => {
			if (err) {
				const logId = req.logError(
					`Failed to log in new user ${ user.username }`,
					err
				);
				return serverError(res, logId);
			}
			res.status(201).json(user.getAccountJSON());
		});
	} catch (err) {
		const logId = req.logError('Failed to create user account due to server error', err);
		serverError(res, logId);
	}
}

export async function CompleteRegistration(req, res) {
	if (!req.account.isRegistrationIncomplete) {
		return forbidden(
			res,
			'Operation Forbidden: Registration for this account has already been completed.'
		);
	}

	const { error } = CompleteRegistrationSchema.validate(req.body);
	if (error) {
		return badRequest(
			'There was a problem with the request to complete the user\'s registration',
			error,
			res
		);
	}

	try {
		const [ usernameConflict, emailConflict ] = await Promise.all([
			User.findByUsername(req.body.username),
			User.findOne({
				emailLower: req.body.email.toLowerCase(),
				usernameLower: { $ne: req.params.username.toLowerCase() }
			})
		]);

		if (usernameConflict) {
			return conflict(
				res,
				'username',
				'Username is already taken'
			);
		}

		if (emailConflict) {
			return conflict(
				res,
				'email',
				'Email is already taken'
			);
		}

		req.account.username = req.body.username;
		req.account.usernameLower = req.body.username.toLowerCase();
		req.account.email = req.body.email;
		req.account.emailLower = req.body.email.toLowerCase();
		req.account.firstName = req.body.firstName;
		req.account.lastName = req.body.lastName;
		req.account.logsVisibility = req.body.logsVisibility;
		req.account.distanceUnit = req.body.distanceUnit;
		req.account.pressureUnit = req.body.pressureUnit;
		req.account.temperatureUnit = req.body.temperatureUnit;
		req.account.weightUnit = req.body.weightUnit;
		req.account.uiComplexity = req.body.uiComplexity;
		req.account.isRegistrationIncomplete = false;
		await req.account.save();

		req.log.info(`User ${ req.body.username } has completed registration`);

		res.json(req.account.getFullAccountJSON());
	} catch (err) {
		const logId = req.logError('Failed to complete registration for user.', err);
		serverError(res, logId);
	}
}

export async function ChangeEmail(req, res) {
	try {
		const isValid = ChangeEmailSchema.validate(req.body);
		if (isValid.error) {
			return badRequest(
				'Request was invalid. Check that the new e-mail is a valid e-mail address.',
				isValid.error,
				res);
		}

		const { newEmail } = req.body;
		const newEmailLower = newEmail.toLowerCase();

		if (req.account.emailLower === newEmailLower) {
			// There is no change to be made here. Return 204.
			return res.sendStatus(204);
		}

		const emailConflict = await User.findByEmail(newEmail);
		if (emailConflict) {
			return conflict(
				res,
				'email',
				'Desired e-mail address is already in use on another account');
		}

		req.account.email = newEmail;
		req.account.emailLower = newEmailLower;
		await req.account.save();

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Failed to change email address due to an unexpected server error', err);
		serverError(res, logId);
	}
}

export async function ChangePassword(req, res) {
	try {
		const isValid = ChangePasswordSchema.validate(req.body);
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

export async function ConfirmPasswordReset(req, res) {
	const isUsernameValid = UsernameSchema.required().validate(req.params.username);
	if (isUsernameValid.error) {
		return badRequest(
			'Unable to reset password. The username specified in the request URL is invalid',
			isUsernameValid.error,
			res);
	}

	const isRequestValid = ConfirmResetPasswordSchema.validate(req.body);
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

export async function UpdateLockStatus(req, res) {
	try {
		const user = await User.findByUsername(req.params.username);
		if (!user) {
			return notFound(req, res);
		}

		user.isLockedOut = req.params.lockStatus === 'lock';
		await user.save();

		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError('Unable to update lock status', err);
		serverError(res, logId);
	}
}
