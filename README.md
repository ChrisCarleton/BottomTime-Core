# BottomTime Service
This repository is home to the Bottom Time application backend API service.

#### Build Status
Service | Status
- | -
Master | [![CircleCI](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/master.svg?style=svg&circle-token=b4c86baca538392eeb5676fd14ef920f2cc44857)](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/master)
Production | [![CircleCI](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/prod.svg?style=svg&circle-token=b4c86baca538392eeb5676fd14ef920f2cc44857)](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/prod)
Test Coverage | [![Coverage Status](https://coveralls.io/repos/github/ChrisCarleton/BottomTime-Core/badge.svg?branch=master)](https://coveralls.io/github/ChrisCarleton/BottomTime-Core?branch=master)
Dependencies | [![Dependencies](https://david-dm.org/ChrisCarleton/BottomTime-Core.svg)](https://david-dm.org/ChrisCarleton/BottomTime-Core)

## Environment Variables
The application is configured through the use of environment variables. Any of these can be set to change
the behaviour of the running application:

* **BT_LOG_FILE** Setting this to a file name will force the application to write its logs to the file
rather than `stdout`.
* **BT_LOG_LEVEL** Sets the level of verbosity of the log output. Valid values are `trace`, `debug`, `info`,
`warn`, `error`, and `fatal`. The default is `debug`.
* **BT_MONGO_ENDPOINT** Sets the connection string for the MongoDB database. The default is
`mongodb://localhost/dev`.
* **BT_PORT** Can be set to override the default port the application listens for requests on. The default
is 29201.
* **BT_SESSION_SECRET** Sets the secret used to encrypt/decrypt session cookies. This doesn't really matter
for testing but should definitely be set to a secure value in production to prevent session hijacking.
* **BT_SITE_URL** Tells the application the base URL of the site. E.g. `https://www.bottomtime.ca/`. This
is important for some components of the application that need to return or provide URLs.

## API Documentation
See the full API documentation [here](docs/API.md)!

## Local Development
You'll need the following installed:

* **[Node.js](https://nodejs.org/en/download/)**
* **[Docker](https://www.docker.com/)**
* **Gulp CLI** which can be installed via npm: `npm install -g gulp-cli`.
* **Bunyan** (optional) is a nice tool for formatting the application's log output into a human-readable
form. `npm install -g bunyan`

The source code for the service itself lives in the `service/` directory and the unit/integration tests live
in the `tests/` directory.

A number of Gulp commands can be run to accomplish various tasks:
* `gulp lint` lints the code files for code smells.
* `gulp test` runs the test suite.
* `gulp serve` or simply `gulp` hosts the application at port 29201 so that you can test against the APIs.
The dev server will log to `stdout`.

*Hint:* Piping the dev server's log output through Bunyan makes it much easier to read:
`gulp serve | bunyan`

Before running any tests or the dev server you'll want to have a MongoDB database running to persist the
application data. Running the `admin/init-local.sh` script will run such a database in a Docker container,
which the application will try to use by default. However, you can set the `BT_MONGO_ENDPOINT` environment
variable to point to any MongoDB database you wish to use for testing.

## Deployment
Deployment and continuous integration builds are handled by
[CircleCI](https://circleci.com/gh/ChrisCarleton/BottomTime-Core). Merges to the `master` branch
are deployed to the development environment and merges to `prod` are deployed to the production environment.

The code is first linted/tested and then packaged in a Docker container which is pushed to AWS ECR. Finally,
Terraform is used to spin up an AWS ECS-powered environment to host the application.

* How the Docker image is built is controlled by the `Dockerfile` file in the project root directory.
* Terraform modules can be found at `terraform/modules/` and configuration for specific environments can be
found in `terraform/env/`.
* The CircleCI deployment pipeline is controlled by editing `.circleci/config.yml`.
