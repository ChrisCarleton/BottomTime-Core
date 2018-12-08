terraform {
	backend "s3" {
		region = "us-east-1"
		bucket = "bottomtime-tfstate"
	}
}

provider "aws" {
	region = "${var.region}"
}
