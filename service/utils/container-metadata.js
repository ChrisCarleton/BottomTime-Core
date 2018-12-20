import config from '../config';

const metadata = config.containerMetadataFile
	? require(config.containerMetadataFile)
	: {};

export default metadata;
