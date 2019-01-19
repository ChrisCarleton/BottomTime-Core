[Back to table of contents](API.md)

# Securing Requests
Requests are authenticated/authorized based on JWT bearer tokens that identify the user or device's
session. These tokens are returned when logging in or creating new accounts (`POST /auth/login` and
`PUT /users/:username`, respectively.)

The token will uniquely identify a user or device's session and must appear in the request header for all
API calls that require the user's authorization. The header must be formatted as follows:

```
Authorization: Bearer <token>
```

All requests that do not contain the Authorization header will be considered to be made by the **anonymous
user**. Some requests will be allowed to complete, however, permissions will be greatly reduced. See
documentation on individual APIs for more details.

Attempting to use an incorrect, non-recognized, expired, or invalidated token will result in an HTTP **401
Unauthorized** error. App developers should redirect their users to the login page or screen to
re-authenticate should this happen.
