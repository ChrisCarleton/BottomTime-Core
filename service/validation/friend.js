import Joi from 'joi';
import { UsernameSchema } from './common';

export const ListFriendsSchema = Joi.object({
	type: Joi.string().valid([ 'friends', 'requests-incoming', 'requests-outgoing' ]).allow(null)
});

export const HandleFriendRequestSchema = Joi.object({
	reason: Joi.string().max(250)
});

export const BulkDeleteSchema = Joi
	.array()
	.max(1000)
	.items(UsernameSchema.required())
	.required();
