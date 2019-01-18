import bcrypt from 'bcrypt';
import config from './config';
import { ErrorIds } from './utils/error-response';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import { logError } from './logger';
import passport from 'passport';
import sessionManager from './utils/session-manager';
import url from 'url';
import User from './data/user';

passport.use(new LocalStrategy(async (username, password, done) => {
	try {
		const user = await User.findByUsername(username);

		if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
			return done(null, false);
		}

		return done(null, user);
	} catch (err) {
		return done(err);
	}
}));

passport.use(new JwtStrategy(
	{
		jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
		secretOrKey: config.sessionSecret
	},
	async (payload, done) => {
		try {
			const user = await sessionManager.getSessionFromToken(payload);
			return done(null, user);
		} catch (err) {
			const logId = logError(err);
			return done({
				errorId: ErrorIds.serverError,
				logId,
				status: 500,
				message: 'A server error occurred.',
				details: 'Your request could not be completed at this time. Please try again later.'
			});
		}
	}
));

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
	app.use((req, res, next) => {
		if (req.headers.authorization) {
			passport.authenticate('jwt', { session: false })(req, res, next);
		} else {
			return next();
		}
	});
};
