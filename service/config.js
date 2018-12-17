const config = {
	logLevel: process.env.BT_LOG_LEVEL || 'debug',
	logFileName: process.env.BT_LOG_FILE,
	port: process.env.BT_PORT || 29201,
	sessionSecret: process.env.BT_SESSION_SECRET || 'bottom_time',

	mongoEndpoint: process.env.BT_MONGO_ENDPOINT || 'mongodb://localhost/dev',

	smtp: {
		pool: true,
		host: process.env.BT_SMTP_HOST || 'localhost',
		port: process.env.BT_SMTP_PORT || 15025,
		secure: process.env.BT_SMTP_USE_TLS ? (process.env.BT_SMTP_USE_TLS === 'true') : false,
		auth: {
			user: process.env.BT_SMTP_USERNAME,
			pass: process.env.BT_SMTP_PASSWORD
		}
	}
};

if (!config.smtp.auth.user || !config.smtp.auth.pass) {
	delete smtp.auth;
}

export default config;
