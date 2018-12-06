variable "build_number" {
	type = "string"
	default = "latest"
}

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

variable "docker_image" {
	type = "string"
	default = "961445962603.dkr.ecr.us-east-1.amazonaws.com/bottom-time/core"
}

variable "instance_type" {
	type = "string"
	default = "t3.small"
}

variable "log_level" {
	type = "string"
	default = "info"
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
