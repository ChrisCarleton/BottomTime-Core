import {
	BulkDeleteSchema,
	HandleFriendRequestSchema,
	ListFriendsSchema
} from '../validation/friend';
import config from '../config';
import Friend from '../data/friend';
import Joi from 'joi';
import mailer from '../mail/mailer';
import templates from '../mail/templates';
import { badRequest, conflict, forbidden, notFound, serverError } from '../utils/error-response';
import User from '../data/user';

export async function ListFriends(req, res) {
	const isValid = Joi.validate(req.query, ListFriendsSchema);
	if (isValid.error) {
		return badRequest('Query string was invalid', isValid.error, res);
	}

	try {
		const friends = await Friend.getFriendsForUser(req.account.username, req.query.type);
		res.json(friends.map(f => f.toCleanJSON()));
	} catch (err) {
		const logId = req.logError(
			`Unable to list friends for user ${ req.account.username }.`,
			err);
		serverError(res, logId);
	}
}

export async function CreateFriendRequestAdmin(req, res) {
	const now = new Date();
	const friends = [
		new Friend({
			user: req.account.username,
			friend: req.friend.username,
			approved: true,
			requestedOn: now,
			evaluatedOn: now
		}),
		new Friend({
			user: req.friend.username,
			friend: req.account.username,
			approved: true,
			requestedOn: now,
			evaluatedOn: now
		})
	];

	await Promise.all([
		Friend.deleteMany({
			user: req.account.username,
			friend: req.friend.username
		}),
		Friend.deleteMany({
			user: req.friend.username,
			friend: req.account.username
		})
	]);
	await Friend.insertMany(friends);
	res.sendStatus(204);
}

export async function CreateFriendRequest(req, res, next) {
	try {
		if (req.account.username === req.friend.username) {
			return badRequest('Users cannot be friends with themselves', null, res);
		}

		let friendRequest = null;
		let incomingRequest = null;
		[ friendRequest, incomingRequest ] = await Promise.all([
			Friend.findOne({
				user: req.account.username,
				friend: req.friend.username
			}),
			Friend.findOne({
				user: req.friend.username,
				friend: req.account.username
			})
		]);

		if (incomingRequest) {
			return conflict(
				res,
				'friend',
				'A reciprocal friend-request already exists.'
			);
		}

		if (friendRequest) {
			if (friendRequest.approved === false) {
				// A previously-rejected friend request can simply be re-enabled.
				friendRequest.approved = null;
				friendRequest.evaluatedOn = null;
			} else {
				return conflict(
					res,
					'friend',
					'Friend request could not be created because it already exists.'
				);
			}
		}

		if (req.user.role === 'admin') {
			return next();
		}

		const friendCount = await Friend.estimatedDocumentCount({
			user: req.account.username,
			approved: { $ne: false }
		});

		if (friendCount >= config.friendLimit) {
			return badRequest(
				'Could not create friend request.',
				`Friend limit of ${ config.friendLimit } has been reached.`,
				res);
		}

		friendRequest = friendRequest || new Friend({
			user: req.account.username,
			friend: req.friend.username,
			requestedOn: new Date()
		});
		await friendRequest.save();
	} catch (err) {
		const logId = req.logError(
			`Failed to save friend request from ${ req.user.username } to ${ req.friend.username }.`,
			err);
		return serverError(res, logId);
	}

	try {
		const mailMessage = templates.NewFriendRequestEmail(
			req.user.getFullName(),
			req.friend.username,
			req.friend.getFriendlyName()
		);
		await mailer.sendMail({
			to: req.friend.email,
			subject: 'Dive Buddy Request',
			html: mailMessage
		});
	} catch (err) {
		req.logError('Failed to send friend request e-mail', err);
	}

	res.sendStatus(204);
}

export async function LoadFriendRequestData(req, res, next) {
	const isValid = Joi.validate(req.body, HandleFriendRequestSchema);
	if (isValid.error) {
		return badRequest(
			'Request body was invalid',
			isValid.error,
			res
		);
	}

	try {
		[ req.account, req.friend, req.friendRequest ] = await Promise.all([
			User.findByUsername(req.params.username),
			User.findByUsername(req.params.friendName),
			Friend.findOne({
				user: req.params.username,
				friend: req.params.friendName
			})
		]);

		if (!req.account || !req.friend || !req.friendRequest) {
			return notFound(req, res);
		}

		if (req.user.id !== req.friend.id) {
			return forbidden(
				res,
				'Users cannot approve or reject their own friend request and/or those of another user.'
			);
		}

		if (typeof (req.friendRequest.approved) !== 'undefined') {
			return badRequest(
				'Request could not be completed',
				'Friend request has already been approved or rejected.',
				res
			);
		}
	} catch (err) {
		const logId = req.logError('Failed to retrieve information for friend request', err);
		return serverError(res, logId);
	}

	return next();
}

export async function ApproveFriendRequest(req, res) {
	try {
		req.friendRequest.approved = true;
		req.friendRequest.evaluatedOn = new Date();
		req.friendRequest.reason = req.body.reason;

		const reciprocal = new Friend({
			user: req.friendRequest.friend,
			friend: req.friendRequest.user,
			requestedOn: req.friendRequest.requestedOn,
			evaluatedOn: req.friendRequest.evaluatedOn,
			approved: true
		});

		await Promise.all([
			req.friendRequest.save(),
			reciprocal.save()
		]);
	} catch (err) {
		const logId = req.logError(
			`Failed to approve friend request from ${ req.params.username } to ${ req.params.friendName }.`,
			err);
		return serverError(res, logId);
	}

	try {
		const html = templates.ApproveFriendRequestEmail(
			req.account.getFriendlyName(),
			req.friend.username,
			req.friend.getFullName()
		);
		await mailer.sendMail({
			to: req.account.email,
			subject: 'Dive Buddy Request Accepted',
			html
		});
	} catch (err) {
		req.logError('Failed to send notification e-mail for friend request approval', err);
	}

	res.sendStatus(204);
}

export async function RejectFriendRequest(req, res) {
	try {
		req.friendRequest.approved = false;
		req.friendRequest.evaluatedOn = new Date();
		req.friendRequest.reason = req.body.reason;
		await req.friendRequest.save();
	} catch (err) {
		const logId = req.logError(
			`Failed to approve friend request from ${ req.params.username } to ${ req.params.friendName }.`,
			err);
		return serverError(res, logId);
	}

	try {
		const html = templates.RejectFriendRequestEmail(
			req.account.getFriendlyName(),
			req.friend.getFullName(),
			req.body.reason
		);
		await mailer.sendMail({
			to: req.account.email,
			subject: 'Dive Buddy Request Rejected',
			html
		});
	} catch (err) {
		req.logError('Failed to send notification e-mail for friend request rejection', err);
	}

	res.sendStatus(204);
}

export async function DeleteFriend(req, res) {
	try {
		await Friend.findOneAndDelete({
			user: req.account.username,
			friend: req.params.friendName
		});
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError(
			`Unable to delete friend for user ${ req.account.username }.`,
			err);
		serverError(res, logId);
	}
}

export async function BulkDeleteFriends(req, res) {
	const isValid = Joi.validate(req.body, BulkDeleteSchema);
	if (isValid.error) {
		return badRequest(
			'Invalid request body',
			isValid.error,
			res
		);
	}

	try {
		await Friend.deleteMany({
			user: req.account.username,
			friend: { $in: req.body }
		});
		res.sendStatus(204);
	} catch (err) {
		const logId = req.logError(
			`Failed to delete friends for user ${ req.account.username }`,
			err);
		serverError(res, logId);
	}
}

export async function RetrieveFriendAccount(req, res, next) {
	try {
		req.friend = await User.findByUsername(req.params.friendName);

		if (!req.friend) {
			return notFound(req, res);
		}

		return next();
	} catch (err) {
		const logId = req.logError(
			`Failed to get user account information for user ${ req.params.friendName }`,
			err);
		return serverError(res, logId);
	}
}
