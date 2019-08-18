[Back to table of contents](API.md)

# Securing Requests
The application uses cookies to track user sessions. The cookies will be returned when a successful
request is made to log in (`POST /auth/login`), create a new account (`PUT /users/:username`), or
when redirected back from a successful login using a third-party auth service.

Calling applications should make use of an appropriate client/agent that can track cookies. Any call made
to the APIs that do not contain a valid and current session cookie will be treated as an anonymous request.
Anonymous users are allowed access to certain APIs (see the relevant documentation) but usually with
greatly reduced permissions.

Attempting to make calls with an invalid or expired session cookie will result in a **401 Unauthorized**
error. App developers should redirect users back to the login page/screen.
