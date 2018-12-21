import config from '../config';
import log from '../logger';
import mongoose from 'mongoose';

mongoose.Promise = require('bluebird');

mongoose.connect(
	config.mongoEndpoint,
	{
		autoIndex: config.nodeEnv !== 'production',
		useNewUrlParser: true,
		useCreateIndex: true,
		keepAlive: true,
		keepAliveInitialDelay: 300000
	})
	.catch(err => {
		log.fatal('Failed to connect to MongoDB database:', err);
		throw err;
	});

export default mongoose;
