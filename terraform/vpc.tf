data "aws_availability_zones" "available" {}

# VPC and Subnets

resource "aws_vpc" "main" {
	cidr_block = "10.0.0.0/16"

	tags {
		Name = "Bottom Time Application VPC - ${var.env}"
	}
}

resource "aws_subnet" "public_1" {
	vpc_id = "${aws_vpc.main.id}"
	cidr_block = "10.0.0.0/24"
	map_public_ip_on_launch = true
	availability_zone = "${data.aws_availability_zones.available.names[0]}"

	tags {
		Name = "Bottom Time public-facing subnet - ${data.aws_availability_zones.available.names[0]} ${var.env}"
	}
}

resource "aws_subnet" "private_1" {
	vpc_id = "${aws_vpc.main.id}"
	cidr_block = "10.0.1.0/24"
	availability_zone = "${data.aws_availability_zones.available.names[0]}"

	tags {
		Name = "Bottom Time private-facing subnet - ${data.aws_availability_zones.available.names[0]} ${var.env}"
	}
}

resource "aws_subnet" "public_2" {
	vpc_id = "${aws_vpc.main.id}"
	cidr_block = "10.0.2.0/24"
	map_public_ip_on_launch = true
	availability_zone = "${data.aws_availability_zones.available.names[1]}"

	tags {
		Name = "Bottom Time public-facing subnet - ${data.aws_availability_zones.available.names[1]} ${var.env}"
	}
}

resource "aws_subnet" "private_2" {
	vpc_id = "${aws_vpc.main.id}"
	cidr_block = "10.0.3.0/24"
	availability_zone = "${data.aws_availability_zones.available.names[1]}"

	tags {
		Name = "Bottom Time private-facing subnet - ${data.aws_availability_zones.available.names[1]} ${var.env}"
	}
}

# Gateways

resource "aws_internet_gateway" "main" {
	vpc_id = "${aws_vpc.main.id}"

	tags {
		Name = "Bottom Time Application Internet Gateway - ${var.env}"
	}
}

resource "aws_eip" "az_1" {
	vpc = true
	depends_on = ["aws_internet_gateway.main"]

	tags {
		Name = "Bottom Time Elastic IP - ${data.aws_availability_zones.available.names[0]} - ${var.env}"
	}
}

resource "aws_eip" "az_2" {
	vpc = true
	depends_on = ["aws_internet_gateway.main"]
	
	tags {
		Name = "Bottom Time Elastic IP - ${data.aws_availability_zones.available.names[1]} - ${var.env}"
	}
}

resource "aws_nat_gateway" "az_1" {
	allocation_id = "${aws_eip.az_1.id}"
	subnet_id = "${aws_subnet.public_1.id}"
	depends_on = ["aws_internet_gateway.main"]

	tags {
		Name = "Bottom Time NAT Gateway - ${data.aws_availability_zones.available.names[0]} - ${var.env}"
	}
}

resource "aws_nat_gateway" "az_2" {
	allocation_id = "${aws_eip.az_2.id}"
	subnet_id = "${aws_subnet.public_2.id}"
	depends_on = ["aws_internet_gateway.main"]

	tags {
		Name = "Bottom Time NAT Gateway - ${data.aws_availability_zones.available.names[1]} - ${var.env}"
	}
}

# Routing
resource "aws_route_table" "public" {
	vpc_id = "${aws_vpc.main.id}"

	route {
		cidr_block = "0.0.0.0/0"
		gateway_id = "${aws_internet_gateway.main.id}"
	}

	tags {
		Name = "Bottom Time application public-facing route table - ${var.env}"
	}
}

resource "aws_route_table_association" "public_az1" {
	subnet_id = "${aws_subnet.public_1.id}"
	route_table_id = "${aws_route_table.public.id}"
}

resource "aws_route_table_association" "public_az2" {
	subnet_id = "${aws_subnet.public_2.id}"
	route_table_id = "${aws_route_table.public.id}"
}


resource "aws_route_table" "private_az1" {
	vpc_id = "${aws_vpc.main.id}"

	route {
		cidr_block = "0.0.0.0/0"
		nat_gateway_id = "${aws_nat_gateway.az_1.id}"
	}

	tags {
		Name = "Bottom Time application private-facing route table - ${data.aws_availability_zones.available.names[0]}"
	}
}

resource "aws_route_table" "private_az2" {
	vpc_id = "${aws_vpc.main.id}"

	route {
		cidr_block = "0.0.0.0/0"
		nat_gateway_id = "${aws_nat_gateway.az_2.id}"
	}

	tags {
		Name = "Bottom Time application private-facing route table - ${data.aws_availability_zones.available.names[1]} ${var.env}"
	}
}

resource "aws_route_table_association" "private_az1" {
	subnet_id = "${aws_subnet.private_1.id}"
	route_table_id = "${aws_route_table.private_az1.id}"
}

resource "aws_route_table_association" "private_az2" {
	subnet_id = "${aws_subnet.private_2.id}"
	route_table_id = "${aws_route_table.private_az2.id}"
}
