import containerMetadata from '../service/utils/container-metadata';
import { expect } from 'chai';

describe('ECS Container Metadata tests', () => {

	it('Will load ECS container metadata correctly', () => {
		const expected = require('./assets/container-metadata.json');
		expect(containerMetadata).to.eql(expected);
	});

});
