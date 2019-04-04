import { expect } from 'chai';
import faker from 'faker';
import Joi from 'joi';
import {
	BulkDeleteSchema,
	HandleFriendRequestSchema,
	ListFriendsSchema
} from '../../service/validation/friend';

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details.length).to.be.at.least(1);
		expect(isValid.error.details[0].type).to.equal(expectedError);
	} else {
		expect(isValid.error).to.not.exist;
	}
}

describe('Friends Validation Tests', () => {
	describe('List friends validation', () => {

		let query = null;

		beforeEach(() => {
			query = {
				type: 'friends'
			};
		});

		function validateListFriendsQuery(expectedError) {
			const isValid = Joi.validate(query, ListFriendsSchema);
			ensureValid(isValid, expectedError);
		}

		it('Succeeds if query string is valid', () => {
			validateListFriendsQuery();
		});

		it('Succeeds if type parameter is missing', () => {
			delete query.type;
			validateListFriendsQuery();
		});

		[ null, 'friends', 'requests', 'both' ].forEach(t => {
			it(`Succeeds if type parameter is "${ t }"`, () => {
				query.type = t;
				validateListFriendsQuery();
			});
		});

		it('Fails if type parameter is not a recognised value.', () => {
			query.type = 'not-valid';
			validateListFriendsQuery('any.allowOnly');
		});
	});

	describe('Handle Friend Request Validation', () => {

		let body = null;

		beforeEach(() => {
			body = {
				reason: 'A good reason'
			};
		});

		function validateHandleFriendRequest(expectedError) {
			const isValid = Joi.validate(body, HandleFriendRequestSchema);
			ensureValid(isValid, expectedError);
		}

		it('Will succeed if request is valid', () => {
			validateHandleFriendRequest();
		});

		it('Will succeed if reason is missing', () => {
			delete body.reason;
			validateHandleFriendRequest();
		});

		it('Will fail if reason is not a string', () => {
			body.reason = 42;
			validateHandleFriendRequest('string.base');
		});

		it('Will fail if reason is too long', () => {
			body.reason = faker.lorem.sentences(20);
			validateHandleFriendRequest('string.max');
		});
	});

	describe('Bulk Delete Users Validation', () => {
		let body = null;

		function makeUsername() {
			return faker.internet.userName(
				faker.name.firstName(),
				faker.name.lastName()
			).padEnd(6, 'a');
		}

		beforeEach(() => {
			body = new Array(5).fill(null).map(() => makeUsername());
		});

		function validateBulkDelete(expectedError) {
			const isValid = Joi.validate(body, BulkDeleteSchema);
			ensureValid(isValid, expectedError);
		}

		it('Succeeds if array is valid', () => {
			validateBulkDelete();
		});

		it('Fails if array element is not a user name', () => {
			body[1] = '## Totally INval!d';
			validateBulkDelete('string.regex.base');
		});

		it('Fails if array is emtpy', () => {
			body = [];
			validateBulkDelete('array.includesRequiredUnknowns');
		});

		it('Fails if body is empty', () => {
			body = null;
			validateBulkDelete('array.base');
		});

		it('Fails if array has empty elements', () => {
			body[3] = null;
			validateBulkDelete('string.base');
		});

		it('Fails if array contains too many elements', () => {
			body = new Array(1200).fill(null).map(() => makeUsername());
			validateBulkDelete('array.max');
		});
	});
});
