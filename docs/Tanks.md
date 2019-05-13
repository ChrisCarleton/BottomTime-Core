[Back to table of contents](API.md)

# Tanks API
These are APIs for managing a user's custom tank profiles. This allows users to save info like size,
working pressure, and material on their tanks so they can quickly recall this data when filling in their
logs.

## Classes
### TankInfo Object
Describes a tank profile. These are useful for saving information on users' favourite tanks so that it can
be recalled when filling in log entries.

```json
{
	"tankId": "String: Unique ID that identifies the tank profile.",
	"name": "REQUIRED: String: Name that uniquely identifies the tank.",
	"size": "Number: Capacity in Litres.",
	"workingPressure": "Number: The tank's rated working pressure in bar.",
	"material": "String: Whether the tank is aluminum or steel. Valid values are 'al' and 'fe'.",
	"isCustom": "Boolean: Indicates whether this tank was customised by the user or is one of the system defaults."
}
```

## Routes
### GET /tanks
Lists the tank profiles saved for the user. The list will include both the user's custom profiles and the
system default profiles (if not overridden).

#### Responses
HTTP Status Code | Details
---- | ----
**200 OK** | The call succeeded and the response body will contain an array of [TankInfo](#tankinfo-object) objects.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### POST /tanks
Creates a new tank profile for the current user to use. Users are allowed to create up to 50 custom tank
profiles.

#### Message Body
The message body must contain a [TankInfo](#tankinfo-object) object.

**Notes:**
* The `tankId` property must be omitted. A new tank profile will be saved to the database and the
newly-generated ID will be returned in the response.
* The `isCustom` property will be ignored if provided.

#### Responses
HTTP Status Code | Details
---- | ----
**200 No Content** | The call succeeded and the tank profile was successfully created. The response body will contain the original [TankInfo](#tankinfo-object) object with the `tankId` property set to the newly-generated tank ID.
**400 Bad Request** | The call failed because the validation of the tank profile failed.
**401 Unauthorized** | The call failed because the user is not currently signed in.
**403 Forbidden** | The call failed because the current user has already reached the limit of 50 custom tank profiles.
**409 Conflict** | The call failed because a tank profile with the given name already exists for the current user.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### PUT /tanks/:tankId
Updates a custom tank profile.

#### Route Parameters
* **tankId** - The tank ID which indicates the tank profile to be updated.

#### Message Body
The message body must contain a [TankInfo](#tankinfo-object) object.

**Notes:**
* The `tankId` property must be omitted (it is provided as part of the request route.)
* The `isCustom` property will be ignored if provided.

#### Responses
HTTP Status Code | Details
---- | ----
**204 No Content** | The call succeeded and the tank profile was successfully updated.
**400 Bad Request** | The call failed because the validation of the tank profile failed.
**401 Unauthorized** | The call failed because the user is not currently signed in.
**404 Not Found** | The call failed because the indicated tank profile ID was not found in the database for the current user.
**409 Conflict** | The call failed because the user attempted to change the `name` property of the tank but already has another tank profile saved under that name.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### DELETE /tanks/:tankId
Deletes a custom tank profile.

#### Route Parameters
* **tankId** - The tank ID which indicates the tank profile to be deleted.

#### Responses
HTTP Status Code | Details
---- | ----
**204 No Content** | The call succeeded and the tank profile was successfully deleted.
**401 Unauthorized** | The call failed because the user is not currently signed in.
**404 Not Found** | The call failed because the indicated tank could not be found for the current user.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.
