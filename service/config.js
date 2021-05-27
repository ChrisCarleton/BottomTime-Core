/* eslint no-process-env: 0 */
import path from 'path';

const config = {
	nodeEnv: process.env.NODE_ENV,
	buildNumber: process.env.BT_BUILD_NUMBER,
	awsRegion: process.env.BT_AWS_REGION,

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

	s3Endpoint: process.env.BT_S3_ENDPOINT || 'http://localhost:4569/',
	mediaBucket: process.env.BT_MEDIA_BUCKET || 'BottomTime-Media',
	tempDir: process.env.BT_TEMP_DIR || path.resolve(__dirname, '../temp/'),

	// Default is 10 Mb
	maxImageFileSize: process.env.BT_MAX_IMAGE_FILE_SIZE
		? parseInt(process.env.BT_MAX_IMAGE_FILE_SIZE, 10)
		: 10485760,

	elasticSearchEndpoint: process.env.BT_ES_ENDPOINT || 'http://localhost:9200/',
	elasticSearchIndex: process.env.BT_ES_INDEX || 'bottomtime_dev',

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
