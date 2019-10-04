import bcrypt from 'bcrypt';
import config from './config';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import log from './logger';
import moment from 'moment';
import passport from 'passport';
import url from 'url';
import User from './data/user';
import uuid from 'uuid/v4';

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

export async function SignInWithGoogle(accessToken, refreshToken, profile, cb) {
	try {
		let user = await User.findOne({ googleId: profile.id });
		if (user) {
			return cb(null, user);
		}

		user = await User.findByEmail(profile.emails[0].value);
		if (user) {
			return cb(null, 'email-taken');
		}

		const username = uuid();
		user = {
			username,
			usernameLower: username,
			email: profile.emails[0].value,
			emailLower: profile.emails[0].value.toLowerCase(),
			createdAt: moment().utc().toDate(),
			googleId: profile.id,
			isRegistrationIncomplete: true
		};

		user = new User(user);
		await user.save();

		log.info('Created new user account based on Google Sign In:', user.username);
		return cb(null, user);
	} catch (err) {
		log.error('An error occurred while attempting a Google authentication', err);
		return cb(err);
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

passport.serializeUser((user, done) => {
	done(null, user.username);
});

passport.deserializeUser(async (username, done) => {
	try {
		const user = await User.findByUsername(username);
		return done(null, user);
	} catch (err) {
		return done(err);
	}
});

export default app => {
	app.use(passport.initialize());
	app.use(passport.session());
};
