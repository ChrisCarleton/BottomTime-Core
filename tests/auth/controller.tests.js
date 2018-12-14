import { App } from '../../service/server';
import { ErrorIds } from '../../service/utils/error-response';
import { expect, request } from 'chai';
import faker from 'faker';
import fakeUser from '../util/fake-user';
import User from '../../service/data/user';

describe('Auth Controller', () => {

	describe('POST /auth/login', () => {
		afterEach(done => {
			User.deleteMany({}, done);
		});
	
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
					// TODO: Validate that a session cookie is present.
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
			done();
		});
	});
	
	describe('POST /logout', () => {
		it('Kills an existing session', done => {
			done();
		});
	
		it('Does nothing if there is no session', done => {
			done();
		});
	});
	
});
