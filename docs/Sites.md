[Back to table of contents](API.md)

# Dive Sites APIs

## Classes
### DiveSite Object
Describes a dive site.

```json
{
	"siteId": "IGNORED String: A unique ID identifying the dive site in the database.",
	"owner": "IGNORED String: ",
	"name": "REQUIRED String: The name of the site. (Max 200 characters.)",
	"location": "String: The location, town, city, etc. where the dive site is located. (Max 100 characters.)",
	"country": "REQUIRED String: The name of the country in which the dive site is located. (Max 100 characters.)",
	"description": "String: A free-form description of the site. (Max 1000 characters.)",
	"tags": [
		"String: An array of tags to help in searching for dive sites. (E.g. deep, drift, good vis, etc.)"
	],
	"gps": {
		"longitude": "Number: Degrees in longitude. Must be between -180.0 and 180.0.",
		"latitude": "Number: Degrees in latitude. Must be between -90.0 and 90.0."
	}
}
```
**Notes:** The `siteId` and `owner` properties are ignored when creating and updating dive sites. On
creation, the site ID will be generated and the owner will be set to the user who created the site.

All dive sites are publicly visible. They are meant to be shared among users.

## Routes
### GET /diveSites
This route is for listing or searching for dive sites in the database.

#### Query Parameters
* **search** - A search term to search for in the database.
* **count** - Number of records to return.


#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain an array of [DiveSite](#divesite-object) objects.
**400 Bad Request** | The request failed because the user has reached the friend limit. An exception will be made if the friend request exists but has already been rejected. In this case it is simply re-opened.
**401 Unauthorized** | The request was rejected because the current request could not be authenticated. (Bearer token was missing or invalid.)
**403 Forbidden** | The request was rejected because the current user does not have permission to modify the indicated user's friends or the current user tried to create a friend request to themselves.
**404 Not Found** | The request failed because the user specified in the **username** route parameter does not exist or the user specified in **friendName** route parameter does not exist.
**409 Conflict** | The request was rejected because the friend request already exists.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### GET /diveSites/:siteId

### POST /diveSites

### PUT /diveSites/:siteId

### DELETE /diveSites

### DELETE /diveSites/:siteId