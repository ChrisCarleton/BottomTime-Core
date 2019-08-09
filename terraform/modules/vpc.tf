data "aws_availability_zones" "available" {}

# VPC and Subnets

resource "aws_vpc" "main" {
	cidr_block = "10.0.0.0/16"

	tags {
		Name = "Bottom Time Application VPC - ${var.env}"
	}
}

resource "aws_subnet" "az1" {
	vpc_id = "${aws_vpc.main.id}"
	cidr_block = "10.0.1.0/24"
	availability_zone = "${data.aws_availability_zones.available.names[0]}"
	map_public_ip_on_launch = true

	tags {
		Name = "Bottom Time service subnet: ${data.aws_availability_zones.available.names[0]}/${var.env}"
	}
}

resource "aws_subnet" "az2" {
	vpc_id = "${aws_vpc.main.id}"
	cidr_block = "10.0.3.0/24"
	availability_zone = "${data.aws_availability_zones.available.names[1]}"
	map_public_ip_on_launch = true

	tags {
		Name = "Bottom Time service subnet: ${data.aws_availability_zones.available.names[1]}/${var.env}"
	}
}

# Routing

resource "aws_internet_gateway" "main" {
	vpc_id = "${aws_vpc.main.id}"

	tags {
		Name = "Bottom Time Application Internet Gateway: ${var.env}"
	}
}

resource "aws_route_table" "internet" {
	vpc_id = "${aws_vpc.main.id}"

	route {
		cidr_block = "0.0.0.0/0"
		gateway_id = "${aws_internet_gateway.main.id}"
	}

	tags {
		Name = "Bottom Time Service route table: ${var.env}"
	}
}

resource "aws_route_table_association" "az1" {
	subnet_id = "${aws_subnet.az1.id}"
	route_table_id = "${aws_route_table.internet.id}"
}

resource "aws_route_table_association" "az2" {
	subnet_id = "${aws_subnet.az2.id}"
	route_table_id = "${aws_route_table.internet.id}"
}

resource "aws_vpc_endpoint" "s3" {
	vpc_id = "${aws_vpc.main.id}"
	service_name = "com.amazonaws.${var.region}.s3"
	vpc_endpoint_type = "Gateway"
	policy = <<EOF
{
    "Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "Access-to-media-bucket",
			"Principal": "*",
			"Action": [
				"s3:ListBucket",
				"s3:GetObject",
				"s3:PutObject",
				"s3:PutObjectAcl",
				"s3:DeleteObject"
			],
			"Effect": "Allow",
			"Resource": [
				"${aws_s3_bucket.media_bucket.arn}",
				"${aws_s3_bucket.media_bucket.arn}/*"
			]
		}
	]
}
EOF
}

resource "aws_vpc_endpoint_route_table_association" "s3rt" {
	vpc_endpoint_id = "${aws_vpc_endpoint.s3.id}"
	route_table_id = "${aws_route_table.internet.id}"
}
