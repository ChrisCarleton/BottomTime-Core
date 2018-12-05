data "aws_acm_certificate" "lb_cert" {
	domain = "*.${var.domain_zone}"
	most_recent = true
}

data "aws_ami" "ecs_optimized" {
	most_recent = true

	filter {
		name = "name"
		values = ["amzn-ami-2018.03.i-amazon-ecs-optimized"]
	}
}

resource "aws_launch_configuration" "main" {
	name_prefix = "bottomtime_service_${var.env}_"
	image_id = "${data.aws_ami.ecs_optimized.id}"
	instance_type = "${var.instance_type}"
	iam_instance_profile = "${aws_iam_instance_profile.instance.id}"
	security_groups = ["${aws_security_group.instance.id}"]
	associate_public_ip_address = false
	user_data = "${format(file("user-data.sh"), aws_ecs_cluster.main.name)}"

	lifecycle {
		create_before_destroy = true
	}

	ebs_block_device {
		device_name = "/dev/xvdcz"
		volume_size = 40
	}
}
