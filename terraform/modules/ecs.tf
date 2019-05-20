locals {
	container_name = "BottomTime-Container-${var.env}"
	container_port = 29201
	cluster_name = "BottomTime-Cluster-${var.env}"
	service_name = "BottomTime-Service-${var.env}"
}


data "template_file" "task_def" {
	template = "${file("resources/task-def.json")}"

	vars {
		build = "${var.build_number}"
		domain_name = "https://${var.domain_name}.${var.domain_zone}/"
		env = "${var.env}"
		es_endpoint = "${var.es_endpoint}"
		google_id = "${var.google_client_id}"
		google_secret = "${var.google_client_secret}"
		image = "${var.docker_image}"
		log_level = "${var.log_level}"
		logs_group = "${local.logs_group_name}"
		media_bucket_name = "${local.media_bucket_name}"
		mongodb = "${var.mongodb_endpoint}"
		name = "${local.container_name}"
		port = "${local.container_port}"
		region = "${var.region}"
		session_secret = "${var.session_secret}"
		smtp_auth_username = "${var.smtp_auth_username}"
		smtp_auth_password = "${var.smtp_auth_password}"
		smtp_host = "${var.smtp_host}"
		smtp_port = "${var.smtp_port}"
		smtp_use_tls = "${var.smtp_use_tls}"
		support_email = "${var.support_email}"
	}
}

resource "aws_ecs_task_definition" "main" {
	family = "BottomTime-Task-${var.env}"
	container_definitions = "${data.template_file.task_def.rendered}"
	task_role_arn = "${aws_iam_role.execution.arn}"
	execution_role_arn = "${aws_iam_role.execution.arn}"
	cpu = 512
	memory = 512
	requires_compatibilities = ["EC2"]
}

resource "aws_ecs_cluster" "main" {
	name = "${local.cluster_name}"
}

resource "aws_ecs_service" "main" {
	name = "${local.service_name}"
	cluster = "${aws_ecs_cluster.main.id}"
	desired_count = 2
	launch_type = "EC2"
	iam_role = "${aws_iam_role.service.arn}"
	deployment_minimum_healthy_percent = 50
	deployment_maximum_percent = 130
	health_check_grace_period_seconds = 30
	task_definition = "${aws_ecs_task_definition.main.id}"

	depends_on = ["aws_iam_role_policy.service", "aws_lb_listener.https"]

	load_balancer {
		target_group_arn = "${aws_lb_target_group.main.arn}"
		container_name = "${local.container_name}"
		container_port = "${local.container_port}"
	}

	lifecycle {
		ignore_changes = ["desired_count"]
	}
}
