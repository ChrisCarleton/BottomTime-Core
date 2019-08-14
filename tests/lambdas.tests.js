import { expect } from 'chai';
import faker from 'faker';
import Friend from '../service/data/friend';
import moment from 'moment';

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

		await Friend.deleteMany({});
		await Friend.insertMany(friends);
	});

	after(async () => {
		await Friend.deleteMany({});
	});

	it('Will delete rejected friend requests', async () => {
		await dbMaintenance();
		const friends = await Friend.find({});
		expect(friends).to.have.lengthOf(3);
	});
});
