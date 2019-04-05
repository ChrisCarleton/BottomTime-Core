/* eslint no-process-env: 0 */

const config = {
	nodeEnv: process.env.NODE_ENV,

	logLevel: process.env.BT_LOG_LEVEL || 'debug',
	logFileName: process.env.BT_LOG_FILE,
	port: process.env.BT_PORT || 29201,
	sessionSecret: process.env.BT_SESSION_SECRET || 'bottom_time',
	siteUrl: process.env.BT_SITE_URL || 'http://localhost:29201/',
	supportEmail: process.env.BT_SUPPORT_EMAIL || 'support@bottomtime.ca',
	doNotReplyEmail: 'no-reply@bottomtime.ca',

	mongoEndpoint: process.env.BT_MONGO_ENDPOINT || 'mongodb://localhost/dev',

	auth: {
		googleClientId: process.env.BT_GOOGLE_CLIENT_ID || 'abcd',
		googleClientSecret: process.env.BT_GOOGLE_CLIENT_SECRET || '1234'
	},

	smtp: {
		pool: (process.env.NODE_ENV === 'production'),
		host: process.env.BT_SMTP_HOST || 'localhost',
		port: process.env.BT_SMTP_PORT || 15025,
		secure: process.env.BT_SMTP_USE_TLS ? (process.env.BT_SMTP_USE_TLS === 'true') : false,
		auth: {
			user: process.env.BT_SMTP_USERNAME,
			pass: process.env.BT_SMTP_PASSWORD
		}
	},

	/*
		Do not set! This will be set automatically by the ECS agent hosting the application container.
		(That's why the BT_ prefix is missing from the environment variable!)
	*/
	containerMetadataFile: process.env.ECS_CONTAINER_METADATA_FILE,

	friendLimit: process.env.BT_FRIEND_LIMIT || 1000
};

if (!config.smtp.auth.user) {
	delete config.smtp.auth;
}

export default config;
