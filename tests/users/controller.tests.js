import { App } from '../../service/server';
import bcrypt from 'bcrypt';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect } from 'chai';
import faker from 'faker';
import fakeCompleteRegistration from '../util/fake-complete-registration';
import fakeUser from '../util/fake-user';
import generateAuthHeader from '../util/generate-auth-header';
import moment from 'moment';
import mongoose from 'mongoose';
import request from 'supertest';
import sinon from 'sinon';
import User from '../../service/data/user';
import { v4 as uuid } from 'uuid';

function createNewAccountRequest() {
	const firstName = faker.name.firstName();
	const lastName = faker.name.lastName();
	return {
		username: faker.internet.userName(firstName, lastName),
		body: {
			email: faker.internet.email(firstName, lastName),
			password: faker.internet.password(18, false, null, '*@1Az'),
			role: 'user'
		}
	};
}

let stub = null;

describe('Users Controller', () => {
	let admin = null;
	let regularUser = null;

	before(async () => {
		admin = await createFakeAccount('admin');
		regularUser = await createFakeAccount();
	});

	after(async () => {
		await User.deleteMany({});
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	describe('GET /users/:username', () => {
		it('Anonymous users will receive a 401 error response', async () => {
			const { body } = await request(App).get(`/users/${ regularUser.user.username }`);
			expect(body).to.be.an.unauthorizedResponse;
		});

		it('Regular users will receive a 403 response if they try to access their own account', async () => {
			const { body } = await request(App)
				.get(`/users/${ regularUser.user.username }`)
				.set(...regularUser.authHeader);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Regular users will receive a 403 response if they try to access another user\'s account', async () => {
			const { body } = await request(App)
				.get(`/users/${ admin.user.username }`)
				.set(...regularUser.authHeader);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Regular users will receive a 403 response if they try to access a non-existent account', async () => {
			const { body } = await request(App)
				.get('/users/not_a_real_user')
				.set(...regularUser.authHeader);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Administrators will receive a 404 response if they try to access a non-existent account', async () => {
			const { body } = await request(App)
				.get('/users/not_a_real_user')
				.set(...admin.authHeader);

			expect(body).to.be.a.notFoundResponse;
		});

		it('Administrators can retrieve user account information', async () => {
			const { body } = await request(App)
				.get(`/users/${ regularUser.user.username }`)
				.set(...admin.authHeader)
				.expect(200);

			expect(body).to.eql(regularUser.user.getAccountJSON());
		});

		it('A 500 server error response is returned if something goes wrong', async () => {
			stub = sinon.stub(User, 'findByUsername').rejects('nope');
			const { body } = await request(App)
				.get(`/users/${ regularUser.user.username }`)
				.set(...admin.authHeader)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('PUT /users/:username', () => {
		it('Anonymous users can create accounts and will receive an auth token', async () => {
			const fake = createNewAccountRequest();

			const response = await request(App)
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.expect(201);
			expect(response.header['set-cookie']).to.exist;

			const user = response.body;
			expect(user.isAnonymous).to.be.false;
			expect(user.isLockedOut).to.be.false;
			expect(user.username).to.equal(fake.username);
			expect(user.email).to.equal(fake.body.email);
			expect(user.role).to.equal('user');

			const { body } = await request(App)
				.get('/auth/me')
				.set('Cookie', response.header['set-cookie'])
				.expect(200);
			expect(body.isAnonymous).to.be.false;
			expect(body.isLockedOut).to.be.false;
			expect(body.username).to.equal(fake.username);
			expect(body.email).to.equal(fake.body.email);
			expect(body.role).to.equal('user');
		});

		it('Anonymous users cannot create admin accounts', async () => {
			const fake = createNewAccountRequest();
			fake.body.role = 'admin';

			const res = await request(App)
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.expect(403);
			expect(res.status).to.equal(403);
			expect(res.body.status).to.equal(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Admins can create admin accounts', async () => {
			const fake = createNewAccountRequest();
			fake.body.role = 'admin';

			const response = await request(App)
				.put(`/users/${ fake.username }`)
				.set(...admin.authHeader)
				.send(fake.body)
				.expect(201);

			// Make sure the admin's auth cookie is not overwritten!
			expect(response.header['set-cookie']).to.not.exist;

			const { body } = response;
			expect(body.isAnonymous).to.be.false;
			expect(body.isLockedOut).to.be.false;
			expect(body.username).to.equal(fake.username);
			expect(body.email).to.equal(fake.body.email);
			expect(body.role).to.equal('admin');

			const user = await User.findByUsername(fake.username);
			expect(user).to.exist;
			expect(user.getAccountJSON()).to.eql(body);
		});

		it('Other authenticated users cannot create new accounts', async () => {
			const fake = createNewAccountRequest();

			const res = await request(App)
				.put(`/users/${ fake.username }`)
				.set(...regularUser.authHeader)
				.send(fake.body)
				.expect(403);
			expect(res.body.status).to.equal(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will return Conflict if username is taken', async () => {
			const fake = createNewAccountRequest();
			fake.username = regularUser.user.username;

			const res = await request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.expect(409);
			expect(res.body.errorId).to.equal(ErrorIds.conflict);
			expect(res.body.status).to.equal(409);
			expect(res.body.fieldName).to.equal('username');
		});

		it('Will return Conflict if email is taken', async () => {
			const fake = createNewAccountRequest();
			fake.body.email = regularUser.user.email;

			const res = await request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.expect(409);
			expect(res.body.errorId).to.equal(ErrorIds.conflict);
			expect(res.body.fieldName).to.equal('email');
			expect(res.body.status).to.equal(409);
		});

		it('Will return Bad Request if username is invalid', async () => {
			const fake = createNewAccountRequest();
			fake.username = 'Whoa! Totally not valid';

			const res = await request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.status).to.equal(400);
		});

		it('Will return Bad Request if request body is invalid', async () => {
			const fake = createNewAccountRequest();
			fake.body.notCool = true;

			const res = await request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.status).to.equal(400);
		});

		it('Will return Bad Request if request body is empty', async () => {
			const res = await request(App)
				.put(`/users/${ faker.internet.userName() }`)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
			expect(res.body.status).to.equal(400);
		});

		it('Will return Server Error if something goes wrong with the database', async () => {
			const fake = createNewAccountRequest();
			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const res = await request(App)
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.logId).to.exist;
			expect(res.body.errorId).to.equal(ErrorIds.serverError);
		});
	});

	describe('POST /users/:username/completeRegistration', () => {
		const Password = 'wow23_!!';
		const PasswordHash = bcrypt.hashSync(Password, 3);

		let registration = null;
		let tempUser = null;
		let conflictUser = null;
		let registrationAgent = null;

		beforeEach(async () => {
			registration = fakeCompleteRegistration();

			const tempEmail = faker.internet.email();
			const tempUsername = uuid();
			tempUser = {
				username: tempUsername,
				usernameLower: tempUsername,
				email: tempEmail,
				emailLower: tempEmail.toLowerCase(),
				passwordHash: PasswordHash,
				role: 'user',
				createdAt: new Date(),
				googleId: uuid(),
				isRegistrationIncomplete: true
			};
			await new User(tempUser).save();

			registrationAgent = request.agent(App);
			await registrationAgent
				.post('/auth/login')
				.send({
					username: tempUsername,
					password: Password
				})
				.expect(200);
		});

		afterEach(async () => {
			if (tempUser) {
				await User.deleteOne({ _id: tempUser._id });
				tempUser = null;
			}

			if (conflictUser) {
				await User.deleteOne({ _id: conflictUser._id });
				conflictUser = null;
			}
		});

		it('Will complete the registration for the target account', async () => {
			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(200);

			const expectedJSON = {
				createdAt: moment(tempUser.createdAt).toISOString(),
				distanceUnit: registration.distanceUnit,
				email: registration.email,
				hasPassword: true,
				isAnonymous: false,
				isLockedOut: false,
				isRegistrationIncomplete: false,
				pressureUnit: registration.pressureUnit,
				role: 'user',
				temperatureUnit: registration.temperatureUnit,
				username: registration.username,
				weightUnit: registration.weightUnit,
				uiComplexity: registration.uiComplexity,
				firstName: registration.firstName,
				lastName: registration.lastName,
				logsVisibility: registration.logsVisibility,
				memberSince: body.memberSince
			};

			expect(body.memberSince).to.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
			expect(body).to.eql(expectedJSON);

			tempUser = await User.findByUsername(registration.username);
			expect(tempUser).to.exist;
			expect(tempUser.getFullAccountJSON()).to.eql(expectedJSON);
		});

		it('Auth token will still work after account registration has been completed', async () => {
			await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(200);

			const { body } = await registrationAgent
				.get('/auth/me')
				.expect(200);
			const expectedJSON = {
				createdAt: moment(tempUser.createdAt).toISOString(),
				distanceUnit: registration.distanceUnit,
				email: registration.email,
				hasPassword: true,
				isAnonymous: false,
				isLockedOut: false,
				isRegistrationIncomplete: false,
				pressureUnit: registration.pressureUnit,
				role: 'user',
				temperatureUnit: registration.temperatureUnit,
				uiComplexity: registration.uiComplexity,
				username: registration.username,
				weightUnit: registration.weightUnit,
				firstName: registration.firstName,
				lastName: registration.lastName,
				logsVisibility: registration.logsVisibility,
				memberSince: body.memberSince
			};
			expect(body.memberSince).to.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
			expect(body).to.eql(expectedJSON);
		});

		it('Returns 400 if message body is bad', async () => {
			registration.invalid = 'yup';
			registration.username = 'lol. Not valid';

			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Returns 400 if message body is missing', async () => {
			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Returns 401 if user is not authenticated', async () => {
			const { body } = await request(App)
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(401);

			expect(body).to.be.a.unauthorizedResponse;
		});

		it('Returns 403 if isRegistrationIncomplete is false', async () => {
			await User.updateOne(
				{ usernameLower: tempUser.usernameLower },
				{ isRegistrationIncomplete: false }
			);

			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Returns 403 if user is not authorized to complete registration', async () => {
			const { body } = await request(App)
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.set(...regularUser.authHeader)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Admins can complete registration on behalf of other users', async () => {
			const { body } = await request(App)
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.set(...admin.authHeader)
				.send(registration)
				.expect(200);

			const expectedJSON = {
				createdAt: moment(tempUser.createdAt).toISOString(),
				distanceUnit: registration.distanceUnit,
				email: registration.email,
				hasPassword: true,
				isAnonymous: false,
				isLockedOut: false,
				isRegistrationIncomplete: false,
				pressureUnit: registration.pressureUnit,
				role: 'user',
				temperatureUnit: registration.temperatureUnit,
				uiComplexity: registration.uiComplexity,
				username: registration.username,
				weightUnit: registration.weightUnit,
				firstName: registration.firstName,
				lastName: registration.lastName,
				logsVisibility: registration.logsVisibility,
				memberSince: body.memberSince
			};

			expect(body.memberSince).to.match(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
			expect(body).to.eql(expectedJSON);

			tempUser = await User.findByUsername(registration.username);
			expect(tempUser).to.exist;
			expect(tempUser.getFullAccountJSON()).to.eql(expectedJSON);
		});

		it('Returns 404 if requested user account does not exist', async () => {
			const { body } = await request(App)
				.post(`/users/${ uuid() }/completeRegistration`)
				.send(registration)
				.set(...admin.authHeader)
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Returns 409 if username is already taken', async () => {
			conflictUser = fakeUser();
			conflictUser.username = registration.username;
			conflictUser.usernameLower = registration.username.toLowerCase();
			await new User(conflictUser).save();

			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(409);

			expect(body).to.be.a.conflictResponse;
			expect(body.fieldName).to.equal('username');
		});

		it('Returns 409 if email address is already taken', async () => {
			conflictUser = fakeUser();
			conflictUser.email = registration.email;
			conflictUser.emailLower = registration.email.toLowerCase();
			await new User(conflictUser).save();

			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(409);

			expect(body).to.be.a.conflictResponse;
			expect(body.fieldName).to.equal('email');
		});

		it('Will not detect conflict if email address is already associated with temp user', async () => {
			registration.email = tempUser.email;

			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(200);

			const expectedJSON = {
				createdAt: moment(tempUser.createdAt).toISOString(),
				distanceUnit: registration.distanceUnit,
				email: registration.email,
				hasPassword: true,
				isAnonymous: false,
				isLockedOut: false,
				isRegistrationIncomplete: false,
				pressureUnit: registration.pressureUnit,
				role: 'user',
				temperatureUnit: registration.temperatureUnit,
				uiComplexity: registration.uiComplexity,
				username: registration.username,
				weightUnit: registration.weightUnit,
				firstName: registration.firstName,
				lastName: registration.lastName,
				logsVisibility: registration.logsVisibility,
				memberSince: body.memberSince
			};

			expect(body).to.eql(expectedJSON);

			tempUser = await User.findByUsername(registration.username);
			expect(tempUser).to.exist;
			expect(tempUser.getFullAccountJSON()).to.eql(expectedJSON);
		});

		it('Returns 500 if server error occurs', async () => {
			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects(new Error('nope'));

			const { body } = await registrationAgent
				.post(`/users/${ tempUser.username }/completeRegistration`)
				.send(registration)
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('POST /users/:username/changeEmail', () => {
		const newEmail = 'New_Email@ShinyServer.org';
		let account = null;

		afterEach(async () => {
			if (account) {
				await account.user.delete();
				account = null;
			}
		});

		it('Will update user\'s email address', async () => {
			account = await createFakeAccount();

			await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.set(...account.authHeader)
				.send({ newEmail })
				.expect(204);

			const result = await User.findByUsername(account.user.username);
			expect(result.email).to.equal(newEmail);
			expect(result.emailLower).to.equal(newEmail.toLowerCase());
		});

		it('Will allow admins to change other users\' emails', async () => {
			account = await createFakeAccount();

			await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.set(...admin.authHeader)
				.send({ newEmail })
				.expect(204);

			const result = await User.findByUsername(account.user.username);
			expect(result.email).to.equal(newEmail);
			expect(result.emailLower).to.equal(newEmail.toLowerCase());
		});

		it('Will act as a no-op and return 204 if user changes their password to its current value', async () => {
			account = await createFakeAccount();
			stub = sinon.stub(User.prototype, 'save');
			stub.rejects('nope');

			await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.set(...account.authHeader)
				.send({ newEmail: account.user.email.toUpperCase() })
				.expect(204);
		});

		it('Will return 400 if request is invalid', async () => {
			account = await createFakeAccount();

			const { body } = await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.set(...account.authHeader)
				.send({ lol: true })
				.expect(400);

			expect(body).to.be.a.badRequestResponse;
		});

		it('Will return 401 if user is not logged in', async () => {
			account = await createFakeAccount();

			const { body } = await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.send({ newEmail })
				.expect(401);

			expect(body).to.be.an.unauthorizedResponse;
		});

		it('Will return 403 if regular user tries to change another user\'s email', async () => {
			account = await createFakeAccount();

			const { body } = await request(App)
				.post(`/users/${ regularUser.user.username }/changeEmail`)
				.set(...account.authHeader)
				.send({ newEmail })
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will return 403 if user account is not found', async () => {
			const { body } = await request(App)
				.post('/users/nobody/changeEmail')
				.set(...admin.authHeader)
				.send({ newEmail })
				.expect(403);

			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will return 409 if the new email is already taken', async () => {
			const otherUser = new User(fakeUser());
			await otherUser.save();
			account = await createFakeAccount();

			const { body } = await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.set(...account.authHeader)
				.send({ newEmail: otherUser.email.toUpperCase() })
				.expect(409);

			expect(body).to.be.a.conflictResponse;
		});

		it('Will return 500 if there is an error accessing the database', async () => {
			account = await createFakeAccount();
			stub = sinon.stub(User.prototype, 'save');
			stub.rejects('nope');

			const { body } = await request(App)
				.post(`/users/${ account.user.username }/changeEmail`)
				.set(...account.authHeader)
				.send({ newEmail })
				.expect(500);

			expect(body).to.be.a.serverErrorResponse;
		});
	});

	describe('POST /users/:username/changePassword', () => {
		it('Will change the user\'s password', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const authHeader = await generateAuthHeader(user.username, oldPassword);
			await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.send({
					oldPassword,
					newPassword
				})
				.set(...authHeader)
				.expect(204);

			const entity = await User.findByUsername(user.username);
			expect(bcrypt.compareSync(newPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Not Authorized if user is not authenticated', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const { body } = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.send({
					oldPassword,
					newPassword
				})
				.expect(401);
			expect(body).to.be.a.unauthorizedResponse;

			const entity = await User.findByUsername(user.username);
			expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Forbidden if requested user account cannot be found', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			const { body } = await request(App)
				.post('/users/made_up_user/changePassword')
				.set(...admin.authHeader)
				.send({
					oldPassword,
					newPassword
				})
				.expect(403);
			expect(body).to.be.a.forbiddenResponse;
		});

		it('Will return Forbidden if user tries to change another user\'s password', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));

			await user.save();

			const res = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...regularUser.authHeader)
				.send({
					oldPassword,
					newPassword
				})
				.expect(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);

			const entity = await User.findByUsername(user.username);
			expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Forbidden if old password is incorrect', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const authHeader = await generateAuthHeader(user.username, oldPassword);
			const { body } = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...authHeader)
				.send({
					oldPassword: 'Wr0ng.P@ssw3rd',
					newPassword
				})
				.expect(403);
			expect(body).to.be.a.forbiddenResponse;

			const entity = await User.findByUsername(user.username);
			expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
		});

		it('Will allow admins to change other user\'s passwords without supplying an old one', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));

			await user.save();
			await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...admin.authHeader)
				.send({ newPassword })
				.expect(204);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(newPassword, entity.passwordHash)).to.be.true;
		});

		it('Old password is not required if no password is set', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1a_Z');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			await user.save();
			const authHeader = await generateAuthHeader(user.username, oldPassword);

			user.passwordHash = null;
			await user.save();

			await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...authHeader)
				.send({ newPassword })
				.expect(204);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(newPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Bad Request if new password is not strong enough', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = 'too_weak';
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const authHeader = await generateAuthHeader(user.username, oldPassword);
			const res = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...authHeader)
				.send({
					oldPassword,
					newPassword
				})
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(oldPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Bad Request if request body is malformed', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const authHeader = await generateAuthHeader(user.username, oldPassword);
			const res = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...authHeader)
				.send({
					wat: 'not-valid',
					oldPassword
				})
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(oldPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Bad Request if request body is missing', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const authHeader = await generateAuthHeader(user.username, oldPassword);
			const res = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...authHeader)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(oldPassword, entity.passwordHash)).to.be.true;
		});

		it('Will return Not Found if username is invalid', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			const res = await request(App)
				.post('/users/__#What^User/changePassword')
				.set(...admin.authHeader)
				.send({
					oldPassword,
					newPassword
				})
				.expect(404);
			expect(res.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return Server Error if a problem occurs looking up the user account from the database', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');

			await request(App)
				.post(`/users/${ regularUser.user.username }/changePassword`)
				.set(...regularUser.authHeader)
				.send({
					oldPassword,
					newPassword
				})
				.expect(500);
		});

		it('Will return Server Error if a problem occurs while writing to the database', async () => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			await user.save();

			const authHeader = await generateAuthHeader(user.username, oldPassword);
			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const res = await request(App)
				.post(`/users/${ user.username }/changePassword`)
				.set(...authHeader)
				.send({
					oldPassword,
					newPassword
				})
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.errorId).to.equal(ErrorIds.serverError);
			expect(res.body.logId).to.exist;
		});
	});

	describe('POST /users/:username/confirmResetPassword', () => {
		it('Will update the user\'s password', async () => {
			const user = new User(fakeUser());
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			user.passwordResetToken = uuid();
			user.passwordResetExpiration = moment().add(6, 'h').utc().toDate();

			await user.save();
			await request(App)
				.post(`/users/${ user.username }/confirmResetPassword`)
				.send({
					resetToken: user.passwordResetToken,
					newPassword
				})
				.expect(204);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(newPassword, entity.passwordHash)).to.be.true;
			expect(entity.passwordResetToken).to.not.exist;
			expect(entity.passwordResetExpiration).to.not.exist;
		});

		it('Will return Forbidden if reset token is not set', async () => {
			const user = new User(fakeUser());
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			await user.save();
			const res = await request(App)
				.post(`/users/${ user.username }/confirmResetPassword`)
				.send({
					resetToken: uuid(),
					newPassword
				})
				.expect(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(newPassword, entity.passwordHash)).to.be.false;
		});

		it('Will return Forbidden if reset token is expired', async () => {
			const user = new User(fakeUser());
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			user.passwordResetToken = uuid();
			user.passwordResetExpiration = moment().subtract(6, 'h').utc().toDate();

			await user.save();
			const res = await request(App)
				.post(`/users/${ user.username }/confirmResetPassword`)
				.send({
					resetToken: user.passwordResetToken,
					newPassword
				})
				.expect(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(newPassword, entity.passwordHash)).to.be.false;
		});

		it('Will return Forbidden if reset token is incorrect', async () => {
			const user = new User(fakeUser());
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			user.passwordResetToken = uuid();
			user.passwordResetExpiration = moment().add(6, 'h').utc().toDate();

			await user.save();
			const res = await request(App)
				.post(`/users/${ user.username }/confirmResetPassword`)
				.send({
					resetToken: uuid(),
					newPassword
				})
				.expect(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);

			const entity = await User.findByUsername(user.username);
			expect(await bcrypt.compare(newPassword, entity.passwordHash)).to.be.false;
		});

		it('Will return Forbidden if user account does not exist', async () => {
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const res = await request(App)
				.post('/users/NotARealUser/confirmResetPassword')
				.send({
					resetToken: uuid(),
					newPassword
				})
				.expect(403);
			expect(res.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Will return Bad Request if request body is empty', async () => {
			const user = fakeUser();
			const res = await request(App)
				.post(`/users/${ user.username }/confirmResetPassword`)
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
		});

		it('Will return Bad Request if request body is invalid', async () => {
			const res = await request(App)
				.post('/users/Jim.Coates/confirmResetPassword')
				.send({
					resetToken: uuid(),
					newPassword: 'aeg932qhq3rpgn*&Y)&Y',
					wat: 'dunno'
				})
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
		});

		it('Will return Bad Request if username is invalid', async () => {
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			const res = await request(App)
				.post('/users/$TOtally!NOTValid/confirmResetPassword')
				.send({
					resetToken: uuid(),
					newPassword
				})
				.expect(400);
			expect(res.body.errorId).to.equal(ErrorIds.badRequest);
		});

		it('Will return Server Error if there is a problem updating the database', async () => {
			const user = new User(fakeUser());
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			user.passwordResetToken = uuid();
			user.passwordResetExpiration = moment().add(6, 'h').utc().toDate();

			await user.save();

			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			const res = await request(App)
				.post(`/users/${ user.username }/confirmResetPassword`)
				.send({
					resetToken: user.passwordResetToken,
					newPassword
				})
				.expect(500);
			expect(res.body.status).to.equal(500);
			expect(res.body.errorId).to.equal(ErrorIds.serverError);
			expect(res.body.logId).to.exist;
		});
	});

	describe('POST /users/:username/[lock|unlock]', () => {
		[ true, false ].forEach(locked => {
			function lockedString() {
				return locked ? 'locked' : 'unlocked';
			}
			function route() {
				return locked ? 'lock' : 'unlock';
			}

			it(`Will toggle account locked status to ${ lockedString() }`, async () => {
				const user = new User(fakeUser());
				user.isLockedOut = !locked;
				await user.save();

				await request(App).post(`/users/${ user.username }/${ route() }`).set(...admin.authHeader).expect(204);

				const result = await User.findByUsername(user.username);
				expect(result.isLockedOut).to.equal(locked);
			});

			it(`Will be a no-op if lock status is already ${ lockedString() }`, async () => {
				const user = new User(fakeUser());
				user.isLockedOut = locked;
				await user.save();

				await request(App).post(`/users/${ user.username }/${ route() }`).set(...admin.authHeader).expect(204);

				const result = await User.findByUsername(user.username);
				expect(result.isLockedOut).to.equal(locked);
			});

			it(`Will return Unauthorized if user is not logged in when calling ${ route() }`, async () => {
				const user = new User(fakeUser());
				user.isLockedOut = !locked;
				await user.save();

				const res = await request(App).post(`/users/${ user.username }/${ route() }`).expect(401);
				expect(res.body).to.be.an.unauthorizedResponse;
			});

			it(`Will return Forbidden if user is not an administrator when calling ${ route() }`, async () => {
				const user = new User(fakeUser());
				user.isLockedOut = !locked;
				await user.save();

				const res = await request(App)
					.post(`/users/${ user.username }/${ route() }`)
					.set(...regularUser.authHeader)
					.expect(403);
				expect(res.body).to.be.a.forbiddenResponse;
			});

			it(`Will return Not Found if indicated user does not exist when calling ${ route() }`, async () => {
				const res = await request(App)
					.post(`/users/some_guy/${ route() }`)
					.set(...admin.authHeader)
					.expect(404);
				expect(res.body).to.be.a.notFoundResponse;
			});

			it(`Will return Server Error if something goes wrong when calling ${ route() }`, async () => {
				const user = new User(fakeUser());
				user.isLockedOut = !locked;
				await user.save();

				stub = sinon.stub(User.prototype, 'save').rejects('nope');

				const res = await request(App)
					.post(`/users/${ user.username }/${ route() }`)
					.set(...admin.authHeader)
					.expect(500);
				expect(res.body).to.be.a.serverErrorResponse;
			});
		});
	});
});
