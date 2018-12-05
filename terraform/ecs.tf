resource "aws_ecs_cluster" "main" {
	name = "bottomtime-cluster-${var.env}"
}
