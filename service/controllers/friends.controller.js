import Friend from '../data/friend';
import Joi from 'joi';
import { ListFriendsSchema } from '../validation/friend';
import { badRequest, serverError } from '../utils/error-response';

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
