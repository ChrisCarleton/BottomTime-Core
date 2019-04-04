locals {
	logs_group_name = "bottomtime/core/${var.region}/${var.env}"
}

resource "aws_cloudwatch_log_group" "logs" {
	name = "${local.logs_group_name}"
	retention_in_days = 30
}

resource "aws_cloudwatch_metric_alarm" "service_low_latency" {
	alarm_name = "BottomTime-ServiceLatency-Low-${var.env}"
	alarm_description = "Service latency is very low and service can be scaled in."
	comparison_operator = "LessThanOrEqualToThreshold"
	evaluation_periods = 1
	period = 300
	metric_name = "TargetResponseTime"
	namespace = "AWS/ApplicationELB"
	statistic = "Average"
	threshold = "${var.latency_low_threshold}"
	treat_missing_data = "missing"
	alarm_actions = ["${aws_autoscaling_policy.service_scale_in.arn}", "${aws_appautoscaling_policy.service_scale_in.arn}"]

	dimensions {
		LoadBalancer = "${aws_lb.main.arn_suffix}"
	}
}

resource "aws_cloudwatch_metric_alarm" "service_high_latency" {
	alarm_name = "BottomTime-ServiceLatency-High-${var.env}"
	alarm_description = "Service latency is high and the service should be scaled out."
	comparison_operator = "GreaterThanOrEqualToThreshold"
	evaluation_periods = 1
	period = 300
	metric_name = "TargetResponseTime"
	namespace = "AWS/ApplicationELB"
	statistic = "Average"
	threshold = "${var.latency_high_threshold}"
	treat_missing_data = "missing"
	alarm_actions = ["${aws_autoscaling_policy.service_scale_out.arn}", "${aws_appautoscaling_policy.service_scale_out.arn}"]

	dimensions {
		LoadBalancer = "${aws_lb.main.arn_suffix}"
	}
}

resource "aws_cloudwatch_event_rule" "regular-maintenance" {
	name = "BottomTime-RegularDBMaintenance-${var.region}-${var.env}"
	schedule_expression = "${var.database_maintenance_frequency}"
}

resource "aws_cloudwatch_event_target" "regular-maintenance" {
	rule = "${aws_cloudwatch_event_rule.regular-maintenance.name}"
	target_id = "db_maintenance"
	arn = "${aws_lambda_function.db_maintenance.arn}"
}
