export function RequireUser(req, res, next) {
	if (!req.user) {
		return res.status(403).json({

		});
	}

	next();
}
