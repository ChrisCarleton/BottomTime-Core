import {
	AuthenticateUser,
	Login,
	Logout,
	GetCurrentUser,
	GoogleAuth,
	GoogleCallback
} from '../controllers/auth.controller';

module.exports = app => {
	app.get('/auth/me', GetCurrentUser);

	app.post('/auth/login', AuthenticateUser, Login);
	app.post('/auth/logout', Logout);

	app.get('/auth/google', GoogleAuth);
	app.get('/auth/google/callback', GoogleCallback);
};
