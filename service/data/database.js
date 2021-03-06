import config from '../config';
import log from '../logger';
import mongoose from 'mongoose';

(async () => {
	try {
		log.debug(`Connecting to database at "${ config.mongoEndpoint }"...`);
		await mongoose.connect(
			config.mongoEndpoint,
			{
				autoIndex: config.nodeEnv !== 'production',
				useNewUrlParser: true,
				useCreateIndex: true,
				keepAlive: true,
				keepAliveInitialDelay: 300000,
				useUnifiedTopology: true
			});
	} catch (err) {
		log.fatal('Failed to connect to MongoDB database:', err);
		throw err;
	}
})();

export default mongoose;
