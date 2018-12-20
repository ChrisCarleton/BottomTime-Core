[Back to table of contents](API.md)

# General APIs
This section documents global classes common to multiple domains as well as general, one-off API routes.

## Classes
### Error Object
The error object is returned by many APIs when there is a problem. Its properties can be used to
troubleshoot the problem.

```json
{
	"errorId": "String: Uniquely identifies the type of error that has occured.",
	"status": "Integer: The HTTP status code returned with the error.",
	"message": "String: A brief message indicating what happened.",
	"details": "String|Object: A more detailed explanation of the problem.",
	"logId": "OPTIONAL String: A unique ID that can be used to find specific information in the system logs.",
	"field": "OPTIONAL String: Used for 409 Conflict errors. See below."
}
```

`logId` is provided in the case of server errors (HTTP 5xx). A log entry in the application's system log
will have a corresponding logID field that matches this value. This is to allow administrators to quickly
look up the details of an error, without reporting those potentially sensitive details to be returned to the
API caller.

For Conflict errors (e.g. username already taken) the `field` property will indicate what is in conflict.

### ComponentHealthStatus Object
```json
{
	"name": "String: Name of the application component or dependency.",
	"health": "String: healthy|warn|unhealthy",
	"details": "String: Details of the current status of the component."
}
```

If the health is `healthy` then the component is functioning properly. If the health status is `warn` then
something is not quite right but the system can continue functioning anyways. Finally, if the status is
`unhealthy` then the component is not functioning or responding properly and the application will be
impacted - possibly disabled.

### HealthStatus Object
```json
{
	"status": "String: healthy|warn|unhealthy",
	"components": [
		// Array of ComponentHealthStatus objects
	]
}
```

The `status` property will match the lowest health status found in all of the components.

### Version Object
```json
{
	"appVersion": "String: Version number for the application.",
	"apiVersion": "String Version number for the supported API specification."
}
```

## Routes
### GET /
Returns a [Version](#version-object) representing the current application and API versions. The HTTP
response code will be a 200 OK.

### GET /health
Gets the health of the application node. This route is mainly used to provide a pass/fail report on the
node's health to AWS so that unhealthy nodes can be killed off by the load balancer, however, the output of
the route can be used to diagnose problems.

#### Responses
HTTP Status Code | Details
- | -
**200 OK** | The node is healthy. The response body will be a [HealthStatus](#healthstatus-object) object which can be parsed for the health of the individual components. Some components may be in a `warn` state. This could mean that some part of the system is experiencing non-critical difficulties at the moment.
**500 Server Error** | The node is unhealthy. One ore more components are in the `unhealthy` state. The response body will be a [HealthStatus](#healthstatus-object) object which can be used to determine which component of the system is currently failing.
