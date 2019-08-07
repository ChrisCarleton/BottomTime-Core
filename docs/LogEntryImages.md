[Back to table of contents](API.md)

# Log Entry Images
This sub-domain allows for the management of pictures taken during a logged dive.

## Classes
### DiveLogImageInfo Object
```json
{
	"imageId": "String: A unique identifier that identifies the image.",
	"title": "String: The image title. (Max 100 characters.)",
	"description": "String: A brief description of the image (Max 500 characters.)",
	"imageUrl": "String: The URL from which the image can be downloaded.",
	"location": {
		"lat": "REQUIRED Number: Latitude at which the picture was taken.",
		"lon": "REQUIRED Number: Longitude at which the picture was taken."
	}
}
```

## Routes
### GET /users/:userName/logs/:logId/images
Lists the images associated with the dive.

#### Route Parameters
* **userName** - The username of the user to whom the log entry belongs.
* **logId** - The ID of the log entry for which images should be listed.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain an array of [DiveLogImageInfo](#divelogimageinfo-object) objects.
**401 Unauthorized** | The request was rejected because the user is not authenticated and the log book is not publicly-viewable.
**403 Forbidden** | The request was rejected because the user does not have access to view the log book.
**404 Not Found** | Either the user or the log entry specified in the route could not be found.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### POST /users/:userName/logs/:logId/images
Posts a new image to the log entry.

#### Route Parameters
* **userName** - The username of the user to whom the log entry belongs.
* **logId** - The ID of the log entry for which images should be listed.

#### Request Body
Unlike most APIs that accept a *JSON-formatted* request body, this one must be a
*multi-part form* to allow for the upload of the image file. These are the form fields that are accepted:

* **image** - REQUIRED. The image file being uploaded. Accepted formats are JPEG and PNG. Maximum size is
set using the `BT_MAX_IMAGE_FILE_SIZE` environment variable. Default is 10Mb.
* **title** - A brief title for the image. (Max 100 characters.)
* **description** - A description of the image. (Max 500 characters.)
* **timestamp** - Time at which the image was taken. Must be a in ISO date format.
* **lat** - Number. The latitude at which the picture was taken.
* **lon** - Number. The longitude at which the picture was taken.

**NOTES:** All fields other than `image` are optional. `lat` and `lon` must be provided together. If one
is missing and the other is supplied the request will fail with a 400 HTTP error.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain a [DiveLogImageInfo](#divelogimageinfo-object) object with the `imageId`, `imageUrl` and `thumbnailUrl` properties filled in.
**400 Bad Request** | The request was rejected because the request body was invalid or there was a problem with the image file.
**401 Not Authorized** | The request was rejected because the current user is not authenticated.
**403 Forbidden** | The request was rejected because the user does not own the target log book and is not an administrator.
**404 Not Found** | The request was rejected because either the user or the target log book entry could not be found.
**409 Conflict** | The request was rejected because the image already exists (or at least one with the same title/S3 key) for the given log entry.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### GET /users/:userName/logs/:logId/images/:imageId
Retrieves info on a specific image.

#### Route Parameters
* **userName** - The username of the user to whom the log entry belongs.
* **logId** - The ID of the log entry to which the image belongs.
* **imageId** - The ID of the image for which info should be retrieved.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain a [DiveLogImageInfo](#divelogimageinfo-object) object with info on the desired image.
**401 Unauthorized** | The request was rejected because the user is not authenticated and the log book is not publicly-viewable.
**403 Forbidden** | The request was rejected because the user does not have access to view the log book.
**404 Not Found** | Either the user, the log entry, or the image specified in the route could not be found.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### PUT /users/:userName/logs/:logId/images/:imageId
Updates the metadata for the specified image.

#### Route Parameters
* **userName** - The username of the user to whom the log entry belongs.
* **logId** - The ID of the log entry to which the image belongs.
* **imageId** - The ID of the image for which the metadata will be updated.

#### Request Body
The request body must contain a [DiveLogImageInfo](#divelogimageinfo-object) with the updated metadata.

#### Responses
HTTP Status Code | Details
----- | -----
**200 Ok** | The call succeeded and the response body will contain a [DiveLogImageInfo](#divelogimageinfo-object) object with the newly-updated metadata.
**400 Bad Request** | The request was rejected because the request body was invalid or empty.
**401 Unauthorized** | The request was rejected because the user is not authenticated.
**403 Forbidden** | The request was rejected because the user does not have access to modify the log book.
**404 Not Found** | Either the user, the log entry, or the image specified in the route could not be found.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### DELETE /users/:userName/logs/:logId/images/:imageId
Deletes a specific image from a log entry.

#### Route Parameters
* **userName** - The username of the user to whom the log entry belongs.
* **logId** - The ID of the log entry to which the image belongs.
* **imageId** - The ID of the image that will be deleted.

#### Responses
HTTP Status Code | Details
----- | -----
**204 No Content** | The call succeeded and the image was deleted along with its metadata.
**401 Unauthorized** | The request was rejected because the user is not authenticated.
**403 Forbidden** | The request was rejected because the user does not have access to modify the log book.
**404 Not Found** | Either the user, the log entry, or the image specified in the route could not be found.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.

### GET /users/:userName/logs/:logId/images/:imageId/image
### GET /users/:userName/logs/:logId/images/:imageId/thumbnail
These routes can be used to download the actual images and image thumbnails, respectively.

#### Route Parameters
* **userName** - The username of the user to whom the log entry belongs.
* **logId** - The ID of the log entry to which the image belongs.
* **imageId** - The ID of the image for which the image or thumbnail should be downloaded.

#### Responses
HTTP Status Code | Details
----- | -----
**302 Found** | The call succeeded and the user agent will be redirected to a signed URL that will allow access to the resource in AWS S3.
**401 Unauthorized** | The request was rejected because the user is not authenticated and the log book is not publicly-viewable.
**403 Forbidden** | The request was rejected because the user does not have access to view the log book.
**404 Not Found** | Either the user, the log entry, or the image specified in the route could not be found.
**500 Server Error** | An internal server error occurred. Log information will be provided in the [Error](General.md#error-object) object for troubleshooting.
