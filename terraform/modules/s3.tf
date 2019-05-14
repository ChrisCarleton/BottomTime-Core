resource "aws_s3_bucket" "media_bucket" {
	bucket = "BottomTime-Media-${var.region}-${var.env}"
	acl = "private"
	region = "${var.region}"
	force_destroy = true

	tags {
		Name = "BottomTime Media (${var.region})"
		Environment = "${var.env}"
	}

	lifecycle_rule {
		id = "make_ia"
		enabled = true

		transition {
			days = 60
			storage_class = "STANDARD_IA"
		}
	}
}
