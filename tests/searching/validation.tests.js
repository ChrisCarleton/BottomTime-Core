import { expect } from 'chai';
import Joi from 'joi';
import { UserQuery } from '../../service/validation/search';

let userQuery = null;

function testExpectedError(err, expectedError) {
	if (expectedError) {
		expect(err.error).to.exist;
		expect(err.error.details[0].type).to.equal(expectedError);
	} else {
		expect(err.error).to.be.null;
	}
}

function validateUserSearch(expectedError) {
	const err = Joi.validate(userQuery, UserQuery);
	testExpectedError(err, expectedError);
}

describe('Search Users Validation', () => {
	beforeEach(() => {
		userQuery = 'mike.lamar';
	});

	it('Will accept a valid username', () => {
		validateUserSearch();
	});

	it('Will accept a valid email address', () => {
		userQuery = 'm_lamar27@hotmail.com';
		validateUserSearch();
	});

	it('Will fail if query is missing', () => {
		userQuery = null;
		validateUserSearch('string.base');
	});

	it('Will fail if query is invalid', () => {
		userQuery = 'Totally not valid!!';
		validateUserSearch('string.regex.base');
	});
});
