[Back to table of contents](API.md)

# Dive Sites APIs

## Classes
### DiveSite Object
Describes a dive site.

```json
{
	"siteId": "String: A unique ID identifying the dive site in the database.",
	"owner": "String: Username of the user who created the dive site record.",
	"name": "REQUIRED String: The name of the site. (Max 200 characters.)",
	"location": "String: The location, town, city, etc. where the dive site is located. (Max 100 characters.)",
	"country": "String: The name of the country in which the dive site is located. (Max 100 characters.)",
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
* **query** - A search term to search for in the database. This will perform a full-text search over the
`name`, `location`, `description`, and `tags` fields.
* **closeTo** - A geographical location around which dive sites should be searched. Should be specified
in the format: `[longitude,latitude]`. E.g. `[-86.94527777777778,20.5030556]` (Cozumel, Mexico.)
* **distance** - Can be used with **closeTo** to indicate how far away from the indicated location dive
sites should be searched. **distance** must be a number representing how many kilometers from the location
will be considered in the search. The default is `50`; the maximum is `1000`.
* **count** - Number of records to return. The default is `250`; the maximum is `1000`.
* **sortOrder** - The order in which results are returned. Must be `asc` or `desc`. (The default is `asc`.)
* **sortBy** - The field on which to sort the results. Currently, the only value supported is `name`.
* **lastSeen** - Used for querying the next "page" of search results. This should be set to the last
dive site ID returned in the previous query and the search will return a new set of results following that
record in the desired sort order.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain an array of [DiveSite](#divesite-object) objects.
**400 Bad Request** | The request was rejected because the query string was invalid.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### GET /diveSites/:siteId
Returns information on a specific dive site.

#### Route Parameters
* **siteId** - The unique ID of the dive site for which information will be retrieved.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain a [DiveSite](#divesite-object) object.
**404 Not Found** | The requested site ID could not be found in the database.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### POST /diveSites
Saves new dive sites to the database and indexes them for searching.

#### Message Body
The message body must be an array of [DiveSite](#divesite-object) objects. The `siteId` and `owner`
properties must be omitted from the objects as these properties are considered read-only. Up to 250
dive sites can be posted in a single request.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain the original array of [DiveSite](#divesite-object) objects with the `siteId` fields filled in.
**400 Bad Request** | The request was rejected because the message body was invalid or the limit of 250 sites was exceeded. Check the details of the error message to see, specifically, what was wrong.
**401 Not Authorized** | The request was rejected because the current user is not authenticated.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### PUT /diveSites/:siteId
Updates an existing dive site record. Only admins and the user who owns the record are allowed to to
do this.

#### Route Parameters
* **siteId** - The ID of dive site to be updated.

#### Message Body
The request body must contain a [DiveSite](#divesite-object) object. The `siteId` and `owner`
properties must be omitted from the object as these properties are considered read-only.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the indicated dive site was updated.
**400 Bad Request** | The request was rejected because the message body was invalid. Check the details of the error message to see, specifically, what was wrong.
**401 Not Authorized** | The request was rejected because the current user is not authenticated.
**403 Forbidden** | The request was rejected because the current user does not own the indicated dive site record and is not an administrator.
**404 Not Found** | The request was rejected because the indicated siteId could not be found in the database.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### DELETE /diveSites
Deletes multiple dive site records. Only admins and the user who owns the records are allowed to do this.

#### Message Body
The request body must contain an array of dive site IDs indicating which sites should be deleted.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the indicated dive sites were deleted. The call will still return a 204 response if one or more of the indicated dive site IDs could not be found.
**400 Bad Request** | The request was rejected because the request body was malformed.
**401 Not Authorized** | The request was rejected because the current user is not authenticated.
**403 Forbidden** | The request was rejected because the current user does not own the indicated dive site record and is not an administrator.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### DELETE /diveSites/:siteId
Deletes an existing dive site record. Only admins and the user who owns the record are allowed to to
do this.

#### Route Parameters
* **siteId** - The ID of dive site to be deleted.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the indicated dive site was deleted.
**401 Not Authorized** | The request was rejected because the current user is not authenticated.
**403 Forbidden** | The request was rejected because the current user does not own the indicated dive site record and is not an administrator.
**404 Not Found** | The request was rejected because the indicated siteId could not be found in the database.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.
