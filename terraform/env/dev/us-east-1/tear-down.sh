#!/usr/bin/env bash
set -e

terraform init -from-module=../../../modules/ -backend-config="key=dev.us-east-1.tfstate"
terraform destroy -auto-approve -var-file config.tfvars

rm *.tf
rm -rf resources/ .terraform/
