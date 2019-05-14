/* eslint no-process-env: 0 */

import eslint from 'gulp-eslint';
import GLS from 'gulp-live-server';
import gulp from 'gulp';
import log from 'fancy-log';
import mkdirp from 'mkdirp';
import mocha from 'gulp-mocha';
import path from 'path';

const devServer = new GLS('service/index.js');

function lint() {
	return gulp.src(
		[
			'gulpfile.babel.js',
			'service/**/*.js',
			'tests/**/*.js',
			'admin/**/*.js',
			'lambda/db-maintenance/index.js'
		])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
}

function test() {
	mkdirp.sync(path.join(__dirname, 'logs/'));

	process.env.BT_LOG_FILE = path.join(__dirname, 'logs/test.log');
	process.env.ECS_CONTAINER_METADATA_FILE = path.join(__dirname, 'tests/assets/container-metadata.json');
	process.env.BT_S3_ENDPOINT = 'http://localhost:4569/';

	return gulp
		.src([ 'tests/**/*.tests.js' ])
		.pipe(mocha({
			require: [ '@babel/register' ],
			timeout: 10000
		}));
}

function watch(done) {
	process.env.BT_S3_ENDPOINT = 'http://localhost:4569/';
	devServer.start();
	gulp.watch([ 'service/**/*.js' ], file => {
		devServer.start.bind(devServer);
		log(`Changes detected to ${ file }; Dev server restarted.`);
	});

	log('Dev server started.');

	done();
}

function serve(done) {
	process.env.BT_S3_ENDPOINT = 'http://localhost:4569/';
	devServer.start();
	log('Dev server started.');
	done();
}

gulp.task('lint', lint);

gulp.task('test', test);

gulp.task('serve', serve);

gulp.task('server', serve);

gulp.task('watch', watch);

gulp.task('default', watch);

