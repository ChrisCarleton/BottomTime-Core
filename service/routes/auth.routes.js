import {
	AuthenticateUser,
	GetCurrentUser,
	Login,
	Logout,
	ResetPassword
} from '../controllers/auth.controller';
import passport from 'passport';

function setSsoProvider(provider) {
	return (req, res, next) => {
		req.authProvider = provider;
		next();
	};
}

function redirectToHome(req, res) {
	res.redirect('/');
}

module.exports = app => {
	app.get('/auth/me', GetCurrentUser);

	app.post('/auth/login', AuthenticateUser, Login);
	app.post('/auth/logout', Logout);
	app.post('/auth/resetPassword', ResetPassword);

	app.get('/auth/github', passport.authenticate('github', { scope: [ 'read:user' ] }));
	app.get(
		'/auth/github/callback',
		setSsoProvider('github'),
		passport.authenticate('github'),
		redirectToHome
	);

	app.get('/auth/google', passport.authenticate('google', { scope: [ 'email' ] }));
	app.get(
		'/auth/google/callback',
		setSsoProvider('google'),
		passport.authenticate('google'),
		redirectToHome
	);

	app.get('/auth/discord', passport.authenticate('discord', { scope: [ 'identify', 'email' ] }));
	app.get(
		'/auth/discord/callback',
		setSsoProvider('discord'),
		passport.authenticate('discord'),
		redirectToHome
	);
};
