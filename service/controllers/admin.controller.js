export function GetHealth(req, res) {
	res.json({
		status: 'healthy',
		components: []
	});
}

export function GetVersion(req, res) {
	res.json({
		appVersion: '1.0.0',
		apiVersion: '1.0.0'
	});
}
