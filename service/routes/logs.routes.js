module.exports = app => {
	app.get('/logs', (req, res) => {
		res.send('ok');
	});
};
