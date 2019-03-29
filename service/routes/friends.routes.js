import {
	// AssertUserReadPermission,
	// AssertUserWritePermission,
	RetrieveUserAccount
} from '../controllers/security.controller';
import {
	BulkDeleteFriends,
	DeleteFriend,
	ListFriends
} from '../controllers/friends.controller';

const FriendsRoute = '/users/:username/friends';
const FriendRoute = `${ FriendsRoute }/:friendName`;

module.exports = app => {
	app.route(FriendsRoute)
		.get(RetrieveUserAccount, ListFriends)
		.delete(RetrieveUserAccount, BulkDeleteFriends);

	app.route(FriendRoute)
		.delete(RetrieveUserAccount, DeleteFriend);
};
