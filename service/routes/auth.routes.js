import {
	AuthenticateUser,
	GetCurrentUser,
	Login,
	Logout
} from '../controllers/auth.controller';
import passport from 'passport';

module.exports = app => {
	app.get('/auth/me', GetCurrentUser);

	app.post('/auth/login', AuthenticateUser, Login);
	app.post('/auth/logout', Logout);

	app.get('/auth/google', passport.authenticate('google', { scope: [ 'email' ] }));
	app.get(
		'/auth/google/callback',
		(req, res, next) => {
			req.authProvider = 'google';
			next();
		},
		passport.authenticate('google'),
		(req, res) => res.redirect('/')
	);
};
