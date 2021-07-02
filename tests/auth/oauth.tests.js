import _ from 'lodash';
import { EmailTakenError, SsoError } from '../../service/utils/errors';
import { expect } from 'chai';
import fakeUser from '../util/fake-user';
import moment from 'moment';
import { SignInWithDiscord, SignInWithGithub, SignInWithGoogle } from '../../service/auth';
import sinon from 'sinon';
import User from '../../service/data/user';

function getProfileEmail(profile, path) {
	return _.at(profile, path)[0];
}

function removeProfileEmail(profile, path) {
	return _.omit(profile, path);
}

[
	{
		name: 'Google',
		profile: require('./google-profile.json'),
		idField: 'googleId',
		handler: SignInWithGoogle,
		emailPath: 'emails[0].value'
	},
	{
		name: 'Discord',
		profile: require('./discord-profile.json'),
		idField: 'discordId',
		handler: SignInWithDiscord,
		emailPath: 'email'
	},
	{
		name: 'Github',
		profile: require('./github-profile.json'),
		idField: 'githubId',
		handler: SignInWithGithub,
		emailPath: '_json.email'
	}
].forEach(provider => {
	describe(`Sign-In With ${ provider.name }`, () => {
		let profile = null;

		before(async () => {
			await User.deleteMany({});
		});

		beforeEach(() => {
			profile = Object.assign({}, provider.profile);
		});

		afterEach(async () => {
			await User.deleteMany({});
		});

		it('Will sign in an existing user', async () => {
			const userData = fakeUser();
			userData[provider.idField] = profile.id;
			const user = new User(userData);
			const spy = sinon.spy();

			await user.save();
			await provider.handler(null, null, profile, spy);
			expect(spy.calledOnce).to.be.true;

			const [ error, account ] = spy.firstCall.args;
			expect(error).to.not.exist;
			expect(account.toJSON()).to.eql(user.toJSON());
		});

		it('Will create a user if an existing provider Id does not exist', async () => {
			const spy = sinon.spy();

			await provider.handler(null, null, profile, spy);
			expect(spy.calledOnce).to.be.true;

			const [ error, account ] = spy.firstCall.args;
			expect(error).to.not.exist;

			const expectedUser = {
				createdAt: moment(account.createdAt).toISOString(),
				email: getProfileEmail(profile, provider.emailPath),
				hasPassword: false,
				isAnonymous: false,
				isLockedOut: false,
				isRegistrationIncomplete: true,
				role: 'user',
				username: account.username,
				distanceUnit: 'm',
				temperatureUnit: 'c',
				pressureUnit: 'bar',
				weightUnit: 'kg',
				uiComplexity: 'basic'
			};
			expect(account.getAccountJSON()).to.eql(expectedUser);
			expect(account.username).to.match(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
		});

		it('Will indicate if the e-mail address is already taken', async () => {
			const email = getProfileEmail(profile, provider.emailPath);
			const user = new User({
				...fakeUser(),
				email,
				emailLower: email.toLowerCase()
			});
			const spy = sinon.spy();

			await user.save();
			await provider.handler(null, null, profile, spy);
			expect(spy.calledOnce).to.be.true;

			const [ error, account ] = spy.firstCall.args;
			expect(error).to.be.an.instanceOf(EmailTakenError);
			expect(account).to.not.exist;
		});

		it('Will create an account even if the e-mail address is missing', async () => {
			const spy = sinon.spy();

			profile = removeProfileEmail(profile, provider.emailPath);
			await provider.handler(null, null, profile, spy);
			expect(spy.calledOnce).to.be.true;

			const [ error, account ] = spy.firstCall.args;
			expect(error).to.not.exist;

			const expectedUser = {
				createdAt: moment(account.createdAt).toISOString(),
				hasPassword: false,
				isAnonymous: false,
				isLockedOut: false,
				isRegistrationIncomplete: true,
				role: 'user',
				username: account.username,
				distanceUnit: 'm',
				temperatureUnit: 'c',
				pressureUnit: 'bar',
				weightUnit: 'kg',
				uiComplexity: 'basic'
			};
			expect(account.getAccountJSON()).to.eql(expectedUser);
			expect(account.username).to.match(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
		});

		it('Will fail gracefully if there is a server error', async () => {
			const error = new Error('Nope!');
			const spy = sinon.spy();
			const stub = sinon.stub(User.prototype, 'save');
			stub.rejects(error);

			try {
				await provider.handler(null, null, profile, spy);
				const [ err, account ] = spy.firstCall.args;
				expect(err).to.be.an.instanceOf(SsoError);
				expect(err.internalError).to.eql(error);
				expect(account).to.not.exist;
			} finally {
				stub.restore();
			}
		});
	});
});
