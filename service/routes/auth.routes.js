import {
	AuthenticateUser,
	CheckForEmailConflict,
	GetCurrentUser,
	Login,
	Logout,
	RedirectToHome
} from '../controllers/auth.controller';
import passport from 'passport';

module.exports = app => {
	app.get('/auth/me', GetCurrentUser);

	app.post('/auth/login', AuthenticateUser, Login);
	app.post('/auth/logout', Logout);

	app.get('/auth/google', passport.authenticate('google', { scope: [ 'email' ] }));
	app.get(
		'/auth/google/callback',
		passport.authenticate('google'),
		CheckForEmailConflict,
		RedirectToHome
	);
};
