import { EmailTakenError, SignInWithGoogle } from '../../service/auth';
import { expect } from 'chai';
import ExpectedProfile from './google-profile.json';
import fakeUser from '../util/fake-user';
import moment from 'moment';
import sinon from 'sinon';
import User from '../../service/data/user';

describe('Sign-In With Google', () => {
	before(async () => {
		await User.deleteMany({});
	});

	afterEach(async () => {
		await User.deleteMany({});
	});

	it('Will sign in an existing user', async () => {
		const user = new User({
			...fakeUser(),
			googleId: ExpectedProfile.id
		});
		const spy = sinon.spy();

		await user.save();
		await SignInWithGoogle(null, null, ExpectedProfile, spy);
		expect(spy.calledOnce).to.be.true;

		const [ error, account ] = spy.firstCall.args;
		expect(error).to.not.exist;
		expect(account.toJSON()).to.eql(user.toJSON());
	});

	it('Will create a user if an existing Google Id does not exist', async () => {
		const spy = sinon.spy();

		await SignInWithGoogle(null, null, ExpectedProfile, spy);
		expect(spy.calledOnce).to.be.true;

		const [ error, account ] = spy.firstCall.args;
		expect(error).to.not.exist;

		const expectedUser = {
			createdAt: moment(account.createdAt).toISOString(),
			email: ExpectedProfile.emails[0].value,
			hasPassword: false,
			isAnonymous: false,
			isLockedOut: false,
			isRegistrationIncomplete: true,
			role: 'user',
			username: account.username,
			distanceUnit: 'm',
			temperatureUnit: 'c',
			pressureUnit: 'bar',
			weightUnit: 'kg'
		};
		expect(account.getAccountJSON()).to.eql(expectedUser);
		expect(account.username).to.match(/^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
	});

	it('Will indicate if the e-mail address is already taken', async () => {
		const user = new User({
			...fakeUser(),
			email: ExpectedProfile.emails[0].value,
			emailLower: ExpectedProfile.emails[0].value
		});
		const spy = sinon.spy();

		await user.save();
		await SignInWithGoogle(null, null, ExpectedProfile, spy);
		expect(spy.calledOnce).to.be.true;

		const [ error, account ] = spy.firstCall.args;
		expect(error).to.eql(EmailTakenError);
		expect(account).to.not.exist;
	});

	it('Will fail gracefully if there is a server error', async () => {
		const error = new Error('Nope!');
		const spy = sinon.spy();
		const stub = sinon.stub(User, 'findByEmail');
		stub.rejects(error);

		try {
			await SignInWithGoogle(null, null, ExpectedProfile, spy);
			const [ err, account ] = spy.firstCall.args;
			expect(account).to.not.exist;
			expect(err).to.eql(error);
		} finally {
			stub.restore();
		}
	});
});
