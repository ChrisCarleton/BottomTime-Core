locals {
	db_maintenance_payload = "resources/db-maintenance.zip"
}

resource "aws_lambda_function" "db_maintenance" {
	filename = "${local.db_maintenance_payload}"
	function_name = "db_maintenance"
	role = "${aws_iam_role.lambda.arn}"
	handler = "index.handler"
	source_code_hash = "${base64sha256("${local.db_maintenance_payload}")}"
	runtime = "nodejs8.10"

	environment {
		variables = {
			BT_MONGO_ENDPOINT = "${var.mongodb_endpoint}"
			BT_FRIEND_REQUEST_EXPIRATION_PERIOD = "${var.friend_request_expiration_period}"
		}
	}
}

resource "aws_lambda_permission" "allow_db_maintenance_trigger" {
	statement_id = "AllowExecutionFromCloudWatch"
	action = "lambda:InvokeFunction"
	function_name = "${aws_lambda_function.db_maintenance.function_name}"
	principal = "events.amazonaws.com"
	source_arn = "${aws_cloudwatch_event_rule.regular-maintenance.arn}"
}
