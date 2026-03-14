/* ============================================================
   CURRICULUM PART 4  —  Modules 10 · 11 · 12
   10: Docker on EC2
   11: Git, CI/CD & Deployment
   12: Performance Tuning & SRE Observability
   ============================================================ */

window.CURRICULUM_PART4 = [

  /* ══════════════════════════════════════════════════════════
     MODULE 10 · Docker on EC2
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod10',
    title: 'Docker on EC2',
    icon: '🐳',
    difficulty: 'intermediate',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod10-ex1',
        title: 'Installing Docker on Ubuntu EC2',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Fresh EC2 instance. Install Docker using the official method (not Ubuntu\'s older snap/apt package) and verify the installation.',
        steps: [
          {
            instruction: 'Install Docker using the official script',
            command: 'curl -fsSL https://get.docker.com | sudo sh',
            check: 'docker',
            explanation: 'Official Docker install script: adds Docker\'s apt repo, imports their GPG signing key, installs docker-ce, docker-ce-cli, containerd.io. This is the fastest method for EC2 instances. For production: use the manual repo setup method for better version control. Never use `sudo apt install docker.io` — that installs an older Ubuntu-maintained version.'
          },
          {
            instruction: 'Add ubuntu user to docker group (no sudo needed)',
            command: 'sudo usermod -aG docker ubuntu && newgrp docker',
            check: 'docker',
            explanation: '`usermod -aG docker` adds ubuntu to the docker group so Docker commands run without sudo. `newgrp docker` activates the group change immediately in the current session (normally requires logout/login). SECURITY NOTE: docker group = root equivalent (can mount host filesystem into containers). Treat accordingly.'
          },
          {
            instruction: 'Verify Docker installation',
            command: 'docker version && docker run hello-world',
            check: 'docker',
            explanation: '`docker version` shows client and server (daemon) versions — both must show. `docker run hello-world` pulls the test image from Docker Hub and runs it. If Docker socket permission error: the group change hasn\'t taken effect (need to re-login or use `newgrp docker`). If daemon not running: `sudo systemctl start docker`.'
          },
          {
            instruction: 'Enable Docker to start on boot',
            command: 'sudo systemctl enable docker && sudo systemctl enable containerd',
            check: 'systemctl',
            explanation: 'Docker service must auto-start on EC2 instance reboot. Both `docker` and `containerd` (low-level runtime) need to be enabled. AWS Auto Scaling Group replacement instances get fresh Docker installs via UserData — but for long-running instances, enable both.'
          },
          {
            instruction: 'Configure Docker daemon settings (logging, storage)',
            command: 'sudo tee /etc/docker/daemon.json << EOF\n{\n  "storage-driver": "overlay2",\n  "log-driver": "json-file",\n  "log-opts": {"max-size": "10m", "max-file": "3"},\n  "default-ulimits": {"nofile": {"Hard": 65535, "Soft": 65535}}\n}\nEOF\nsudo systemctl restart docker',
            check: 'daemon.json',
            explanation: 'daemon.json configures Docker engine. Key settings: overlay2 = default storage driver (best performance on ext4/xfs), log-driver json-file with max-size/max-file = prevents container logs filling disk (critical!), default-ulimits = high file descriptor limits for production services. For CloudWatch: use `"log-driver": "awslogs"` to ship container logs directly.'
          }
        ]
      },

      {
        id: 'mod10-ex2',
        title: 'Container Lifecycle Management',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Deploy an nginx container, manage its lifecycle, inspect it, and clean it up properly.',
        steps: [
          {
            instruction: 'Pull and run an nginx container',
            command: 'docker run -d --name web -p 80:80 --restart unless-stopped nginx:latest',
            check: 'docker run',
            explanation: '`-d` = detached (background). `--name web` = container name. `-p 80:80` = host_port:container_port mapping. `--restart unless-stopped` = auto-restart on crash or reboot (not if manually stopped). `nginx:latest` = image:tag. In production: always pin versions (`nginx:1.25.3`) — `latest` changes unexpectedly.'
          },
          {
            instruction: 'Check running containers',
            command: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}\t{{.Image}}"',
            check: 'docker ps',
            explanation: '`docker ps` shows running containers. `--format` uses Go templates for custom output. `docker ps -a` shows ALL containers including stopped ones. Key columns: STATUS (Up/Exited + duration), PORTS (mappings), IMAGE. A container "Exited (1)" = crashed. Check with `docker logs container-name`.'
          },
          {
            instruction: 'View container logs',
            command: 'docker logs -f --tail 50 web',
            check: 'docker logs',
            explanation: '`docker logs` reads from the container\'s log driver. `-f` = follow (like tail -f). `--tail 50` = last 50 lines. `--since 1h` = last hour only. `--timestamps` = add timestamps. For troubleshooting crashed containers: `docker logs container-id` works even after the container exits (logs persisted until container removed).'
          },
          {
            instruction: 'Exec into a running container',
            command: 'docker exec -it web bash',
            check: 'docker exec',
            explanation: '`docker exec -it` = interactive + TTY (gives you a shell inside the running container). Once inside: debug with the container\'s installed tools. If bash isn\'t available: try `sh`. For a quick command: `docker exec web cat /etc/nginx/nginx.conf` (no -it needed for non-interactive). IMPORTANT: changes inside a container are lost when it restarts.'
          },
          {
            instruction: 'Inspect container configuration and metadata',
            command: 'docker inspect web | python3 -m json.tool | grep -A5 "IPAddress\\|Mounts\\|RestartPolicy"',
            check: 'docker inspect',
            explanation: '`docker inspect` returns full JSON of container config: IP address, port bindings, volume mounts, environment variables, restart policy, resource limits, health check config. Use in debugging: `docker inspect --format "{{.NetworkSettings.IPAddress}}" web` for the container IP. The IP is on the Docker bridge network (172.17.x.x by default).'
          },
          {
            instruction: 'Stop and remove container cleanly',
            command: 'docker stop web && docker rm web',
            check: 'docker',
            explanation: '`docker stop` sends SIGTERM to PID 1, waits 10 seconds, then SIGKILL. `docker rm` removes the stopped container (releases port mapping, frees name). `docker rm -f` = force remove (SIGKILL immediately). Combined: `docker rm -f web`. Data in container filesystem is lost — use volumes for persistent data.'
          }
        ]
      },

      {
        id: 'mod10-ex3',
        title: 'Docker Volumes & Networking',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Running a stateful MySQL container that needs persistent storage. Also setting up a custom network so containers can communicate by name.',
        steps: [
          {
            instruction: 'Create a named Docker volume',
            command: 'docker volume create mysql-data && docker volume ls',
            check: 'docker volume',
            explanation: 'Named volumes are managed by Docker and stored in /var/lib/docker/volumes/. Better than bind mounts for containers: Docker manages permissions, works across container restarts, easy to backup with `docker run --rm -v mysql-data:/data -v /tmp:/backup alpine tar czf /backup/backup.tar.gz /data`.'
          },
          {
            instruction: 'Run MySQL with persistent volume',
            command: 'docker run -d --name mysql -v mysql-data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=SecurePass123 -e MYSQL_DATABASE=appdb --restart unless-stopped mysql:8.0',
            check: 'docker run',
            explanation: '`-v mysql-data:/var/lib/mysql` = mount named volume at MySQL data directory. Database files persist when container is stopped/removed. `-e` = environment variable (MySQL uses these for initialization). NEVER put passwords in docker run commands in production — use Docker secrets or AWS Secrets Manager: `--env-file secrets.env`.'
          },
          {
            instruction: 'Create an isolated Docker network',
            command: 'docker network create app-network && docker network ls',
            check: 'docker network',
            explanation: 'Custom bridge networks: containers on the same network can communicate by container name (DNS-based service discovery). Containers on different networks are isolated. Connect existing container: `docker network connect app-network mysql`. Default bridge network (docker0) doesn\'t support name-based resolution.'
          },
          {
            instruction: 'Connect containers on the same network',
            command: 'docker run -d --name webapp --network app-network -p 8080:3000 -e DB_HOST=mysql node:20-alpine sh -c "echo test"',
            check: 'docker run',
            explanation: 'With `--network app-network`, the webapp container can reach MySQL at hostname "mysql" (container name on same network). DB_HOST=mysql tells the app where to find the database. No hardcoded IPs needed. For multi-container apps, use Docker Compose which handles networks automatically.'
          },
          {
            instruction: 'Inspect network and connected containers',
            command: 'docker network inspect app-network | python3 -m json.tool | grep -A3 "Containers\\|Subnet"',
            check: 'docker network',
            explanation: 'Shows network CIDR, gateway, and all connected containers with their IP assignments on this network. Use to debug: "can container A reach container B?" — verify both are on the same network here. Also: `docker exec webapp ping mysql` to test actual connectivity between containers.'
          }
        ]
      },

      {
        id: 'mod10-ex4',
        title: 'Dockerfile & Building Images',
        difficulty: 'intermediate',
        time: '9 min',
        scenario: 'Build a production-ready Docker image for a Node.js application, optimize it for size and security, then push it to ECR.',
        steps: [
          {
            instruction: 'Write a production Dockerfile',
            command: 'cat > /tmp/Dockerfile << EOF\nFROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nRUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser\nUSER appuser\nEXPOSE 3000\nCMD ["node", "server.js"]\nEOF\ncat /tmp/Dockerfile',
            check: 'Dockerfile',
            explanation: 'Best practices: alpine = small base (5MB vs 100MB node). Copy package.json first (Docker cache layers — dependencies only reinstall when package.json changes). `npm ci` = clean install (uses package-lock.json, deterministic). Create non-root user: never run containers as root in production. USER sets the runtime user.'
          },
          {
            instruction: 'Build the Docker image',
            command: 'docker build -t myapp:1.0.0 -t myapp:latest -f /tmp/Dockerfile /tmp/ 2>&1 | tail -20',
            check: 'docker build',
            explanation: '`-t name:tag` = tag the image (use both version and latest). `-f` = Dockerfile path. Final arg = build context (directory sent to Docker daemon). Each RUN/COPY/ADD creates a layer — layers are cached. Changing a line invalidates all subsequent layers. Order layers: least-changed first (FROM), most-changed last (COPY . .).'
          },
          {
            instruction: 'Scan image for vulnerabilities',
            command: 'docker scout cves myapp:1.0.0 2>/dev/null || trivy image myapp:1.0.0 2>/dev/null || echo "Install trivy: sudo apt install trivy"',
            check: 'docker',
            explanation: 'Vulnerability scanning before pushing to registry is mandatory in DevSecOps pipelines. Trivy (Aqua Security) or Docker Scout scan for: OS package CVEs, language dependency CVEs, misconfigurations. In CI/CD: fail the pipeline if CRITICAL CVEs found. Integrate with ECR: AWS Inspector scans ECR images automatically.'
          },
          {
            instruction: 'Authenticate to Amazon ECR',
            command: 'aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com',
            check: 'ecr',
            explanation: 'ECR uses temporary credentials (12-hour tokens). `aws ecr get-login-password` gets the token, piped to `docker login`. Requires IAM permissions: ecr:GetAuthorizationToken. In CI/CD: use OIDC authentication (GitHub Actions → assume IAM role) instead of static credentials. ECR authentication refreshes automatically with newer Docker credential helpers.'
          },
          {
            instruction: 'Tag and push image to ECR',
            command: 'docker tag myapp:1.0.0 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0.0 && docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0.0',
            check: 'docker push',
            explanation: 'Docker push uploads layers to ECR. Only changed layers are uploaded (layer deduplication). ECR stores images in the same region as your ECS/EKS — same-region pulls are free and fast. Enable ECR image scanning: in ECR console → repository settings → scan on push. Tag strategy: semver tags (1.0.0) + git SHA for traceability.'
          }
        ]
      },

      {
        id: 'mod10-ex5',
        title: 'Docker Compose — Multi-Container Apps',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Deploy a full-stack app (Node.js + Redis + PostgreSQL) using Docker Compose. Manage the stack lifecycle.',
        steps: [
          {
            instruction: 'Write a docker-compose.yml',
            command: 'cat > /tmp/docker-compose.yml << EOF\nversion: "3.9"\nservices:\n  app:\n    image: node:20-alpine\n    ports: ["3000:3000"]\n    environment:\n      - REDIS_URL=redis://cache:6379\n      - DB_HOST=db\n    depends_on:\n      db:\n        condition: service_healthy\n    networks: [backend]\n  db:\n    image: postgres:15-alpine\n    environment:\n      POSTGRES_PASSWORD: secret\n      POSTGRES_DB: appdb\n    volumes: [pgdata:/var/lib/postgresql/data]\n    healthcheck:\n      test: ["CMD", "pg_isready"]\n      interval: 10s\n      retries: 5\n    networks: [backend]\n  cache:\n    image: redis:7-alpine\n    networks: [backend]\nvolumes:\n  pgdata:\nnetworks:\n  backend:\nEOF',
            check: 'docker-compose',
            explanation: 'docker-compose.yml defines the full stack. `depends_on` with `condition: service_healthy` waits for DB to be ready (uses healthcheck). `healthcheck` tests PostgreSQL readiness every 10s. Named volumes persist data. Custom network (backend) isolates services from other applications. Env vars from files: `env_file: .env` (never hardcode secrets in yaml).'
          },
          {
            instruction: 'Start the full stack',
            command: 'cd /tmp && docker compose up -d',
            check: 'docker compose',
            explanation: '`docker compose up -d` = start all services in detached mode (background). Compose creates: network, volumes, then containers in dependency order. `docker compose ps` shows status. `docker compose logs -f` follows all service logs interleaved. For production: use `--scale app=3` to run multiple app instances behind a load balancer.'
          },
          {
            instruction: 'View logs of a specific service',
            command: 'docker compose -f /tmp/docker-compose.yml logs --tail=30 db',
            check: 'docker compose',
            explanation: '`logs service_name` shows logs from just that service. Add `-f` to follow. Combine: `docker compose logs -f app db` (multiple services). In production: configure centralized logging driver in compose file: `logging: driver: awslogs` with options for CloudWatch log group and stream prefix.'
          },
          {
            instruction: 'Scale a service horizontally',
            command: 'docker compose -f /tmp/docker-compose.yml up -d --scale app=3',
            check: 'docker compose',
            explanation: '`--scale service=N` starts N instances of a service. Compose appends _1, _2, _3 to container names. Port conflicts: remove the ports mapping from app service (use an nginx or traefik load balancer container instead). For production scaling at EC2 level: use ECS with Fargate + ALB for auto-scaling without managing Compose replicas manually.'
          },
          {
            instruction: 'Stop and remove the entire stack',
            command: 'docker compose -f /tmp/docker-compose.yml down --volumes',
            check: 'docker compose',
            explanation: '`down` stops and removes containers, networks. `--volumes` also removes named volumes (data gone). For production teardown: `down` (keep volumes, for upgrade rollback). `down --rmi local` also removes locally built images. `docker compose restart service` = restart one service without affecting others.'
          }
        ]
      },

      {
        id: 'mod10-ex6',
        title: 'Docker Cleanup & Maintenance',
        difficulty: 'intermediate',
        time: '6 min',
        scenario: 'EC2 instance /var/lib/docker is at 85% full from accumulated images, stopped containers, and unused volumes. Clean up safely.',
        steps: [
          {
            instruction: 'Check Docker disk usage',
            command: 'docker system df',
            check: 'docker system df',
            explanation: '`docker system df` shows: Images (total, active, reclaimable), Containers (running, stopped, reclaimable), Volumes, Build Cache. "Reclaimable" = safe to delete. Active = currently in use. This is your inventory before cleanup — never run `docker system prune` without understanding what will be removed.'
          },
          {
            instruction: 'Remove stopped containers',
            command: 'docker container prune -f',
            check: 'docker',
            explanation: 'Removes all stopped containers. `-f` = no confirmation prompt. Only removes STOPPED containers — running ones are safe. After incidents with crash-restart loops, you accumulate hundreds of stopped containers each holding logs and filesystem layers. Check count first: `docker ps -a | grep -c Exited`.'
          },
          {
            instruction: 'Remove dangling images (untagged layers)',
            command: 'docker image prune -f',
            check: 'docker image',
            explanation: 'Dangling images = layers with no tag, created by builds or pulls where the same tag was updated. Safe to remove. `docker image prune -a` removes ALL unused images (including tagged ones with no running container) — more aggressive. After CI/CD pipelines that build many image versions, this can recover gigabytes.'
          },
          {
            instruction: 'Full cleanup: remove all unused resources',
            command: 'docker system prune -f --volumes',
            check: 'docker system',
            explanation: '`docker system prune --volumes` removes: stopped containers + dangling images + unused networks + unused volumes. CAREFUL with `--volumes`: this deletes data volumes not currently mounted by a container. Do NOT run on production DB containers without verifying volume usage. Check first: `docker volume ls` and `docker volume inspect` before purging.'
          },
          {
            instruction: 'Set up automatic image cleanup via cron',
            command: 'echo "0 3 * * 0 docker image prune -f --filter until=168h >> /var/log/docker-cleanup.log 2>&1" | sudo tee /etc/cron.d/docker-cleanup',
            check: 'cron',
            explanation: '`--filter until=168h` removes images older than 7 days — preserves recent images for quick rollback while cleaning old ones. Runs every Sunday at 3 AM. In production: also add `docker container prune -f --filter until=24h` to clean containers older than 1 day. Monitor /var/lib/docker size in CloudWatch with the unified agent.'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 11 · Git, CI/CD & Deployment Workflows
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod11',
    title: 'Git, CI/CD & Deployment',
    icon: '🚀',
    difficulty: 'advanced',
    description: '5 exercises',
    exercises: [

      {
        id: 'mod11-ex1',
        title: 'Git Fundamentals for DevOps',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Configure Git on a new EC2 instance, clone a repository, and understand the branching and merging workflow used in your team\'s CI/CD pipeline.',
        steps: [
          {
            instruction: 'Configure Git identity and preferences',
            command: 'git config --global user.name "DevOps Engineer" && git config --global user.email "devops@company.com" && git config --global core.editor vim && git config --global pull.rebase false',
            check: 'git config',
            explanation: '`--global` = applies to all repos for this user (saved in ~/.gitconfig). user.name/email shows in commit history. core.editor = editor for commit messages. pull.rebase false = use merge on pull (vs rebase). Verify: `git config --list`. For EC2 CI agents: set up SSH key auth to GitHub/GitLab instead of HTTPS tokens.'
          },
          {
            instruction: 'Clone a repository via SSH',
            command: 'git clone git@github.com:company/infrastructure.git /opt/infrastructure && cd /opt/infrastructure && git log --oneline -10',
            check: 'git clone',
            explanation: 'SSH clone uses the SSH key in ~/.ssh/. HTTPS clone uses token auth. SSH is preferred for automation — tokens expire, keys don\'t. `git log --oneline` shows compact commit history. For private repos on EC2: use IAM CodeCommit + IAM authentication, or GitHub deploy keys (read-only keys specific to one repo).'
          },
          {
            instruction: 'Create a feature branch and make a change',
            command: 'git checkout -b hotfix/fix-nginx-config && echo "# Updated config" >> /opt/infrastructure/README.md && git add -A && git commit -m "hotfix: correct nginx upstream configuration"',
            check: 'git checkout',
            explanation: '`-b` = create branch and switch to it. `git add -A` = stage all changes (new, modified, deleted files). Commit message format: `type(scope): description` (Conventional Commits). Types: feat, fix, hotfix, docs, chore, refactor. CI/CD pipelines often enforce this format for automatic changelog generation.'
          },
          {
            instruction: 'View changes and status before pushing',
            command: 'git status && git diff HEAD~1 HEAD --stat',
            check: 'git status',
            explanation: '`git status` shows: staged, unstaged, untracked files. `git diff HEAD~1 HEAD --stat` = files changed between previous and current commit. Before any `git push`, always verify: you\'re on the right branch (`git branch`), changes are what you intended (`git diff`), no sensitive data committed (`git log -p | grep -i password`).'
          },
          {
            instruction: 'Push the branch and check the log',
            command: 'git push origin hotfix/fix-nginx-config && git log --oneline --graph --all -15',
            check: 'git push',
            explanation: '`--graph --all` shows branching history visually. After push, create a Pull Request (GitHub) or Merge Request (GitLab) for code review. CI pipeline triggers automatically on push. The graph view shows divergence and merges — critical for understanding the state of a repo with many teams and branches.'
          }
        ]
      },

      {
        id: 'mod11-ex2',
        title: 'Deployment Script — Zero-Downtime Release',
        difficulty: 'advanced',
        time: '10 min',
        scenario: 'Write and run a production deployment script for a Node.js app that achieves zero downtime: pull new code → install deps → run tests → reload app server.',
        steps: [
          {
            instruction: 'Write a deployment script with error handling',
            command: 'cat > /usr/local/bin/deploy.sh << \'SCRIPT\'\n#!/bin/bash\nset -euo pipefail\nAPP_DIR="/opt/app"\nGIT_BRANCH="main"\necho "[$(date)] Starting deployment"\ncd $APP_DIR\ngit fetch origin\ngit checkout $GIT_BRANCH\ngit pull origin $GIT_BRANCH\nnpm ci --only=production\nnpm test\nsudo systemctl reload app\necho "[$(date)] Deployment complete"\nSCRIPT\nchmod +x /usr/local/bin/deploy.sh',
            check: 'deploy',
            explanation: '`set -euo pipefail`: e=exit on error, u=treat unset vars as error, o pipefail=pipe fails if any command fails. This trio makes deployment scripts safe — they stop at the first failure instead of continuing into a broken state. `npm ci` = clean install (deterministic, faster than npm install in CI). Test before reload: if tests fail, old version keeps running.'
          },
          {
            instruction: 'Deploy with rollback capability',
            command: 'cat > /usr/local/bin/rollback.sh << \'SCRIPT\'\n#!/bin/bash\nset -euo pipefail\nAPP_DIR="/opt/app"\necho "[$(date)] Rolling back to previous version"\ncd $APP_DIR\ngit log --oneline -5\nread -p "Enter commit hash to rollback to: " HASH\ngit checkout $HASH\nnpm ci --only=production\nsudo systemctl reload app\necho "[$(date)] Rollback complete to $HASH"\nSCRIPT\nchmod +x /usr/local/bin/rollback.sh',
            check: 'rollback',
            explanation: 'Rollback = deploy the previous git commit. Shows last 5 commits, asks for hash, checks out and redeploys. For zero-downtime rollback: use blue-green deployment (two environments, router flips between them) or canary deployment (route 10% of traffic to new version first). Kubernetes handles this with Rollout strategies.'
          },
          {
            instruction: 'Blue-green deployment with Nginx',
            command: 'cat /etc/nginx/conf.d/app.conf 2>/dev/null || echo "upstream app_blue  { server 127.0.0.1:3001; }\nupstream app_green { server 127.0.0.1:3002; }\nserver {\n  location / {\n    proxy_pass http://app_blue; # Switch to app_green after deploy\n  }\n}"',
            check: 'nginx',
            explanation: 'Blue-green: run two versions simultaneously. Blue (current) handles production traffic. Green starts with new code. After smoke tests on green: switch nginx upstream from app_blue to app_green with `nginx -s reload` (zero dropped connections). If green has issues: switch back in seconds. Requires 2x resources during transition.'
          },
          {
            instruction: 'Run smoke tests after deployment',
            command: 'for endpoint in /health /api/v1/status; do STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$endpoint); echo "GET $endpoint → HTTP $STATUS"; [ "$STATUS" = "200" ] || { echo "SMOKE TEST FAILED"; exit 1; }; done',
            check: 'curl',
            explanation: 'Smoke tests verify the most critical endpoints respond 200 after deployment. Curl exit code 0 = request succeeded (but HTTP 500 is also exit 0!). Use `-w "%{http_code}"` to get the actual HTTP status. If any smoke test fails: trigger the rollback script. In production: also test response time, not just HTTP 200.'
          },
          {
            instruction: 'Notify Slack/SNS on deployment success/failure',
            command: 'aws sns publish --topic-arn arn:aws:sns:us-east-1:123456:deployments --message "Deployment complete: $(git log -1 --oneline)" --region us-east-1 2>/dev/null || echo "SNS not configured"',
            check: 'aws sns',
            explanation: 'Post-deployment notification closes the loop: team knows the deployment succeeded (or failed + rollback triggered). AWS SNS triggers: Slack (via Lambda/ChatBot), PagerDuty, email. In GitHub Actions: use the `slackapi/slack-github-action` step. Deployment notifications in dashboards let on-call engineers correlate incidents with deployments.'
          }
        ]
      },

      {
        id: 'mod11-ex3',
        title: 'AWS CLI — Core Operations',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Automate AWS operations from the EC2 command line: describe instances, manage S3, read secrets, and query CloudWatch metrics.',
        steps: [
          {
            instruction: 'Configure AWS CLI (or use instance profile)',
            command: 'aws sts get-caller-identity',
            check: 'aws sts',
            explanation: '`aws sts get-caller-identity` shows: Account ID, User ID, ARN — confirming which IAM identity the CLI uses. On EC2 with an IAM instance profile: no credentials file needed — the CLI automatically gets temporary credentials from IMDS. This is best practice — never store AWS credentials on EC2 instances.'
          },
          {
            instruction: 'List and describe EC2 instances',
            command: 'aws ec2 describe-instances --query "Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType,PublicIpAddress,Tags[?Key==\\`Name\\`].Value|[0]]" --output table --region us-east-1',
            check: 'aws ec2',
            explanation: '`--query` uses JMESPath to filter JSON. `--output table` = formatted table. Key fields: InstanceId, State, Type, PublicIP, Name tag. Use `--filters "Name=instance-state-name,Values=running"` for only running instances. Essential for infrastructure inventory scripts and compliance reporting.'
          },
          {
            instruction: 'S3 operations — sync a directory',
            command: 'aws s3 sync /var/log/nginx/ s3://my-log-bucket/nginx/$(hostname)/ --exclude "*.gz.tmp" --sse AES256 --region us-east-1',
            check: 'aws s3',
            explanation: '`aws s3 sync` mirrors local directory to S3 (or S3 to local). Only uploads changed files. `--exclude` pattern excludes temp files. `--sse AES256` = server-side encryption (required for PII/compliance). `--delete` mirrors deletions. Use for: log archival, backup, static site deployment. S3 is infinitely scalable for log storage.'
          },
          {
            instruction: 'Read a secret from AWS Secrets Manager',
            command: 'aws secretsmanager get-secret-value --secret-id production/db-password --query SecretString --output text --region us-east-1',
            check: 'aws secretsmanager',
            explanation: 'Never store DB passwords in environment variables or config files on disk. Scripts should fetch secrets at runtime from Secrets Manager. `--output text` = raw string (no JSON wrapper). In Python: `boto3.client("secretsmanager").get_secret_value(SecretId="production/db-password")`. IAM policy controls who can read each secret.'
          },
          {
            instruction: 'Query CloudWatch metrics for CPU',
            command: 'aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization --dimensions Name=InstanceId,Value=$(curl -s http://169.254.169.254/latest/meta-data/instance-id) --start-time $(date -u -d "1 hour ago" +%Y-%m-%dT%H:%M:%SZ) --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) --period 300 --statistics Average --region us-east-1',
            check: 'aws cloudwatch',
            explanation: 'Queries 1 hour of CPU data in 5-minute intervals. IMDS provides the current instance ID (no hardcoding). Output: array of {Timestamp, Average, Unit} datapoints. Use in scripts to check if CPU is spiking before or after a deployment. Combine with `jq` for sorting: `| jq ".Datapoints | sort_by(.Timestamp)".'
          }
        ]
      },

      {
        id: 'mod11-ex4',
        title: 'Ansible Basics — Config Management',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'Use Ansible from your EC2 bastion to configure a fleet of application servers: install nginx, deploy config, and verify the state.',
        steps: [
          {
            instruction: 'Install Ansible on the control node',
            command: 'sudo apt-get install -y ansible && ansible --version',
            check: 'ansible',
            explanation: '`ansible --version` shows Ansible version, Python version, and config file location. On Ubuntu, the apt version may be older — for latest: `pip3 install ansible` in a venv. Ansible is agentless: it uses SSH to connect to managed nodes. Control node (here: EC2 bastion) needs SSH access to managed nodes.'
          },
          {
            instruction: 'Create an inventory file',
            command: 'cat > /tmp/inventory.ini << EOF\n[webservers]\n10.0.1.10 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/ec2.pem\n10.0.1.11 ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/ec2.pem\n\n[all:vars]\nansible_python_interpreter=/usr/bin/python3\nEOF',
            check: 'inventory',
            explanation: 'Inventory defines managed hosts. Groups let you target subsets: `ansible webservers -m ping`. Variables per group or host override each other (host_vars > group_vars > inventory vars). In production: use AWS EC2 dynamic inventory (boto3 plugin) — automatically discovers instances by tag instead of static IP lists.'
          },
          {
            instruction: 'Test connectivity to all managed nodes',
            command: 'ansible -i /tmp/inventory.ini all -m ping',
            check: 'ansible',
            explanation: 'Ansible `ping` module tests SSH connectivity and Python availability (not network ping). Returns "pong" on success. Common failures: wrong SSH key, user can\'t SSH, Python not installed, wrong user. Use `--ask-become-pass` if sudo requires a password. In CI/CD: SSH keys are stored in CI secrets, not on disk.'
          },
          {
            instruction: 'Run an ad-hoc command on all servers',
            command: 'ansible -i /tmp/inventory.ini webservers -m shell -a "systemctl status nginx --no-pager | head -5" --become',
            check: 'ansible',
            explanation: '`-m shell` = run shell command. `-a "command"` = command string. `--become` = sudo. Ad-hoc commands for: emergency restarts, quick checks, one-off tasks. For repeatable operations, write a playbook. `-m command` is safer than `-m shell` (no shell expansion) but doesn\'t support pipes/redirects.'
          },
          {
            instruction: 'Write and run an Ansible playbook',
            command: 'cat > /tmp/nginx-playbook.yml << EOF\n---\n- name: Configure nginx webservers\n  hosts: webservers\n  become: true\n  tasks:\n    - name: Install nginx\n      apt:\n        name: nginx\n        state: present\n        update_cache: yes\n    - name: Start and enable nginx\n      systemd:\n        name: nginx\n        state: started\n        enabled: true\nEOF\nansible-playbook -i /tmp/inventory.ini /tmp/nginx-playbook.yml --check',
            check: 'ansible-playbook',
            explanation: '`--check` = dry run (shows what would change, doesn\'t change anything). The `apt` module is idempotent: won\'t reinstall if nginx is already present. `state: present` = ensure installed. `state: absent` = ensure removed. `state: latest` = upgrade if available. Ansible is idempotent: safe to run multiple times — only changes what needs changing.'
          }
        ]
      },

      {
        id: 'mod11-ex5',
        title: 'GitHub Actions — CI/CD on EC2',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'Set up a GitHub Actions self-hosted runner on EC2 and understand the full CI/CD pipeline: build → test → Docker build → push to ECR → deploy.',
        steps: [
          {
            instruction: 'Install a GitHub Actions self-hosted runner',
            command: 'mkdir -p /opt/github-runner && cd /opt/github-runner && curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/download/v2.312.0/actions-runner-linux-x64-2.312.0.tar.gz && tar xzf actions-runner-linux-x64.tar.gz && ls',
            check: 'github-runner',
            explanation: 'Self-hosted runner = your EC2 instance becomes a CI/CD worker that GitHub Actions schedules jobs on. Benefits over GitHub-hosted runners: access to private VPC resources, persistent toolcaches, more RAM/CPU, faster builds (no cold start). Requires outbound HTTPS to github.com. Best practice: use ephemeral runners (one job then terminate).'
          },
          {
            instruction: 'Configure the runner for your repository',
            command: './config.sh --url https://github.com/org/repo --token YOUR_RUNNER_TOKEN --name "ec2-runner" --labels "ubuntu-22.04,self-hosted,x64" --unattended',
            check: 'config.sh',
            explanation: 'Runner token is a one-time use registration token from GitHub → Settings → Actions → Runners → New runner. `--labels` allows workflows to target this runner: `runs-on: [self-hosted, ubuntu-22.04]`. `--unattended` = no interactive prompts. In production: use GitHub App for runner registration (supports auto-registration at org level).'
          },
          {
            instruction: 'Install runner as a systemd service',
            command: 'sudo /opt/github-runner/svc.sh install ubuntu && sudo /opt/github-runner/svc.sh start && sudo /opt/github-runner/svc.sh status',
            check: 'svc.sh',
            explanation: '`svc.sh install` creates /etc/systemd/system/actions.runner.*.service. Runs as the specified user (ubuntu). Auto-starts on reboot. Logs via journalctl: `journalctl -u actions.runner.*`. For ephemeral runners at scale: use `actions-runner-controller` (on EKS) or `terraform-aws-github-runner` module which auto-scales EC2 runners based on job queue.'
          },
          {
            instruction: 'Write a CI/CD workflow file',
            command: 'cat > /tmp/workflow.yml << EOF\nname: Deploy to EC2\non:\n  push:\n    branches: [main]\njobs:\n  deploy:\n    runs-on: [self-hosted, ubuntu-22.04]\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run tests\n        run: npm ci && npm test\n      - name: Build Docker image\n        run: docker build -t app:$GITHUB_SHA .\n      - name: Push to ECR\n        run: |\n          aws ecr get-login-password | docker login --username AWS --password-stdin $ECR_REGISTRY\n          docker tag app:$GITHUB_SHA $ECR_REGISTRY/app:$GITHUB_SHA\n          docker push $ECR_REGISTRY/app:$GITHUB_SHA\n      - name: Deploy\n        run: sudo systemctl reload app\nEOF\ncat /tmp/workflow.yml',
            check: 'workflow',
            explanation: 'Workflow file goes in .github/workflows/deploy.yml. Triggers on push to main. `$GITHUB_SHA` = full commit SHA (image tag = exact code version, traceable). ECR_REGISTRY is a GitHub secret. The deploy step assumes the runner user has permission to reload the service. In production: separate jobs for test/build/deploy with full OIDC auth for AWS.'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 12 · Performance Tuning & SRE Observability
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod12',
    title: 'Performance & Observability',
    icon: '📊',
    difficulty: 'advanced',
    description: '5 exercises',
    exercises: [

      {
        id: 'mod12-ex1',
        title: 'The USE Method — Systematic Performance Analysis',
        difficulty: 'advanced',
        time: '10 min',
        scenario: 'Application latency degraded from 50ms to 2000ms. Use the USE method (Utilization, Saturation, Errors) to systematically find the bottleneck.',
        steps: [
          {
            instruction: 'Check CPU: Utilization, Saturation, Errors',
            command: 'mpstat -P ALL 1 3 && sar -q 1 3 2>/dev/null | tail -10',
            check: 'mpstat',
            explanation: 'USE Method for CPU: Utilization = `mpstat` user+sys %. Saturation = `sar -q` run queue (processes waiting for CPU). Errors = `sar -w` context switches/sec (high = overhead). CPU saturation (run queue > CPU count) = added latency even with low utilization. Install sysstat: `sudo apt install sysstat`.'
          },
          {
            instruction: 'Check Memory: Utilization, Saturation',
            command: 'free -h && vmstat 1 3 && cat /proc/meminfo | grep -E "MemAvailable|SwapFree|Dirty"',
            check: 'free',
            explanation: 'Memory USE: Utilization = used RAM %. Saturation = swap activity (vmstat si/so > 0 = saturated). Errors = ECC memory errors (checked via `edac-util` on bare metal — not visible in EC2). Low MemAvailable (<500MB) + swap activity = memory bottleneck. Solution: reduce cache sizes, scale up instance type, find leaks.'
          },
          {
            instruction: 'Check Storage I/O: Utilization and Saturation',
            command: 'iostat -xz 1 3 2>/dev/null | grep -A50 "Device"',
            check: 'iostat',
            explanation: 'iostat key columns: %util (disk utilization — > 80% = saturated), await (average I/O wait ms — normally < 10ms on EBS gp3), r/s + w/s (IOPS). On EC2: EBS gp3 = 3000 IOPS baseline. If %util=100% and await=100ms+, you\'ve hit IOPS limits. Solution: gp3 with provisioned IOPS (up to 16000), or io2 volume.'
          },
          {
            instruction: 'Check Network: Utilization and Errors',
            command: 'sar -n DEV 1 3 2>/dev/null && ip -s link show eth0',
            check: 'sar',
            explanation: 'Network USE: Utilization = `sar -n DEV` rxkB/s + txkB/s vs instance bandwidth limit. Saturation = dropped packets (`ip -s link` RX/TX drops > 0). Errors = `ip -s link` errors field. EC2 network bandwidth varies by instance type (t3.medium = ~500Mbps, c5n.18xlarge = 100Gbps). Check CloudWatch: NetworkIn/NetworkOut and NetworkPacketsDropped.'
          },
          {
            instruction: 'Identify the bottleneck with dstat overview',
            command: 'dstat --cpu --mem --net --disk --load 1 5 2>/dev/null || vmstat -w 1 5',
            check: 'dstat',
            explanation: '`dstat` shows CPU, memory, network, and disk in one view — immediately shows which resource is saturated. Install: `sudo apt install dstat`. Look for the column that\'s pegged at max while others are normal — that\'s your bottleneck. Screenshot dstat output when filing performance issues: it\'s the most information-dense single-line metric tool.'
          }
        ]
      },

      {
        id: 'mod12-ex2',
        title: 'Nginx Performance Tuning',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'Nginx is handling 10,000 req/s but dropping connections at peak load. Tune nginx for high throughput and low latency.',
        steps: [
          {
            instruction: 'Benchmark baseline performance with wrk',
            command: 'wrk -t4 -c100 -d30s http://localhost/ 2>/dev/null || ab -n 10000 -c 100 http://localhost/ 2>&1 | tail -20',
            check: 'wrk',
            explanation: '`wrk -t4 -c100 -d30s` = 4 threads, 100 concurrent connections, 30 second test. Reports: req/sec, latency percentiles (p50/p99), errors. Install wrk: `sudo apt install wrk`. Apache Bench (`ab`) is simpler but less accurate for latency percentiles. Baseline before tuning — you must measure to know if changes helped.'
          },
          {
            instruction: 'Tune nginx worker processes and connections',
            command: 'grep -E "worker_processes|worker_connections|use epoll|multi_accept" /etc/nginx/nginx.conf || echo "worker_processes auto;\nevents {\n  worker_connections 4096;\n  use epoll;\n  multi_accept on;\n}"',
            check: 'nginx',
            explanation: '`worker_processes auto` = one worker per CPU core (optimal). `worker_connections 4096` = max connections per worker. Total capacity = workers × connections. `use epoll` = Linux\'s most scalable I/O event model (default on Linux, explicit is clearer). `multi_accept on` = accept multiple connections per epoll event (reduces accept() syscall overhead).'
          },
          {
            instruction: 'Enable gzip compression and caching headers',
            command: 'cat /etc/nginx/conf.d/performance.conf 2>/dev/null || echo "gzip on;\ngzip_types text/plain text/css application/json application/javascript;\ngzip_min_length 1000;\ngzip_comp_level 4;\nopen_file_cache max=10000 inactive=30s;\nopen_file_cache_valid 60s;\nkeepalive_timeout 65;\nkeepalive_requests 100;"',
            check: 'nginx',
            explanation: 'gzip reduces response size 60-80% for text/JSON (huge bandwidth + latency savings). `gzip_comp_level 4` = good compression ratio vs CPU (1=fast/less compression, 9=max/most CPU). `open_file_cache` caches file descriptors (avoid repeated open() syscalls for static files). `keepalive_timeout` = reuse TCP connections (avoids TCP handshake overhead per request).'
          },
          {
            instruction: 'Tune the OS for high connection concurrency',
            command: 'sudo sysctl -w net.core.somaxconn=65535 && sudo sysctl -w net.ipv4.tcp_max_syn_backlog=65535 && sudo sysctl -w net.ipv4.ip_local_port_range="1024 65535"',
            check: 'sysctl',
            explanation: 'somaxconn = max backlog for listen() call (default 128 → 65535). tcp_max_syn_backlog = SYN queue depth (handles SYN floods better). ip_local_port_range = available ephemeral ports for outgoing connections (affects nginx→upstream connections). Make permanent: add to /etc/sysctl.d/99-performance.conf. Without these: nginx drops connections before completing the TCP handshake.'
          },
          {
            instruction: 'Check nginx status module',
            command: 'curl http://localhost/nginx_status 2>/dev/null || echo "Enable: stub_status in nginx.conf server block"',
            check: 'nginx_status',
            explanation: 'nginx stub_status shows: active connections, accepts, handled, requests, reading/writing/waiting. Monitor: accepted connections increasing but handled staying flat = SYN backlog limit hit. Writing = responses in flight. Waiting = keepalive idle connections. Expose only to localhost or monitoring IPs, never public. Feed into Prometheus via nginx-prometheus-exporter.'
          }
        ]
      },

      {
        id: 'mod12-ex3',
        title: 'Prometheus & Node Exporter',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'Set up Prometheus Node Exporter on this EC2 instance to collect system metrics for your Grafana dashboard.',
        steps: [
          {
            instruction: 'Download and install node_exporter',
            command: 'cd /tmp && curl -LO https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz && tar xzf node_exporter-1.7.0.linux-amd64.tar.gz && sudo mv node_exporter-1.7.0.linux-amd64/node_exporter /usr/local/bin/ && node_exporter --version',
            check: 'node_exporter',
            explanation: 'node_exporter exposes 1000+ Linux metrics in Prometheus format at :9100/metrics. Metrics include: CPU per-core, disk I/O, filesystem usage, memory, network, NTP sync, process file descriptors, and hostname info. The standard for Linux monitoring in any Prometheus/Grafana stack. Install on every EC2 you want to monitor.'
          },
          {
            instruction: 'Create a systemd service for node_exporter',
            command: 'sudo tee /etc/systemd/system/node_exporter.service << EOF\n[Unit]\nDescription=Prometheus Node Exporter\nAfter=network.target\n\n[Service]\nUser=nobody\nExecStart=/usr/local/bin/node_exporter --web.listen-address=127.0.0.1:9100\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target\nEOF\nsudo systemctl daemon-reload && sudo systemctl enable --now node_exporter',
            check: 'node_exporter',
            explanation: 'Runs as nobody (minimal privileges). `--web.listen-address=127.0.0.1:9100` = only listens on loopback (configure Prometheus scraping via SSH tunnel or VPC-internal). Never expose :9100 publicly — metrics reveal system internals. In a VPC, restrict Security Group to allow inbound 9100 only from Prometheus server IP.'
          },
          {
            instruction: 'Verify metrics are being exported',
            command: 'curl -s http://localhost:9100/metrics | head -30 && curl -s http://localhost:9100/metrics | grep node_cpu_seconds_total | head -5',
            check: 'metrics',
            explanation: 'Metrics format: `metric_name{labels} value timestamp`. Labels enable filtering in PromQL: `node_cpu_seconds_total{cpu="0",mode="user"}`. Key metrics: node_cpu_seconds_total, node_memory_MemAvailable_bytes, node_filesystem_avail_bytes, node_network_receive_bytes_total. These become Grafana dashboard panels.'
          },
          {
            instruction: 'Write a PromQL query for CPU usage',
            command: 'echo \'100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)\'\necho "Meaning: CPU utilization % = 100 - idle %"\necho "rate() calculates per-second rate over 5 min window"\necho "avg by (instance) = average across all cores"',
            check: 'PromQL',
            explanation: 'PromQL (Prometheus Query Language): `rate()` = per-second rate over time window. `irate()` = instant rate (last 2 samples). `avg by (label)` = aggregate across dimensions. CPU = 100 - idle%. Memory available: `node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100`. Disk used%: `100 - node_filesystem_avail_bytes{mountpoint="/"}/node_filesystem_size_bytes{mountpoint="/"} * 100`.'
          },
          {
            instruction: 'Check current metrics for key health indicators',
            command: 'curl -s http://localhost:9100/metrics | grep -E "^node_load1 |^node_memory_MemAvailable|^node_filesystem_avail_bytes.*root|^node_network_receive_bytes_total"',
            check: 'metrics',
            explanation: 'Quick health snapshot: node_load1 = 1-minute load average (vs CPU count), node_memory_MemAvailable_bytes = available RAM, node_filesystem_avail_bytes for root = free disk bytes, node_network_receive_bytes_total = cumulative network RX. Compare these values against your alerting thresholds in real-time. These are the 4 golden signals: latency, traffic, errors, saturation.'
          }
        ]
      },

      {
        id: 'mod12-ex4',
        title: 'Kernel & OS Tuning for Production',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'High-traffic API server receiving 50,000 requests/sec. Tune the Linux kernel and OS for maximum network throughput and minimum latency.',
        steps: [
          {
            instruction: 'Apply network stack tuning',
            command: 'sudo tee /etc/sysctl.d/99-network-tuning.conf << EOF\nnet.core.somaxconn = 65535\nnet.core.rmem_max = 134217728\nnet.core.wmem_max = 134217728\nnet.ipv4.tcp_rmem = 4096 87380 67108864\nnet.ipv4.tcp_wmem = 4096 65536 67108864\nnet.ipv4.tcp_tw_reuse = 1\nnet.ipv4.ip_local_port_range = 1024 65000\nnet.ipv4.tcp_max_syn_backlog = 65535\nEOF\nsudo sysctl -p /etc/sysctl.d/99-network-tuning.conf',
            check: 'sysctl',
            explanation: 'Network tuning: rmem/wmem_max = TCP socket buffer sizes (134MB for high-BDP networks). tcp_rmem/tcp_wmem = min/default/max per-socket buffers. tcp_tw_reuse = reuse TIME_WAIT sockets for outgoing connections (safe for clients, reduces port exhaustion). ip_local_port_range = range of ephemeral ports (more ports = more concurrent outgoing connections).'
          },
          {
            instruction: 'Tune virtual memory and swappiness',
            command: 'sudo sysctl -w vm.swappiness=10 && sudo sysctl -w vm.dirty_ratio=15 && sudo sysctl -w vm.dirty_background_ratio=5 && echo "vm.swappiness=10\nvm.dirty_ratio=15\nvm.dirty_background_ratio=5" | sudo tee /etc/sysctl.d/99-vm-tuning.conf',
            check: 'sysctl',
            explanation: 'vm.swappiness=10 = prefer to keep processes in RAM over using swap. dirty_ratio=15 = start blocking writes at 15% dirty pages. dirty_background_ratio=5 = start flushing at 5% dirty pages in background. For databases: use vm.swappiness=1 (almost never swap). For EC2 with no EBS IOPS to spare: lower dirty ratios to reduce write I/O spikes.'
          },
          {
            instruction: 'Optimize disk scheduler for EBS volumes',
            command: 'for disk in /sys/block/*/queue/scheduler; do echo none | sudo tee $disk; done && cat /sys/block/xvda/queue/scheduler',
            check: 'scheduler',
            explanation: 'I/O scheduler: `none` (no reordering — ideal for SSDs/NVMe/EBS that have their own internal queue), `mq-deadline` (good for SSDs with low latency requirements), `bfq` (best for desktop/HDDs). EBS is SSD-backed — use `none` (noop). The default `mq-deadline` adds unnecessary latency overhead for EBS volumes.'
          },
          {
            instruction: 'Enable and configure swap on EC2 (emergency RAM)',
            command: 'sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile && echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab && free -h',
            check: 'swap',
            explanation: '4GB swapfile as a safety net (not primary memory). EBS swap is slow (~1ms seek) vs RAM (ns) — it prevents OOM kills but causes performance degradation. In production: swap to EBS is a last resort. Better: right-size the instance. `vm.swappiness=10` ensures swap only used under real memory pressure. Check swap use: `vmstat 1 5 | awk "{print $7, $8}"`.'
          },
          {
            instruction: 'Verify all tuning applied correctly',
            command: 'sysctl net.core.somaxconn vm.swappiness net.ipv4.tcp_tw_reuse && cat /sys/block/xvda/queue/scheduler && free -h | grep Swap',
            check: 'sysctl',
            explanation: 'Always verify after applying sysctl changes — some settings require specific kernel versions or are overridden by other settings. The sysctl -p output you see during apply may show warnings for unsupported parameters. Tune iteratively: measure baseline → apply one change → measure again → keep or revert. Never apply all tuning at once without validation.'
          }
        ]
      },

      {
        id: 'mod12-ex5',
        title: 'SRE: Error Budgets & Runbooks',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'Your SLA is 99.9% uptime. Calculate your error budget, set up SLO tracking, and create a runbook for the most common production incident.',
        steps: [
          {
            instruction: 'Calculate your monthly error budget',
            command: 'python3 -c "\nsla = 99.9\nmonths_min = 30 * 24 * 60\nbudget_min = months_min * (1 - sla/100)\nprint(f\'SLA: {sla}%\')\nprint(f\'Monthly error budget: {budget_min:.1f} minutes ({budget_min*60:.0f} seconds)\')\nprint(f\'Weekly budget: {budget_min/4:.1f} minutes\')\n"',
            check: 'python3',
            explanation: '99.9% SLA = 43.8 minutes/month downtime allowed. 99.99% = 4.38 minutes/month. 99.999% (5 nines) = 26 seconds/month. Error budget = 100% - SLA%. When budget exhausted: freeze deployments (stop burning budget). When budget has room: deploy freely. Error budgets incentivize reliability because they give the exact cost of instability.'
          },
          {
            instruction: 'Write your first SLI/SLO definition',
            command: 'cat > /tmp/slo.yaml << EOF\nslo:\n  name: "API Availability"\n  sli:\n    description: "HTTP 2xx responses / total requests (excluding /health)"\n    query: "sum(rate(http_requests_total{status=~\'2..\'}[5m])) / sum(rate(http_requests_total[5m]))"\n  objective: 99.9\n  window: 30d\n  alerting:\n    burnrate_threshold_1h: 14.4\n    burnrate_threshold_6h: 6\nEOF\ncat /tmp/slo.yaml',
            check: 'slo',
            explanation: 'SLI (Service Level Indicator): the metric we measure (success rate). SLO (Service Level Objective): the target (99.9%). Burn rate alerting: if you\'re burning budget 14.4x faster than normal over 1 hour → page immediately (at that rate, monthly budget exhausted in 2 days). Standard openSLO format. Implement in Prometheus with sloth.dev or pyrra.'
          },
          {
            instruction: 'Create a production runbook entry',
            command: 'cat > /tmp/runbook-high-latency.md << EOF\n# Runbook: High API Latency\n## Trigger\nAlert: p99 latency > 2000ms for 5 minutes\n## Investigation Steps\n1. Check CPU: mpstat -P ALL 1 3\n2. Check Memory: free -h && vmstat 1 3\n3. Check DB pool: ss -tnp | grep 5432 | wc -l\n4. Check upstream: curl -w "%%{time_total}" -s -o /dev/null http://db:5432\n5. Check nginx error log: tail -50 /var/log/nginx/error.log\n## Common Causes\n- Database connection pool exhausted\n- Memory pressure causing GC pauses\n- Disk I/O saturation (run: iostat -xz 1 3)\n## Resolution\n- Restart app: sudo systemctl restart app\n- Scale DB pool: edit DATABASE_POOL_SIZE\n- Escalate if unresolved after 15 min\nEOF\ncat /tmp/runbook-high-latency.md',
            check: 'runbook',
            explanation: 'Runbooks are the foundation of operational excellence. A good runbook: has a clear trigger (the alert condition), investigation steps in order (triage → diagnose → fix), common causes with their signatures, resolution steps with exact commands. Store in your team wiki (Confluence, Notion, GitHub Wiki) and link directly from the alert.'
          },
          {
            instruction: 'Check MTTR with incident duration analysis',
            command: 'echo "MTTR (Mean Time To Restore) calculation:"\nstart=$(date -d "2026-03-14 02:00:00" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "2026-03-14 02:00:00" +%s 2>/dev/null || echo 1710378000)\nend=$(date -d "2026-03-14 02:47:00" +%s 2>/dev/null || date -j -f "%Y-%m-%d %H:%M:%S" "2026-03-14 02:47:00" +%s 2>/dev/null || echo 1710380820)\ndiff=$((end - start))\necho "Incident duration: $((diff / 60)) minutes"\necho "Budget burned: $((diff / 60)) of 43.8 minutes ($(python3 -c "print(f\'{($diff/60)/43.8*100:.1f}%\')" 2>/dev/null))"\n',
            check: 'MTTR',
            explanation: 'MTTR = time from incident start (alert fires) to resolution (alert clears). Low MTTR > High MTTR prevention: good runbooks + fast escalation paths + practiced incident procedures. Four key SRE metrics: MTTD (detection), MTTR (repair), MTBF (between failures), change failure rate. Track these in your incident management tool (PagerDuty, OpsGenie, or Linear).'
          },
          {
            instruction: 'Set up a CloudWatch composite alarm',
            command: 'aws cloudwatch put-composite-alarm --alarm-name "ProductionHealthCritical" --alarm-description "Multiple production indicators critical" --alarm-rule "ALARM(CPUUtilizationHigh) AND ALARM(MemoryUtilizationHigh)" --alarm-actions arn:aws:sns:us-east-1:123:pagerduty --region us-east-1 2>/dev/null && echo "Composite alarm created - fires only when BOTH CPU AND Memory are high"',
            check: 'aws cloudwatch',
            explanation: 'Composite alarms combine multiple alarms with AND/OR logic — reduces alert fatigue. Single CPU spike isn\'t actionable. CPU AND Memory both high = real performance crisis. Composite alarm pages on-call only when multiple signals confirm the problem. Also useful: alarm when error rate is high AND latency is high (real incident vs transient spike).'
          }
        ]
      }
    ]
  }
];
