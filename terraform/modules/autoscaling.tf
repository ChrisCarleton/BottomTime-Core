locals {
	scaling_resource_id = "service/${local.cluster_name}/${local.service_name}"
}

data "aws_acm_certificate" "lb_cert" {
	domain = "*.${var.domain_zone}"
	most_recent = true
}

data "aws_ami" "ecs_optimized" {
	most_recent = true
	owners = ["amazon"]

	filter {
		name = "name"
		values = ["amzn2-ami-ecs-hvm-2.0.20190301-x86_64-ebs"]
	}
}

resource "aws_launch_configuration" "main" {
	name_prefix = "BottomTime_Core_${var.env}_"
	image_id = "${data.aws_ami.ecs_optimized.id}"
	instance_type = "${var.instance_type}"
	iam_instance_profile = "${aws_iam_instance_profile.instance.id}"
	security_groups = ["${aws_security_group.instance.id}"]
	associate_public_ip_address = false
	user_data = "${format(file("resources/user-data.sh"), aws_ecs_cluster.main.name)}"

	lifecycle {
		create_before_destroy = true
	}

	ebs_block_device {
		device_name = "/dev/xvdcz"
		volume_size = 40
	}
}

resource "aws_autoscaling_group" "main" {
	name = "BottomTime-ASG-${var.env}"
	min_size = "${var.min_instances}"
	max_size = "${var.max_instances}"
	default_cooldown = 180
	health_check_type = "EC2"
	launch_configuration = "${aws_launch_configuration.main.id}"
	vpc_zone_identifier = ["${aws_subnet.az1.id}", "${aws_subnet.az2.id}"]
	termination_policies = ["OldestInstance"]

	tags = [
		{
			key = "Name"
			value = "BottomTime Application Instance - ${var.env}"
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

	depends_on = ["aws_ecs_service.main"]
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
			metric_interval_lower_bound = 0
			scaling_adjustment = -1
		}
	}

	depends_on = ["aws_appautoscaling_target.service"]
}

resource "aws_appautoscaling_policy" "service_scale_out" {
	name = "Service-Scale-Out"
	policy_type = "StepScaling"
	resource_id = "${local.scaling_resource_id}"
	scalable_dimension = "ecs:service:DesiredCount"
	service_namespace = "ecs"

	step_scaling_policy_configuration {
		adjustment_type = "ChangeInCapacity"
		cooldown = 120
		metric_aggregation_type = "Average"

		step_adjustment {
			metric_interval_upper_bound = 0
			scaling_adjustment = 1
		}
	}

	depends_on = ["aws_appautoscaling_target.service"]
}
