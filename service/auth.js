import bcrypt from 'bcrypt';
import config from './config';
import { ErrorIds } from './utils/error-response';
import { ExtractJwt, Strategy as JwtStrategy } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import log, { logError } from './logger';
import moment from 'moment';
import passport from 'passport';
import randomUsername from './utils/random-username';
import sessionManager from './utils/session-manager';
import url from 'url';
import User from './data/user';

function generateServerError(err) {
	const logId = logError(err);
	return {
		errorId: ErrorIds.authError,
		logId,
		status: 500,
		message: 'A server error occurred.',
		details: 'Your request could not be completed at this time. Please try again later.'
	};
}

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
		secretOrKey: config.sessionSecret,
		passReqToCallback: true
	},
	async (req, payload, done) => {
		try {
			const user = await sessionManager.getSessionFromToken(payload);

			if (user) {
				req.sessionId = payload.sessionId;
			}

			return done(null, user);
		} catch (err) {
			return done(
				null,
				generateServerError(err)
			);
		}
	}
));

export async function SignInWithGoogle(accessToken, refreshToken, profile, cb) {
	try {
		let user = await User.findOne({ googleId: profile.id });
		if (user) {
			return cb(null, user);
		}

		let username = profile.emails[0].value.substr(0, profile.emails[0].value.indexOf('@'));

		const [ usernameTaken, emailTaken ] = await Promise.all([
			User.findByUsername(username),
			User.findByEmail(profile.emails[0].value)
		]);

		if (emailTaken) {
			return cb(null, 'email-taken');
		}

		if (usernameTaken) {
			username = randomUsername();
		}

		user = {
			username,
			usernameLower: username.toLowerCase(),
			email: profile.emails[0].value,
			emailLower: profile.emails[0].value.toLowerCase(),
			createdAt: moment().utc().toDate(),
			googleId: profile.id
		};

		if (profile.name) {
			user.firstName = profile.name.givenName;
			user.lastName = profile.name.familyName;
		}

		user = new User(user);
		await user.save();

		log.info('Created new user account based on Google Sign In:', user.username);
		return cb(null, user);
	} catch (err) {
		return cb(
			null,
			generateServerError(err)
		);
	}
}

passport.use(
	new GoogleStrategy({
		clientID: config.auth.googleClientId,
		clientSecret: config.auth.googleClientSecret,
		callbackURL: url.resolve(config.siteUrl, '/auth/google/callback')
	},
	SignInWithGoogle)
);

export default app => {
	app.use(passport.initialize());
	app.use((req, res, next) => {
		if (req.headers.authorization) {
			passport.authenticate('jwt', { session: false })(req, res, next);
		} else {
			return next();
		}
	});

	// Passport likes to do its own thing when errors occur. It does not conform to the
	// conventions of the application as documented in the API documentation.
	//
	// To avoid this, errors that occur during authentication are passed back to Passport as
	// "users" rather than errors. This additional piece of middleware captures those errors
	// and handles them properly.
	app.use((req, res, next) => {
		if (req.user && req.user.errorId) {
			return res.status(500).json(req.user);
		}

		return next();
	});
};
