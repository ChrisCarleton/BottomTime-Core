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

## Routes
### PUT /users/:username
Creates a new user account. Certain actions are not permitted, however, and will not be permitted. These
requests will fail with a `403 Forbidden` HTTP error.

* Anonymous users may only create accounts with the role of `user`. Only administrators are permitted to
create accounts with higher privilege levels.
* Authenticated users (other than administrators) cannot create additional accounts. They must logout and
create a new account.

#### Route Parameters
* **username** - A valid [username](#usernames) that will identify the user account once it is created.

#### Message Body
The message body must contain a valid [UserAccount](#useraccount-object) object describing the new account.

#### Responses
HTTP Status Code | Details
- | -
**201 Created** | The call succeeded and the new user account has been created. If the user is not authenticated then a session will be created and a cookie will be returned, effectively, signing the user in under their new account.
**400 Bad Request** | The request was rejected because the request body was empty or the [UserAccount](#useraccount-object) object was invalid, or because the username route parameter was not valid.
**403 Forbidden** | This is returned if the action being taken is not allowed. See above for details.
**409 Conflict** | A Conflict error is returned if either the requested username or e-mail address is already taken by another user. Check the `field` property of the [Error](General.md#error-object) to see which one is problematic. It will be set to one of `email` or `username`.
**500 Server Error** | The request could not be completed because something went wrong on the server-side.
