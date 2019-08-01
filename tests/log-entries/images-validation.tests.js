import { expect } from 'chai';
import fakeLogEntryImage from '../util/fake-log-entry-image';
import faker from 'faker';
import { ImageMetadataSchema } from '../../service/validation/log-entry-image';
import Joi from 'joi';

function ensureValid(isValid, expectedError) {
	if (expectedError) {
		expect(isValid.error).to.exist;
		expect(isValid.error.details.length).to.be.at.least(1);
		expect(isValid.error.details[0].type).to.equal(expectedError);
	} else {
		expect(isValid.error).to.not.exist;
	}
}

const LongString = faker.lorem.sentences(4).substr(0, 101);
const ExtraLongString = faker.lorem.paragraphs(6).substr(0, 501);

describe('Log Entry Image Validation Tests', () => {
	let metadata = null;

	function validateMetadata(expectedError) {
		const isValid = Joi.validate(metadata, ImageMetadataSchema);
		ensureValid(isValid, expectedError);
	}

	beforeEach(() => {
		metadata = fakeLogEntryImage();
	});

	it('Title must be a string', () => {
		metadata.title = 77;
		validateMetadata('string.base');
	});

	it('Title can be null', () => {
		metadata.title = null;
		validateMetadata();
	});

	it('Title is optional', () => {
		delete metadata.title;
		validateMetadata();
	});

	it('Title cannot be longer that 100 characters', () => {
		metadata.title = LongString;
		validateMetadata('string.max');
	});

	it('Description must be a string', () => {
		metadata.description = 77;
		validateMetadata('string.base');
	});

	it('Description can be null', () => {
		metadata.description = null;
		validateMetadata();
	});

	it('Description is optional', () => {
		delete metadata.description;
		validateMetadata();
	});

	it('Description cannot be longer that 500 characters', () => {
		metadata.description = ExtraLongString;
		validateMetadata('string.max');
	});

	it('Timestamp must be a string', () => {
		metadata.timestamp = 88;
		validateMetadata('string.base');
	});

	it('Timestamp must be an ISO date', () => {
		metadata.timestamp = 'May 9th';
		validateMetadata('string.isoDate');
	});

	it('Timestamp is optional', () => {
		delete metadata.timestamp;
		validateMetadata();
	});

	it('Timestamp can be null', () => {
		metadata.timestamp = null;
		validateMetadata();
	});

	it('Location is optional', () => {
		delete metadata.location;
		validateMetadata();
	});

	it('Location can be null', () => {
		metadata.location = null;
		validateMetadata();
	});

	[ 'lat', 'lon' ].forEach(e => {
		const min = e === 'lat' ? -90.0 : -180.0;
		const max = -1 * min;

		it(`Location.${ e } is required`, () => {
			delete metadata.location[e];
			validateMetadata('any.required');
		});

		it(`Location.${ e } must be a number`, () => {
			metadata.location[e] = 'seven';
			validateMetadata('number.base');
		});

		it(`Location.${ e } cannot be less than ${ min }`, () => {
			metadata.location[e] = min - 0.1;
			validateMetadata('number.min');
		});

		it(`Location.${ e } cannot be more than ${ max }`, () => {
			metadata.location[e] = max + 0.1;
			validateMetadata('number.max');
		});
	});
});
