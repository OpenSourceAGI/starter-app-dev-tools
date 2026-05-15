![code2cloud](https://i.imgur.com/t6WlnCI.png)

# Cloud Computer Control Panel

An open-source cloud infrastructure management platform with automated [Dokploy](https://dokploy.com/) deployment for seamless container orchestration on AWS EC2.

TODO: add https://github.com/Dokploy/mcp

## Overview

CCCP (Cloud Computer Control Panel) lets you manage your own personal cloud and run fully self-hosted cloud applications on your own terms. Spin up a full Linux OS, deploy Docker containers, host developer tools, and maintain complete control over your cloud infrastructure.

### What is Dokploy?

**Dokploy** is an open-source, self-hostable Platform-as-a-Service (PaaS) that lets you deploy any Dockerized application or stack with a web UI, Git integration, and real-time resource monitoring. Positioned as an open-source alternative to Vercel, Netlify, and Heroku, Dokploy runs on your own infrastructure and automatically builds and deploys from Git providers (GitHub, GitLab, Bitbucket, Gitea) on every push to a configured branch.

## Features

- **Automated Dokploy Installation**: Instances automatically install Docker, Docker Swarm, and Dokploy for easy container management
- **AWS EC2 Management**: Create, start, stop, terminate, and snapshot EC2 instances with a single click
- **Custom Scripts**: Execute custom shell scripts on your instances via SSH for advanced setup
- **Docker Hub Integration**: Search and deploy Docker images directly from Docker Hub
- **GitHub Integration**: Search and deploy GitHub repositories with Dokploy
- **Development Environment Setup**: Automatically install git, docker, nodejs, python3, nginx, and more
- **Cost Estimator**: Calculate estimated monthly costs before creating instances
- **Real-time Monitoring**: Track instance status and health in real-time
- **Secure Credential Management**: AWS credentials stored locally in your browser, never on external servers
- **API Documentation**: Built-in Scalar API reference for programmatic access

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, shadcn/ui
- **AWS Integration**: AWS SDK for JavaScript (EC2, credentials)
- **Form Handling**: React Hook Form, Zod validation
- **Deployment**: Vercel Analytics, Next Themes for dark mode

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- AWS Account with IAM credentials (Access Key ID + Secret Access Key)
- Required AWS IAM permissions for EC2 operations:
  - `ec2:DescribeInstances`
  - `ec2:RunInstances`
  - `ec2:StartInstances`
  - `ec2:StopInstances`
  - `ec2:TerminateInstances`
  - `ec2:CreateSnapshot`
  - `ec2:DescribeRegions`
  - `ec2:DescribeAvailabilityZones`

### Creating AWS IAM Credentials

Follow these guides to create programmatic access credentials:

- [Video Tutorial: Creating AWS IAM User](https://www.youtube.com/watch?v=lntWTStctIE)
- [Step-by-Step Guide: AWS IAM Programmatic Access](https://www.simplified.guide/aws/iam/create-programmatic-access-user)

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/aws-manager.git
cd aws-manager
```

2. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Configuration

1. On the home page, enter your AWS Access Key ID and Secret Access Key
2. Your credentials are stored securely in your browser's localStorage
3. Click "Connect to AWS" to access the dashboard

## Usage

### Creating an Instance

1. Navigate to the "Create New" tab in the dashboard
2. Configure your instance:
   - **Instance Name**: Choose a descriptive name
   - **Instance Type**: Select from t2.micro, t3.small, t3.medium, etc.
   - **Storage Size**: Specify EBS volume size in GB (default: 40GB)
   - **SSH Key Pair**: Optional, for SSH access
   - **Region**: Select AWS region (default: us-east-1)

3. Choose software to install:
   - **Install Dokploy**: Automatically installs Docker, Docker Swarm, and Dokploy
   - **Development Environment**: Select tools like git, docker, nodejs, python3, nginx
   - **Custom Shell Script**: Add your own bash scripts or docker-compose files

4. Click "Create Instance" and wait for provisioning

### Managing Instances

From the "Managers" tab:

- **Start/Stop**: Control instance power state
- **Terminate**: Permanently delete the instance
- **Create Snapshot**: Backup instance EBS volumes
- **View Details**: Monitor instance status, IP address, and connection info
- **Add Software**: Install additional tools post-creation
- **Access Dokploy**: One-click access to Dokploy dashboard (port 3000)

![CCCP Banner](https://i.imgur.com/gnjJNSJ.png)

### API Reference

Access the interactive API documentation at `/api-reference` or click the "API Docs" button in the dashboard.

Available endpoints:

- `GET /api/instances` - List all instances in a region
- `GET /api/instances/all-regions` - List instances across all regions
- `POST /api/instances/install-software` - Install software on an instance
- `POST /api/servers/create` - Create a new EC2 instance
- `POST /api/check-credentials` - Validate AWS credentials
- `GET /api/docker-search` - Search Docker Hub
- `GET /api/github-search` - Search GitHub repositories
