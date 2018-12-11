import config from './config';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import passport from 'passport';
import url from 'url';

passport.serializeUser((user, done) => {
	done(null, user.id);
});

passport.deserializeUser((id, done) => {
	done(null, null);
});

passport.use(new LocalStrategy((username, password, done) => {
	// TODO: Authenticate user.
	done(null, null);
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
