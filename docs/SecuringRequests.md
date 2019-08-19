[Back to table of contents](API.md)

# Securing Requests
The application uses cookies to track user sessions. The cookies will be returned when a successful
request is made to log in (`POST /auth/login`), create a new account (`PUT /users/:username`), or
when redirected back from a successful login using a third-party auth service.

Calling applications should make use of an appropriate client/agent that can track cookies. Any call made
to the APIs that do not contain a valid and current session cookie will be treated as an anonymous request.
Anonymous users are allowed access to certain APIs (see the relevant documentation) but usually with
greatly reduced permissions.

If an API call that requires authentication returns a 401 when a cookie is supplied, then it is possible
that the session has expired. App developers should redirect the user back to the login page/screen to
re-authenticate.
