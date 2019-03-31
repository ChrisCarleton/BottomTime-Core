import { expect } from 'chai';
import faker from 'faker';
import Joi from 'joi';
import {
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

		it('Succeeds if type parameter is null', () => {
			query.type = null;
			validateListFriendsQuery();
		});

		it('Succeeds if type parameter is "friends"', () => {
			query.type = 'friends';
			validateListFriendsQuery();
		});

		it('Succeeds if type parameter is "requests"', () => {
			query.type = 'requests';
			validateListFriendsQuery();
		});

		it('Succeeds if type parameter is "both"', () => {
			query.type = 'both';
			validateListFriendsQuery();
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
});
