const config = {
	logLevel: process.env.BT_LOG_LEVEL || 'debug',
	logFileName: process.env.BT_LOG_FILE,
	port: process.env.BT_PORT || 29201,
	sessionSecret: process.env.BT_SESSION_SECRET || 'bottom_time',
	siteUrl: process.env.BT_SITE_URL || 'http://localhost:29201/',

	mongoEndpoint: process.env.BT_MONGO_ENDPOINT || 'mongodb://localhost/dev',

	auth: {
		googleClientId: process.env.BT_GOOGLE_CLIENT_ID || 'abcd',
		googleClientSecret: process.env.BT_GOOGLE_CLIENT_SECRET || '1234'
	}
};

export default config;
