import Friend from '../data/friend';
import Joi from 'joi';
import { ListFriendsSchema } from '../validation/friend';
import mailer from '../mail/mailer';
import templates from '../mail/templates';
import { badRequest, serverError, notFound } from '../utils/error-response';
import User from '../data/user';

export async function ListFriends(req, res) {
	const isValid = Joi.validate(req.query, ListFriendsSchema);
	if (isValid.error) {
		return badRequest('Query string was invalid', isValid.error, res);
	}

	let approved = true;
	switch (req.query.type) {
	case 'requests':
		approved = false;
		break;

	case 'both':
		approved = null;
		break;

	default:
		approved = true;
	}

	try {
		const friends = await Friend.getFriendsForUser(req.account.username, approved);
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
			approvedOn: now
		}),
		new Friend({
			user: req.friend.username,
			friend: req.account.username,
			approved: true,
			requestedOn: now,
			approvedOn: now
		})
	];

	await Promise.all([ friends[0].save(), friends[1].save() ]);
	res.sendStatus(204);
}

export async function CreateFriendRequest(req, res) {
	try {
		if (req.user.role === 'admin') {
			return CreateFriendRequestAdmin(req, res);
		}

		const friendRequest = new Friend({
			user: req.account.username,
			friend: req.friend.username,
			requestedOn: new Date(),
			approved: false
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

export function ApproveFriendRequest(req, res) {
	res.sendStatus(501);
}

export function RejectFriendRequest(req, res) {
	res.sendStatus(501);
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

export function BulkDeleteFriends(req, res) {
	res.sendStatus(501);
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
