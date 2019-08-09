locals {
	media_bucket_name = "bottomtime-media-${var.region}-${var.env}"
}


resource "aws_s3_bucket" "media_bucket" {
	bucket = "${local.media_bucket_name}"
	acl = "private"
	region = "${var.region}"
	force_destroy = true

	tags {
		Name = "BottomTime Media ${var.region}"
		Environment = "${var.env}"
	}

	lifecycle_rule {
		id = "make_ia"
		enabled = true

		transition {
			days = 30
			storage_class = "STANDARD_IA"
		}
	}

	server_side_encryption_configuration {
		rule {
			apply_server_side_encryption_by_default {
				kms_master_key_id = "${data.aws_kms_key.master_key.arn}"
				sse_algorithm = "aws:kms"
			}
		}
	}
}
