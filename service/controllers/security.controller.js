import { unauthorized } from '../utils/error-response';

export function RequireUser(req, res, next) {
	if (!req.user) {
		return unauthorized(res);
	}

	next();
}
