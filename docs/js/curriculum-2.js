/* ============================================================
   CURRICULUM PART 2  —  Modules 4 · 5 · 6
   4: Process Management & systemd
   5: Networking, Firewall & Diagnostics
   6: Package Management & Security Patching
   ============================================================ */

window.CURRICULUM_PART2 = [

  /* ══════════════════════════════════════════════════════════
     MODULE 4 · Process Management & systemd
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod4',
    title: 'Process Management & systemd',
    icon: '⚙️',
    difficulty: 'intermediate',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod4-ex1',
        title: 'Inspecting Running Processes',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'The EC2 instance is running slow. Your job: identify what processes are consuming resources, find zombie processes, and understand the process tree.',
        steps: [
          {
            instruction: 'View all running processes in detail',
            command: 'ps aux --sort=-%cpu | head -20',
            check: 'ps',
            explanation: '`ps aux`: a=all users, u=user-oriented format, x=processes not attached to terminal. `--sort=-%cpu` sorts by CPU descending. Columns: USER, PID, %CPU, %MEM, VSZ (virtual memory), RSS (resident RAM), STAT (process state), START, TIME, COMMAND.'
          },
          {
            instruction: 'Show full process tree',
            command: 'ps auxf | head -40',
            check: 'ps',
            explanation: '`ps auxf` shows the process tree (forest view). You can see parent→child relationships: systemd (PID 1) → nginx master → nginx worker → etc. Essential for understanding which parent spawned a suspicious process.'
          },
          {
            instruction: 'Find a specific process by name',
            command: 'pgrep -la nginx',
            check: 'pgrep',
            explanation: '`pgrep -l` = list PIDs and names, `-a` = show full command line. Returns all PIDs matching the pattern. More precise than `ps | grep name` (which might match grep itself). Use `pgrep -u ubuntu` to find all processes owned by ubuntu.'
          },
          {
            instruction: 'Look for zombie processes',
            command: 'ps aux | awk "{if ($8 == \"Z\") print}"',
            check: 'ps',
            explanation: 'Zombie (Z) processes have finished but their parent hasn\'t collected their exit status. They consume no CPU/RAM but occupy a PID. Many zombies indicate a parent process bug. Kill the parent to clean them up (kernel then reaps the zombies).'
          },
          {
            instruction: 'Check process limits (open files, threads)',
            command: 'cat /proc/$(pgrep -n nginx)/limits 2>/dev/null || cat /proc/1/limits',
            check: 'proc',
            explanation: '/proc/[PID]/limits shows resource limits for a process. Key: "Max open files" — if nginx hits this limit it can\'t accept new connections. Production setting: nginx ulimit should be 65535+. Set in /etc/security/limits.conf or nginx systemd unit (LimitNOFILE).'
          }
        ]
      },

      {
        id: 'mod4-ex2',
        title: 'Killing & Signaling Processes',
        difficulty: 'intermediate',
        time: '6 min',
        scenario: 'An nginx worker is stuck and not responding to reload. A runaway script is consuming 100% CPU. You need to signal processes correctly.',
        steps: [
          {
            instruction: 'Send SIGHUP (reload) to nginx master',
            command: 'sudo kill -HUP $(pgrep -o nginx)',
            check: 'kill',
            explanation: 'SIGHUP (signal 1) = "reload configuration" for daemons. Nginx re-reads nginx.conf without dropping connections. Always prefer HUP over restart for config reloads. `$(pgrep -o nginx)` = oldest nginx PID (the master process).'
          },
          {
            instruction: 'Gracefully terminate a process (SIGTERM)',
            command: 'kill -15 <PID>',
            check: 'kill',
            explanation: 'SIGTERM (15) is the polite "please shut down" signal. Well-written programs catch it to flush buffers, close connections, and clean up. This is what `systemctl stop` sends first. Always try SIGTERM before SIGKILL.'
          },
          {
            instruction: 'Force-kill an unresponsive process (SIGKILL)',
            command: 'kill -9 <PID>',
            check: 'kill',
            explanation: 'SIGKILL (9) cannot be caught or ignored — kernel kills the process immediately. Downside: no cleanup (open files may corrupt, buffers not flushed). Use ONLY when SIGTERM fails after 10-30 seconds. `kill -9` on a Docker container = data loss risk.'
          },
          {
            instruction: 'Kill all processes matching a name',
            command: 'sudo pkill -f "runaway-script.sh"',
            check: 'pkill',
            explanation: '`pkill -f` matches against the full command line (not just program name). Useful when multiple instances of the same binary run with different arguments. `-f "pattern"` lets you target one specific instance. `killall nginx` kills all processes named nginx.'
          },
          {
            instruction: 'List all available signals',
            command: 'kill -l',
            check: 'kill',
            explanation: 'Common signals: 1=HUP (reload), 2=INT (Ctrl+C), 9=KILL (force), 15=TERM (graceful), 19=STOP (pause, like Ctrl+Z), 18=CONT (continue paused process), 10=USR1 (app-specific, e.g. nginx log rotation). Know these — they\'re on DevOps interview lists.'
          }
        ]
      },

      {
        id: 'mod4-ex3',
        title: 'systemd Services — Start, Stop, Enable',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'You\'ve deployed nginx on the EC2 instance. You need to start it, enable it to start on boot, verify its status, and understand how to read systemd unit files.',
        steps: [
          {
            instruction: 'Start the nginx service',
            command: 'sudo systemctl start nginx',
            check: 'systemctl',
            explanation: '`systemctl start` activates the service now (does not persist across reboots). The unit file at /lib/systemd/system/nginx.service defines how to start/stop/reload. systemd is PID 1 on Ubuntu 16.04+ — it replaces upstart and SysV init.'
          },
          {
            instruction: 'Enable nginx to start at boot',
            command: 'sudo systemctl enable nginx',
            check: 'systemctl',
            explanation: '`enable` creates symlinks in the appropriate /etc/systemd/system/multi-user.target.wants/ directory. `start` + `enable` together: `sudo systemctl enable --now nginx`. `disable` removes the symlink (service still runs until next reboot).'
          },
          {
            instruction: 'Check detailed service status',
            command: 'sudo systemctl status nginx',
            check: 'systemctl',
            explanation: 'Status shows: Active state (active/running, failed, inactive), PID, uptime, memory usage, and the last 10 log lines. The green "active (running)" vs red "failed" is your first health check. Exit code in () tells you why it failed (non-zero = error).'
          },
          {
            instruction: 'View the nginx unit file',
            command: 'systemctl cat nginx',
            check: 'systemctl',
            explanation: '`systemctl cat` shows the complete unit file with overrides. Key sections: [Unit] (dependencies, description), [Service] (ExecStart, ExecReload, User, LimitNOFILE, Restart=always), [Install] (WantedBy target). Override without editing: `sudo systemctl edit nginx`.'
          },
          {
            instruction: 'Reload systemd after manual unit file changes',
            command: 'sudo systemctl daemon-reload',
            check: 'systemctl',
            explanation: 'After editing any .service file, daemon-reload re-reads all unit files without restarting services. Forgetting this means your edits are ignored until next reboot. Always follow with `sudo systemctl restart <service>` for changes to take effect.'
          },
          {
            instruction: 'List all failed services',
            command: 'systemctl --failed',
            check: 'systemctl',
            explanation: '`systemctl --failed` shows all units in a failed state. This is your first check after an instance reboot or deployment. Failed services indicate startup errors — dig into each with `sudo journalctl -u service-name --no-pager | tail -50`.'
          }
        ]
      },

      {
        id: 'mod4-ex4',
        title: 'Foreground, Background & tmux',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'You need to run a long deployment script without it being killed if your SSH session drops. You also need to manage multiple tasks simultaneously.',
        steps: [
          {
            instruction: 'Run a job in the background with &',
            command: 'sleep 300 &',
            check: 'sleep',
            explanation: '`&` forks the process to the background. Returns [job number] PID. Use `jobs` to list background jobs. Limitation: background jobs are tied to the shell — they die when you SSH disconnect. Use `nohup` or `tmux` to persist.'
          },
          {
            instruction: 'Check background jobs',
            command: 'jobs -l',
            check: 'jobs',
            explanation: '`jobs -l` shows background jobs with their PIDs. `fg %1` brings job 1 to foreground. `bg %1` resumes a stopped job in background. `Ctrl+Z` stops (pauses) a running foreground process. Pattern: start, Ctrl+Z, then `bg` to background it.'
          },
          {
            instruction: 'Run a command that survives SSH disconnect',
            command: 'nohup bash -c "sleep 600; echo done" > /tmp/job.log 2>&1 &',
            check: 'nohup',
            explanation: 'nohup ignores SIGHUP (sent when terminal closes). Redirecting stdout+stderr to a file makes it fully independent. `2>&1` merges stderr into stdout. For interactive processes, use `tmux` instead. `disown %1` works for already-running background jobs.'
          },
          {
            instruction: 'Start a new tmux session',
            command: 'tmux new -s deploy',
            check: 'tmux',
            explanation: 'tmux = terminal multiplexer. Sessions persist independently of SSH connections. Detach: Ctrl+B then D. Reattach: `tmux attach -t deploy`. Create multiple windows within a session: Ctrl+B then C. Split panes: Ctrl+B then % (vertical) or " (horizontal).'
          },
          {
            instruction: 'List and reattach to a tmux session',
            command: 'tmux ls',
            check: 'tmux',
            explanation: '`tmux ls` shows all sessions. After SSH reconnect: `tmux attach -t deploy` resumes your session exactly where you left it. This is essential for long-running operations: database migrations, large file transfers, overnight builds.'
          }
        ]
      },

      {
        id: 'mod4-ex5',
        title: 'Scheduling with cron & systemd Timers',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'You need to schedule daily log rotation, weekly backups, and a health-check script that runs every 5 minutes.',
        steps: [
          {
            instruction: 'Edit the crontab for the ubuntu user',
            command: 'crontab -e',
            check: 'crontab',
            explanation: 'Opens crontab in the default editor. Format: `Minute Hour DayOfMonth Month DayOfWeek Command`. Special strings: @reboot (on boot), @daily, @weekly. Environment: cron runs with minimal $PATH — always use full binary paths (/usr/bin/python3 not python3).'
          },
          {
            instruction: 'List current crontab entries',
            command: 'crontab -l',
            check: 'crontab',
            explanation: 'Lists the current user\'s crontab without opening editor. View system cron jobs: `cat /etc/crontab` and `ls /etc/cron.d/`. View all users\' crontabs: `sudo ls /var/spool/cron/crontabs/`. Audit crontabs regularly — attackers plant persistence here.'
          },
          {
            instruction: 'Add a cron job via command line',
            command: '(crontab -l 2>/dev/null; echo "*/5 * * * * /usr/local/bin/healthcheck.sh >> /var/log/healthcheck.log 2>&1") | crontab -',
            check: 'crontab',
            explanation: 'This pattern appends without overwriting existing entries. `*/5` = every 5 minutes. `>> logfile 2>&1` logs both stdout/stderr. Without output redirection, cron emails output to root — configure mail or always redirect. Test timing: crontab.guru website.'
          },
          {
            instruction: 'Check cron mail / debug cron execution',
            command: 'sudo grep CRON /var/log/syslog | tail -20',
            check: 'syslog',
            explanation: 'cron logs execution in /var/log/syslog. If a job isn\'t running, grep here first: wrong syntax, wrong time, wrong user permissions. Common bug: using `~` or relative paths in cron scripts — always use absolute paths.'
          },
          {
            instruction: 'List all system cron jobs',
            command: 'ls -la /etc/cron.{daily,weekly,monthly,d}',
            check: 'cron',
            explanation: 'System-wide scheduled jobs: /etc/cron.daily (daily), /etc/cron.weekly (weekly), /etc/cron.monthly (monthly), /etc/cron.d (custom named schedules). Drop scripts into cron.daily for simple recurring tasks. They run at times defined in /etc/crontab.'
          }
        ]
      },

      {
        id: 'mod4-ex6',
        title: 'Resource Limits & nice / ionice',
        difficulty: 'advanced',
        time: '7 min',
        scenario: 'A batch backup job is causing CPU and I/O spikes that affect the production application. You need to run it with lower priority.',
        steps: [
          {
            instruction: 'Run a backup with low CPU priority',
            command: 'nice -n 19 tar -czf /tmp/backup.tar.gz /opt/app/',
            check: 'nice',
            explanation: '`nice -n 19` sets the lowest CPU priority (range: -20 highest to 19 lowest). Normal processes default to 0. Negative values require root. High-priority production process + nice background job = near-zero impact on latency-sensitive services.'
          },
          {
            instruction: 'Re-nice a running process',
            command: 'renice +19 -p $(pgrep tar)',
            check: 'renice',
            explanation: '`renice` changes priority of an already-running process. Non-root users can only increase niceness (lower priority). Root can decrease it. In production: renice long-running analytics queries that compete with OLTP workloads.'
          },
          {
            instruction: 'Run backup with low I/O priority',
            command: 'ionice -c 3 -p $(pgrep tar)',
            check: 'ionice',
            explanation: 'ionice controls I/O scheduling priority. Classes: 0=none, 1=real-time, 2=best-effort (default), 3=idle. Class 3 (idle) means I/O only runs when no other process needs the disk — perfect for backups. Use `ionice -c 3 command` to run with idle I/O from start.'
          },
          {
            instruction: 'Set persistent limits via limits.conf',
            command: 'cat /etc/security/limits.conf | grep -v "^#" | grep -v "^$"',
            check: 'limits',
            explanation: '/etc/security/limits.conf sets per-user/per-group resource limits applied at login. Key limits: nofile (open file descriptors), nproc (max processes), core (core dump size — set to 0 in prod), memlock. Override for services via systemd unit: LimitNOFILE=65535.'
          },
          {
            instruction: 'Check and set system-wide kernel parameters',
            command: 'sysctl -a 2>/dev/null | grep -E "net.core.somaxconn|vm.swappiness|fs.file-max"',
            check: 'sysctl',
            explanation: 'sysctl tunes live kernel parameters. Key DevOps settings: `vm.swappiness=10` (reduce swap use, keep more in RAM), `net.core.somaxconn=65535` (connection backlog for high-traffic nginx), `fs.file-max=2097152` (system-wide file descriptor limit). Make permanent in /etc/sysctl.d/99-custom.conf.'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 5 · Networking, Firewall & Diagnostics
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod5',
    title: 'Networking & Firewall',
    icon: '🌐',
    difficulty: 'intermediate',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod5-ex1',
        title: 'Network Interface & IP Configuration',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'New EC2 instance — verify network configuration and understand what\'s exposed before deploying your application.',
        steps: [
          {
            instruction: 'Show all network interfaces and IP addresses',
            command: 'ip addr show',
            check: 'ip',
            explanation: '`ip addr show` (iproute2) replaces deprecated `ifconfig`. Shows: interface name (eth0/ens5/enp0s3 on EC2), MAC address, inet (IPv4) with CIDR notation, inet6 (IPv6), interface state (UP/DOWN). On EC2: eth0 has a private IP; public IP is NAT\'d at the VPC level.'
          },
          {
            instruction: 'Show routing table',
            command: 'ip route show',
            check: 'ip route',
            explanation: '`ip route show` shows the kernel routing table. Key entries: `default via 172.31.x.1 dev eth0` = default gateway (for internet). `172.31.0.0/16 dev eth0` = local VPC subnet (direct). Essential for troubleshooting "can\'t reach external hosts" issues.'
          },
          {
            instruction: 'Get public IP of this EC2 instance',
            command: 'curl -s http://169.254.169.254/latest/meta-data/public-ipv4',
            check: 'curl',
            explanation: 'EC2 instances don\'t see their public IP on the interface (VPC NAT handles it). IMDS (169.254.169.254) is the only reliable way to get public IP from inside. Also: `curl ifconfig.me` works but requires internet access.'
          },
          {
            instruction: 'Show network statistics and errors',
            command: 'ip -s link show eth0',
            check: 'ip',
            explanation: '`-s` shows statistics: TX/RX bytes, packets, errors, drops, overruns. Non-zero errors/drops indicate hardware issues, driver bugs, or MTU mismatches. On EC2: monitor with CloudWatch NetworkIn/Out metrics for sustained high traffic.'
          },
          {
            instruction: 'Check network interface speed/duplex',
            command: 'ethtool eth0 2>/dev/null | grep -E "Speed|Duplex|Link"',
            check: 'ethtool',
            explanation: 'ethtool shows physical layer info. On EC2 virtual interfaces this shows limited info but confirms link state. On bare metal: auto-negotiation issues (half-duplex vs full-duplex mismatch) cause massive packet loss that looks like random latency spikes.'
          }
        ]
      },

      {
        id: 'mod5-ex2',
        title: 'DNS & Name Resolution',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'Application can\'t connect to the database by hostname. You need to diagnose the DNS resolution path on this EC2 instance.',
        steps: [
          {
            instruction: 'Check how the system resolves DNS',
            command: 'cat /etc/resolv.conf',
            check: 'resolv',
            explanation: '/etc/resolv.conf tells the resolver which DNS servers to query. On EC2: the AWS VPC DNS resolver at 169.254.169.253 (or VPC base + 2, e.g., 172.31.0.2) resolves both public DNS and Route 53 private hosted zones. `search` line adds domain suffixes for short hostnames.'
          },
          {
            instruction: 'Resolve a hostname using dig (detailed)',
            command: 'dig google.com',
            check: 'dig',
            explanation: '`dig` is the DNS diagnostics tool. Output sections: QUESTION (what you asked), ANSWER (result), AUTHORITY (authoritative nameservers), ADDITIONAL (A records for authority servers). Check TTL values — low TTL means frequent re-resolution (can cause latency). `dig +short google.com` = quick IP only.'
          },
          {
            instruction: 'Check DNS resolution time and nameserver',
            command: 'dig @8.8.8.8 google.com | grep -E "Query time|SERVER"',
            check: 'dig',
            explanation: '`@8.8.8.8` queries Google\'s public DNS directly (bypass local resolver). If `@local_dns` is slow but `@8.8.8.8` is fast, your VPC DNS resolver is the bottleneck. In production: enable DNS caching with systemd-resolved or nscd. Check Route 53 Resolver query logs.'
          },
          {
            instruction: 'Test hostname resolution without dig',
            command: 'getent hosts github.com',
            check: 'getent',
            explanation: '`getent hosts` queries the Name Service Switch (NSS) stack — the same path applications use. This includes /etc/hosts, then DNS. If getent works but the app fails, the app has hardcoded nameservers. Check /etc/nsswitch.conf for resolution order.'
          },
          {
            instruction: 'Add a static DNS entry for testing',
            command: 'echo "10.0.1.50 db.internal.company.com" | sudo tee -a /etc/hosts',
            check: 'hosts',
            explanation: '/etc/hosts is checked before DNS (unless nsswitch.conf says otherwise). Adding entries here overrides DNS — useful for: testing before DNS propagates, /etc/hosts-based service discovery (legacy), bypassing DNS for specific internal hosts. Never put production services behind only /etc/hosts.'
          }
        ]
      },

      {
        id: 'mod5-ex3',
        title: 'Port Scanning & Connection Monitoring',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Application is not responding on port 8080. Is the service listening? Is something blocking it? Are there too many connections? Walk through network troubleshooting.',
        steps: [
          {
            instruction: 'List all listening ports with associated processes',
            command: 'sudo ss -tlnp',
            check: 'ss',
            explanation: '`ss` (socket statistics) replaces `netstat`. `-t` = TCP, `-l` = listening, `-n` = numeric ports (no DNS lookup), `-p` = show process. Read output: Local Address:Port, Process name/PID. Find your service by port number. If port 8080 isn\'t listed, the service isn\'t running.'
          },
          {
            instruction: 'Show all active TCP connections',
            command: 'ss -tnp | grep ESTAB | head -20',
            check: 'ss',
            explanation: 'Shows ESTABLISHED connections — active sessions between this server and clients. Columns: State, Recv-Q (data received but not processed), Send-Q (data queued to send), Local Address:Port, Peer Address:Port. High Recv-Q = app too slow to process incoming data.'
          },
          {
            instruction: 'Count connections by state',
            command: 'ss -tan | awk "{print $1}" | sort | uniq -c | sort -rn',
            check: 'ss',
            explanation: 'Counts TCP connections by state: ESTAB (active), TIME_WAIT (just closed, waiting for late packets), CLOSE_WAIT (app not closing sockets — memory leak!), LISTEN, SYN_RECV (incoming handshake). Too many TIME_WAIT = high connection churn (tune net.ipv4.tcp_tw_reuse).'
          },
          {
            instruction: 'Test if a remote port is reachable',
            command: 'nc -zv 172.31.10.15 5432',
            check: 'nc',
            explanation: '`nc -zv host port`: z=zero-I/O (just test), v=verbose. Prints "Connection to host port succeeded!" or "Connection refused" or times out (firewall blocking). Faster than telnet and available everywhere. Test from app server to DB server to verify Security Group rules.'
          },
          {
            instruction: 'Capture live network traffic on port 80',
            command: 'sudo tcpdump -i eth0 -n port 80 -c 20',
            check: 'tcpdump',
            explanation: 'tcpdump captures raw network packets. `-i eth0` = interface, `-n` = no DNS lookup, `port 80` = filter, `-c 20` = capture 20 packets then stop. For HTTP: add `-A` to see ASCII content. Save to file: `-w /tmp/capture.pcap` then open in Wireshark. Use with care on production — high traffic can cause performance hit.'
          }
        ]
      },

      {
        id: 'mod5-ex4',
        title: 'Connectivity Troubleshooting: ping, traceroute, curl',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'Your EC2 instance can\'t reach an external RDS endpoint. You need to trace the network path, identify where it breaks, and diagnose HTTP connectivity issues.',
        steps: [
          {
            instruction: 'Test basic ICMP connectivity',
            command: 'ping -c 4 8.8.8.8',
            check: 'ping',
            explanation: '`ping -c 4` sends 4 ICMP echo requests. Output: round-trip time (rtt) and packet loss %. If AWS Security Groups block ICMP, ping fails even when TCP works. In VPC: ping between instances in same SG usually works. Losing even 0.1% packets can degrade TCP throughput significantly.'
          },
          {
            instruction: 'Trace the network path (traceroute)',
            command: 'traceroute -n 8.8.8.8',
            check: 'traceroute',
            explanation: 'traceroute sends packets with incrementing TTL to reveal each hop. `* * *` = hop not responding (firewall blocks ICMP, not necessarily broken). On EC2: first 1-2 hops are VPC infrastructure. Latency spike at a specific hop = bottleneck there. `traceroute -T` uses TCP (avoids ICMP blocks).'
          },
          {
            instruction: 'Use MTR for continuous path monitoring',
            command: 'mtr --report --no-dns -c 10 8.8.8.8',
            check: 'mtr',
            explanation: 'mtr = ping + traceroute combined, runs continuously. `--report` prints summary. Shows packet loss PER HOP — crucial because loss at an intermediate hop that doesn\'t propagate to final destination is normal (ICMP de-prioritization). Install: `sudo apt install mtr-tiny`.'
          },
          {
            instruction: 'Detailed HTTP request diagnosis with curl',
            command: 'curl -v -I https://api.company.com/health --connect-timeout 5',
            check: 'curl',
            explanation: '`-v` = verbose (shows TLS handshake, headers), `-I` = HEAD request only (no body), `--connect-timeout 5` = fail fast. Output shows: DNS lookup, TCP connect, TLS handshake, HTTP response code. Each step\'s timing tells you WHERE the slowness is. Add `-w "%{time_total}"` for precise timing.'
          },
          {
            instruction: 'Time each phase of an HTTP request',
            command: 'curl -w "DNS: %{time_namelookup}s  TCP: %{time_connect}s  TLS: %{time_appconnect}s  Total: %{time_total}s\n" -s -o /dev/null https://google.com',
            check: 'curl',
            explanation: 'curl -w format strings give per-phase timing. DNS lookup time, TCP connect time, TLS handshake time, and total. Use this to diagnose: slow DNS = Route 53 or VPC resolver issue, slow TCP = routing/congestion, slow TLS = certificate chain issue or overloaded LB.'
          }
        ]
      },

      {
        id: 'mod5-ex5',
        title: 'iptables & ufw Firewall',
        difficulty: 'advanced',
        time: '9 min',
        scenario: 'Your EC2 has both AWS Security Groups AND a host-based firewall. You need to understand both layers, add rules, and debug why port 8080 isn\'t accessible.',
        steps: [
          {
            instruction: 'Check current iptables rules',
            command: 'sudo iptables -L -n -v --line-numbers',
            check: 'iptables',
            explanation: '`iptables -L` lists rules. `-n` = numeric (no reverse DNS), `-v` = shows packet/byte counters, `--line-numbers` = numbered for easy rule deletion. Chains: INPUT (incoming), OUTPUT (outgoing), FORWARD (routed traffic). EC2: even with permissive SG, host firewall can block traffic.'
          },
          {
            instruction: 'Check ufw status (Ubuntu Uncomplicated Firewall)',
            command: 'sudo ufw status verbose',
            check: 'ufw',
            explanation: 'ufw is Ubuntu\'s frontend for iptables. `status verbose` shows: enabled/disabled, default policies (incoming/outgoing), and all rules. On AWS EC2, Security Groups are the recommended firewall layer — ufw should typically be disabled to avoid confusion. But knowing both is essential.'
          },
          {
            instruction: 'Allow port 8080 through ufw',
            command: 'sudo ufw allow 8080/tcp',
            check: 'ufw',
            explanation: '`ufw allow port/protocol` adds an ACCEPT rule to INPUT chain. Also: `ufw allow from 10.0.0.0/8 to any port 22` (restrict SSH to VPC only). `ufw deny 23` (block telnet). After modifying Security Groups in AWS console, verify host firewall too — double-blockage is a common "I opened the SG but it still doesn\'t work" frustration.'
          },
          {
            instruction: 'Add a specific iptables rule to allow app port',
            command: 'sudo iptables -A INPUT -p tcp --dport 8080 -j ACCEPT',
            check: 'iptables',
            explanation: '`-A INPUT` = append to INPUT chain. `-p tcp` = TCP protocol. `--dport 8080` = destination port 8080. `-j ACCEPT` = action: accept. Rules are evaluated top to bottom — first match wins. Insert at position with `-I INPUT 1` to put before existing DROP rules.'
          },
          {
            instruction: 'Save iptables rules persistently',
            command: 'sudo apt-get install -y iptables-persistent && sudo netfilter-persistent save',
            check: 'iptables',
            explanation: '`iptables-persistent` saves rules to /etc/iptables/rules.v4. Without this, all iptables rules are lost on reboot. For production, prefer: nftables (newer, replaces iptables), or manage via Ansible/Terraform rather than manual rule management on individual instances.'
          }
        ]
      },

      {
        id: 'mod5-ex6',
        title: 'SSH Tunneling & Port Forwarding',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'RDS database is in a private subnet (no public access). You need to connect to it from your laptop via the EC2 bastion host using SSH tunneling.',
        steps: [
          {
            instruction: 'Create a local SSH tunnel to private RDS',
            command: 'ssh -L 5433:rds-endpoint.us-east-1.rds.amazonaws.com:5432 ubuntu@bastion-ip -N',
            check: 'ssh',
            explanation: 'SSH local forwarding: `-L local_port:remote_host:remote_port`. Traffic to localhost:5433 on your laptop is tunneled through the bastion to RDS:5432. `-N` = no command (just forward). Now connect your DB client to localhost:5433. Secure alternative to opening RDS to internet.'
          },
          {
            instruction: 'Create a SOCKS5 proxy via SSH',
            command: 'ssh -D 1080 ubuntu@bastion-ip -N',
            check: 'ssh',
            explanation: '`-D 1080` = dynamic SOCKS5 proxy on local port 1080. Configure your browser to use SOCKS5 localhost:1080 to browse private VPC resources through the bastion. Useful for accessing internal web UIs (Grafana, Jenkins, Kibana) in private subnets without VPN.'
          },
          {
            instruction: 'Use SSH jump host for multi-hop connections',
            command: 'ssh -J ubuntu@bastion-ip ubuntu@private-instance-ip',
            check: 'ssh',
            explanation: '`-J jump_host` (ProxyJump) connects to the target through the jump host in one command. Configure permanently in ~/.ssh/config: `ProxyJump bastion`. This replaces the old `ProxyCommand ssh -W %h:%p bastion` approach. No need to copy keys to the bastion.'
          },
          {
            instruction: 'Configure ~/.ssh/config for frequent connections',
            command: 'cat ~/.ssh/config 2>/dev/null || echo "Host bastion\n  HostName ec2-54-1-2-3.compute-1.amazonaws.com\n  User ubuntu\n  IdentityFile ~/.ssh/my-key.pem\n  ServerAliveInterval 60"',
            check: 'ssh config',
            explanation: '~/.ssh/config lets you define aliases. `ServerAliveInterval 60` sends keepalives every 60s to prevent "broken pipe" disconnects through NAT gateways. `StrictHostKeyChecking no` is unsafe — use only in scripts with known hosts. `ControlMaster auto` + `ControlPath` enables SSH connection multiplexing (faster repeated connections).'
          },
          {
            instruction: 'Enable SSH connection multiplexing',
            command: 'ssh -o ControlMaster=auto -o ControlPath=/tmp/ssh-%r@%h:%p -o ControlPersist=600 ubuntu@bastion-ip',
            check: 'ssh',
            explanation: 'Connection multiplexing reuses existing SSH connections. Second ssh to same host reuses the tunnel = near-instant connect (no new TLS handshake). ControlPersist=600 keeps the master connection alive 10 minutes. Huge speedup for Ansible playbooks that make many SSH connections.'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 6 · Package Management & Security Patching
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod6',
    title: 'Packages & Security Patching',
    icon: '📦',
    difficulty: 'intermediate',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod6-ex1',
        title: 'apt Essentials — Install, Update, Upgrade',
        difficulty: 'beginner',
        time: '7 min',
        scenario: 'Fresh EC2 instance. Update the package index, install required tools, and understand the difference between update vs upgrade.',
        steps: [
          {
            instruction: 'Update the package index',
            command: 'sudo apt-get update',
            check: 'apt-get update',
            explanation: '`apt-get update` fetches the package list from all configured repositories (/etc/apt/sources.list + /etc/apt/sources.list.d/). It does NOT install anything. Without this, apt works with stale package info. Always run before install or upgrade. In scripts use `-qq` for quiet output.'
          },
          {
            instruction: 'Install a package',
            command: 'sudo apt-get install -y curl wget git vim net-tools',
            check: 'apt-get install',
            explanation: '`-y` auto-confirms prompts (required in non-interactive scripts). You can install multiple packages in one command. `DEBIAN_FRONTEND=noninteractive` prevents interactive prompts for packages like grub that ask questions during install — critical in Dockerfiles and CI/CD.'
          },
          {
            instruction: 'Show available package information',
            command: 'apt-cache show nginx',
            check: 'apt-cache',
            explanation: '`apt-cache show` displays: version, dependencies, description, maintainer, installed size. Use before installing to verify you\'re getting the right version. `apt-cache policy nginx` shows available versions across configured repositories and which is currently installed.'
          },
          {
            instruction: 'Upgrade all installed packages',
            command: 'sudo apt-get upgrade -y',
            check: 'apt-get upgrade',
            explanation: '`upgrade` installs newer versions of all installed packages but never removes packages. `dist-upgrade` (or `full-upgrade`) can also remove packages to resolve conflicts — use with caution in production. In automation, always test upgrades in staging before production.'
          },
          {
            instruction: 'Clean up downloaded package files',
            command: 'sudo apt-get autoremove -y && sudo apt-get clean',
            check: 'apt-get',
            explanation: '`autoremove` removes packages installed as dependencies that are no longer needed. `clean` removes .deb files from /var/cache/apt/archives. Required in Dockerfile to minimize image size: `RUN apt-get update && apt-get install -y pkg && apt-get clean && rm -rf /var/lib/apt/lists/*`.'
          }
        ]
      },

      {
        id: 'mod6-ex2',
        title: 'Security Patching — CVE Response',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: '🚨 CVE-2024-XXXX has been published affecting the OpenSSL version on your EC2. Your SLA requires critical patches applied within 4 hours. Walk through the full patching workflow.',
        steps: [
          {
            instruction: 'List packages with security updates available',
            command: 'sudo apt-get -s upgrade | grep -i security | head -20',
            check: 'apt-get',
            explanation: '`-s` = simulate (dry run, no changes). Filtered to show security updates. For a dedicated tool: `sudo unattended-upgrades --dry-run --debug`. Security updates come from the `-security` repo (e.g., ubuntu-focal-security in sources.list). Never skip this step before patching.'
          },
          {
            instruction: 'Check OpenSSL version and CVE exposure',
            command: 'openssl version -a && dpkg -l openssl',
            check: 'openssl',
            explanation: '`openssl version -a` shows full build info including date. Cross-reference version number against the CVE description. `dpkg -l package` shows installed version (ii = installed, two info chars). This is the version you compare against the CVE\'s affected version range.'
          },
          {
            instruction: 'Install only security updates',
            command: 'sudo apt-get install -y --only-upgrade openssl libssl-dev',
            check: 'apt-get',
            explanation: '`--only-upgrade` upgrades the specified package only if already installed. For all security updates: `sudo unattended-upgrades` or `sudo apt-get -y --with-new-pkgs upgrade`. After patching, verify new version: `openssl version`. For services using the library, restart them: `sudo systemctl restart nginx`.'
          },
          {
            instruction: 'Check which services are using old library versions',
            command: 'sudo lsof +c 15 | grep "libssl" | awk "{print $1}" | sort -u',
            check: 'lsof',
            explanation: 'After patching a shared library (like libssl), processes using the old version in memory still need restart. `lsof | grep libssl` shows running processes using the library. Until restarted, they\'re still vulnerable. This is why security patches often require service restarts.'
          },
          {
            instruction: 'Configure automatic security updates',
            command: 'sudo dpkg-reconfigure -plow unattended-upgrades',
            check: 'unattended',
            explanation: 'unattended-upgrades auto-applies security updates. Config: /etc/apt/apt.conf.d/50unattended-upgrades. Best practice: enable for security updates only, disable for all updates (to prevent surprise reboots). Set Automatic-Reboot-Time for maintenance window and email notifications.'
          },
          {
            instruction: 'Check if a reboot is required after patching',
            command: 'cat /var/run/reboot-required 2>/dev/null && cat /var/run/reboot-required.pkgs 2>/dev/null',
            check: 'reboot-required',
            explanation: '/var/run/reboot-required is created when kernel or critical libraries are updated. `/var/run/reboot-required.pkgs` lists which packages triggered it. In automation: `[ -f /var/run/reboot-required ] && sudo reboot`. In prod: schedule reboot during maintenance window, coordinate with load balancer health checks.'
          }
        ]
      },

      {
        id: 'mod6-ex3',
        title: 'Package Pinning & Version Control',
        difficulty: 'advanced',
        time: '7 min',
        scenario: 'Your application requires a specific version of Node.js. You need to prevent accidental upgrades, install from a custom repository, and manage conflicting packages.',
        steps: [
          {
            instruction: 'Install a specific version of a package',
            command: 'sudo apt-get install nginx=1.18.0-6ubuntu14',
            check: 'apt-get',
            explanation: 'Append `=version` to install a specific version. Get available versions: `apt-cache madison nginx`. In production environments, always pin critical software versions to prevent "it worked in staging" upgrade surprises. Version string varies by distro release.'
          },
          {
            instruction: 'Pin a package to prevent auto-upgrade',
            command: 'echo "nginx hold" | sudo dpkg --set-selections && apt-mark showhold',
            check: 'dpkg',
            explanation: '`dpkg --set-selections hold` marks a package on hold — `apt upgrade` will skip it. `apt-mark hold nginx` is equivalent. `apt-mark showhold` lists held packages. After applying a tested upgrade: `sudo apt-mark unhold nginx`. Essential for managing infra where specific versions are tested and certified.'
          },
          {
            instruction: 'Add an external repository (NodeSource example)',
            command: 'curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -',
            check: 'curl',
            explanation: 'External repos add a .list file to /etc/apt/sources.list.d/ and import the GPG signing key. Always verify the script source before piping to bash! Alternative: download and inspect first: `curl -fsSL url > setup.sh; cat setup.sh; bash setup.sh`. Check keys: `gpg --verify`.'
          },
          {
            instruction: 'List all configured apt repositories',
            command: 'cat /etc/apt/sources.list && ls /etc/apt/sources.list.d/',
            check: 'sources',
            explanation: 'Sources format: `deb [arch=amd64] http://archive.ubuntu.com/ubuntu focal main restricted universe`. Components: main (Ubuntu-supported), universe (community), restricted (proprietary), multiverse (non-free). For 3rd party repos, verify signing keys: `apt-key list` (deprecated) or `/etc/apt/trusted.gpg.d/`.'
          },
          {
            instruction: 'Remove a package completely (purge configs too)',
            command: 'sudo apt-get purge -y apache2 && sudo apt-get autoremove -y',
            check: 'apt-get',
            explanation: '`remove` uninstalls but keeps config files. `purge` removes package AND config files. After purge: configs in /etc/packagename are gone. `autoremove` cleans up dependencies. Check for leftover files: `find /etc /var /opt -name "*apache*" 2>/dev/null`.'
          }
        ]
      },

      {
        id: 'mod6-ex4',
        title: 'Kernel Upgrades & Management',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'You need to upgrade the kernel on a running EC2 instance (critical security patch), manage multiple kernel versions, and plan the reboot window.',
        steps: [
          {
            instruction: 'Check current kernel version',
            command: 'uname -r && cat /proc/version',
            check: 'uname',
            explanation: '`uname -r` = running kernel version (e.g., 5.15.0-1034-aws). This is the kernel currently in memory. After upgrading the kernel package, the new kernel is installed to /boot but the OLD kernel runs until reboot. You must reboot to apply kernel patches.'
          },
          {
            instruction: 'List installed kernel packages',
            command: 'dpkg -l | grep linux-image',
            check: 'dpkg',
            explanation: 'Shows all installed kernel images. Keep 2 kernels: current + previous (for rollback if new kernel fails). If you see 5+ kernels, clean up older ones: `sudo apt-get autoremove --purge`. /boot partition fills up with old kernels causing "no space left" errors during upgrades.'
          },
          {
            instruction: 'Install latest available kernel',
            command: 'sudo apt-get install -y linux-aws',
            check: 'apt-get',
            explanation: '`linux-aws` = AWS-optimized Ubuntu kernel (recommended for EC2). Includes optimizations for the Xen/KVM hypervisor, enhanced networking, and EBS/NVMe drivers. After install: `/boot` now has the new vmlinuz. GRUB config is automatically updated. Reboot required to activate.'
          },
          {
            instruction: 'Verify GRUB will boot the new kernel',
            command: 'grep -i menuentry /boot/grub/grub.cfg | head -10',
            check: 'grub',
            explanation: 'GRUB config shows all bootable kernel entries. On EC2: PV instances use GRUB2 directly; HVM instances also use GRUB2. For AWS: the `linux-aws` metapackage auto-selects the latest. `grub-reboot 0` selects default for next boot. Use AWS Systems Manager (SSM) console for EC2 console/screenshot if reboot goes wrong.'
          },
          {
            instruction: 'Schedule a safe reboot during maintenance window',
            command: 'sudo shutdown -r +5 "Rebooting for kernel patch"',
            check: 'shutdown',
            explanation: '`shutdown -r +5` reboots in 5 minutes with a broadcast message to logged-in users. For EC2: first remove from Load Balancer target group, wait for connection drain, then reboot. Use AWS Maintenance Windows (Systems Manager) for coordinated multi-instance patching with automatic rollback.'
          }
        ]
      },

      {
        id: 'mod6-ex5',
        title: 'Snap, pip & Third-Party Package Managers',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'Your DevOps toolkit includes tools installed via snap, pip, and custom binaries. You need to manage all three alongside apt.',
        steps: [
          {
            instruction: 'List installed snap packages',
            command: 'snap list',
            check: 'snap',
            explanation: 'Snaps are self-contained packages (different from apt — they bundle their own dependencies). They auto-update by default. Pros: works across distros, automatic updates. Cons: larger disk use, slower startup, confined to snap directories. On EC2: common snaps include microk8s, kubectl, helm.'
          },
          {
            instruction: 'Install a DevOps tool via snap',
            command: 'sudo snap install kubectl --classic',
            check: 'snap',
            explanation: '`--classic` removes snap\'s sandboxing confinement — required for tools that need filesystem access. `--channel=1.28/stable` pins to a specific channel. Snap channels: stable, candidate, beta, edge. For production tools, always use `stable` channel.'
          },
          {
            instruction: 'Install Python packages with pip',
            command: 'pip3 install --user awscli boto3 ansible-core',
            check: 'pip',
            explanation: '`--user` installs to ~/.local/lib/python3.x/site-packages — no root needed. Installs binary to ~/.local/bin (ensure it\'s in PATH). For isolation: use `python3 -m venv .venv` (virtual environments). In Docker: never use --user, just pip install. pip freeze > requirements.txt captures reproducible versions.'
          },
          {
            instruction: 'Use virtual environments for Python tools',
            command: 'python3 -m venv ~/devops-venv && source ~/devops-venv/bin/activate && pip install ansible',
            check: 'venv',
            explanation: 'venv creates isolated Python installations. `source .../activate` switches to it (prompt changes). `pip install` in a venv never touches system Python. `deactivate` exits. For DevOps tools: separate venv per project prevents dependency conflicts (e.g., Ansible and AWS CLI needing different botocore versions).'
          },
          {
            instruction: 'Install a binary directly from GitHub releases',
            command: 'curl -LO "https://github.com/cli/cli/releases/download/v2.40.0/gh_2.40.0_linux_amd64.tar.gz" && tar -xzf gh_2.40.0_linux_amd64.tar.gz && sudo mv gh_2.40.0_linux_amd64/bin/gh /usr/local/bin/',
            check: 'curl',
            explanation: 'Many DevOps tools (gh, helm, terraform, k9s) distribute pre-compiled binaries. Pattern: download release tarball, extract, move to /usr/local/bin (in PATH). Always verify checksums: `sha256sum downloaded.tar.gz`. /usr/local/bin is the convention for manually installed tools vs /usr/bin (system packages).'
          }
        ]
      },

      {
        id: 'mod6-ex6',
        title: 'Patch Management at Scale with SSM',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'You manage 50 EC2 instances. Manual patching each one is not feasible. Set up AWS Systems Manager Patch Manager and understand automated patching at scale.',
        steps: [
          {
            instruction: 'Install SSM agent on Ubuntu EC2',
            command: 'sudo snap install amazon-ssm-agent --classic && sudo systemctl enable amazon-ssm-agent && sudo systemctl start amazon-ssm-agent',
            check: 'ssm',
            explanation: 'AWS SSM Agent enables Systems Manager features including: Patch Manager (automated patching), Session Manager (browser-based SSH without key pairs), Run Command (remote command execution without SSH), and Parameter Store access. Pre-installed on Amazon Linux and recent Ubuntu AMIs.'
          },
          {
            instruction: 'Check SSM agent status',
            command: 'sudo systemctl status amazon-ssm-agent && sudo ssm-cli get-instance-information 2>/dev/null',
            check: 'ssm',
            explanation: 'If SSM agent is running but instance isn\'t appearing in fleet: (1) IAM instance profile needs AmazonSSMManagedInstanceCore policy, (2) Outbound HTTPS to ssm.us-east-1.amazonaws.com needed (or VPC endpoint), (3) Check agent logs: /var/log/amazon/ssm/.'
          },
          {
            instruction: 'Apply pending security patches now',
            command: 'sudo apt-get update && sudo DEBIAN_FRONTEND=noninteractive apt-get -y --with-new-pkgs upgrade',
            check: 'apt-get',
            explanation: 'DEBIAN_FRONTEND=noninteractive prevents interactive prompts for debconf. `--with-new-pkgs` handles dependency upgrades that require new packages. This is the command SSM Patch Manager runs on Ubuntu. Equivalent to: `sudo unattended-upgrades` but applies ALL updates not just security.'
          },
          {
            instruction: 'Create a patching schedule via cron',
            command: 'echo "0 2 * * 0 root DEBIAN_FRONTEND=noninteractive apt-get -y --with-new-pkgs upgrade && apt-get autoremove -y" | sudo tee /etc/cron.d/weekly-patch',
            check: 'cron',
            explanation: 'Runs every Sunday at 2 AM as root. In production: coordinate with deployment schedules, notify on-call team, ensure load balancers drain before reboot. Better approach: use SSM Maintenance Windows which integrates with CloudWatch Events, sends SNS notifications, and handles instance registration/deregistration.'
          },
          {
            instruction: 'View patch compliance status',
            command: 'sudo apt-get -s upgrade 2>/dev/null | grep -c "^Inst" && echo "packages pending upgrade"',
            check: 'apt-get',
            explanation: '`-s` = simulate, count lines starting with "Inst" = pending upgrades. For production compliance: use AWS Config Rule `ec2-managedinstance-patch-compliance-status-check`, which integrates with Security Hub and can auto-remediate non-compliant instances. Report on patch state via AWS Systems Manager Compliance dashboards.'
          }
        ]
      }
    ]
  }
];
