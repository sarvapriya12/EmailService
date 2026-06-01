# AWS App Runner Deployment

This repository is ready for AWS App Runner through Docker.

One-time setup required in AWS:

1. Create an ECR repository for the image.
2. Create an App Runner service that uses the ECR image.
3. Enable automatic deployments from the ECR image tag you choose, usually `latest`.
4. Create an IAM role that GitHub Actions can assume with permissions to push to ECR and start App Runner deployments.

Required GitHub configuration:

- Secret `AWS_ROLE_ARN`
- Repository variable `AWS_REGION`
- Repository variable `ECR_REPOSITORY`
- Repository variable `APP_RUNNER_SERVICE_ARN`

Workflow behavior:

- `ci.yml` runs validation and Docker build checks on every push and pull request.
- `deploy-apprunner.yml` builds and pushes the Docker image to ECR.
- If `APP_RUNNER_SERVICE_ARN` is set, the workflow also triggers an App Runner deployment.
