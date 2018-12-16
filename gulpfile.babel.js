//import coveralls from 'gulp-coveralls';
import eslint from 'gulp-eslint';
import gls from 'gulp-live-server';
import gulp from 'gulp';
import log from 'fancy-log';
import mkdirp from 'mkdirp';
import mocha from 'gulp-mocha';
import path from 'path';

const devServer = new gls('service/index.js');

function lint() {
	return gulp.src(['gulpfile.babel.js', 'service/**/*.js', 'tests/**/*.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
}

function test() {
	mkdirp.sync(path.join(__dirname, 'logs/'));
	process.env.BT_LOG_FILE = path.join(__dirname, 'logs/test.log');
	process.env.ECS_CONTAINER_METADATA_FILE
		= path.join(__dirname, 'tests/assets/container-metadata.json');
	return gulp
		.src(['tests/**/*.tests.js'])
		.pipe(mocha({
			require: ['@babel/register'],
			timeout: 10000
		}));
}

function serve(done) {
	devServer.start();
	gulp.watch(['service/**/*.js'], file => {
		devServer.start.bind(devServer);
		log(`Changes detected to ${file}; Dev server restarted.`);
	});

	log('Dev server started.');
	
	done();
}

// function reportCoverage() {
// 	return gulp
// 		.src('coverage/lcov.info')
// 		.pipe(coveralls());
// }

gulp.task('lint', lint);

gulp.task('test', test);

gulp.task('ci-build', gulp.series(lint, test));

gulp.task('serve', serve);

gulp.task('default', serve);
