import sessionManager from '../../service/utils/session-manager';

export default async function (username) {
	const token = await sessionManager.createSessionToken(username, 'chrome');
	return [ 'Authorization', `Bearer ${ token }` ];
}
