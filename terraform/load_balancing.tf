resource "aws_lb" "main" {
	name = "BottomTime-LoadBalancer-${var.env}"
	internal = false
	load_balancer_type = "application"
	security_groups = ["${aws_security_group.lb.id}"]
	subnets = ["${aws_subnet.az1.id}", "${aws_subnet.az2.id}"]
	
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

	depends_on = ["aws_lb.main"]

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
