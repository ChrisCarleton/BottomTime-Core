import config from '../config';
import log from '../logger';
import nodemailer from 'nodemailer';

export default nodemailer.createTransport({
	...config.smtp,
	logger: log
});
