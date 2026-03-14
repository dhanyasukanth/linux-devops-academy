/* ============================================================
   CURRICULUM PART 3  —  Modules 7 · 8 · 9
   7: Logs & Log Analysis
   8: Troubleshooting — Real Incident Scenarios
   9: Security Hardening & Auditing
   ============================================================ */

window.CURRICULUM_PART3 = [

  /* ══════════════════════════════════════════════════════════
     MODULE 7 · Logs & Log Analysis
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod7',
    title: 'Logs & Log Analysis',
    icon: '📋',
    difficulty: 'intermediate',
    description: '5 exercises',
    exercises: [

      {
        id: 'mod7-ex1',
        title: 'System Logs — syslog, auth, kern',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'A service crashed overnight. You need to find out what happened using system logs.',
        steps: [
          {
            instruction: 'View system-wide log file',
            command: 'sudo tail -100 /var/log/syslog | grep -i "error\\|fail\\|critical"',
            check: 'syslog',
            explanation: '/var/log/syslog is the main system log on Ubuntu — captures kernel messages, init messages, and syslog-facility logs from all services. grep -i makes it case-insensitive. In production: ship syslog to CloudWatch Logs, Datadog, or ELK Stack — instances terminate and local logs are gone.'
          },
          {
            instruction: 'Check authentication/SSH log',
            command: 'sudo grep -E "Failed|Accepted|Invalid" /var/log/auth.log | tail -30',
            check: 'auth.log',
            explanation: '/var/log/auth.log records: SSH login attempts (success/failure), sudo usage, PAM authentication, su attempts. Pattern for brute-force: many "Failed password for root from X.X.X.X". Alert on this in production via CloudWatch metric filter. If you see "Accepted publickey" from unknown IPs, investigate immediately.'
          },
          {
            instruction: 'Check kernel ring buffer (hardware/driver messages)',
            command: 'sudo dmesg --ctime | tail -30',
            check: 'dmesg',
            explanation: '`dmesg` shows the kernel ring buffer. `--ctime` converts kernel timestamp to human-readable time. Find: driver errors ("ata error"), out-of-memory kills ("OOM killer"), disk errors ("EXT4-fs error"), network issues ("eth0: NETDEV WATCHDOG"). On EC2: EBS volume errors show here before the filesystem crashes.'
          },
          {
            instruction: 'Find out-of-memory (OOM) kills',
            command: 'sudo dmesg | grep -i "oom\\|killed process"',
            check: 'dmesg',
            explanation: 'Linux OOM Killer kills processes when RAM is exhausted. Log shows: "Out of memory: Kill process 1234 (java) score 500 or sacrifice child". Score based on memory usage and OOM score adj. To prevent critical process from being killed: `echo -17 > /proc/PID/oom_adj`. Long-term: add RAM or fix memory leak.'
          },
          {
            instruction: 'Read logs with journalctl (systemd journal)',
            command: 'sudo journalctl -u nginx --since "1 hour ago" --no-pager',
            check: 'journalctl',
            explanation: 'journalctl is the systemd journal query tool. `-u service` = filter by unit. `--since "2026-03-14 02:00"` = time filter. `-f` = follow (like tail -f). `-p err` = only errors and above. `-b` = since last boot. `--disk-usage` shows journal size. Structured JSON output: `journalctl -o json-pretty`.'
          }
        ]
      },

      {
        id: 'mod7-ex2',
        title: 'Application Log Parsing with grep & awk',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Nginx access logs show high error rates. You need to extract 5xx errors, find top offending IPs, and calculate error rate — all with shell tools.',
        steps: [
          {
            instruction: 'Count HTTP 500 errors in nginx access log',
            command: 'grep " 500 " /var/log/nginx/access.log | wc -l',
            check: 'grep',
            explanation: 'Simple grep + wc = error count in seconds. Fix: `grep "$(date +%d/%b/%Y)" /var/log/nginx/access.log | grep " 500 " | wc -l` counts only today\'s errors. In production: ship logs to CloudWatch and use metric filters — shell parsing is for quick ad-hoc investigation.'
          },
          {
            instruction: 'Find top 10 IPs generating errors',
            command: 'awk "$9 ~ /^5/ {print $1}" /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10',
            check: 'awk',
            explanation: 'awk processes structured text. `$9` = 9th field (HTTP status code in combined log format). `~ /^5/` matches 5xx. `$1` = first field (client IP). `sort | uniq -c | sort -rn` = count unique values, sort by count descending. This pipeline is a fundamental DevOps skill.'
          },
          {
            instruction: 'Extract slow requests (response time > 1s)',
            command: 'awk "{if ($NF > 1.0) print $0}" /var/log/nginx/access.log | tail -20',
            check: 'awk',
            explanation: '$NF = last field (requires nginx configured with `$request_time` at end). Requests taking over 1 second indicate backend slowness or DB query issues. For more detail: log `$upstream_response_time` separately to distinguish nginx overhead from backend latency.'
          },
          {
            instruction: 'Get the most requested URLs',
            command: 'awk "{print $7}" /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -20',
            check: 'awk',
            explanation: '`$7` = request URI (field 7 in combined log format: IP, ident, user, time, request, status, bytes, referer, user-agent). Most-requested URLs reveal traffic patterns and where to focus caching or optimization. High count on `/api/v1/users` with 500s = DB problem.'
          },
          {
            instruction: 'Calculate 404 error rate as percentage',
            command: 'awk "BEGIN{total=0;err=0} {total++; if($9==404) err++} END{printf \"404 Rate: %.2f%%\\n\", (err/total)*100}" /var/log/nginx/access.log',
            check: 'awk',
            explanation: 'awk BEGIN/END blocks run before/after processing. This calculates the percentage of 404 responses. A high 404 rate signals: broken links, crawlers probing for vulnerabilities, or a bad deployment. Alert if 404 rate exceeds 5% of traffic.'
          }
        ]
      },

      {
        id: 'mod7-ex3',
        title: 'Log Rotation & Management',
        difficulty: 'intermediate',
        time: '6 min',
        scenario: 'Nginx logs are growing unbounded and will fill the disk in 3 days. Set up log rotation and understand how it works.',
        steps: [
          {
            instruction: 'View the logrotate config for nginx',
            command: 'cat /etc/logrotate.d/nginx',
            check: 'logrotate',
            explanation: 'logrotate config defines: how often to rotate (daily/weekly), how many versions to keep (rotate 14), whether to compress (compress, delaycompress — delay 1 cycle so rsyslog can finish writing), what to do after rotation (postrotate: `nginx -s reopen`). Without rotation, logs grow forever.'
          },
          {
            instruction: 'Manually run log rotation (test)',
            command: 'sudo logrotate --force --verbose /etc/logrotate.d/nginx',
            check: 'logrotate',
            explanation: '`--force` ignores the schedule and rotates now. `--verbose` shows what it\'s doing. After rotation: access.log is renamed to access.log.1, new empty access.log is created, nginx gets SIGUSR1 to reopen log files. Test this in staging before trusting production rotation.'
          },
          {
            instruction: 'Set systemd journal size limits',
            command: 'sudo journalctl --vacuum-size=500M && sudo journalctl --disk-usage',
            check: 'journalctl',
            explanation: '`--vacuum-size` trims journal to target size. Permanent config: edit /etc/systemd/journald.conf: `SystemMaxUse=500M`, `SystemKeepFree=1G`, `MaxRetentionSec=30d`. Restart: `sudo systemctl restart systemd-journald`. On instances with limited disk, journal can silently eat all free space.'
          },
          {
            instruction: 'Configure syslog remote forwarding to CloudWatch',
            command: 'sudo apt-get install -y awslogs && sudo systemctl enable awslogsd',
            check: 'awslogs',
            explanation: 'AWS CloudWatch Logs agent ships local logs to CloudWatch. Config: /etc/awslogs/awslogs.conf defines which files to ship and to which log group. Alternative: CloudWatch unified agent (amazon-cloudwatch-agent) — more flexible, supports metrics too. Logs in CloudWatch survive instance termination.'
          },
          {
            instruction: 'Find logs that haven\'t been rotated and are large',
            command: 'find /var/log -name "*.log" -size +50M -not -name "*.gz" 2>/dev/null | xargs ls -lh',
            check: 'find',
            explanation: 'Finds uncompressed logs over 50MB — candidates for rotation or cleanup. Common offenders: applications that write their own logs outside /var/log/app (and aren\'t in logrotate.d), deprecated services left running, debug logging accidentally left on in production.'
          }
        ]
      },

      {
        id: 'mod7-ex4',
        title: 'Real-Time Monitoring with watch & multitail',
        difficulty: 'intermediate',
        time: '5 min',
        scenario: 'During a deployment you need to monitor multiple log files simultaneously and watch system resource changes in real time.',
        steps: [
          {
            instruction: 'Watch a command update every 2 seconds',
            command: 'watch -n 2 "ss -tnp | grep -c ESTAB"',
            check: 'watch',
            explanation: '`watch -n 2 cmd` runs cmd every 2 seconds and displays refreshing output. `-d` highlights changes between refreshes. Examples: `watch -n 1 "df -h"` (disk space ticker), `watch -n 2 "ps aux --sort=-%cpu | head -5"` (top CPU processes live). Press Ctrl+C to exit.'
          },
          {
            instruction: 'Simultaneously tail multiple log files',
            command: 'tail -f /var/log/nginx/access.log /var/log/nginx/error.log /var/log/syslog',
            check: 'tail',
            explanation: '`tail -f` with multiple files prefixes each line with the filename. Shows interleaved output from all logs. For color-coded multi-tail: install `multitail` (`sudo apt install multitail`). In production during a deployment: tail access.log + error.log + your app log simultaneously.'
          },
          {
            instruction: 'Filter tail output on the fly',
            command: 'tail -f /var/log/nginx/access.log | grep --line-buffered " 50[0-9] "',
            check: 'tail',
            explanation: '`--line-buffered` forces grep to output each matching line immediately (without buffering). Standard grep buffers — you\'d wait minutes for output. This streams only 5xx errors in real time during incident response. Chain more greps or awk for more filtering.'
          },
          {
            instruction: 'Monitor all syslog errors in real time',
            command: 'sudo journalctl -f -p err --no-hostname',
            check: 'journalctl',
            explanation: '`journalctl -f` follows the journal live. `-p err` = error priority and above (err, crit, alert, emerg). `--no-hostname` = cleaner output. This is better than `tail -f /var/log/syslog` because it catches structured logs from all systemd units in one stream.'
          }
        ]
      },

      {
        id: 'mod7-ex5',
        title: 'CloudWatch Logs & Metric Filters',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'You need to ship EC2 logs to CloudWatch, create a metric filter for errors, and set up an alarm that pages the on-call engineer.',
        steps: [
          {
            instruction: 'Install the CloudWatch unified agent',
            command: 'sudo apt-get install -y amazon-cloudwatch-agent',
            check: 'cloudwatch',
            explanation: 'The unified CloudWatch agent collects both logs (ships to CloudWatch Logs) and metrics (CPU, memory, disk — metrics not available by default in CloudWatch without the agent). Config: /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json. Start: `sudo systemctl start amazon-cloudwatch-agent`.'
          },
          {
            instruction: 'Configure log collection for nginx error log',
            command: 'sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-config-wizard',
            check: 'amazon-cloudwatch',
            explanation: 'The wizard generates a config JSON. It asks: which logs to collect, log group names, retention period, which metrics to collect. Manual config: set "file_path" to `/var/log/nginx/error.log`, "log_group_name" to `/ec2/nginx/error-log`. With IAM role: agent uses instance profile for auth (no credentials needed).'
          },
          {
            instruction: 'Tail logs from CloudWatch via AWS CLI',
            command: 'aws logs tail /ec2/nginx/error-log --follow --since 1h --region us-east-1',
            check: 'aws logs',
            explanation: '`aws logs tail --follow` streams CloudWatch Logs like `tail -f`. Works from your laptop or another instance — great for monitoring instances in private subnets without direct SSH. `--filter-pattern "[status=5*]"` filters CloudWatch-side for efficiency.'
          },
          {
            instruction: 'Create a metric filter for 5xx errors',
            command: 'aws logs put-metric-filter --log-group-name /ec2/nginx/access-log --filter-name "5xxErrors" --filter-pattern "[ip, id, user, timestamp, request, status_code=5*, size]" --metric-transformations metricName=5xxErrors,metricNamespace=NginxMetrics,metricValue=1 --region us-east-1',
            check: 'aws logs',
            explanation: 'Metric filters extract numbers from log text and publish as CloudWatch custom metrics. Pattern uses named capture groups. metricValue=1 = count (add Sum statistic). You can then create CloudWatch Alarms on NginxMetrics/5xxErrors. This enables alerting without external log aggregators.'
          },
          {
            instruction: 'Set CloudWatch alarm for high error rate',
            command: 'aws cloudwatch put-metric-alarm --alarm-name "Nginx5xxHigh" --alarm-description "Nginx 5xx error rate high" --metric-name 5xxErrors --namespace NginxMetrics --statistic Sum --period 300 --threshold 10 --comparison-operator GreaterThanThreshold --evaluation-periods 2 --alarm-actions arn:aws:sns:us-east-1:123456789:on-call --region us-east-1',
            check: 'aws cloudwatch',
            explanation: 'Creates alarm: if Sum of 5xxErrors > 10 in two consecutive 5-minute periods → trigger SNS action (page on-call). Period=300 = 5 minutes. EvaluationPeriods=2 avoids single-spike false alarms. SNS can trigger: email, SMS, PagerDuty, OpsGenie, Lambda (auto-remediation).'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 8 · Troubleshooting — Real Incident Scenarios
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod8',
    title: 'Incident Troubleshooting',
    icon: '🔥',
    difficulty: 'advanced',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod8-ex1',
        title: '🔥 Incident: High CPU — Find the Culprit',
        difficulty: 'advanced',
        time: '10 min',
        scenario: '🚨 ALERT: EC2 CPU at 98% for 15 minutes. Application response time > 30 seconds. CloudWatch alarm triggered. You\'re on-call. This is the runbook.',
        steps: [
          {
            instruction: 'Run the 60-second performance assessment',
            command: 'uptime && top -bn1 | head -20 && ps aux --sort=-%cpu | head -10',
            check: 'uptime',
            explanation: 'The 60-second assessment: `uptime` = load averages (1/5/15 min). If load > CPU count, we\'re saturated. `top -bn1` = snapshot of resource usage. `ps --sort=-%cpu` = which process is consuming the most CPU. Load average > CPU_COUNT = CPU bound. If load is low but CPU is high = short bursts.'
          },
          {
            instruction: 'Get a live perf view with detailed CPU breakdown',
            command: 'mpstat -P ALL 1 3',
            check: 'mpstat',
            explanation: '`mpstat -P ALL` = per-CPU statistics. Shows user%, sys%, iowait%, idle% per CPU core. All cores at 100% user = runaway process. All cores at high iowait% = disk I/O bottleneck (not CPU). High sys% = kernel CPU usage (network processing, syscall overhead). Install: `sudo apt install sysstat`.'
          },
          {
            instruction: 'Find what the top process is doing',
            command: 'strace -p $(ps aux --sort=-%cpu | awk "NR==2{print $2}") -c -T 5',
            check: 'strace',
            explanation: '`strace -p PID` traces system calls. `-c` = count mode (summary after 5 seconds). `-T` = show time per syscall. This tells you: is the process doing I/O (read/write), network (recv/send), CPU computation (no syscalls = pure CPU), or stuck waiting (futex, epoll_wait)? Critical for diagnosing what a black-box process is doing.'
          },
          {
            instruction: 'Check if it\'s a kernel CPU issue',
            command: 'perf top -n 20 2>/dev/null || sudo sar -u 1 5',
            check: 'sar',
            explanation: '`perf top` shows live CPU hotspots (kernel functions). `sar -u 1 5` = CPU statistics every 1 second, 5 times (from sysstat). If kernel CPU is high: network interrupts from DDoS, I/O completion, or memory pressure triggering kernel activity. `sudo sar -r 1 5` shows RAM over time.'
          },
          {
            instruction: 'Kill the runaway process gracefully',
            command: 'sudo kill -15 $(ps aux --sort=-%cpu | awk "NR==2{print $2}")',
            check: 'kill',
            explanation: 'SIGTERM gives the process a chance to clean up. If no improvement in 30s → SIGKILL. IMPORTANT: identify the cause first (cryptominer? runaway Python script? OOM handler spinning?). Killing symptoms without understanding root cause leads to recurrence. Document PID, command, and CPU time in the incident ticket before killing.'
          },
          {
            instruction: 'Check CPU steal time (EC2-specific)',
            command: 'vmstat 1 5 | awk "{print $1, $15, $16, $17}" | head -10',
            check: 'vmstat',
            explanation: 'vmstat column 16 = steal time (st). Steal > 5% = your EC2 instance is competing with other VMs on the hypervisor for CPU cycles — NOT your application\'s fault. Solution: upgrade to a dedicated or larger instance type. Report to AWS if steal is consistently high (ec2-instance-connect or support ticket).'
          }
        ]
      },

      {
        id: 'mod8-ex2',
        title: '🔥 Incident: Disk Full — Emergency Recovery',
        difficulty: 'advanced',
        time: '10 min',
        scenario: '🚨 Production app throwing "No space left on device". MySQL can\'t write. Nginx can\'t write access logs. Find the problem and recover — without restarting the database.',
        steps: [
          {
            instruction: 'Triage: find which mount is full',
            command: 'df -h && df -i',
            check: 'df',
            explanation: 'First check: `df -h` for disk space, `df -i` for inodes. Could be either. Note which mount point is at 100%. Typically / or /var. If inodes: millions of small files (usually /tmp, /var/spool, or a misconfigured app writing temp files). Inode-full with space available = confusing for devs but terminal for the OS.'
          },
          {
            instruction: 'Find the biggest directories under /var (the usual culprit)',
            command: 'sudo du -sh /var/* 2>/dev/null | sort -rh | head -10',
            check: 'du',
            explanation: '/var contains: /var/log (logs), /var/lib/docker (Docker images/containers), /var/lib/mysql (database), /var/cache/apt (package cache). Sort by size determines where to recover space first. A common secret offender: /var/lib/docker at 50GB+ on instances that run Docker without cleaning images.'
          },
          {
            instruction: 'Find open-but-deleted files still holding space',
            command: 'sudo lsof | grep deleted | awk "{print $7, $9}" | sort -rn | head -10',
            check: 'lsof',
            explanation: 'CRITICAL disk-full trick: when a process has a file open and it\'s deleted, the space isn\'t freed until the process closes it. `lsof | grep deleted` finds these. To free space immediately WITHOUT killing the process: `truncate -s 0 /proc/[PID]/fd/[FD#]`. This is a production life-saver.'
          },
          {
            instruction: 'Clean Docker images and stopped containers',
            command: 'docker system prune -f 2>/dev/null && docker volume prune -f 2>/dev/null',
            check: 'docker',
            explanation: '`docker system prune` removes: stopped containers, unused networks, dangling images. Often recovers 10-50GB instantly. `volume prune` removes unused volumes. Add `-a` to also remove unused (not just dangling) images — more aggressive but safe if you can repull. Run `docker system df` first to see how much will be freed.'
          },
          {
            instruction: 'Truncate the largest log files safely',
            command: 'sudo find /var/log -name "*.log" -size +100M | xargs -I{} sudo truncate -s 0 {}',
            check: 'truncate',
            explanation: '`truncate -s 0` empties files without deleting them. Safe for running processes. Targets all .log files over 100MB. After truncating: `df -h` should show recovered space immediately. For the future: verify logrotate is configured correctly for all these files. A truncated log = lost history (document in incident).'
          },
          {
            instruction: 'Expand EBS volume without downtime (AWS)',
            command: 'aws ec2 modify-volume --volume-id vol-0abc123def456 --size 50 --region us-east-1',
            check: 'aws ec2',
            explanation: 'AWS allows live EBS volume resizing — no reboot, no downtime. After modify-volume, you must also extend the filesystem: 1) `sudo growpart /dev/xvda 1` (extend partition), 2) `sudo resize2fs /dev/xvda1` (ext4) or `sudo xfs_growfs /` (XFS). AWS console: EC2 → Volumes → Modify. Best long-term fix for disk full incidents.'
          }
        ]
      },

      {
        id: 'mod8-ex3',
        title: '🔥 Incident: App Not Responding on Port 80',
        difficulty: 'advanced',
        time: '9 min',
        scenario: '🚨 Load balancer health checks failing. EC2 instance stopped receiving traffic. Users getting 502. Walk through the investigation from network layer to application layer.',
        steps: [
          {
            instruction: 'Check if nginx is running and listening',
            command: 'sudo systemctl status nginx && sudo ss -tlnp | grep :80',
            check: 'systemctl',
            explanation: 'Two questions: Is nginx running? Is it listening on port 80? If status=active but ss shows nothing on :80, nginx config has a bind error. If status=failed, check: `sudo journalctl -u nginx --no-pager -n 50`. If neither, nginx was never started. Start: `sudo systemctl start nginx`.'
          },
          {
            instruction: 'Test nginx config for syntax errors',
            command: 'sudo nginx -t',
            check: 'nginx',
            explanation: '`nginx -t` validates config without restarting. Output: "syntax is ok" + "test is successful" = safe to reload. Any error? Fix it: it\'s the reason nginx won\'t start. Common issues: missing SSL certificate, wrong upstream address, syntax error in custom config. Never restart nginx in production without running -t first.'
          },
          {
            instruction: 'Check the nginx error log for root cause',
            command: 'sudo tail -50 /var/log/nginx/error.log',
            check: 'nginx',
            explanation: 'nginx error.log is the source of truth. Look for: "connect() failed (111: Connection refused)" = backend app down. "no live upstreams" = all backends unhealthy. "SSL_CTX_use_certificate" = TLS cert issue. "bind() to 0.0.0.0:80 failed (98: Address already in use)" = port conflict.'
          },
          {
            instruction: 'Find what process is using port 80 if nginx fails to bind',
            command: 'sudo fuser 80/tcp && sudo lsof -i :80',
            check: 'fuser',
            explanation: '`fuser 80/tcp` prints the PID using port 80. `lsof -i :80` shows more detail. If Apache is on port 80 and nginx tried to start too: conflict. Solution: stop Apache or configure one of them to use a different port. Two processes can\'t bind the same IP:port.'
          },
          {
            instruction: 'Check upstream backend health',
            command: 'curl -sv http://localhost:3000/health 2>&1 | grep -E "< HTTP|curl: |Connected|timed out"',
            check: 'curl',
            explanation: 'If nginx is a reverse proxy: test the upstream directly. If localhost:3000 returns 200, nginx proxy config is wrong. If connection refused, the app isn\'t running. If timeout, app is running but hanging. This narrows from "502 bad gateway" to either nginx issue or backend issue — two very different fixes.'
          },
          {
            instruction: 'Reload nginx gracefully after fix',
            command: 'sudo nginx -t && sudo systemctl reload nginx',
            check: 'nginx',
            explanation: '`reload` sends SIGHUP: nginx master re-reads config, starts new workers with new config, gracefully drains old workers. Zero dropped connections. `restart` kills all workers immediately — causes brief downtime. ALWAYS use reload for config changes in production. Only use restart for binary upgrades.'
          }
        ]
      },

      {
        id: 'mod8-ex4',
        title: '🔥 Incident: SSH Connection Refused',
        difficulty: 'advanced',
        time: '9 min',
        scenario: '🚨 You can\'t SSH into a production EC2 instance. Load balancer shows it running but healthy. You need multiple approaches to regain access without terminating the instance.',
        steps: [
          {
            instruction: 'Diagnose the connection issue from your terminal',
            command: 'ssh -vvv ubuntu@<instance-ip> 2>&1 | head -40',
            check: 'ssh',
            explanation: '`-vvv` = maximum verbosity. Output tells you where it fails: "Connecting to port 22" (TCP connect — SG blocking?), "Connection refused" (sshd not running), "Connection timed out" (SG or firewall blocking), "Unable to negotiate" (key exchange mismatch — old OpenSSH). This narrows from "can\'t SSH" to a specific layer.'
          },
          {
            instruction: 'Check EC2 instance reachability from AWS',
            command: 'aws ec2 describe-instance-status --instance-ids i-0abc123 --region us-east-1',
            check: 'aws ec2',
            explanation: 'AWS runs two status checks: instance status (instance hardware/OS) and system status (underlying host hardware). Both passing but SSH failing = OS-level issue (sshd crashed, iptables blocking). Any check failing = EC2 or OS problem. View EC2 console screenshot: `aws ec2 get-console-screenshot --instance-id i-0abc123`.'
          },
          {
            instruction: 'Use AWS SSM Session Manager as SSH alternative',
            command: 'aws ssm start-session --target i-0abc123 --region us-east-1',
            check: 'aws ssm',
            explanation: 'SSM Session Manager provides shell access WITHOUT SSH port open (port 22 can be closed entirely). Requires: SSM Agent running + IAM role with AmazonSSMManagedInstanceCore. This is why you install SSM agent on every instance. No key management, no bastion host needed, sessions logged to S3/CloudWatch.'
          },
          {
            instruction: 'Restart sshd via SSM if you have session access',
            command: 'sudo systemctl restart sshd && sudo systemctl status sshd',
            check: 'sshd',
            explanation: 'Once in via SSM: restart sshd. If sshd was crashed: `sudo systemctl start sshd`. If config broke sshd: `sudo sshd -t` (test config), fix the error, then restart. Check sshd_config: `sudo grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"`. Then verify port 22 in Security Group allows your IP.'
          },
          {
            instruction: 'Check Security Group rules from inside the instance',
            command: 'curl -s http://169.254.169.254/latest/meta-data/security-groups && aws ec2 describe-security-groups --group-names $(curl -s http://169.254.169.254/latest/meta-data/security-groups) --region us-east-1 2>/dev/null',
            check: 'security-groups',
            explanation: 'IMDS exposes the attached Security Group names. Then AWS CLI (if IAM role has ec2:DescribeSecurityGroups) shows the rules. Verify port 22 is open for your IP or 0.0.0.0/0. Security Groups are stateful — inbound allow is sufficient. Check inbound rules: 22/tcp from 0.0.0.0/0 or your specific IP.'
          }
        ]
      },

      {
        id: 'mod8-ex5',
        title: '🔥 Incident: Memory Leak Investigation',
        difficulty: 'advanced',
        time: '9 min',
        scenario: '🚨 ALERT: Memory usage at 95% and climbing. CloudWatch shows steadily increasing memory over 6 hours. Application is Java/Node.js and hasn\'t been restarted in 2 weeks.',
        steps: [
          {
            instruction: 'Check current memory usage in detail',
            command: 'free -h && cat /proc/meminfo | grep -E "MemTotal|MemFree|MemAvailable|Cached|SwapTotal|SwapFree"',
            check: 'free',
            explanation: 'Key /proc/meminfo fields: MemAvailable (what applications can use — better than MemFree), Cached (page cache — aggressive, OS reclaims it), SwapTotal/Free (if swap is near full, performance is dire). Available < 200MB on a web server = take action now. Available < 100MB = emergency.'
          },
          {
            instruction: 'Find the top memory-consuming processes',
            command: 'ps aux --sort=-%mem | head -15 | awk "{printf \"%-8s %-5s %-5s %s\\n\", $1,$2,$4,$11}"',
            check: 'ps',
            explanation: '%MEM in ps = percentage of physical RAM used. RSS (Resident Set Size) = actual physical memory pages. VSZ = virtual address space (includes mapped files, shared libs). A Java process with RSS growing 50MB/day = likely memory leak. Take a heap dump before restarting: essential for root cause analysis.'
          },
          {
            instruction: 'Monitor memory growth over time',
            command: 'for i in 1 2 3 4 5; do ps -p $(pgrep -n java) -o pid,rss,vsz --no-headers 2>/dev/null | awk "{printf \"PID=%s RSS=%.0fMB VSZ=%.0fMB\\n\", $1,$2/1024,$3/1024}"; sleep 5; done',
            check: 'ps',
            explanation: 'Sampling RSS every 5 seconds confirms whether the process is actively leaking (growing each sample) vs just using a lot of memory statically. A 100MB RSS increase per minute = critical leak warranting immediate heap dump + restart. A flat 2GB RSS = high but stable usage = tuning needed, not a leak.'
          },
          {
            instruction: 'Check swap activity in real time',
            command: 'vmstat 2 5 | awk "NR==1{print} NR>2{print $7, $8, $15, $16, $17}"',
            check: 'vmstat',
            explanation: 'vmstat columns: si=swap-in (pages/sec), so=swap-out. Non-zero so = OS is swapping to survive. ~Performance~ when swapping: 1000x slower than RAM. Column 15=stolen time (EC2 hypervisor). Even 10MB/s swap activity can cause multi-second API response times. Immediate action: identify and restart the leaking process.'
          },
          {
            instruction: 'Drop page cache to free "cached" memory',
            command: 'sync && echo 3 | sudo tee /proc/sys/vm/drop_caches',
            check: 'drop_caches',
            explanation: '`drop_caches=3` drops page cache + dentries + inodes. SAFE operation — kernel will re-read from disk as needed. Useful when "free" shows low memory but "available" is OK (cache taking space). Does NOT free application heap memory. Use this only for breathing room while investigating the actual leak. `sync` first ensures dirty pages are written.'
          }
        ]
      },

      {
        id: 'mod8-ex6',
        title: '🔥 Incident: Network Connectivity Loss',
        difficulty: 'advanced',
        time: '9 min',
        scenario: '🚨 EC2 instances can reach each other but can\'t reach the internet. S3 API calls are timing out. New deployments failing because apt-get can\'t download packages.',
        steps: [
          {
            instruction: 'Test internet connectivity step by step',
            command: 'ping -c 3 8.8.8.8 && ping -c 3 google.com; echo "Exit: $?"',
            check: 'ping',
            explanation: 'Two-step test: (1) Can we reach an IP? If ping 8.8.8.8 fails = routing or NAT issue (not DNS). (2) Can we resolve and reach a hostname? If ping 8.8.8.8 works but ping google.com fails = DNS issue. If both fail = routing/NAT Gateway misconfigured. The distinction narrows your investigation dramatically.'
          },
          {
            instruction: 'Check default route and NAT Gateway',
            command: 'ip route show && curl -s --connect-timeout 3 http://169.254.169.254/latest/meta-data/ || echo "IMDS unreachable"',
            check: 'ip route',
            explanation: 'Default route should be via the VPC router (e.g., 172.31.0.1). If missing: `sudo ip route add default via 172.31.0.1`. For internet: private subnets need a NAT Gateway route and the NAT GW must have an Elastic IP. Public subnets need Internet Gateway. IMDS check confirms VPC networking layer works.'
          },
          {
            instruction: 'Check DNS resolution specifically',
            command: 'dig @169.254.169.253 amazonaws.com +short && dig @8.8.8.8 amazonaws.com +short',
            check: 'dig',
            explanation: '169.254.169.253 = AWS VPC DNS resolver. If this works but @8.8.8.8 fails = internet access blocked but VPC DNS fine. If @169.254.169.253 also fails = VPC DNS broken (Route 53 Resolver issue, DHCP option set misconfigured). Check: `cat /etc/resolv.conf` — should point to 169.254.169.253 or your VPC+2 address.'
          },
          {
            instruction: 'Test S3 connectivity via VPC endpoint',
            command: 'curl -v https://s3.amazonaws.com 2>&1 | grep -E "Connected|SSL|HTTP|curl:"',
            check: 'curl',
            explanation: 'S3 API calls failing: could be (1) internet outage, (2) VPC endpoint routing, (3) S3 bucket policy, (4) IAM role permissions. Test in order: can we reach s3.amazonaws.com? If TLS connects but gets 403 = authentication issue. If connection refused/timeout = routing. `aws s3 ls 2>&1` gives the AWS SDK perspective.'
          },
          {
            instruction: 'Check VPC flow logs for blocked traffic',
            command: 'aws logs filter-log-events --log-group-name /vpc/flow-logs --filter-pattern "REJECT" --start-time $(date -d "1 hour ago" +%s000) --region us-east-1 2>/dev/null | head -5',
            check: 'aws logs',
            explanation: 'VPC Flow Logs capture ACCEPT/REJECT decisions for all traffic. REJECT = Security Group or Network ACL blocked it. Filter for REJECTs to your instance IP to find what\'s being blocked and from where. Key: NACLs are stateless (must allow both inbound and outbound), SGs are stateful (only inbound needed for request-response).'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 9 · Security Hardening & Auditing
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod9',
    title: 'Security Hardening & Auditing',
    icon: '🔒',
    difficulty: 'advanced',
    description: '5 exercises',
    exercises: [

      {
        id: 'mod9-ex1',
        title: 'SSH Hardening',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'Security audit found SSH is configured with defaults. Apply CIS Benchmark Level 1 SSH hardening and verify the changes.',
        steps: [
          {
            instruction: 'Backup and review current sshd config',
            command: 'sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.bak && grep -v "^#" /etc/ssh/sshd_config | grep -v "^$"',
            check: 'sshd_config',
            explanation: 'Always backup before editing. Review active (non-comment) settings. Defaults to check: Port 22 (change to reduce scan noise), PermitRootLogin (must be no), PasswordAuthentication (must be no for key-only auth), MaxAuthTries (reduce to 3). Review against CIS Benchmark Ubuntu 22.04 L1 section 5.2.'
          },
          {
            instruction: 'Apply SSH hardening settings',
            command: 'sudo tee -a /etc/ssh/sshd_config.d/99-hardening.conf << EOF\nPort 22\nProtocol 2\nPermitRootLogin no\nPasswordAuthentication no\nPubkeyAuthentication yes\nMaxAuthTries 3\nMaxSessions 5\nX11Forwarding no\nAllowTcpForwarding yes\nClientAliveInterval 300\nClientAliveCountMax 2\nLoginGraceTime 60\nEOF',
            check: 'sshd_config',
            explanation: 'Key settings: Protocol 2 (SSHv1 is broken), PermitRootLogin no (all root actions via sudo), PasswordAuthentication no (eliminates brute force), MaxAuthTries 3 (lockout after 3 bad keys), X11Forwarding no (reduces attack surface), ClientAliveInterval 300 (timeout idle sessions at 10 min). Drop-in file in sshd_config.d avoids editing main file.'
          },
          {
            instruction: 'Test SSH config before applying',
            command: 'sudo sshd -t',
            check: 'sshd',
            explanation: '`sshd -t` validates config syntax without restarting. Zero output = no errors. Any error line = fix before proceeding. CRITICAL: if you reload sshd with a broken config and get kicked out with no SSM access, you may need to stop the instance and attach the volume to another EC2 to fix it. Never skip this step.'
          },
          {
            instruction: 'Apply the new config (keep existing session alive)',
            command: 'sudo systemctl reload sshd',
            check: 'sshd',
            explanation: '`reload` applies new config to new connections without cutting existing sessions. Your current SSH session stays alive. Test the new config in a NEW terminal window before closing the current one — if the new terminal can connect, config is good. If not, fix it (your current session is still open).'
          },
          {
            instruction: 'Verify hardening with a test scan',
            command: 'ssh-audit localhost 2>/dev/null | head -20 || echo "Install: pip3 install ssh-audit"',
            check: 'ssh-audit',
            explanation: 'ssh-audit scans SSH server configuration for weak algorithms, ciphers, and MACs. Output shows: key exchange algorithms, host key types, encryption ciphers, MAC algorithms — color-coded (green=safe, yellow=caution, red=remove). Use to verify your hardened config against current best practices.'
          }
        ]
      },

      {
        id: 'mod9-ex2',
        title: 'fail2ban — Brute Force Protection',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'The auth log shows 500 failed SSH login attempts per hour from various IPs. Set up fail2ban to automatically ban repeat offenders.',
        steps: [
          {
            instruction: 'Install and start fail2ban',
            command: 'sudo apt-get install -y fail2ban && sudo systemctl enable --now fail2ban',
            check: 'fail2ban',
            explanation: 'fail2ban monitors log files for authentication failures and automatically adds IPtables rules to ban offending IPs for a configurable duration. Works for SSH, nginx, apache, postfix, and any service with log-parseable failure messages. Essential for any internet-facing EC2.'
          },
          {
            instruction: 'Create a local config for SSH protection',
            command: 'sudo tee /etc/fail2ban/jail.local << EOF\n[DEFAULT]\nbantime = 3600\nfindtime = 600\nmaxretry = 5\nbanaction = iptables-multiport\n\n[sshd]\nenabled = true\nport = ssh\nfilter = sshd\nlogpath = /var/log/auth.log\nmaxretry = 3\nEOF',
            check: 'fail2ban',
            explanation: 'jail.local overrides jail.conf (never edit jail.conf — updates overwrite it). Settings: bantime=3600 (ban for 1 hour), findtime=600 (10 minute window), maxretry=3 (ban after 3 failures). For persistent offenders: use `bantime = -1` (permanent ban). Long-term: ship IPs to AWS WAF or Security Hub.'
          },
          {
            instruction: 'Check fail2ban status and banned IPs',
            command: 'sudo fail2ban-client status && sudo fail2ban-client status sshd',
            check: 'fail2ban',
            explanation: '`fail2ban-client status sshd` shows: Currently failed (recent failures), Total failed, Currently banned IPs, Total banned. Banned IPs have iptables DROP rules. To manually ban: `sudo fail2ban-client set sshd banip 1.2.3.4`. To unban: `sudo fail2ban-client set sshd unbanip 1.2.3.4`.'
          },
          {
            instruction: 'Whitelist your own IP to prevent self-lockout',
            command: 'echo "ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12" | sudo tee -a /etc/fail2ban/jail.local && sudo systemctl reload fail2ban',
            check: 'fail2ban',
            explanation: 'ignoreip = NEVER ban these IPs, regardless of failures. Include: localhost, your VPC CIDR, your office IP, CI/CD runner IPs. A misconfigured deploy script that retries SSH 10 times could ban your pipeline. Always whitelist internal networks. Changes take effect after reload.'
          }
        ]
      },

      {
        id: 'mod9-ex3',
        title: 'auditd — Security Event Auditing',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'Compliance requires logging who accesses sensitive files, all sudo commands, and file permission changes. Set up auditd for CIS Level 2 compliance.',
        steps: [
          {
            instruction: 'Install and enable auditd',
            command: 'sudo apt-get install -y auditd audispd-plugins && sudo systemctl enable --now auditd',
            check: 'auditd',
            explanation: 'auditd is the Linux Audit daemon — records security-relevant events at the kernel level (not just syslog). Unlike bash history, audit records are tamper-resistant and capture all processes (cron, scripts, non-interactive). Required for PCI-DSS, SOC2, HIPAA, and CIS Level 2 compliance.'
          },
          {
            instruction: 'Watch for access to sensitive files',
            command: 'sudo auditctl -w /etc/passwd -p rwa -k passwd_changes && sudo auditctl -w /etc/sudoers -p rwa -k sudoers_changes && sudo auditctl -w /root/.ssh -p rwa -k ssh_key_access',
            check: 'auditctl',
            explanation: '`-w file` = watch file/directory. `-p rwa` = record on read/write/attribute change. `-k key` = label for easy searching. Now any read of /etc/passwd, write to /etc/sudoers, or access to /root/.ssh is logged with: timestamp, PID, UID, executable, syscall. Searchable with `ausearch -k key`.'
          },
          {
            instruction: 'Search audit log for passwd file access',
            command: 'sudo ausearch -k passwd_changes --interpret | tail -20',
            check: 'ausearch',
            explanation: '`ausearch -k key` filters audit log by key. `--interpret` translates numbers to names (UID 1000 → ubuntu). Output includes: time, auid (who ran it at login), uid (current user), exe (what binary), file accessed, and success/failure. In a breach investigation: `ausearch -ts today -k ssh_key_access` shows all SSH key file access today.'
          },
          {
            instruction: 'Generate an audit report',
            command: 'sudo aureport --summary && sudo aureport --auth | head -20',
            check: 'aureport',
            explanation: '`aureport --summary` = high-level counts of events by type. `--auth` = authentication events. Other reports: `--login` (logins), `--file` (file access), `--exec` (command execution), `--failed` (failed events). Part of daily security review on compliance-mandated systems.'
          },
          {
            instruction: 'Make audit rules persistent',
            command: 'sudo cp /etc/audit/rules.d/audit.rules /etc/audit/rules.d/audit.rules.bak && sudo auditctl -l | grep -v "^-a" | sudo tee -a /etc/audit/rules.d/custom.rules && sudo service auditd reload',
            check: 'auditd',
            explanation: 'Rules added with `auditctl -w` are ephemeral (lost on reboot). Write them to /etc/audit/rules.d/*.rules for persistence. The audit system loads all .rules files at boot. CIS Benchmark provides a complete set of recommended audit rules — download from CIS website and apply to /etc/audit/rules.d/cis.rules.'
          }
        ]
      },

      {
        id: 'mod9-ex4',
        title: 'Vulnerability Scanning with Lynis',
        difficulty: 'advanced',
        time: '7 min',
        scenario: 'Before a SOC2 audit, run a comprehensive security assessment of the EC2 instance and document findings with hardening recommendations.',
        steps: [
          {
            instruction: 'Install Lynis security auditing tool',
            command: 'sudo apt-get install -y lynis',
            check: 'lynis',
            explanation: 'Lynis is an open-source security auditing tool for Unix/Linux. It tests: authentication, boot loader, file systems, software, networking, and much more — 300+ security tests. Results scored: Hardening Index 0-100 (>80 = good). Used by security teams for CIS compliance checks and pre-audit assessments.'
          },
          {
            instruction: 'Run a full system audit',
            command: 'sudo lynis audit system --quick 2>&1 | tail -60',
            check: 'lynis',
            explanation: '`lynis audit system` runs all security tests. Output color-coded: green=ok, yellow=warning (should fix), red=suggestion (consider fixing). `--quick` skips waiting prompts. Full report: /var/log/lynis.log. Lynis report: /var/log/lynis-report.dat. Share the report with your security team — it maps to CIS benchmarks.'
          },
          {
            instruction: 'View the hardening suggestions',
            command: 'sudo lynis show suggestions 2>/dev/null | head -30 || grep "suggestion" /var/log/lynis-report.dat | head -20',
            check: 'lynis',
            explanation: 'Suggestions are prioritized fixes. Common ones: enable process accounting (`auditd`), set umask to 027, configure `TMOUT` (auto-logout idle shells), enable ASLR (`sysctl kernel.randomize_va_space=2`), disable root login GRUB password. Each suggestion shows the Lynis test ID and CIS mapping.'
          },
          {
            instruction: 'Check for SUID binaries (privilege escalation risk)',
            command: 'find / -perm /4000 -type f 2>/dev/null | sort',
            check: 'find',
            explanation: 'SUID binaries are a privilege escalation vector. Expected SUID binaries: /usr/bin/sudo, /usr/bin/passwd, /usr/bin/su, /bin/ping. Unexpected SUID binaries (e.g., /tmp/.backdoor, /dev/shm/rootkit): attacker planted backdoor. Review this list monthly and alert on new additions with auditd: `auditctl -w /tmp -p x -k suspicious_exec`.'
          }
        ]
      },

      {
        id: 'mod9-ex5',
        title: 'CIS Benchmark Hardening Checklist',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'Your organization requires CIS Ubuntu 22.04 Level 1 compliance on all EC2 instances. Apply the critical hardening settings.',
        steps: [
          {
            instruction: 'Set a secure umask for all users',
            command: 'echo "umask 027" | sudo tee -a /etc/profile.d/umask.sh && echo "umask 027" | sudo tee -a /etc/bash.bashrc',
            check: 'umask',
            explanation: 'umask 027: new files created as 640 (owner read/write, group read, others none). Default umask 022 creates files as 644 (others can read). On a multi-user system: 022 means any user can read newly created config files which might contain secrets. CIS L1 requires umask 027 or stricter.'
          },
          {
            instruction: 'Configure session timeout for idle users',
            command: 'echo "TMOUT=900" | sudo tee /etc/profile.d/timeout.sh && echo "readonly TMOUT" | sudo tee -a /etc/profile.d/timeout.sh',
            check: 'TMOUT',
            explanation: 'TMOUT=900 auto-logs out shells idle for 15 minutes. `readonly` prevents users from disabling it. Required by PCI-DSS (15 min), HIPAA, and most security frameworks. Combine with ServerAliveInterval in sshd_config to actually disconnect idle SSH sessions (TMOUT only exits the shell, not the TCP session).'
          },
          {
            instruction: 'Disable core dumps',
            command: 'echo "* hard core 0" | sudo tee -a /etc/security/limits.conf && echo "fs.suid_dumpable = 0" | sudo tee -a /etc/sysctl.d/99-coredump.conf && sudo sysctl -p /etc/sysctl.d/99-coredump.conf',
            check: 'core',
            explanation: 'Core dumps contain full process memory at crash time — including encryption keys, passwords, session tokens. Disabling: `hard core 0` prevents users from enabling them. `fs.suid_dumpable=0` prevents SUID programs from creating core dumps. In production: route crashes to a separate collection system with access controls.'
          },
          {
            instruction: 'Enable ASLR (Address Space Layout Randomization)',
            command: 'echo "kernel.randomize_va_space = 2" | sudo tee /etc/sysctl.d/99-aslr.conf && sudo sysctl -p /etc/sysctl.d/99-aslr.conf',
            check: 'sysctl',
            explanation: 'ASLR randomizes memory addresses (stack, heap, libraries) making buffer overflow exploits harder. Value 2 = full ASLR (stack, heap, mmap, VDSO). Check current: `cat /proc/sys/kernel/randomize_va_space`. Should be 2 on all production systems. Most Ubuntu systems default to 2 — verify and document.'
          },
          {
            instruction: 'Verify and report all hardening changes',
            command: 'echo "=== Hardening Summary ===" && sysctl kernel.randomize_va_space fs.suid_dumpable && grep TMOUT /etc/profile.d/timeout.sh && grep "hard core" /etc/security/limits.conf',
            check: 'hardening',
            explanation: 'Document your hardening with evidence. Security auditors want to see: the configuration AND the evidence it\'s applied. Build this into your infrastructure-as-code: Terraform or Ansible that applies and verifies hardening settings. Use AWS Config for continuous compliance monitoring — it drifts if someone manually changes settings.'
          }
        ]
      }
    ]
  }
];
