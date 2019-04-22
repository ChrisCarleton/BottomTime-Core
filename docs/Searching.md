[Back to table of contents](API.md)

# Searching
The searching domain is used for doing wide searches across the other domains.

## Classes
### UserResult Object
Represents a user entity returned by a search.

```json
{
	"username": "String: The username that identifies the user that was found.",
	"email": "String: The e-mail address of the user.",
	"memberSince": "String: The date and time at which the user account was created (ISO format.)"
}
```

**Notes:** For privacy reasons, the `email` field will be omitted unless it was the search term used in
the query.

## Routes
### GET /search/users

#### Query Parameters
* **query** - The username or e-mail to search for.

#### Responses
HTTP Status Code | Details
---- | ----
**200 OK** | The search completed and returned zero or more results. The response body will be an array of [UserResult](#userresult-object) Objects.
**400 Bad Request** | This response indicates that the `query` parameter was missing or invalid.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.