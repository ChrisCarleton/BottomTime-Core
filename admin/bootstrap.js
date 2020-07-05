/***********************************************************************************
 * NOTE: This script exists to bootstrap the other admin scripts. It should not
 * be run directly. See the section on Admin Scripts in the README.md file.
 **********************************************************************************/

require('dotenv').config();
require('@babel/register');
require(process.argv[2]);
