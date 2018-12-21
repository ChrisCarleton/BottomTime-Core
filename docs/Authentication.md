[Back to table of contents](API.md)

# Authentication
The authentication domain deals with access to user accounts.

## Classes
### UserAccount Object
```json
{
	"username": "String: The unique username that identifies the users profile.",
	"email": "String: The e-mail address associated with the user account.",
	"createdAt": "String: An ISO date string indicating when the user account was first created. (UTC.)",
	"role": "String: Indicates the user's privilege level in the system. One of user|admin.",
	"isAnonymous": "Boolean: True if the user is unauthenticated; otherwise, false.",
	"hasPassword": "Boolean: True if the user has a password set on his/her account.",
	"isLockedOut": "Boolean: True if the account is locked out (not allowed to log in.)"
}
```
Some user accounts may not have a password set on them because the user opted to sign up using one of the
OAuth providers and so authentication is provided by a third party.

### Authentication Object
```json
{
	"username": "REQUIRED String",
	"password": "REQUIRED String"
}
```

## Routes
### GET /auth/me
Returns a [UserAccount](#useraccount-object) containing information for the currently signed in user. If
the user is not authenticated then the object is populated with "dummy" information for the anonymous user.

#### Responses
HTTP Status Code | Details
- | -
**200 OK** | The call succeeded and the response body will contain a [UserAccount](#useraccount-object) object.
**500 Server Error** | An error occurred on the server side. The response body will contain an [Error](General.md#error-object) object with more details.

### POST /auth/login
Attempts to log a user in using a username/password pair and create a user session.

#### Message Body
An [Authentication](#authentication-object) object must be sent in the message body containing the username
and password.

#### Responses
HTTP Status Code | Details
- | -
**204 No Content** | The call succeeded and the user is authenticated. The `set-cookie` header will be returned containing the user's session cookie. The response body will be empty.
**400 Bad Request** | The request was rejected because the provided [Authentication](#authentication-object) object was invalid or missing.
**401 Unauthorized** | Authentication failed. Either the user account does not exist, does not have a password set, is locked out, or the supplied password was incorrect.
**500 Server Error** | Something went wrong accessing the database. An [Error](General.md#error-object) object will be provided in the response with more details.

### POST /auth/logout
Logs out a user and terminates their session.

#### Responses
HTTP Status Code | Details
- | -
**204 No Content** | The call succeeded and the user's session has been invalidated. Their session cookie will no longer be accepted. The response body will be empty.
**500 Server Error** | Something went wrong accessing the database. An [Error](General.md#error-object) object will be provided in the response with more details.
