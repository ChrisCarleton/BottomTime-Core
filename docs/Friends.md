[Back to table of contents](API.md)

# Friends API (Dive Buddies)
These are APIs for managing a user's list of friends and friend requests.

## Classes
### Friend Object
Describes a relation between a user and a friend.

```json
{
	"user": "String: The user's username",
	"friend": "String: The friend's username",
	"requestedOn": "String: The date at which the initial friend request was made. (ISO 8601 format.)",
	"approved": "Boolean: Indicates whether or not the friend request has been approved.",
	"approvedOn": "String: The date at which the friend request was approved. (ISO 8601 format.)"
}
```

**Notes:** The `approved` property distinguishes whether the record is an established friendship or just a
pending friend request. Friend requests will have `approved` set to `false`. Once the request is approved,
`approved` will be set to `true`.

## Routes
### GET /users/:username/friends
Lists a user's friends and/or friend requests.

#### Route Parameters
* **username** - Name of the user whose friends will be queried.

#### Query Parameters
* **type** - Indicates whether friends, friend requests, or both should be returned. Valid values are
`friends`, `requests`, or `both`. If this parameter is omitted, the default will be `friends`.

#### Responses
HTTP Status Code | Details
----- | -----
**200 OK** | The call succeeded and the response body will contain an array of [Friend](#friend-object) objects.
**400 Bad Request** | The request was rejected because the query string was invalid.
**403 Forbidden** | The request was rejected because the current user does not have permission to view the friends of the user specified in the **userName** route parameter.
**404 Not Found** | The request failed because the user specified in the **username** route parameter does not exist.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### PUT /users/:username/friends/:friendName
Generates a friend-request. For administrators, this call will cause the user and the friend to become
friends with each other (that is, a two-way relationship will be established.) If a friend request is generated, the user receiving the request will receive an e-mail notifying them.

#### Route Parameters
* **username** - Username of the user making the friend request.
* **friendName** - Username of the user who will receive the friend request.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the friend request was created.
**403 Forbidden** | The request was rejected because the current user does not have permission to modify the indicated user's friends.
**404 Not Found** | The request failed because the user specified in the **username** route parameter does not exist or the user specified in **friendName** route parameter does not exist.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### POST /users/:username/:friends/[approve|reject]
These routes can approve or reject a friend request, respectively. A rejected friend request will be
deleted. If the request is approved, then both users will become "friends" with each other. (That is, a
reciprocal friendship will be created under the new friend's account.) The route must actually be called by
the "friend" and not the user, which is a little counterintuitive.

#### Route Parameters
* **username** - Username of the user who made the initial request.
* **friendName** - Username of the user approving/rejecting the request.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the friend request was approved/rejected.
**400 Bad Request** | The request failed because the friend request was already approved.
**403 Forbidden** | The request was rejected because the current user does not have permission to approve or reject the request. Only the *recipient* of a request (or an admin) is allowed to approve/reject a request.
**404 Not Found** | The request failed because the friend request, the user, or the friend could not be found.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### DELETE /users/:username/friends/:friendName
Deletes a relationship between a user and a friend. Can be used to "unfriend" or to quietly reject a friend
request. Though the proper way to reject a friend request would be to call
`POST /users/:username/friends/:friendName/reject`. This method would allow the user to supply a reason and
the friend being rejected would receive an e-mail notifying them.

#### Route Parameters
* **username** - Username of the user whose friends will be queried.
* **friendName** - Username of the user being "unfriended".

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the relationship was deleted. (Also returned if the relationship did not exist in the first place.)
**403 Forbidden** | The request was rejected because the current user does not have permission to modify the friend relationships of the user specified in the **username** route parameter.
**404 Not Found** | The request failed because the user specified in the **username** route parameter does not exist.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.
