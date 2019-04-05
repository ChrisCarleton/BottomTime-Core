import { expect } from 'chai';
import faker from 'faker';
import Friend from '../service/data/friend';
import moment from 'moment';
import Session from '../service/data/session';

const dbMaintenance = require('../lambda/db-maintenance/index').handler;

describe('Lambda Function Tests', () => {
	before(async () => {
		const friends = [
			new Friend({
				user: faker.internet.userName(),
				friend: faker.internet.userName(),
				approved: true,
				requestedOn: faker.date.past(5),
				evaluatedOn: moment().subtract(30, 'd')
			}),
			new Friend({
				user: faker.internet.userName(),
				friend: faker.internet.userName(),
				approved: false,
				requestedOn: faker.date.past(5),
				evaluatedOn: moment().subtract(30, 'd')
			}),
			new Friend({
				user: faker.internet.userName(),
				friend: faker.internet.userName(),
				approved: false,
				requestedOn: faker.date.past(5),
				evaluatedOn: moment().subtract(30, 'm')
			}),
			new Friend({
				user: faker.internet.userName(),
				friend: faker.internet.userName(),
				requestedOn: faker.date.past(5)
			})
		];
		const sessions = [
			new Session({
				username: faker.internet.userName(),
				expires: moment().utc().add(30, 'd').valueOf()
			}),
			new Session({
				username: faker.internet.userName(),
				expires: moment().utc().subtract(5, 'h').valueOf()
			})
		];

		await Promise.all([
			Friend.deleteMany({}),
			Session.deleteMany({})
		]);

		await Promise.all([
			Friend.insertMany(friends),
			Session.insertMany(sessions)
		]);
	});

	after(async () => {
		await Promise.all([
			Friend.deleteMany({}),
			Session.deleteMany({})
		]);
	});

	it('Will delete expired sessions and rejected friend requests', async () => {
		await dbMaintenance();
		const [ friends, sessions ] = await Promise.all([
			Friend.find({}),
			Session.find({})
		]);

		expect(friends).to.have.lengthOf(3);
		expect(sessions).to.have.lengthOf(1);
	});
});
