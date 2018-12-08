# BottomTime Service
This repository is home to the Bottom Time application backend API service.

#### Build Status
Master: [![CircleCI](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/master.svg?style=svg&circle-token=b4c86baca538392eeb5676fd14ef920f2cc44857)](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/master)

Production: [![CircleCI](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/prod.svg?style=svg&circle-token=b4c86baca538392eeb5676fd14ef920f2cc44857)](https://circleci.com/gh/ChrisCarleton/BottomTime-Core/tree/prod)

## API Documentation
_Coming Soon!_

TODO: Link to documentation on the APIs.

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
