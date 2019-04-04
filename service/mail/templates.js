import config from '../config';
import path from 'path';
import pug from 'pug';
import url from 'url';

const resetEmailTemplate = pug.compileFile(
	path.join(__dirname, 'templates/reset-password.pug'));
const newFriendRequestTemplate = pug.compileFile(
	path.join(__dirname, 'templates/friend-request.pug'));
const approveFriendRequestTemplate = pug.compileFile(
	path.join(__dirname, 'templates/friend-request-approved.pug'));
const rejectFriendRequestTemplate = pug.compileFile(
	path.join(__dirname, 'templates/friend-request-rejected.pug'));

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

export function NewFriendRequestEmail(userFriendlyName, friendUsername, friendFriendlyName) {
	return newFriendRequestTemplate({
		siteUrl: config.siteUrl,
		approveUrl: url.resolve(config.siteUrl, `/friends/${ friendUsername }/approve`),
		rejectUrl: url.resolve(config.siteUrl, `/friends/${ friendUsername }/reject`),
		userFriendlyName,
		friendFriendlyName
	});
}

export function ApproveFriendRequestEmail(userFriendlyName, friendUsername, friendFriendlyName) {
	const friendProfileUrl = url.resolve(config.siteUrl, `/profile/${ friendUsername }`);
	return approveFriendRequestTemplate({
		userFriendlyName,
		friendFriendlyName,
		friendProfileUrl
	});
}

export function RejectFriendRequestEmail(userFriendlyName, friendFriendlyName, reason) {
	reason = reason || 'None.';

	return rejectFriendRequestTemplate({
		userFriendlyName,
		friendFriendlyName,
		reason
	});
}

export default {
	ApproveFriendRequestEmail,
	NewFriendRequestEmail,
	RejectFriendRequestEmail,
	ResetPasswordEmail
};
