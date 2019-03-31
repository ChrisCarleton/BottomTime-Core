import Joi from 'joi';

export const ListFriendsSchema = Joi.object({
	type: Joi.string().valid([ 'friends', 'requests', 'both' ]).allow(null)
});

export const HandleFriendRequestSchema = Joi.object({
	reason: Joi.string().max(250)
});
