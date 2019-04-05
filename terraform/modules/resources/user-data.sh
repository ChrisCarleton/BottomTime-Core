#cloud-boothook
#!/bin/bash
echo ECS_CLUSTER=%s >> /etc/ecs/ecs.config
echo ECS_ENGINE_TASK_CLEANUP_WAIT_DURATION=5m >> /etc/ecs/ecs.config
echo ECS_ENABLE_CONTAINER_METADATA=true >> /etc/ecs/ecs.config
