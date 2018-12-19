import { App } from '../../service/server';
import { ErrorIds } from '../../service/utils/error-response';
import { expect, request } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import sinon from 'sinon';
import User, { cleanUpUser } from '../../service/data/user';

describe('Auth Controller', () => {

	let stub;

	afterEach(done => {
		if (stub) {
			stub.restore();
			stub = null;
		}

		User.deleteMany({}, done);
	});

	describe('POST /auth/login', () => {
		it('Authenticates a user when username and password are correct', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const user = new User(fake);
	
			user.save()
				.then(() => {
					return request(App)
						.post('/auth/login')
						.send({
							username: fake.username,
							password: password
						});
				})
				.then(res => {
					expect(res.status).to.equal(204);
					done();
				})
				.catch(done);
		});
	
		it('Fails when user cannot be found', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
	
			request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password: password
				})
				.then(res => {
					expect(res.status).to.equal(401);
					expect(res.body.status).to.equal(401);
					expect(res.body.errorId).to.equal(ErrorIds.notAuthorized);
					done();
				})
				.catch(done);
		});
	
		it('Fails when password is incorrect', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const user = new User(fake);
	
			user.save()
				.then(() => {
					return request(App)
						.post('/auth/login')
						.send({
							username: fake.username,
							password: 'Wr0ng.P@ss3rd'
						});
				})
				.then(res => {
					expect(res.status).to.equal(401);
					expect(res.body.status).to.equal(401);
					expect(res.body.errorId).to.equal(ErrorIds.notAuthorized);
					done();
				})
				.catch(done);
		});
	
		it('Returns Bad Request if validation fails', done => {
			request(App)
				.post('/auth/login')
				.send({
					user: 'wat?',
					password: 53,
					lol: 'not valid'
				})
				.then(res => {
					expect(res.status).to.equal(400);
					expect(res.body.status).to.equal(400);
					expect(res.body.errorId).to.equal(ErrorIds.badRequest);
					done();
				})
				.catch(done);
		});
	
		it('Returns Server Error if something goes wrong in the database', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);

			stub = sinon.stub(User, 'findOne');
			stub.rejects('nope');
	
			request(App)
				.post('/auth/login')
				.send({
					username: fake.username,
					password: password
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
	});

	describe('GET /auth/me', () => {
		it('Returns anonymous user information if user is not authenticated', done => {
			request(App)
				.get('/auth/me')
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(cleanUpUser(null));
					done();
				})
				.catch(done);
		});

		it('Returns user information for authenticated users', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const agent = request.agent(App);
			let user = new User(fake);
	
			user.save()
				.then(entity => {
					user = entity;
					return agent
						.post('/auth/login')
						.send({
							username: fake.username,
							password: password
						});
				})
				.then(res => {
					expect(res.status).to.equal(204);
					return agent.get('/auth/me');
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(cleanUpUser(user));
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});

		it('Returns Server Error if there is a problem accessing the database', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const agent = request.agent(App);
			let user = new User(fake);
	
			user.save()
				.then(entity => {
					user = entity;
					return agent
						.post('/auth/login')
						.send({
							username: fake.username,
							password: password
						});
				})
				.then(res => {
					expect(res.status).to.equal(204);

					stub = sinon.stub(User, 'findOne');
					stub.rejects('nope');

					return agent.get('/auth/me');
				})
				.then(res => {
					expect(res.status).to.equal(500);
					// expect(res.body.status).to.equal(500);
					// expect(res.body.logId).to.exist;
					// expect(res.body.errorId).to.equal(ErrorIds.serverError);
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});
	});
	
	describe('POST /logout', () => {
		it('Kills an existing session', done => {
			const password = faker.internet.password(12, false);
			const fake = fakeUser(password);
			const agent = request.agent(App);
			const user = new User(fake);
	
			user.save()
				.then(() => {
					return agent
						.post('/auth/login')
						.send({
							username: fake.username,
							password: password
						});
				})
				.then(res => {
					expect(res.status).to.equal(204);
					return agent.post('/auth/logout');
				})
				.then(res => {
					expect(res.status).to.equal(204);
					return agent.get('/auth/me');
				})
				.then(res => {
					expect(res.status).to.equal(200);
					expect(res.body).to.eql(cleanUpUser(null));
					done();
				})
				.catch(done)
				.finally(() => {
					agent.close();
				});
		});
	
		it('Does nothing if there is no session', done => {
			request(App)
				.post('/auth/logout')
				.then(res => {
					expect(res.status).to.equal(204);
					done();
				})
				.catch(done);
		});
	});
	
});
