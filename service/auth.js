import bcrypt from 'bcrypt';
import config from './config';
import { Strategy as DiscordStrategy } from 'passport-discord';
import { EmailTakenError, SsoError } from './utils/errors';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import log from './logger';
import moment from 'moment';
import passport from 'passport';
import url from 'url';
import User from './data/user';
import { v4 as uuid } from 'uuid';

passport.use(new LocalStrategy(async (username, password, done) => {
	try {
		const user = await User.findByUsername(username);

		if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
			return done(null, false);
		}

		return done(null, user);
	} catch (err) {
		return done(new SsoError('An error occurred while trying to authenticate user', err));
	}
}));

async function oauthSignIn(profile, idField, cb) {
	try {
		let user = await User.findOne(idField);
		if (user) {
			return cb(null, user);
		}

		const email = profile.email || profile.emails[0].value;
		user = await User.findByEmail(email);
		if (user) {
			return cb(new EmailTakenError());
		}


		const username = uuid();
		user = {
			username,
			usernameLower: username,
			email,
			emailLower: email.toLowerCase(),
			createdAt: moment().utc().toDate(),
			isRegistrationIncomplete: true,
			...idField
		};

		if (profile.name) {
			user.firstName = profile.name.givenName;
			user.lastName = profile.name.familyName;
		}

		user = new User(user);
		await user.save();

		log.info('Created new user account based on single sign-on:', user.username);
		return cb(null, user);
	} catch (err) {
		return cb(
			new SsoError('Error occurred while attempting to authenticate using OAuth.', err)
		);
	}
}

export async function SignInWithGoogle(accessToken, refreshToken, profile, cb) {
	await oauthSignIn(profile, { googleId: profile.id }, cb);
}

export async function SignInWithDiscord(accessToken, refreshToken, profile, cb) {
	await oauthSignIn(profile, { discordId: profile.id }, cb);
}

passport.use(
	new GoogleStrategy({
		clientID: config.auth.googleClientId,
		clientSecret: config.auth.googleClientSecret,
		callbackURL: url.resolve(config.siteUrl, '/api/auth/google/callback')
	},
	SignInWithGoogle)
);

passport.use(
	new DiscordStrategy({
		clientID: config.auth.discordClientId,
		clientSecret: config.auth.discordClientSecret,
		callbackURL: url.resolve(config.siteUrl, '/api/auth/discord/callback'),
		scope: [ 'identify', 'email' ]
	},
	SignInWithDiscord)
);

passport.serializeUser((user, done) => {
	done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
	try {
		const user = await User.findById(id);
		return done(null, user);
	} catch (err) {
		return done(err);
	}
});

export default app => {
	app.use(passport.initialize());
	app.use(passport.session());
};
