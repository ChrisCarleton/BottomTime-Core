import {
	AssertUserReadPermission,
	// AssertUserWritePermission,
	RetrieveUserAccount
} from '../controllers/security.controller';
import {
	ApproveFriendRequest,
	BulkDeleteFriends,
	CreateFriendRequest,
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
		.delete(RetrieveUserAccount, BulkDeleteFriends);

	app.route(FriendRoute)
		.put(RetrieveUserAccount, RetrieveFriendAccount, CreateFriendRequest)
		.delete(RetrieveUserAccount, DeleteFriend);

	app.post(`${ FriendRoute }/approve`, LoadFriendRequestData, ApproveFriendRequest);
	app.post(`${ FriendRoute }/reject`, LoadFriendRequestData, RejectFriendRequest);
};
