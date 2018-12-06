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

data "template_file" "user_data" {
	template = "${file("user-data.sh")}"

	vars {
		cluster = "${aws_ecs_cluster.main.name}"
	}
}

resource "aws_launch_configuration" "main" {
	name_prefix = "bottomtime_service_${var.env}_"
	image_id = "${data.aws_ami.ecs_optimized.id}"
	instance_type = "${var.instance_type}"
	iam_instance_profile = "${aws_iam_instance_profile.instance.id}"
	security_groups = ["${aws_security_group.instance.id}"]
	associate_public_ip_address = false
	user_data = "${data.template_file.user_data.rendered}"

	lifecycle {
		create_before_destroy = true
	}

	ebs_block_device {
		device_name = "/dev/xvdcz"
		volume_size = 40
	}
}

resource "aws_lb" "main" {
	name = "BottomTime-LoadBalancer-${var.env}"
	internal = false
	load_balancer_type = "application"
	security_groups = ["${aws_security_group.lb.id}"]
	subnets = ["${aws_subnet.private_1.id}", "${aws_subnet.private_2.id}"]
	
	tags {
		Name = "BottomTime Application Load Balancer - ${var.env}"
	}
}

resource "aws_lb_target_group" "main" {
	name = "BottomTime-TargetGroup-${var.env}"
	port = 80
	protocol = "HTTP"
	vpc_id = "${aws_vpc.main.id}"
	deregistration_delay = 15
	target_type = "instance"

	health_check {
		interval = 60
		path = "/health"
		protocol = "HTTP"
		timeout = 6
		matcher = "200-299"
	}
}

resource "aws_lb_listener" "https" {
	load_balancer_arn = "${aws_lb.main.arn}"
	port = 443
	protocol = "HTTPS"
	ssl_policy = "ELBSecurityPolicy-2015-05"
	certificate_arn = "${data.aws_acm_certificate.lb_cert.arn}"

	default_action {
		type = "forward"
		target_group_arn = "${aws_lb_target_group.main.arn}"
	}
}

resource "aws_lb_listener" "http" {
	load_balancer_arn = "${aws_lb.main.arn}"
	port = 80
	protocol = "HTTP"

	default_action {
		type = "redirect"

		redirect {
			port = 443
			protocol = "HTTPS"
			status_code = "HTTP_301"
		}
	}
}
