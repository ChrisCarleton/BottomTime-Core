[Back to table of contents](API.md)

# Users and Profiles
The User and Profile domains are for managing user accounts and profiles repsectively.

## Usernames
Usernames are used to uniquely identify users in the system. They conform to several rules.
* They must be at least 5 characters long.
* They may be no longer than 50 characters.
* They may contain only letters, numbers, dashes (`-`), dots (`.`), and underscores (`_`).
* They must be unique on the system. No two users can have the same username.

## A Note on Units
The back-end application works exclusively in **metric**. All of the APIs below that accept or return data
related to temperature, depth/distance, pressure or weight will use/take values in degrees celcius, meters,
bar, and kilograms, respectively. Though user profiles support the `temperatureUnit`, `distanceUnit`,
`pressureUnit` and `weightUnit` properties, these units are not checked when saving/retrieving log entry
information. It is up to the front-end application to consume these properties and make the appropriate
conversions... Or just stick with **metric** ;)

## Incomplete Registration
User accounts have a boolean `isRegistrationIncomplete` flag on them. This is set to true when a new user
account is created by signing in with a third party authentication provider. The account will have a
temporary user name assigned to it and will not be allowed to make most API calls until the registration
process has been completed. Completing the registration requires a call to
[POST /users/:username/completeRegistration](#POST-/users/:username/completeRegistration).

## Classes
### UserResult Object
This object is returned when listing or searching for user accounts.

```json
{
	"username": "String",
	"email": "String",
	"createdAt": "String (ISO Date)",
	"role": "String: (user|admin)",
	"isLockedOut": "Boolean",
	"hasPassword": "Boolean",
	"isAnonymous": false,
	"isRegistrationIncomplete": false
}
```

**NOTES:** Not all fields will be returned to all users. Administrators will see all fields, but regular
users will only see `username`, `createdAt`, and, possibly, `email`.

### NewUserAccount Object
This object gets passed in when creating new user accounts. (Sign up.)

```json
{
	"email": "REQUIRED String: A valid e-mail address.",
	"password": "REQUIRED String: A password to assign to the user account.",
	"role": "REQUIRED String: Must be one of 'user' or 'admin'."
}
```

#### Notes
E-mail addresses must be unique per user account. No two accounts can have the same e-mail address.

Role must be one of `user` or `admin`. However, only administrators can create other `admin` accounts.

Passwords must meet several strength requirements. All passwords must:
* Be at least 7 characters long.
* Be no more than 50 characters long.
* Contain both upper- and lower-case letters.
* Contain a digit (0-9.)
* Contain a special character. One of `!@#$%^&*.`.

### CompleteRegistration Object
This object gets passed in to complete the registration of new user accounts created by signing in using
a third party auth provider.

```json
{
	"username": "REQUIRED String: The new username to assign to the user account.",
	"email": "REQUIRED String: The e-mail address to assign to the user account.",
	"firstName": "String: User's first name. Max 50 characters.",
	"lastName": "String: User's last name. Max 50 characters.",
	"logsVisibility": "String: One of 'private', 'public', or 'friends-only'. Default is 'friends-only'.",
	"weightUnit": "String: User's preferred weight unit. One of 'kg' or 'lbs'. Default is 'kg'.",
	"distanceUnit": "String: User's preferred distance unit. One of 'm' or 'ft'. Default is 'm'.",
	"temperatureUnit": "String: User's preferred temperature unit. One of 'c' or 'f'. Default is 'c'.",
	"pressureUnit": "String: User's preferred pressure unit. One of 'bar' or 'psi'. Default is 'bar'.",
	"uiComplexity": "String: User's preferred UI complexity. One of 'basic', 'advanced', or 'technical'. Default is 'basic'."
}
```

### UserProfile Object
```json
{
	"memberSince": "String (ISO Date): The date and time at which the user profile was created.",
	"logsVisibility": "One of 'private', 'friends-only', or 'public'. Indicates how visible the user's profile and logs are.",
	"firstName": "String: The user's first name.",
	"lastName": "String: The user's last name.",
	"location": "String: Where the user is geographically located.",
	"occupation": "String: The user's occupation.",
	"birthdate": "String: A string representation of the user's birthdate in this format: YYYY-MM-DD",
	"typeOfDiver": "String: Free-form string describing the type of diver the user is.",
	"startedDiving": "Number: The four-digit year in which the user began their diving career.",
	"certificationLevel": "String: The user's certification level (OW, Advanced, Rescue, etc.)",
	"certificationAgencies": "String: A list of agencies the user has trained with (PADI, SSI, NAUI, etc.)",
	"specialties": "String: A list of specialty certifications the user has earned.",
	"about": "String: A free-form paragraph allowing the user to describe their diving background.",
	"divesLogged": "Number: The number of dives the user has logged in the application.",
	"bottomTimeLogged": "Number: The total bottom time (in minutes) that the user has logged in the application.",
	"distanceUnit": "String: The user's preferred unit for distance. (Valid values are 'm' and 'ft'.)",
	"weightUnit": "String: The user's preferred unit for weight. (Valid values are 'kg' and 'lbs'.)",
	"temperatureUnit": "String: The user's preferred unit for temperature. (Valid values are 'c' and 'f'.)",
	"pressureUnit": "String: The user's preferred unit for pressure. (Valid values are 'bar' and 'psi'.)",
	"uiComplexity": "String: How technical the user prefers the UI. (Valid values are 'basic', 'advanced', and 'technical'.)"
}
```

The **logsVisibility** field is important to note. It affects who can view the user's profile information
and log book. Here are the rules:
* Public profiles and log books can be viewed by everyone - including anonymous (unauthenticated) users
to the site!
* Friends-only profiles and log books can only be viewed by anyone the user has 'friended'.
* Private profiles and log books can only be viewed by their owner.
* Only the owner of a user profile or log book can modify it, regardless of privacy settings.
* Admins (user.role === 'admin') can view and modify *all* profiles and log books, regardless of the privacy
setting.

### ChangePassword Object
```json
{
	"oldPassword": "String: The user's old (current) password.",
	"newPassword": "REQUIRED String: The new password to be applied to the user's account."
}
```

### ConfirmPasswordReset Object
```json
{
	"resetToken": "REQUIRED String: The reset token that was provided in the e-mail to the user.",
	"newPassword": "REQUIRED String: The new password to be applied to the user's account."
}
```

## Routes
### GET /users
Used to list or search for users. This function is more robust for administrators, but regular users can
use it to locate friends in the system for making friend requests.

#### Query Parameters
* **query** - A username or e-mail address to search for.
* **count** - Maximum number of records to return. (The default is 500.)
* **sortBy** - The field on which to sort the results. Currently the only value supported is `username`.
* **sortOrder** - The order in which results are returned. Must be `asc` or `desc`. (The default is `asc`.)
* **lastSeen** - Used for querying the next "page" of search results. This should be set to the last
username returned in the previous query and the search will return a new set of results following that
record in the desired sort order.

**NOTES** For administrators, all query parameters are optional. For regular users only **query** is
allowed - and it is *required*! That is, regular users can only use this route for finding exact matches
on usernames or e-mail addresses. This is useful for generating friend requests.

For privacy reasons, if regular users query a username rather than an e-mail addresses, the e-mail address
will not be returned in the results if there is a match.

#### Responses
HTTP Status Code | Details
---- | ----
**200 OK** | The call succeeded and the response body will contain an array of [UserResult](#userresult-object) Objects. See the notes for which fields will be available to administrators vs. regular users.
**400 Bad Request** | The call failed because the query string was malformed, contained unexpected fields, or, in the case of regular users, was missing the **query** field.
**401 Not Authorized** | The call failed because the current user is unauthenticated. Only authenticated users may call this route.
**500 Server Error** | An internal error occurred while attempting to retrieve the profile information from the database. An [Error](General.md#error-object) Object will be returned in the response body with more details.

### PUT /users/:username
Creates a new user account. Certain actions are not permitted, however. These
requests will fail with a `403 Forbidden` HTTP error.

* Anonymous users may only create accounts with the role of `user`.
* Only administrators are permitted to create accounts with higher privilege levels.
* Authenticated users (other than administrators) cannot create additional accounts. They must logout and
create a new account.

#### Route Parameters
* **username** - A valid [username](#usernames) that will identify the user account once it is created.

#### Message Body
The message body must contain a valid [NewUserAccount](#newuseraccount-object) object describing the new account.

#### Responses
HTTP Status Code | Details
----- | -----
**201 Created** | The call succeeded and the new user account has been created. A [UserAccount](Authentication.md#useraccount-object) object will be returned containing information on the user that was signed in. For anonymous users who have just created themselves a new account, a session cookie will also be returned. This session cookie should be provided in future requests to continue using the site as the new user.
**400 Bad Request** | The request was rejected because the request body was empty or the [NewUserAccount](#newuseraccount-object) object was invalid, or because the username route parameter was not valid.
**403 Forbidden** | This is returned if the action being taken is not allowed. See above for details.
**409 Conflict** | A Conflict error is returned if either the requested username or e-mail address is already taken by another user. Check the `field` property of the [Error](General.md#error-object) to see which one is problematic. It will be set to one of `email` or `username`.
**500 Server Error** | The request could not be completed because something went wrong on the server-side.

### POST /users/:username/completeRegistration
For user accounts that were created as a result of signing in using a third party authentication service,
this API allows the completion of the registration process. This API is only allowed for user accounts that
still have the `isRegistrationIncomplete` flag set to `true`. Attempts to use it with other user accounts
will result in a *403 Forbidden* response.

#### Route Parameters
* **username** - The temporary username assigned to the account for which registration needs to be
completed.

#### Message Body
The message body must be contain a valid [CompleteRegistration](#completeregistration-object) object to
finalise the account registration.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the new user account has been created. A [UserAccount](Authentication.md#useraccount-object) object will be returned containing the newly updated user account information. The account can now be used normally on other APIs.
**400 Bad Request** | The request was rejected because the request body was empty or the [CompleteRegistration](#completeregistration-object) object was invalid.
**403 Forbidden** | This is returned if the action being taken is not allowed. The user must be authenticated and signed in as the user whose account registration is being completed. Additionally, this operation will not be permitted if the account's `isRegistrationIncomplete` flag is already set to `false`.
**404 Not Found** | This is returned if the user indicated in the `username` route parameter cannot be found.
**409 Conflict** | A Conflict error is returned if either the requested username or e-mail address is already taken by another user. Check the `field` property of the [Error](General.md#error-object) to see which one is problematic. It will be set to one of `email` or `username`.
**500 Server Error** | The request could not be completed because something went wrong on the server-side.

### GET /users/:username/profile
Retrieves the user profile information for the specified user.

#### Route Parameters
* **username** - A valid [username](#usernames) that will identify the user for which profile information
will be returned.

#### Responses
HTTP Status Code | Details
----- | -----
**200 OK** | The request succeeded and the profile information was returned. The response body will contain a [UserProfile](#userprofile-object) Object containing the profile information.
**403 Forbidden** | The request was rejected because the current user is not authorized to view the requested user profile. An [Error](General.md#error-object) Object will be returned in the response body.
**404 Not Found** | A user with the username specified in the **username** route parameter does not exist and so no profile could be found. An [Error](General.md#error-object) Object will be returned in the response body.
**500 Server Error** | An internal error occurred while attempting to retrieve the profile information from the database. An [Error](General.md#error-object) Object will be returned in the response body with more details.

### POST /users/:username/changePassword
Changes a user's password. Users may change their own passwords. Admins can change the password for any
user account.

#### Route Parameters
* **username** - The username identifying the account for which the password will be changed.

#### Message Body
A [ChangePassword](#changepassword-object) object containing the user's current password as well as the
desired new password. Admins may change the password of any user. Admins are not required to provide the
`oldPassword` parameter in the message body. Regular users changing their own password must supply their
correct current password as the `oldPassword` parameter.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The request succeeded and the password was successfully changed.
**400 Bad Request** | The request was rejected because there was a problem validating the message body. It may have been malformed or the new password may not have met strength requirements.
**403 Forbidden** | The request was rejected because the current user is not authorized to change the password for the user account indicated in the `username` route parameter. It can also occur if the `oldPassword` supplied in the message body was incorrect. An [Error](General.md#error-object) Object will be returned in the response body.
**404 Not Found** | A user with the username specified in the **username** route parameter does not exist and so no user account could be found. An [Error](General.md#error-object) Object will be returned in the response body.
**500 Server Error** | An internal error occurred while attempting to read or write the profile information to/from the database. An [Error](General.md#error-object) Object will be returned in the response body with more details.

### POST /users/:username/resetPassword
Requests that a forgotten password be reset. This API call does not require an active session. A
confirmation token will be sent by e-mail to the account owner's email address. The token must be posted
to `POST /users/:username/confirmPasswordReset` within 24 hours to complete the password reset.

#### Route Parameters
* **username** - The username identifying the account for which the password reset will be requested.

#### Message Body
The message body should be empty.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The request was received and processed. If the `username` route parameter refers to a valid user account then a reset token will be emailed to the user's e-mail address.
**500 Server Error** | An internal error occurred while attempting to create the reset token or send the email. An [Error](General.md#error-object) Object will be returned in the response body with more details.

### POST /users/:username/confirmResetPassword
Changes a user's password after a reset password request has been made. A call to
`POST /users/:username/resetPassword` must be made before-hand to receive the reset token necessary to
make this call.

#### Route Parameters
* **username** - The username identifying the account for which the password will be reset.

#### Message Body
The message body must contain a [ConfirmPasswordReset](#confirmpasswordreset-object) object.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The request succeeded and the password was successfully changed.
**400 Bad Request** | The request was rejected because there was a problem validating the message body. It may have been malformed or the new password may have not met strength requirements.
**403 Forbidden** | The request was rejected for security reasons. The reset token may be invalid or expired, or the indicated user account may not exist.
**500 Server Error** | An internal error occurred while attempting to read or write the profile information to/from the database. An [Error](General.md#error-object) Object will be returned in the response body with more details.

### PATCH /users/:username/profile
Updates a user's profile information.

#### Route Parameters
* **username** - A valid [username](#usernames) that will identify the user for which profile information
will be updated.

#### Message Body
The message body must contain a valid [UserProfile](#userprofile-object) object containing the new profile
information. Fields that are set to `null` will be cleared (their values will be removed.) Fields that are
omitted will be left unchanged.

The `memberSince`, `divesLogged`, and `bottomTimeLogged` fields are computed fields and are considered read-only. Their values
may be included in the **UserProfile** object but will be ignored.

The `logsVisibility`, `distanceUnit`, `weightUnit`, `pressureUnit`, `temperatureUnit`, and `uiComplexity` fields are
considered *required* fields and cannot be cleared. That is, a 400 error will be returned if any of them
are set to `null`.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The request succeeded and the profile information was updated. The response body will be empty.
**400 Bad Request** | The request was rejected because there was a problem validating the message body. An [Error](General.md#error-object) Object will be returned in the response body with more details.
**403 Forbidden** | The request was rejected because the current user is not authorized to update the requested user profile. An [Error](General.md#error-object) Object will be returned in the response body.
**404 Not Found** | A user with the username specified in the **username** route parameter does not exist and so no profile could be found. An [Error](General.md#error-object) Object will be returned in the response body.
**500 Server Error** | An internal error occurred while attempting to read or write the profile information to/from the database. An [Error](General.md#error-object) Object will be returned in the response body with more details.
