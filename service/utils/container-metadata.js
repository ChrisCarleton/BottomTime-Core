const metadata = process.env.ECS_CONTAINER_METADATA_FILE
	? require(process.env.ECS_CONTAINER_METADATA_FILE)
	: {};

export default metadata;
