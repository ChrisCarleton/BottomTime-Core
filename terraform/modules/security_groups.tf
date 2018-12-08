resource "aws_security_group" "lb" {
	name = "BottomTime-LoadBalancer-${var.env}"
	description = "Allows HTTP/HTTPS access to the load balancer."
	vpc_id = "${aws_vpc.main.id}"

	ingress {
		from_port = 443
		to_port = 443
		protocol = "tcp"
		cidr_blocks = ["0.0.0.0/0"]
	}

	egress {
		from_port = 0
		to_port = 0
		protocol = "-1"
		cidr_blocks = ["0.0.0.0/0"]
	}

	tags {
		Name = "Bottom Time Load Balancer Security Group"
	}
}

resource "aws_security_group" "instance" {
	name = "BottomTime-Instances-${var.env}"
	description = "Allows access to ephemeral ports for ECS."
	vpc_id = "${aws_vpc.main.id}"

	ingress {
		from_port = 32768
		to_port = 65535
		protocol = "tcp"
		security_groups = ["${aws_security_group.lb.id}"]
	}

	egress {
		from_port = 0
		to_port = 0
		protocol = "-1"
		cidr_blocks = ["0.0.0.0/0"]
	}

	tags {
		Name = "Bottom Time Instance Security Group"
	}
}