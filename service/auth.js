import bcrypt from 'bcrypt';
import config from './config';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import passport from 'passport';
import url from 'url';
import User from './data/user';

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	User.findById(id, done);
});

passport.use(new LocalStrategy((username, password, done) => {
	User.findOne({ usernameLower: username.toLowerCase() })
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
