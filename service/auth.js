import bcrypt from 'bcrypt';
import config from './config';
// import { ErrorIds } from './utils/error-response';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { logError } from './logger';
import passport from 'passport';
import url from 'url';
import User from './data/user';

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	User.findById(id)
		.then(user => done(null, user))
		.catch(err => {
			/*
				TODO: I don't have a good way of making Passport return a proper standardised. 500
				error response. For now, I'm just logging the error and returning no user. The request
				will be handled downstream as if the user is not logged.

				See https://github.com/ChrisCarleton/BottomTime-Core/issues/7 for more on this issue.
			*/
			logError('Failed to deserialize user session.', err);
			// done({
			// 	errorId: ErrorIds.serverError,
			// 	logId: logId,
			// 	status: 500,
			// 	message: 'A server error occurred.',
			// 	details: 'Your request could not be completed at this time. Please try again later.'
			// });
			done(null, false);
		});
});

passport.use(new LocalStrategy((username, password, done) => {
	User.findByUsername(username)
		.then(user => {
			if (!user || !user.passwordHash || !bcrypt.compareSync(password, user.passwordHash)) {
				return done(null, false);
			}

			done(null, user);
		})
		.catch(done);
}));

passport.use(new GoogleStrategy({
	clientID: config.auth.googleClientId,
	clientSecret: config.auth.googleClientSecret,
	callbackURL: url.resolve(config.siteUrl, '/auth/google/callback')
},
(accessToken, refreshToken, profile, cb) => {
	// TODO: Handle response from Google.
	cb(null, null);
}));

export default app => {
	app.use(passport.initialize());
	app.use(passport.session());
};
