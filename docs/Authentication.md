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
	"isLockedOut": "Boolean: True if the account is locked out (not allowed to log in.)",
	"isRegistrationIncomplete": "Boolean: True if the account was created via SSO sign in and is missing some key info.",
	"distanceUnit": "String: The user's preferred unit for distance. (Valid values are 'm' and 'ft'.)",
	"weightUnit": "String: The user's preferred unit for weight. (Valid values are 'kg' and 'lb'.)",
	"pressureUnit": "String: The user's preferred unit for pressure. (Valid values are 'psi' and 'bar'.)",
	"temperatureUnit": "String: The user's preferred unit for temperature. (Valid values are 'c' and 'f'.)",
	"memberSince": "String (ISO Date): The date and time at which the user profile was created.",
	"logsVisibility": "One of 'private', 'friends-only', or 'public'. Indicates how visible the user's profile and logs are.",
	"firstName": "String: The user's first name.",
	"lastName": "String: The user's last name.",
	"location": "String: Where the user is geographically located.",
	"occupation": "String: The user's occupation.",
	"gender": "String: One of 'male', or 'female'.",
	"birthdate": "String: A string representation of the user's birthdate in this format: YYYY-MM-DD",
	"typeOfDiver": "String: Free-form string describing the type of diver the user is.",
	"startedDiving": "Number: The four-digit year in which the user began their diving career.",
	"certificationLevel": "String: The user's certification level (OW, Advanced, Rescue, etc.)",
	"certificationAgencies": "String: A list of agencies the user has trained with (PADI, SSI, NAUI, etc.)",
	"specialties": "String: A list of specialty certifications the user has earned.",
	"about": "String: A free-form paragraph allowing the user to describe their diving background."
}
```
Some user accounts may not have a password set on them because the user opted to sign up using one of the
OAuth providers and so authentication is provided by a third party. If `isRegistrationIncomplete` is
`true` then the user may not be able to call certain APIs that they would normally have access to. The
user must call `POST /users/:username/completeRegistration` in order to complete their registration and
clear this flag.

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
the user is not authenticated then the object is populated with information on the Anonymous User.

#### Responses
HTTP Status Code | Details
----- | -----
**200 OK** | The call succeeded and the response body will contain a [UserAccount](#useraccount-object) object.
**500 Server Error** | An error occurred on the server side. The response body will contain an [Error](General.md#error-object) object with more details.

### POST /auth/login
Attempts to log a user in using a username/password pair and create a user session.

#### Message Body
An [Authentication](#authentication-object) object must be sent in the message body containing the username
and password.

#### Responses
HTTP Status Code | Details
----- | -----
**200 OK** | The call succeeded and the user was authenticated. A [UserAccount](#useraccount-object) will be returned containing information on the user that was signed in. A session cookie will also be provided in the response. This cookie should be included in future requests made as the authenticated user.
**400 Bad Request** | The request was rejected because the provided [Authentication](#authentication-object) object was invalid or missing.
**401 Unauthorized** | Authentication failed. Either the user account does not exist, does not have a password set, is locked out, or the supplied password was incorrect.
**500 Server Error** | Something went wrong accessing the database. An [Error](General.md#error-object) object will be provided in the response with more details.

### POST /auth/logout
Logs out a user and terminates their session. This will invalidate the user's session cookie. Attempts to
use it in future requests will result in a **401 Unauthorized** error.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the user's session has been invalidated. The session cookie will be removed. The response body will be empty.
**500 Server Error** | Something went wrong accessing the database. An [Error](General.md#error-object) object will be provided in the response with more details.

### GET /auth/:provider
This route should be used when using Single Sign-On (SSO) authentication from a third-party auth provider.
It will redirect to the appropriate provider's website with the necessary OAuth2.0 client ID/secret.

#### Route Parameters
* **provider** - The name of the 3rd-party SSO provider. The only accepted values are `google`.

### GET /auth/:provider/callback
This route provides an end-point for third-party SSO providers to call back with authentication details.
**This route should not be invoked directly!** If authentication was successful then the appropriate auth
cookie will be set. The route will return an HTTP redirect regardless to allow the user to continue
browsing the app.

#### Route Parameters
* **provider** - The name of the 3rd-party SSO provider. The only accepted values are `google`.
