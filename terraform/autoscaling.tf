resource "aws_autoscaling_group" "main" {
	name = "bottomtime_service_autoscaling_${var.env}"
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
