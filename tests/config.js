/* eslint no-process-env: 0 */
// Ensure necessary directories
const mkdirp = require('mkdirp');
const path = require('path');
mkdirp.sync(path.join(__dirname, '../logs'), '0770');
mkdirp.sync(path.resolve(__dirname, '../temp/media/images'), '0770');

// Load configuration
console.log('Setting env variables.');
process.env.BT_LOG_FILE = path.join(__dirname, '../logs/test.log');
process.env.ECS_CONTAINER_METADATA_FILE = path.join(__dirname, 'assets/container-metadata.json');
process.env.BT_MAX_IMAGE_FILE_SIZE = '122740';
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });
console.log('here we go');
const config = require('../service/config');

console.log(config);

// Load Chai extensions
const chai = require('chai');
const chaiSorted = require('chai-sorted');
const errorResponseAssertions = require('./util/error-response-assertions');

chai.use(chaiSorted);
chai.use(errorResponseAssertions);
