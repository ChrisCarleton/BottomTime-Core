[Back to table of contents](API.md)

# Users and Profiles
The User and Profile domains are for managing user accounts and profiles repsectively.

## Usernames
Usernames are used to uniquely identify users in the system. They conform to several rules.
* They must be at least 5 characters long.
* They may be no longer than 50 characters.
* They may contain only letters, numbers, dashes (`-`), dots (`.`), and underscores (`_`).
* They must be unique on the system. No two users can have the same username.

## Classes
### UserAccount Object
```json
{
	"email": "REQUIRED String: A valid e-mail address.",
	"password": "REQUIRED String: A password to assign to the user account.",
	"role": "REQUIRED String: Must be one of 'user' or 'admin'."
}
```

#### Notes
E-mail addresses must be unique per user account. No two accounts can have the same e-mail address.

Role must be one of `user` or `admin`. However, only administrators can create other `admin` accounts. If
unauthenticated users try this the request will be rejected.

Passwords must meet several strength requirements. All passwords must:
* Be at least 7 characters long.
* Be no more than 50 characters long.
* Contain both upper- and lower-case letters.
* Contain a digit (0-9.)
* Contain a special character. One of `!@#$%^&*.`.

### UserProfile Object
```json
{
	"memberSince": "String (ISO Date): The date and time at which the user profile was created.",
	"privacy": "One of 'private', 'friends-only', or 'public'. Indicates how visible the user's profile and logs are.",
	"firstName": "String: The user's first name.",
	"lastName": "String: The user's last name.",
	"location": "String: Where the user is geographically located.",
	"occupation": "String: The user's occupation.",
	"gender": "One of 'male', or 'female'.",
	"birthdate": "String: A string representation of the user's birthdate in this format: YYYY-MM-DD",
	"typeOfDiver": "String: Free-form string describing the type of diver the user is.",
	"startedDiving": "Number: The four-digit year in which the user began their diving career.",
	"certificationLevel": "String: The user's certification level (OW, Advanced, Rescue, etc.)",
	"certificationAgencies": "String: A list of agencies the user has trained with (PADI, SSI, NAUI, etc.)",
	"specialties": "String: A list of specialty certifications the user has earned.",
	"about": "String: A free-form paragraph allowing the user to describe their diving background.",
	"divesLogged": "Number: The number of dives the user has logged in the application.",
	"bottomTimeLogged": "Number: The total bottom time (in minutes) that the user has logged in the application."
}
```

The **privacy** field is important to note. It affects who can view the user's profile information and log
book. Here are the rules:
* Public profiles and log books can be viewed by everyone - including anonymous (unauthenticated) users
to the site!
* Friends-only profiles and log books can only be viewed by anyone the user has 'friended'.
* Private profiles and log books can only be viewed by their owner.
* Only the owner of a user profile or log book can modify it, regardless of privacy settings.
* Admins (user.role === 'admin') can view and modify *all* profiles and log books, regardless of the privacy
setting.

## Routes
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
The message body must contain a valid [UserAccount](#useraccount-object) object describing the new account.

#### Responses
HTTP Status Code | Details
----- | -----
**201 Created** | The call succeeded and the new user account has been created. If the user is not authenticated then a session will be created and a cookie will be returned, effectively, signing the user in under their new account.
**400 Bad Request** | The request was rejected because the request body was empty or the [UserAccount](#useraccount-object) object was invalid, or because the username route parameter was not valid.
**403 Forbidden** | This is returned if the action being taken is not allowed. See above for details.
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

### PUT /users/:username/profile
Updates a user's profile information.

#### Route Parameters
* **username** - A valid [username](#usernames) that will identify the user for which profile information
will be updated.

#### Message Body
The message body must contain a valid [UserProfile](#userprofile-object) object containing the new profile
information. Fields that are omitted will be cleared (their values will be removed.) A **PATCH** route would
be ideal here but it does not exist yet.

The **memberSince**, **divesLogged**, and **bottomTimeLogged** fields are considered read-only. Their values
may be included in the **UserProfile** object but their values will be ignored.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The request succeeded and the profile information was updated. The response body will be empty.
**403 Forbidden** | The request was rejected because the current user is not authorized to update the requested user profile. An [Error](General.md#error-object) Object will be returned in the response body.
**404 Not Found** | A user with the username specified in the **username** route parameter does not exist and so no profile could be found. An [Error](General.md#error-object) Object will be returned in the response body.
**500 Server Error** | An internal error occurred while attempting to read or write the profile information to/from the database. An [Error](General.md#error-object) Object will be returned in the response body with more details.
