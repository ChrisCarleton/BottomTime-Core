import config from '../config';
import path from 'path';
import pug from 'pug';
import url from 'url';

const resetEmailTemplate = pug.compileFile(path.join(__dirname, 'templates/reset-password.pug'));

export function ResetPasswordEmail(username, userFriendlyName, resetToken) {
	const resetUrl = url.resolve(
		config.siteUrl,
		`/resetPassword?username=${ username }&token=${ resetToken }`);

	return resetEmailTemplate({
		userFriendlyName,
		resetUrl,
		siteUrl: config.siteUrl,
		supportEmail: config.supportEmail
	});
}

export default {
	ResetPasswordEmail
};
