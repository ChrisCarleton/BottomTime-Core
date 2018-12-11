import {
	AuthenticateUser,
	Login,
	Logout,
	GoogleAuth,
	GoogleCallback
} from '../controllers/auth.controller';

module.exports = app => {
	app.post('/auth/login', AuthenticateUser, Login);
	app.post('/auth/logout', Logout);

	app.get('/auth/google', GoogleAuth);
	app.get('/auth/google/callback', GoogleCallback);
};
