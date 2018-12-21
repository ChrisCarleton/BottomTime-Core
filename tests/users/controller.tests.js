import { App } from '../../service/server';
import bcrypt from 'bcrypt';
import { ErrorIds } from '../../service/utils/error-response';
import { expect, request } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import mongoose from 'mongoose';
import sinon from 'sinon';
import User from '../../service/data/user';

function fakeCreateAccount() {
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

function createAccount(role = 'user') {
	const password = faker.internet.password(18, false, null, '*@1Az');
	const fake = fakeUser(password);
	fake.role = role;

	const user = new User(fake);
	const result = {
		agent: request.agent(App)
	};

	return user.save()
		.then(entity => {
			result.user = entity;
			return result.agent.post('/auth/login')
				.send({
					username: entity.username,
					password
				});
		})
		.then(() => result);
}

let stub = null;

describe('Users Controller', () => {
	let admin = null;
	let regularUser = null;

	before(done => {
		createAccount('admin')
			.then(account => {
				admin = account;
				return createAccount();
			})
			.then(user => {
				regularUser = user;
				done();
			})
			.catch(done);
	});

	after(done => {
		admin.agent.close();
		regularUser.agent.close();
		User.deleteMany({}, done);
	});

	afterEach(() => {
		if (stub) {
			stub.restore();
			stub = null;
		}
	});

	describe('PUT /users/:username', () => {
		it('Anonymous users can create accounts and will be logged in', done => {
			const agent = request.agent(App);
			const fake = fakeCreateAccount();

			agent
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(201);
					return agent.get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.false;
					expect(res.body.isLockedOut).to.be.false;
					expect(res.body.username).to.equal(fake.username);
					expect(res.body.email).to.equal(fake.body.email);
					expect(res.body.role).to.equal('user');
					done();
				})
				.catch(done)
				.finally(() => agent.close());
		});

		it('Anonymous users cannot create admin accounts', done => {
			const fake = fakeCreateAccount();
			fake.body.role = 'admin';

			request(App)
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.status).to.equal(403);
					expect(res.body.errorId).to.equal(ErrorIds.forbidden);
					done();
				})
				.catch(done);
		});

		it('Admins can create new accounts and will stay logged in as admins', done => {
			const fake = fakeCreateAccount();

			admin.agent
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(201);
					return admin.agent.get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.false;
					expect(res.body.username).to.equal(admin.user.username);
					return User.findOne({ username: fake.username });
				})
				.then(user => {
					expect(user).to.exist;
					done();
				})
				.catch(done);
		});

		it('Admins can create admin accounts', done => {
			const fake = fakeCreateAccount();
			fake.body.role = 'admin';

			admin.agent
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(201);
					return admin.agent.get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.false;
					expect(res.body.username).to.equal(admin.user.username);
					done();
				})
				.catch(done);
		});

		it('Other authenticated users cannot create new accounts', done => {
			const fake = fakeCreateAccount();

			regularUser.agent
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.status).to.equal(403);
					expect(res.body.errorId).to.equal(ErrorIds.forbidden);
					done();
				})
				.catch(done);
		});

		it('Will return Conflict if username is taken', done => {
			const fake = fakeCreateAccount();
			fake.username = regularUser.user.username;

			request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(409);
					expect(res.body.errorId).to.equal(ErrorIds.conflict);
					expect(res.body.status).to.equal(409);
					expect(res.body.fieldName).to.equal('username');
					return request(App).get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Conflict if email is taken', done => {
			const fake = fakeCreateAccount();
			fake.body.email = regularUser.user.email;

			request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(409);
					expect(res.body.errorId).to.equal(ErrorIds.conflict);
					expect(res.body.fieldName).to.equal('email');
					expect(res.body.status).to.equal(409);
					return request(App).get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if username is invalid', done => {
			const fake = fakeCreateAccount();
			fake.username = 'Whoa! Totally not valid';

			request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					expect(res.body.status).to.equal(400);
					return request(App).get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if request body is invalid', done => {
			const fake = fakeCreateAccount();
			fake.body.notCool = true;

			request(App)
				.put(`/users/${ fake.username.toUpperCase() }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					expect(res.body.status).to.equal(400);
					return request(App).get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Bad Request if request body is empty', done => {
			request(App)
				.put(`/users/${ faker.internet.userName() }`)
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					expect(res.body.status).to.equal(400);
					return request(App).get('/auth/me');
				})
				.then(res => {
					expect(res.body.isAnonymous).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if something goes wrong with the database', done => {
			const fake = fakeCreateAccount();
			stub = sinon.stub(mongoose.Model.prototype, 'save');
			stub.rejects('nope');

			request(App)
				.put(`/users/${ fake.username }`)
				.send(fake.body)
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.logId).to.exist;
					expect(res.body.errorId).to.equal(ErrorIds.serverError);
					done();
				})
				.catch(done);
		});
	});

	describe('POST /users/:username/changePassword', () => {
		it('Will change the user\'s password', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => agent
					.post('/auth/login')
					.send({
						username: user.username,
						password: oldPassword
					}))
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						oldPassword,
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(204);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(newPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Will return Forbidden if user is not authenticated', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));

			user.save()
				.then(() => request(App)
					.post(`/users/${ user.username }/changePassword`)
					.send({
						oldPassword,
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.errorId).to.equal(ErrorIds.forbidden);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Forbidden if requested user account canot be found', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));

			admin.agent
				.post(`/users/${ user.username }/changePassword`)
				.send({
					oldPassword,
					newPassword
				})
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.errorId).to.equal(ErrorIds.forbidden);
					done();
				})
				.catch(done);
		});

		it('Will return Forbidden if user tries to change another user\'s password', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));

			user.save()
				.then(() => regularUser.agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						oldPassword,
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.errorId).to.equal(ErrorIds.forbidden);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Will return Forbidden if old password is incorrect', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => agent
					.post('/auth/login')
					.send({
						username: user.username,
						password: oldPassword
					}))
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						oldPassword: 'Wr0ng.P@ssw3rd',
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(403);
					expect(res.body.errorId).to.equal(ErrorIds.forbidden);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Will allow admins to change other user\'s passwords without supplying an old one', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));

			user.save()
				.then(() => admin.agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(204);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(newPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done);
		});

		it('Old password is not required if no password is set', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => agent
					.post('/auth/login')
					.send({
						username: user.username,
						password: oldPassword
					}))
				.then(() => {
					user.passwordHash = null;
					return user.save();
				})
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(204);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(newPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Will return Bad Request if new password is not strong enough', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = 'too_weak';
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => agent
					.post('/auth/login')
					.send({
						username: user.username,
						password: oldPassword
					}))
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						oldPassword,
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Will return Bad Request if request body is malformed', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => agent
					.post('/auth/login')
					.send({
						username: user.username,
						password: oldPassword
					}))
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						wat: 'not-valid',
						oldPassword
					}))
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Will return Bad Request if request body is missing', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => agent
					.post('/auth/login')
					.send({
						username: user.username,
						password: oldPassword
					}))
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`))
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					return User.findByUsername(user.username);
				})
				.then(entity => {
					expect(bcrypt.compareSync(oldPassword, entity.passwordHash)).to.be.true;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Will return Not Found if username is invalid', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			admin.agent
				.post('/users/__#What^User/changePassword')
				.send({
					oldPassword,
					newPassword
				})
				.then(res => {
					expect(res.status).to.equal(404);
					expect(res.body.errorId).to.equal(ErrorIds.notFound);
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if a problem occurs looking up the user account from the database', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');

			stub = sinon.stub(User, 'findByUsername');
			stub.rejects('nope');

			regularUser.agent
				.post(`/users/${ regularUser.user.username }/changePassword`)
				.send({
					oldPassword,
					newPassword
				})
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.errorId).to.equal(ErrorIds.serverError);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done);
		});

		it('Will return Server Error if a problem occurs while writing to the database', done => {
			const oldPassword = faker.internet.password(18, false, null, '@1_aZ');
			const newPassword = faker.internet.password(18, false, null, '@1a_Z');
			const user = new User(fakeUser(oldPassword));
			const agent = request.agent(App);

			user.save()
				.then(() => {
					stub = sinon.stub(mongoose.Model.prototype, 'save');
					stub.rejects('nope');

					return agent
						.post('/auth/login')
						.send({
							username: user.username,
							password: oldPassword
						});
				})
				.then(() => agent
					.post(`/users/${ user.username }/changePassword`)
					.send({
						oldPassword,
						newPassword
					}))
				.then(res => {
					expect(res.status).to.equal(500);
					expect(res.body.status).to.equal(500);
					expect(res.body.errorId).to.equal(ErrorIds.serverError);
					expect(res.body.logId).to.exist;
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});
	});

});
