const config = {
	logLevel: process.env.BT_LOG_LEVEL || 'debug',
	logFileName: process.env.BT_LOG_FILE,
	port: process.env.BT_PORT || 29201,
	sessionSecret: process.env.BT_SESSION_SECRET || 'bottom_time',

	mongoEndpoint: process.env.BT_MONGO_ENDPOINT || 'mongodb://localhost/dev'
};

export default config;
