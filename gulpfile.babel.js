import eslint from 'gulp-eslint';
import gls from 'gulp-live-server';
import gulp from 'gulp';
import log from 'fancy-log';
import mkdirp from 'mkdirp';
import mocha from 'gulp-mocha';
import path from 'path';

const devServer = new gls('service/index.js');

function lint() {
	return gulp.src(['service/**/*.js', 'tests/**/*.js'])
		.pipe(eslint())
		.pipe(eslint.format())
		.pipe(eslint.failAfterError());
}

function test() {
	mkdirp.sync(path.join(__dirname, 'logs/'));
	process.env.BT_LOG_FILE = path.join(__dirname, 'logs/test.log');
	return gulp
		.src(['tests/**/*.test.js'])
		.pipe(mocha({
			require: ['@babel/register'],
			timeout: 10000
		}));
}

function serve(done) {
	devServer.start();
	gulp.watch(['service/**/*.js'], file => {
		devServer.start.bind(devServer);
		log('Changes detected; Dev server restarted.')
	});

	log('Dev server started.');
	
	done();
}

gulp.task('lint', lint);

gulp.task('test', test);

gulp.task('lint-and-test', gulp.series(lint, test));

gulp.task('serve', serve);

gulp.task('default', serve);
