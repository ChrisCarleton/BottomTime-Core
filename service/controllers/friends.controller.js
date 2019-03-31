import Friend from '../data/friend';
import {
	BulkDeleteSchema,
	HandleFriendRequestSchema,
	ListFriendsSchema
} from '../validation/friend';
import Joi from 'joi';
import mailer from '../mail/mailer';
import templates from '../mail/templates';
import { badRequest, serverError, notFound } from '../utils/error-response';
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

async function CreateFriendRequestAdmin(req, res) {
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

	await Promise.all([ friends[0].save(), friends[1].save() ]);
	res.sendStatus(204);
}

export async function CreateFriendRequest(req, res) {
	try {
		let friendRequest = await Friend.findOne({
			user: req.account.username,
			friend: req.friend.username
		});

		if (friendRequest) {
			return badRequest(
				'Could not create friend request.',
				'Friend relation already exists between the requested users.',
				res);
		}

		if (req.user.role === 'admin') {
			return CreateFriendRequestAdmin(req, res);
		}

		friendRequest = new Friend({
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

async function GetDataForFriendRequest(username, friendName) {
	const results = await Promise.all([
		User.findByUsername(username),
		User.findByUsername(friendName),
		Friend.findOne({
			user: username,
			friend: friendName
		})
	]);

	return results;
}

export async function ApproveFriendRequest(req, res) {
	let user = null;
	let friend = null;
	let friendRequest = null;

	const isValid = Joi.validate(req.body, HandleFriendRequestSchema);
	if (isValid.error) {
		return badRequest(
			'Request body was invalid',
			isValid.error,
			res
		);
	}

	try {
		[ user, friend, friendRequest ] = await GetDataForFriendRequest(
			req.params.username,
			req.params.friendName
		);

		if (!user || !friend || !friendRequest) {
			return notFound(req, res);
		}

		if (typeof (friendRequest.approved) !== 'undefined') {
			return badRequest(
				'Request could not be completed',
				'Friend request has already been approved',
				res
			);
		}

		friendRequest.approved = true;
		friendRequest.evaluatedOn = new Date();
		friendRequest.reason = req.body.reason;
		await friendRequest.save();
	} catch (err) {
		const logId = req.logError(
			`Failed to approve friend request from ${ req.params.username } to ${ req.params.friendName }.`,
			err);
		return serverError(res, logId);
	}

	try {
		const html = templates.ApproveFriendRequestEmail(
			user.getFriendlyName(),
			friend.username,
			friend.getFullName()
		);
		await mailer.sendMail({
			to: user.email,
			subject: 'Dive Buddy Request Accepted',
			html
		});
	} catch (err) {
		req.logError('Failed to send notification e-mail for friend request approval', err);
	}

	res.sendStatus(204);
}

export async function RejectFriendRequest(req, res) {
	let user = null;
	let friend = null;
	let friendRequest = null;

	const isValid = Joi.validate(req.body, HandleFriendRequestSchema);
	if (isValid.error) {
		return badRequest(
			'Request body was invalid',
			isValid.error,
			res
		);
	}

	try {
		[ user, friend, friendRequest ] = await GetDataForFriendRequest(
			req.params.username,
			req.params.friendName
		);

		if (!user || !friend || !friendRequest) {
			return notFound(req, res);
		}

		if (typeof (friendRequest.approved) === 'boolean') {
			return badRequest(
				'Request could not be completed',
				'Friend request has already been rejected',
				res
			);
		}

		friendRequest.approved = false;
		friendRequest.evaluatedOn = new Date();
		friendRequest.reason = req.body.reason;
		await friendRequest.save();
	} catch (err) {
		const logId = req.logError(
			`Failed to approve friend request from ${ req.params.username } to ${ req.params.friendName }.`,
			err);
		return serverError(res, logId);
	}

	try {
		const html = templates.RejectFriendRequestEmail(
			user.getFriendlyName(),
			friend.getFullName(),
			req.body.reason
		);
		await mailer.sendMail({
			to: user.email,
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
