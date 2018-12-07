output "build_number" {
	value = "${var.build_number}"
}

output "domain_name" {
	value = "${var.domain_name}.${var.domain_zone}"
}

output "load_balancer_url" {
	value = "${aws_lb.main.dns_name}"
}
