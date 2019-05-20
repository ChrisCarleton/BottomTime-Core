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
	default = "dev"
}

# ElasticSearch endpoint
variable "es_endpoint" {
	type= "string"
	default = ""
}

# cron or rate expression (https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html)
variable "database_maintenance_frequency" {
	type = "string"
	default = "cron(15 1/2 ? * * *)"
}

variable "friend_request_expiration_period" {
	type = "string"
	default = 240	# hours
}

variable "docker_image" {
	type = "string"
	default = "961445962603.dkr.ecr.us-east-1.amazonaws.com/bottom-time/core"
}

variable "google_client_id" {
	type = "string"
	default = "399113053541-k86gnd1eo92ochborjtuofikn6v37dja.apps.googleusercontent.com"
}

variable "google_client_secret" {
	type = "string"
	default = ""
}

variable "instance_type" {
	type = "string"
	default = "t3.small"
}

variable "latency_low_threshold" {
	type = "string"
	default = 200
}

variable "latency_high_threshold" {
	type = "string"
	default = 600
}

variable "log_level" {
	type = "string"
	default = "info"
}

variable "max_instances" {
	type = "string"
	default = 10
}

variable "min_instances" {
	type = "string"
	default = 1  
}

variable "mongodb_endpoint" {
	type = "string"
	default = ""
}

variable "region" {
	type = "string"
	default = "us-east-1"
}

variable "session_secret" {
	type = "string"
	default = "shhh!! secret"
}

variable "smtp_auth_password" {
	type = "string"
	default = ""
}

variable "smtp_auth_username" {
	type = "string"
	default = ""
}

variable "smtp_host" {
	type = "string"
	default = ""
}

variable "smtp_port" {
	type = "string"
	default = 25
}

variable "smtp_use_tls" {
	type = "string"
	default = "false"
}

variable "support_email" {
	type = "string"
	default = "support@bottomtime.ca"
}
