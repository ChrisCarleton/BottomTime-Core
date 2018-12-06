locals {
	scaling_resource_id = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
}

resource "aws_autoscaling_group" "main" {
	name = "BottomTime-ASG-${var.env}"
	min_size = "${var.min_instances}"
	max_size = "${var.max_instances}"
	default_cooldown = 180
	health_check_type = "EC2"
	launch_configuration = "${aws_launch_configuration.main.id}"
	vpc_zone_identifier = ["${aws_subnet.private_1.id}", "${aws_subnet.private_2.id}"]
	termination_policies = ["OldestInstance"]

	tags = [
		{
			key = "Name"
			value = "BottomTime Application Instance"
			propagate_at_launch = true
		}
	]
}

resource "aws_autoscaling_policy" "service_scale_in" {
	name = "BottomTime-Scale-In-${var.env}"
	scaling_adjustment = -1
	adjustment_type = "ChangeInCapacity"
	cooldown = 240
	autoscaling_group_name = "${aws_autoscaling_group.main.name}"
}

resource "aws_autoscaling_policy" "service_scale_out" {
	name = "BottomTime-Scale-Out-${var.env}"
	scaling_adjustment = 1
	adjustment_type = "ChangeInCapacity"
	cooldown = 300
	autoscaling_group_name = "${aws_autoscaling_group.main.name}"
}

resource "aws_appautoscaling_target" "service" {
	max_capacity = "${var.max_instances * 4}"
	min_capacity = "${var.min_instances}"
	resource_id = "${local.scaling_resource_id}"
	role_arn = "${aws_iam_role.app_autoscaling.arn}"
	scalable_dimension = "ecs:service:DesiredCount"
	service_namespace = "ecs"
}

resource "aws_appautoscaling_policy" "service_scale_in" {
	name = "Service-Scale-In"
	policy_type = "StepScaling"
	resource_id = "${local.scaling_resource_id}"
	scalable_dimension = "ecs:service:DesiredCount"
	service_namespace = "ecs"

	step_scaling_policy_configuration {
		adjustment_type = "ChangeInCapacity"
		cooldown = 120
		metric_aggregation_type = "Average"

		step_adjustment {
			scaling_adjustment = -1
		}
	}

	depends_on = ["aws_appautoscaling_target.service"]
}

resource "aws_appautoscaling_policy" "service_scale_out" {
	name = "Service-Scale-In"
	policy_type = "StepScaling"
	resource_id = "${local.scaling_resource_id}"
	scalable_dimension = "ecs:service:DesiredCount"
	service_namespace = "ecs"

	step_scaling_policy_configuration {
		adjustment_type = "ChangeInCapacity"
		cooldown = 120
		metric_aggregation_type = "Average"

		step_adjustment {
			scaling_adjustment = 1
		}
	}

	depends_on = ["aws_appautoscaling_target.service"]
}
