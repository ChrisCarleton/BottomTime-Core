import config from '../config';
import log from '../logger';
import mongoose from 'mongoose';

mongoose.Promise = require('bluebird');

mongoose.connect(
	config.mongoEndpoint,
	{
		useNewUrlParser: true
	})
	.catch(err => {
		log.fatal('Failed to connect to MongoDB database:', err);
		process.exit(13);
	});

export default mongoose;
