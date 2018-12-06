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
