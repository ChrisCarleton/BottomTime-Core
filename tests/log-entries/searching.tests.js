import _ from 'lodash';
import { App } from '../../service/server';
import Bluebird from 'bluebird';
import createFakeAccount from '../util/create-fake-account';
import { ErrorIds } from '../../service/utils/error-response';
import { expect, request } from 'chai';
import fakeLogEntry from '../util/fake-log-entry';
import LogEntry from '../../service/data/log-entry';
import mongoose from '../../service/data/database';
import sinon from 'sinon';
import User from '../../service/data/user';

describe('Log Entry Searching', () => {
	let friendsOnlyUser = null;
	let privateUser = null;
	let publicUser = null;
	let adminUser = null;

	before(async () => {
		publicUser = await createFakeAccount('user', 'public');
		friendsOnlyUser = await createFakeAccount('user', 'friends-only');
		privateUser = await createFakeAccount('user', 'private');
		adminUser = await createFakeAccount('admin');

		await Bluebird.all(
			_.map(new Array(500), () => new LogEntry(fakeLogEntry(friendsOnlyUser.user.id)).save())
		);
		await Bluebird.all(
			_.map(new Array(20), () => new LogEntry(fakeLogEntry(publicUser.user.id)).save())
		);
		await Bluebird.all(
			_.map(new Array(20), () => new LogEntry(fakeLogEntry(privateUser.user.id)).save())
		);
	});

	after(async () => {
		publicUser.agent.close();
		friendsOnlyUser.agent.close();
		privateUser.agent.close();
		adminUser.agent.close();

		await LogEntry.deleteMany({});
		await User.deleteMany({});
	});

	describe('Security', () => {
		it('Anonymous users can view public log books', async () => {
			const result = await request(App).get(`/users/${ publicUser.user.username }/logs`);
			expect(result.status).to.equal(200);
			expect(result.body).to.be.an('Array');
		});

		it('Anonymous users cannot view friends-only log books', async () => {
			const result = await request(App).get(`/users/${ friendsOnlyUser.user.username }/logs`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Anonymous users cannot view private log books', async () => {
			const result = await request(App).get(`/users/${ privateUser.user.username }/logs`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Users can view public log books', async () => {
			const result = await privateUser.agent.get(`/users/${ publicUser.user.username }/logs`);
			expect(result.status).to.equal(200);
			expect(result.body).to.be.an('Array');
		});

		it.skip('Users can view friends-only log books if they are friends with the owner', async () => {
			// TODO: Test once we have friends logic.
		});

		it('Users cannot view friends-only log books if they are not friends of the owner', async () => {
			const result = await privateUser.agent.get(`/users/${ friendsOnlyUser.user.username }/logs`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Users cannot view private log books', async () => {
			const result = await publicUser.agent.get(`/users/${ privateUser.user.username }/logs`);
			expect(result.status).to.equal(403);
			expect(result.body.status).to.equal(403);
			expect(result.body.errorId).to.equal(ErrorIds.forbidden);
		});

		it('Admins can view public log books', async () => {
			const result = await adminUser.agent.get(`/users/${ publicUser.user.username }/logs`);
			expect(result.status).to.equal(200);
			expect(result.body).to.be.an('Array');
		});

		it('Admins can view friends-only log books', async () => {
			const result = await adminUser.agent.get(`/users/${ friendsOnlyUser.user.username }/logs`);
			expect(result.status).to.equal(200);
			expect(result.body).to.be.an('Array');
		});

		it('Admins can view private log books', async () => {
			const result = await adminUser.agent.get(`/users/${ privateUser.user.username }/logs`);
			expect(result.status).to.equal(200);
			expect(result.body).to.be.an('Array');
		});
	});

	describe('Parameters', () => {
		let stub = null;

		afterEach(() => {
			if (stub) {
				stub.restore();
				stub = null;
			}
		});

		it('Will return an array of log entries', async () => {
			let results = await friendsOnlyUser.agent.get(`/users/${ friendsOnlyUser.user.username }/logs`);
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 0; i < results.length; i++) {
				expect(results[i]).to.have.keys(
					'entryId',
					'entryTime',
					'maxDepth',
					'location',
					'site',
					'bottomTime'
				);

				if (i > 0) {
					expect(Date.parse(results[i].entryTime))
						.to.be.at.most(Date.parse(results[i - 1].entryTime));
				}
			}
		});

		it('Will return entry times in descending order', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					sortBy: 'entryTime',
					sortOrder: 'desc'
				});
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 1; i < results.length; i++) {
				expect(Date.parse(results[i].entryTime))
					.to.be.at.most(Date.parse(results[i - 1].entryTime));
			}
		});

		it('Will return entry times in ascending order', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					sortBy: 'entryTime',
					sortOrder: 'asc'
				});
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 1; i < results.length; i++) {
				expect(Date.parse(results[i].entryTime))
					.to.be.at.least(Date.parse(results[i - 1].entryTime));
			}
		});

		it('Will return maxDepths in descending order', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					sortBy: 'maxDepth',
					sortOrder: 'desc'
				});
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 1; i < results.length; i++) {
				expect(results[i].maxDepth).to.be.at.most(results[i - 1].maxDepth);
			}
		});

		it('Will return maxDepths in ascending order', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					sortBy: 'maxDepth',
					sortOrder: 'asc'
				});
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 1; i < results.length; i++) {
				expect(results[i].maxDepth).to.be.at.least(results[i - 1].maxDepth);
			}
		});

		it('Will return bottomTime in descending order', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					sortBy: 'bottomTime',
					sortOrder: 'desc'
				});
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 1; i < results.length; i++) {
				expect(results[i].bottomTime).to.be.at.most(results[i - 1].bottomTime);
			}
		});

		it('Will return bottomTime in ascending order', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					sortBy: 'bottomTime',
					sortOrder: 'asc'
				});
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(100);

			for (let i = 1; i < results.length; i++) {
				expect(results[i].bottomTime).to.be.at.least(results[i - 1].bottomTime);
			}
		});

		it('Number of entries returned can be set', async () => {
			let results = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({ count: 50 });
			results = results.body;
			expect(results).to.be.an('Array');
			expect(results).to.have.length(50);
		});

		it('Will return an empty array if no log entries are found', async () => {
			const results = await adminUser.agent.get(`/users/${ adminUser.user.username }/logs`);
			expect(results.body).to.be.an('Array');
			expect(results.body).to.be.empty;
		});

		it('Will return Not Found if requested username does not exist', async () => {
			const result = await friendsOnlyUser.agent.get('/users/Jonny_Nonexistent/logs');

			expect(result.status).to.equal(404);
			expect(result.body.status).to.equal(404);
			expect(result.body.errorId).to.equal(ErrorIds.notFound);
		});

		it('Will return Bad Request if query string fails validation', async () => {
			const result = await friendsOnlyUser.agent
				.get(`/users/${ friendsOnlyUser.user.username }/logs`)
				.query({
					invalid: 'Yup',
					count: -5
				});

			expect(result.status).to.equal(400);
			expect(result.body.errorId).to.equal(ErrorIds.badRequest);
			expect(result.body.status).to.equal(400);
		});

		it('Will return Server Error if something goes wrong querying the database', async () => {
			stub = sinon.stub(mongoose.Query.prototype, 'exec');
			stub.rejects('Nope!');

			const result = await friendsOnlyUser.agent.get(`/users/${ friendsOnlyUser.user.username }/logs`);
			expect(result.status).to.equal(500);
			expect(result.body.status).to.equal(500);
			expect(result.body.logId).to.exist;
			expect(result.body.errorId).to.equal(ErrorIds.serverError);
		});
	});
});
