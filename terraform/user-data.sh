#cloud-boothook
#!/bin/bash
echo ECS_CLUSTER=${cluster} >> /etc/ecs/ecs.config
echo ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=5m >> /etc/ecs/ecs.config
echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config

cloud-init-per once docker_options echo 'OPTIONS="${OPTIONS} --storage-opt dm.basesize=10G"' >> /etc/sysconfig/docker
