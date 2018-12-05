variable "domain_zone" {
	type = "string"
	default = "bottomtime.ca"
}

variable "domain_name" {
	type = "string"
	default = "dev"
}

variable "env" {
	type = "string"
	default = "env"
}

variable "instance_type" {
	type = "string"
	default = "t3.small"
}

variable "min_instances" {
	type = "string"
	default = 1  
}

variable "max_instances" {
	type = "string"
	default = 10
}

variable "region" {
	type = "string"
	default = "ca-central-1"
}
