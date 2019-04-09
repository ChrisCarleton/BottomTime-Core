import {
	AssertUserReadPermission,
	AssertUserWritePermission,
	RequireUser,
	RetrieveUserAccount
} from '../controllers/security.controller';
import {
	ApproveFriendRequest,
	BulkDeleteFriends,
	CreateFriendRequest,
	CreateFriendRequestAdmin,
	DeleteFriend,
	ListFriends,
	LoadFriendRequestData,
	RejectFriendRequest,
	RetrieveFriendAccount
} from '../controllers/friends.controller';

const FriendsRoute = '/users/:username/friends';
const FriendRoute = `${ FriendsRoute }/:friendName`;

module.exports = app => {
	app.route(FriendsRoute)
		.get(RetrieveUserAccount, AssertUserReadPermission, ListFriends)
		.delete(RequireUser, RetrieveUserAccount, AssertUserWritePermission, BulkDeleteFriends);

	app.route(FriendRoute)
		.put(
			RequireUser,
			RetrieveUserAccount,
			RetrieveFriendAccount,
			AssertUserWritePermission,
			CreateFriendRequest,
			CreateFriendRequestAdmin
		)
		.delete(RequireUser, RetrieveUserAccount, AssertUserWritePermission, DeleteFriend);

	app.post(`${ FriendRoute }/approve`, LoadFriendRequestData, ApproveFriendRequest);
	app.post(`${ FriendRoute }/reject`, LoadFriendRequestData, RejectFriendRequest);
};
