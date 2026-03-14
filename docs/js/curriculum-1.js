/* ============================================================
   CURRICULUM PART 1  —  Modules 1 · 2 · 3
   1: EC2 Orientation & Shell Basics
   2: Users, Groups & Sudo
   3: File System Navigation & Management
   ============================================================ */

window.CURRICULUM_PART1 = [

  /* ══════════════════════════════════════════════════════════
     MODULE 1 · EC2 Orientation & Shell Basics
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod1',
    title: 'EC2 Orientation & Shell',
    icon: '🖥️',
    difficulty: 'beginner',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod1-ex1',
        title: 'First Login — Know Your Instance',
        difficulty: 'beginner',
        time: '5 min',
        scenario: 'You\'ve just SSH\'d into a brand-new Ubuntu 22.04 EC2 instance (t3.medium, us-east-1). Your manager says <strong>"find out what you\'re working with"</strong> before touching anything.',
        steps: [
          {
            instruction: 'Check the hostname and current user',
            command: 'hostname && whoami',
            check: 'hostname',
            explanation: '`hostname` prints the EC2 private DNS name (ip-172-31-x-x). `whoami` confirms you\'re logged in as ubuntu — the default non-root user on Ubuntu AMIs. Always verify identity before running commands.'
          },
          {
            instruction: 'Get full OS and kernel info',
            command: 'uname -a',
            check: 'uname',
            explanation: '`uname -a` prints: kernel name, hostname, kernel release, kernel version, machine hardware (x86_64), OS. Critical when checking if a CVE patch applies to your running kernel.'
          },
          {
            instruction: 'Read the OS release details',
            command: 'cat /etc/os-release',
            check: 'cat /etc/os-release',
            explanation: '/etc/os-release is the standard file for distro identification. Scripts and configuration management tools (Ansible, Chef) read this to decide which package manager to use.'
          },
          {
            instruction: 'See how long the instance has been running',
            command: 'uptime',
            check: 'uptime',
            explanation: 'uptime shows: current time, how long the system has been up, number of logged-in users, and 1/5/15-minute load averages. Load > number of CPUs = system is saturated.'
          },
          {
            instruction: 'Check CPU count and architecture',
            command: 'nproc && lscpu | grep -E "^CPU|^Architecture|^Thread"',
            check: 'nproc',
            explanation: '`nproc` gives the number of CPUs available to the process. `lscpu` gives detailed CPU topology — useful for tuning thread pools, Nginx worker_processes, and Java heap sizing.'
          },
          {
            instruction: 'Quickly review EC2 instance metadata',
            command: 'curl http://169.254.169.254/latest/meta-data/instance-type',
            check: 'curl',
            explanation: 'AWS Instance Metadata Service (IMDS) at 169.254.169.254 is only reachable from within EC2. It exposes instance-id, AMI-id, IAM role credentials, public-ip, and more — all without needing AWS CLI.'
          }
        ]
      },

      {
        id: 'mod1-ex2',
        title: 'Shell Navigation & History',
        difficulty: 'beginner',
        time: '5 min',
        scenario: 'Your teammate ran a deployment script 20 minutes ago on this instance. You need to find out what commands were run and navigate the filesystem quickly.',
        steps: [
          {
            instruction: 'View the last 30 commands run on this shell',
            command: 'history | tail -30',
            check: 'history',
            explanation: '`history` reads ~/.bash_history. Piping to `tail -30` shows the most recent 30. In incident response, history is your first audit trail. Note: history can be cleared — pairing with `/var/log/auth.log` gives a fuller picture.'
          },
          {
            instruction: 'Find all sudo commands ever run',
            command: 'history | grep sudo',
            check: 'history',
            explanation: 'Grep filters history for privilege escalations. In a breach investigation, this quickly shows if someone ran `sudo su`, `sudo bash`, or modified sudoers.'
          },
          {
            instruction: 'Print current directory and list contents',
            command: 'pwd && ls -la',
            check: 'ls',
            explanation: '`pwd` = print working directory. `ls -la` = long format (-l) + show hidden files (-a). Hidden files start with a dot (.bashrc, .ssh, .aws). Always check these after gaining access to a new system.'
          },
          {
            instruction: 'Navigate to /var/log and list all logs',
            command: 'cd /var/log && ls -lhS',
            check: 'cd',
            explanation: '/var/log is where all system/application logs live on Linux. `-lhS` = long, human-readable sizes, sorted by Size (largest first). Largest logs flag the noisiest services — often misconfigured or under attack.'
          },
          {
            instruction: 'Jump back to your home directory quickly',
            command: 'cd ~',
            check: 'cd',
            explanation: '`cd ~` or just `cd` with no args always returns you to $HOME (/home/ubuntu). Use `cd -` to toggle between the last two directories — a huge time-saver when switching between /etc/nginx and /var/log/nginx.'
          }
        ]
      },

      {
        id: 'mod1-ex3',
        title: 'Terminal Shortcuts & Environment',
        difficulty: 'beginner',
        time: '5 min',
        scenario: 'You\'re on a fresh EC2 instance and need to set up your shell environment and understand key variables before running deployment commands.',
        steps: [
          {
            instruction: 'Print all environment variables',
            command: 'env | sort',
            check: 'env',
            explanation: '`env` dumps all exported shell variables. Sorted, you can quickly spot PATH issues, missing AWS_REGION, wrong HOME, or injected secrets that shouldn\'t be there. Critical for debugging app config issues.'
          },
          {
            instruction: 'Show only the PATH variable',
            command: 'echo $PATH',
            check: 'echo',
            explanation: 'PATH determines which directories the shell searches for executables. If you install a tool and bash says "command not found", the binary\'s directory isn\'t in PATH. Fix: `export PATH=$PATH:/new/dir`.'
          },
          {
            instruction: 'Check your default shell',
            command: 'echo $SHELL && cat /etc/shells',
            check: 'echo',
            explanation: '$SHELL shows your current shell binary. /etc/shells lists all valid login shells on the system. Useful when setting up CI/CD agents that need a specific shell.'
          },
          {
            instruction: 'View the bash config file',
            command: 'cat ~/.bashrc',
            check: 'cat',
            explanation: '~/.bashrc is sourced for every interactive non-login shell. This is where you put aliases, function definitions, and PATH additions for interactive use. ~/.bash_profile or ~/.profile is sourced for login shells.'
          },
          {
            instruction: 'Create a useful alias and reload the shell',
            command: 'echo "alias ll=\'ls -lah\'" >> ~/.bashrc && source ~/.bashrc',
            check: 'bashrc',
            explanation: '`echo "..." >> ~/.bashrc` appends without overwriting. `source ~/.bashrc` (or `. ~/.bashrc`) reloads without opening a new terminal. Now `ll` works in all new shells. >> appends, > overwrites — never confuse them.'
          }
        ]
      },

      {
        id: 'mod1-ex4',
        title: 'Finding Your Way: which, find, locate',
        difficulty: 'beginner',
        time: '6 min',
        scenario: 'You need to verify where binaries live, find a missing config file, and track down log files across the filesystem.',
        steps: [
          {
            instruction: 'Find where the python3 binary is installed',
            command: 'which python3 && whereis python3',
            check: 'which',
            explanation: '`which` searches PATH and returns the first match — the binary that would actually run. `whereis` searches standard system paths and also returns man pages and source directories. Use `which` for scripts, `whereis` for full discovery.'
          },
          {
            instruction: 'Find all .log files in /var/log modified in last 24h',
            command: 'find /var/log -name "*.log" -mtime -1',
            check: 'find',
            explanation: '`find` is the most powerful file-search tool. `-mtime -1` = modified less than 1 day ago. Other useful flags: `-size +100M` (files over 100MB), `-type d` (directories only), `-user root` (owned by root). Essential for disk space investigations.'
          },
          {
            instruction: 'Find all SUID binaries (security audit)',
            command: 'find / -perm /4000 -type f 2>/dev/null',
            check: 'find',
            explanation: 'SUID (Set User ID) binaries run as their owner (often root) regardless of who executes them. Attackers plant malicious SUID binaries to maintain root access. `2>/dev/null` suppresses permission errors. Run this during security audits.'
          },
          {
            instruction: 'Search for the nginx config file',
            command: 'find /etc -name "nginx.conf" 2>/dev/null',
            check: 'find',
            explanation: 'Configuration files live in /etc by Linux FHS convention. `2>/dev/null` silences "Permission denied" messages (which would mix with real results). In automation, always redirect stderr separately from stdout.'
          },
          {
            instruction: 'Use grep to find text inside files recursively',
            command: 'grep -r "ubuntu" /etc/passwd',
            check: 'grep',
            explanation: '`grep -r` recursively searches file contents. Use `-l` to only print filenames, `-n` to show line numbers, `-i` for case-insensitive. This is how you find which config file references a deprecated setting.'
          }
        ]
      },

      {
        id: 'mod1-ex5',
        title: 'Reading & Writing Files',
        difficulty: 'beginner',
        time: '7 min',
        scenario: 'You need to read large log files efficiently, write config snippets, and safely pipe data between commands.',
        steps: [
          {
            instruction: 'View the first 20 lines of /var/log/syslog',
            command: 'head -20 /var/log/syslog',
            check: 'head',
            explanation: '`head` reads from the start. Default is 10 lines; `-n 20` or `-20` gives 20. Use `head` to quickly see log format and identify service names before applying grep filters.'
          },
          {
            instruction: 'Follow a log file in real time (like tail -f)',
            command: 'tail -f /var/log/syslog',
            check: 'tail',
            explanation: '`tail -f` streams new lines as they are written — the #1 tool for watching live deployments, service restarts, and error propagation. Press Ctrl+C to exit. `tail -F` is better for log rotation (follows by name).'
          },
          {
            instruction: 'Page through a large file',
            command: 'less /var/log/syslog',
            check: 'less',
            explanation: '`less` loads files lazily — no memory issues with huge logs. Navigation: Space (page down), b (page up), /pattern (search), n (next match), q (quit), G (end of file), g (start). Much better than `cat` for large files.'
          },
          {
            instruction: 'Count lines, words, bytes in a file',
            command: 'wc -l /var/log/syslog',
            check: 'wc',
            explanation: '`wc -l` = line count. `-w` = word count, `-c` = byte count, `-m` = character count. Piped into other commands: `cat access.log | grep "404" | wc -l` tells you how many 404 errors occurred.'
          },
          {
            instruction: 'Write a multi-line config block to a file',
            command: 'cat > /tmp/test.conf << EOF\n[server]\nport=8080\nenv=production\nEOF',
            check: 'cat',
            explanation: 'Here-doc (`<< EOF`) lets you write multi-line content without a text editor — essential for automation scripts. `>` creates/overwrites. `>>` appends. In Ansible you\'d use the `template` module for this in production.'
          }
        ]
      },

      {
        id: 'mod1-ex6',
        title: 'Disk & Memory at a Glance',
        difficulty: 'beginner',
        time: '5 min',
        scenario: 'Monitoring alert: EC2 instance showing high resource usage. You need to do a 60-second first-look before deeper investigation.',
        steps: [
          {
            instruction: 'Check disk usage on all mounted filesystems',
            command: 'df -h',
            check: 'df',
            explanation: '`df -h` = disk free, human-readable. Shows mount point, total/used/available space, and usage %. When / (root) or /var hits 90%+, applications crash with "No space left on device". The #1 cause of production outages.'
          },
          {
            instruction: 'Find the largest directories consuming disk',
            command: 'du -sh /var/log/* | sort -rh | head -10',
            check: 'du',
            explanation: '`du -sh` = disk usage summary, human-readable. Piped to `sort -rh` (reverse, human-sort) then `head -10` finds the top 10 largest log directories. Run this first when disk is nearly full to find what to clean up.'
          },
          {
            instruction: 'Check RAM usage',
            command: 'free -h',
            check: 'free',
            explanation: '`free -h` shows total/used/free/available RAM and swap. "available" is what the kernel can give to new processes (including pagecache). If available < 500MB on a 4GB instance, investigate with `top` or `ps`.'
          },
          {
            instruction: 'Snapshot all running processes with resource usage',
            command: 'top -bn1 | head -20',
            check: 'top',
            explanation: '`top -b` = batch mode (non-interactive, good for scripts), `-n1` = one iteration. Shows %CPU, %MEM, RES (actual RAM). For a nicer output, use `htop` if installed. This gives you the "who is eating my CPU/RAM" answer within seconds.'
          },
          {
            instruction: 'Check virtual memory and swap activity',
            command: 'vmstat 1 3',
            check: 'vmstat',
            explanation: '`vmstat 1 3` = print stats every 1 second, 3 times. Key columns: `si`/`so` = swap in/out (if non-zero, RAM exhausted), `us`/`sy` = user/system CPU, `wa` = I/O wait (high = storage bottleneck). Essential for performance triage.'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 2 · Users, Groups & Sudo
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod2',
    title: 'Users, Groups & Sudo',
    icon: '👤',
    difficulty: 'beginner',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod2-ex1',
        title: 'Creating & Managing Users',
        difficulty: 'beginner',
        time: '7 min',
        scenario: 'A new developer named <strong>devuser</strong> joins the team. You need to create their Linux account on the EC2 instance, set a password, and configure their home directory.',
        steps: [
          {
            instruction: 'Add a new user with a home directory',
            command: 'sudo useradd -m -s /bin/bash devuser',
            check: 'useradd',
            explanation: '`useradd` creates the user. `-m` creates /home/devuser. `-s /bin/bash` sets bash as their default shell. Without `-m`, no home directory is created and the user cannot log in normally. Always specify `-s` on Ubuntu.'
          },
          {
            instruction: 'Set a password for the new user',
            command: 'sudo passwd devuser',
            check: 'passwd',
            explanation: '`passwd` prompts for a new password twice. For automation (scripts, Ansible), use: `echo "devuser:<STRONG_PASS>" | sudo chpasswd` instead — replace &lt;STRONG_PASS&gt; with a value fetched from AWS Secrets Manager or Parameter Store. Never hardcode real passwords in scripts.'
          },
          {
            instruction: 'Verify the user was created',
            command: 'cat /etc/passwd | grep devuser',
            check: 'passwd',
            explanation: '/etc/passwd stores user accounts: username:password(x):UID:GID:comment:home:shell. The "x" in password field means the actual hash is in /etc/shadow (readable only by root). UID 0 = root.'
          },
          {
            instruction: 'Check the password hash (shadow file)',
            command: 'sudo cat /etc/shadow | grep devuser',
            check: 'shadow',
            explanation: '/etc/shadow stores hashed passwords and aging policies. Format: user:$6$salt$hash:lastchange:minage:maxage:warn:inactive:expire. $6$ = SHA-512. Never copy shadow hashes between systems without knowing the implications.'
          },
          {
            instruction: 'Lock the account temporarily',
            command: 'sudo usermod -L devuser',
            check: 'usermod',
            explanation: '`usermod -L` locks by prepending ! to the password hash in /etc/shadow. The account exists but cannot authenticate. Use this instead of deletion when access needs to be temporarily revoked. Unlock: `sudo usermod -U devuser`.'
          },
          {
            instruction: 'Unlock the account',
            command: 'sudo usermod -U devuser',
            check: 'usermod',
            explanation: '`usermod -U` removes the ! prefix, restoring the password. Also useful: `sudo usermod -e 2026-12-31 devuser` sets an account expiry date. `sudo chage -l devuser` shows all password aging information.'
          }
        ]
      },

      {
        id: 'mod2-ex2',
        title: 'Groups & Sudo Privileges',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: '<strong>devuser</strong> needs to run sudo commands to deploy applications. You also need to create a shared group called <strong>deployers</strong> so multiple users can write to deployment directories.',
        steps: [
          {
            instruction: 'Create a new group called deployers',
            command: 'sudo groupadd deployers',
            check: 'groupadd',
            explanation: '`groupadd` creates a new group entry in /etc/group. Groups are the primary access control mechanism for shared file access on Linux — better than making files world-writable. Check /etc/group: `cat /etc/group | grep deployers`.'
          },
          {
            instruction: 'Add devuser to the deployers group',
            command: 'sudo usermod -aG deployers devuser',
            check: 'usermod',
            explanation: '`-aG` = append to supplementary Groups. CRITICAL: Use `-aG` not `-G` alone. `-G` replaces all supplementary groups, potentially locking the user out of important groups like `docker` or `sudo`. Always use `-a` (append).'
          },
          {
            instruction: 'Add devuser to the sudo group',
            command: 'sudo usermod -aG sudo devuser',
            check: 'sudo',
            explanation: 'On Ubuntu, members of the `sudo` group can run any command as root via sudo. On RHEL/CentOS the group is `wheel`. In production, restrict sudo: use sudoers rules instead of blanket sudo access (see next step).'
          },
          {
            instruction: 'View all groups devuser belongs to',
            command: 'groups devuser',
            check: 'groups',
            explanation: '`groups username` lists all groups. Note: a user must log out and back in for new group memberships to take effect in existing sessions. In scripts: `id devuser` gives UID, GID, and all group memberships in one line.'
          },
          {
            instruction: 'Grant specific sudo access via sudoers file',
            command: 'echo "devuser ALL=(ALL) NOPASSWD: /usr/bin/systemctl" | sudo tee /etc/sudoers.d/devuser',
            check: 'sudoers',
            explanation: 'The principle of least privilege: instead of full sudo, restrict to specific commands. This lets devuser run `sudo systemctl` without a password but nothing else. `tee` writes to a privileged file. NEVER edit /etc/sudoers directly — use `visudo` or /etc/sudoers.d/.'
          },
          {
            instruction: 'Validate the sudoers file for syntax errors',
            command: 'sudo visudo -c',
            check: 'visudo',
            explanation: '`visudo -c` = check mode (validates syntax without opening editor). A syntax error in /etc/sudoers can lock you out of sudo entirely. Always validate. In CI/CD, lint sudoers files before applying with Ansible.'
          }
        ]
      },

      {
        id: 'mod2-ex3',
        title: 'File Ownership & Permissions',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: 'Your deployment directory /opt/app is owned by root but the deployers group needs write access. You also need to set correct permissions on a private SSH key.',
        steps: [
          {
            instruction: 'Create a deployment directory and check its permissions',
            command: 'sudo mkdir -p /opt/app && ls -ld /opt/app',
            check: 'mkdir',
            explanation: '`mkdir -p` creates parent directories as needed. `ls -ld` lists directory itself (not contents). Reading permissions: drwxr-xr-x = directory, owner=rwx, group=r-x, others=r-x. Owner is root, so group/others can\'t write.'
          },
          {
            instruction: 'Change the group owner to deployers',
            command: 'sudo chgrp deployers /opt/app',
            check: 'chgrp',
            explanation: '`chgrp` changes group ownership. Combined with the right permissions, this lets the deployers group manage files without giving write access to everyone. Alternative: `sudo chown root:deployers /opt/app` changes both owner and group.'
          },
          {
            instruction: 'Grant group write permission on /opt/app',
            command: 'sudo chmod 775 /opt/app',
            check: 'chmod',
            explanation: 'chmod 775: owner=rwx(7) group=rwx(7) others=r-x(5). Octal: r=4, w=2, x=1. Now deployers group members can create/modify files in /opt/app. 755 = default dir, 644 = default file, 600 = SSH key, 400 = secrets.'
          },
          {
            instruction: 'Set the setgid bit so new files inherit the group',
            command: 'sudo chmod g+s /opt/app',
            check: 'chmod',
            explanation: 'Setgid (g+s) on a directory: new files/subdirectories inherit the parent\'s group (deployers) instead of the creator\'s primary group. This prevents permission issues when multiple team members write to shared deployment directories.'
          },
          {
            instruction: 'Fix permissions on a private SSH key',
            command: 'chmod 600 ~/.ssh/id_rsa',
            check: 'chmod',
            explanation: 'SSH refuses to use private keys with permissions wider than 600. chmod 600 = owner read+write only. Others have NO access. If you ignore this, ssh will error: "WARNING: UNPROTECTED PRIVATE KEY FILE!" and refuse to authenticate.'
          },
          {
            instruction: 'Recursively fix ownership of app directory',
            command: 'sudo chown -R ubuntu:deployers /opt/app',
            check: 'chown',
            explanation: '`chown -R` recursively changes owner AND group for directory and all contents. Pattern: `chown user:group path`. After automated deployments, run this to ensure service accounts can read deployed files.'
          }
        ]
      },

      {
        id: 'mod2-ex4',
        title: 'SSH Key Authentication',
        difficulty: 'intermediate',
        time: '7 min',
        scenario: 'You need to set up key-based SSH authentication for devuser so they can log into this EC2 instance without a password.',
        steps: [
          {
            instruction: 'Generate an SSH key pair for devuser',
            command: 'sudo -u devuser ssh-keygen -t ed25519 -C "devuser@company.com" -f /home/devuser/.ssh/id_ed25519 -N ""',
            check: 'ssh-keygen',
            explanation: '`-t ed25519` = modern elliptic-curve algorithm (preferred over RSA 2048). `-C` adds a comment. `-f` specifies the output file. `-N ""` sets empty passphrase (use a passphrase in production!). AWS EC2 uses RSA 2048/4096; ed25519 is better for internal infra.'
          },
          {
            instruction: 'Create the .ssh directory with correct permissions',
            command: 'sudo -u devuser mkdir -p /home/devuser/.ssh && sudo chmod 700 /home/devuser/.ssh',
            check: 'mkdir',
            explanation: '.ssh directory MUST be 700 (only owner can read/write/execute). If permissions are too open, SSH refuses to use it. This is a common issue when cloning home directories or restoring from backup.'
          },
          {
            instruction: 'Add the public key to authorized_keys',
            command: 'sudo cat /home/devuser/.ssh/id_ed25519.pub | sudo tee -a /home/devuser/.ssh/authorized_keys',
            check: 'authorized_keys',
            explanation: 'authorized_keys lists public keys allowed to log in. Each line = one public key. `tee -a` appends. For multiple developers, each person\'s public key is on a separate line. On AWS, the key-pair you select at launch is injected here automatically.'
          },
          {
            instruction: 'Set correct permissions on authorized_keys',
            command: 'sudo chmod 600 /home/devuser/.ssh/authorized_keys && sudo chown devuser:devuser /home/devuser/.ssh/authorized_keys',
            check: 'chmod',
            explanation: 'authorized_keys must be 600 (owner read+write only). If it\'s writable by others, SSH ignores it for security. After any file copy or automation that touches .ssh/, always re-verify permissions.'
          },
          {
            instruction: 'View current SSH daemon configuration',
            command: 'sudo cat /etc/ssh/sshd_config | grep -E "^PermitRoot|^PubkeyAuth|^PasswordAuth|^Port"',
            check: 'sshd_config',
            explanation: 'Key security settings: PermitRootLogin=no (never SSH as root), PubkeyAuthentication=yes (allow keys), PasswordAuthentication=no (disable passwords to prevent brute-force), Port=22 (change to reduce noise). After editing sshd_config, reload: `sudo systemctl reload sshd`.'
          }
        ]
      },

      {
        id: 'mod2-ex5',
        title: 'Switching Users & Root Access',
        difficulty: 'intermediate',
        time: '6 min',
        scenario: 'You need to temporarily work as a different user, switch to root for maintenance, and understand when each approach is appropriate.',
        steps: [
          {
            instruction: 'Switch to devuser account',
            command: 'sudo su - devuser',
            check: 'su',
            explanation: '`su - username` switches to that user and loads their full environment (home dir, PATH, shell). The `-` is crucial — without it you keep your current environment which can cause path/permission issues. `exit` returns to previous user.'
          },
          {
            instruction: 'Run a single command as another user',
            command: 'sudo -u devuser ls /home/devuser',
            check: 'sudo -u',
            explanation: '`sudo -u user command` runs one command as that user without a full shell switch. Preferred in scripts — atomic, auditable, and safer than su. Used extensively in Ansible (become_user), Docker entrypoints, and service scripts.'
          },
          {
            instruction: 'Open a root shell (use only when necessary)',
            command: 'sudo -i',
            check: 'sudo',
            explanation: '`sudo -i` opens a root login shell. Use sparingly — every command runs as root. Prefer `sudo command` for specific tasks. In production: enable MFA for sudo, log all root sessions, and alert on `sudo -i` usage via CloudWatch or auditd.'
          },
          {
            instruction: 'Check who is currently logged in',
            command: 'w',
            check: 'w',
            explanation: '`w` shows logged-in users, their terminal, login time, idle time, and the command they\'re running. More detailed than `who`. Critical in incident response: "is the attacker still on the system right now?"'
          },
          {
            instruction: 'View all failed sudo attempts in auth log',
            command: 'sudo grep "FAILED" /var/log/auth.log | tail -20',
            check: 'auth.log',
            explanation: '/var/log/auth.log records all sudo attempts, SSH logins, and PAM authentication events. Failed sudo = wrong password or unauthorized user. In production, ship this to CloudWatch Logs and set alarms on "authentication failure" patterns.'
          }
        ]
      },

      {
        id: 'mod2-ex6',
        title: 'Delete Users & Audit Accounts',
        difficulty: 'intermediate',
        time: '5 min',
        scenario: 'An ex-employee\'s account needs to be removed. You also need to audit all user accounts on the server looking for stale or suspicious accounts.',
        steps: [
          {
            instruction: 'List all users with login shells (real users)',
            command: 'grep -vE "^#|nologin|false" /etc/passwd | cut -d: -f1,3,7',
            check: 'passwd',
            explanation: 'Filters /etc/passwd to show only accounts with real shells. Fields: username, UID, shell. UID < 1000 = system accounts. UID 0 = root. Multiple UID-0 accounts = backdoor! This grep is a quick account audit baseline.'
          },
          {
            instruction: 'Check for accounts with no password set',
            command: 'sudo awk -F: "($2 == \"\" ) { print $1}" /etc/shadow',
            check: 'shadow',
            explanation: 'Accounts with empty password field in /etc/shadow can be accessed without authentication in some configurations. This should return nothing on a hardened system. Part of CIS Benchmark Level 1 audit checks.'
          },
          {
            instruction: 'Delete the user and their home directory',
            command: 'sudo userdel -r devuser',
            check: 'userdel',
            explanation: '`userdel -r` removes the user AND their home directory and mail spool. Without `-r`, the home directory remains (useful when you want to archive their files first). Always check for running processes owned by the user before deletion: `ps aux | grep devuser`.'
          },
          {
            instruction: 'Verify the user has been removed',
            command: 'id devuser',
            check: 'id',
            explanation: 'After deletion, `id devuser` should return "no such user". Also verify: `ls /home/` (home dir gone), `crontab -l -u devuser` (no scheduled jobs remaining), and orphaned files: `find / -nouser 2>/dev/null`.'
          },
          {
            instruction: 'Find files owned by non-existent users',
            command: 'find /home /opt /var/www -nouser 2>/dev/null',
            check: 'find',
            explanation: '`-nouser` finds files with no matching entry in /etc/passwd (orphaned files). After user deletion these are security risks — they could be picked up by a new user who gets assigned that UID. Chown or delete them as part of offboarding.'
          }
        ]
      }
    ]
  },

  /* ══════════════════════════════════════════════════════════
     MODULE 3 · File System Navigation & Management
     ══════════════════════════════════════════════════════════ */
  {
    id: 'mod3',
    title: 'File System & Storage',
    icon: '💾',
    difficulty: 'beginner',
    description: '6 exercises',
    exercises: [

      {
        id: 'mod3-ex1',
        title: 'Linux Directory Structure (FHS)',
        difficulty: 'beginner',
        time: '6 min',
        scenario: 'A junior dev keeps putting config files in /home. You need to understand the Filesystem Hierarchy Standard (FHS) so you can set up proper paths for your application.',
        steps: [
          {
            instruction: 'Explore the root filesystem structure',
            command: 'ls -la /',
            check: 'ls',
            explanation: 'Key directories: /etc (config files), /var (variable data: logs, cache, spool), /opt (third-party software), /usr (user programs), /bin & /sbin (binaries), /tmp (temp, cleared on reboot), /proc (virtual: kernel/process info), /dev (device files), /mnt & /media (mount points).'
          },
          {
            instruction: 'Understand the /proc virtual filesystem',
            command: 'cat /proc/cpuinfo | head -20 && cat /proc/meminfo | head -10',
            check: 'proc',
            explanation: '/proc is a virtual filesystem — files here are not on disk, they\'re kernel data structures exposed as files. /proc/cpuinfo, /proc/meminfo, /proc/net/tcp, /proc/[PID]/ (per-process info). `cat /proc/version` shows exact kernel build. Tools like `top` and `free` read /proc.'
          },
          {
            instruction: 'Check all mounted filesystems',
            command: 'mount | column -t',
            check: 'mount',
            explanation: '`mount` lists all mounted filesystems. `column -t` aligns output into columns. You\'ll see: / (root), /dev (device nodes), /proc (virtual), /sys (kernel hardware info), /tmp (tmpfs = RAM). On EC2: /dev/xvda1 or /dev/nvme0n1p1 is your EBS root volume.'
          },
          {
            instruction: 'See disk partition layout',
            command: 'lsblk',
            check: 'lsblk',
            explanation: '`lsblk` shows block devices (disks + partitions) in a tree. On EC2: `xvda` or `nvme0n1` = EBS volume. `nvme0n1p1` = the partition. Additional EBS volumes appear as xvdb, xvdc etc. Used before mounting new volumes.'
          },
          {
            instruction: 'Check inode usage (not just disk space)',
            command: 'df -i',
            check: 'df',
            explanation: '`df -i` shows inode usage. Inodes store file metadata (permissions, timestamps, ownership). A filesystem can be out of inodes while still having free disk space — this also causes "No space left" errors. Common when you have millions of small files (mail queues, temp files).'
          }
        ]
      },

      {
        id: 'mod3-ex2',
        title: 'File Operations: Copy, Move, Link',
        difficulty: 'beginner',
        time: '6 min',
        scenario: 'Preparing for a deployment: copying config templates, moving files to the right location, and creating symlinks for version management.',
        steps: [
          {
            instruction: 'Copy a config file preserving attributes',
            command: 'cp -a /etc/nginx/nginx.conf /tmp/nginx.conf.bak',
            check: 'cp',
            explanation: '`cp -a` = archive mode: preserves permissions, timestamps, owner, and copies symlinks as-is. Always use `-a` when backing up config files. Use `-r` for directories, `--preserve=all` when you need verbose attribute preservation.'
          },
          {
            instruction: 'Move (rename) files safely',
            command: 'mv /tmp/nginx.conf.bak /tmp/nginx.conf.$(date +%Y%m%d)',
            check: 'mv',
            explanation: '`mv` is atomic on the same filesystem (no data copy, just inode rename). `$(date +%Y%m%d)` appends today\'s date (e.g., nginx.conf.20260314). This pattern creates timestamped backups before overwriting config files — a production best practice.'
          },
          {
            instruction: 'Create a hard link vs a symbolic link',
            command: 'ln /tmp/test.conf /tmp/test-hard.conf && ln -s /tmp/test.conf /tmp/test-sym.conf',
            check: 'ln',
            explanation: 'Hard link: same inode, both filenames point to identical data. Delete one, data remains. Symbolic (soft) link: pointer to a path. If original is deleted, symlink breaks. Symlinks are used for versioned deployments: /opt/app/current → /opt/app/v2.3.1.'
          },
          {
            instruction: 'Verify symlinks with ls -l',
            command: 'ls -la /tmp/test-sym.conf',
            check: 'ls',
            explanation: 'Symlinks show as `lrwxrwxrwx` with `→ target`. The permissions shown are the symlink\'s own permissions (always 777) — actual access is controlled by the target\'s permissions. Broken symlinks appear in red in most terminals.'
          },
          {
            instruction: 'Use rsync for safe directory copy',
            command: 'rsync -av /etc/ssl/ /tmp/ssl-backup/',
            check: 'rsync',
            explanation: 'rsync is the production-grade file sync tool: `-a` = archive (like cp -a), `-v` = verbose, `--delete` = mirror mode (deletes files not in source), `-z` = compress (for remote), `-n` = dry run. For EC2→S3 or server→server, rsync over SSH is the standard.'
          }
        ]
      },

      {
        id: 'mod3-ex3',
        title: 'Attaching & Mounting EBS Volumes',
        difficulty: 'intermediate',
        time: '10 min',
        scenario: 'You\'ve attached a new 20GB EBS volume to your EC2 instance for application data. Walk through the complete workflow: discover → partition → format → mount → persist.',
        steps: [
          {
            instruction: 'Discover the new block device',
            command: 'lsblk && ls /dev/xvd*',
            check: 'lsblk',
            explanation: 'After attaching an EBS volume in the AWS console, it appears in /dev/ as xvdb, xvdc, or nvme1n1 (NVMe). `lsblk` shows the device and confirms it has no partitions yet. Always verify the new device before formatting.'
          },
          {
            instruction: 'Create a filesystem on the new volume',
            command: 'sudo mkfs.ext4 -L appdata /dev/xvdb',
            check: 'mkfs',
            explanation: '`mkfs.ext4` formats with the ext4 filesystem. `-L appdata` sets a label (used in /etc/fstab instead of UUID — but UUID is safer). Alternatives: `mkfs.xfs` (better for large files), `mkfs.btrfs`. WARNING: This destroys all existing data on the device.'
          },
          {
            instruction: 'Get the UUID of the new filesystem',
            command: 'sudo blkid /dev/xvdb',
            check: 'blkid',
            explanation: '`blkid` shows filesystem type, UUID, and label. Use UUID in /etc/fstab — device names can change on reboot (xvdb might become xvdc). UUID never changes for the lifetime of the filesystem.'
          },
          {
            instruction: 'Create mount point and mount the volume',
            command: 'sudo mkdir -p /data && sudo mount /dev/xvdb /data && df -h /data',
            check: 'mount',
            explanation: 'Mount point = directory where the filesystem becomes accessible. After `mount`, /data shows the filesystem contents. `df -h /data` confirms successful mount and shows available space.'
          },
          {
            instruction: 'Make the mount persistent across reboots',
            command: 'echo "UUID=$(sudo blkid -s UUID -o value /dev/xvdb) /data ext4 defaults,nofail 0 2" | sudo tee -a /etc/fstab',
            check: 'fstab',
            explanation: '/etc/fstab = filesystem table, read at boot. `nofail` prevents boot failure if the EBS volume is detached. `0 2` = dump disabled, fsck runs second. After editing fstab, always test: `sudo mount -a` (mounts all fstab entries without rebooting).'
          },
          {
            instruction: 'Test fstab without rebooting',
            command: 'sudo umount /data && sudo mount -a && df -h /data',
            check: 'mount',
            explanation: '`umount /data` unmounts. `mount -a` re-reads /etc/fstab and mounts all entries. If this fails, fix fstab before rebooting — a wrong fstab can boot your EC2 into emergency mode, requiring instance console access to fix.'
          }
        ]
      },

      {
        id: 'mod3-ex4',
        title: 'Disk Space Cleanup & Maintenance',
        difficulty: 'intermediate',
        time: '8 min',
        scenario: '🚨 INCIDENT: Root disk at 94% on production EC2. Application throwing "No space left on device" errors. You have 10 minutes to free space without restarting the service.',
        steps: [
          {
            instruction: 'Identify the largest directories immediately',
            command: 'sudo du -sh /* 2>/dev/null | sort -rh | head -15',
            check: 'du',
            explanation: 'This is your first command in any "disk full" incident. Scans root-level dirs and sorts by size. Common culprits: /var/log (unrotated logs), /var/lib/docker (unused images), /tmp (large temp files), /home (developer files), /opt (old deployments).'
          },
          {
            instruction: 'Find the largest single files on the system',
            command: 'sudo find / -type f -size +100M 2>/dev/null | xargs ls -lh 2>/dev/null | sort -k5 -rh | head -10',
            check: 'find',
            explanation: 'Finds individual files over 100MB and sorts by size. Common offenders: coredump files (/var/crash), journal logs, uncompressed nginx/apache access logs, undeleted old kernel packages. xargs + ls -lh gives human-readable sizes with paths.'
          },
          {
            instruction: 'Clean apt/dpkg package cache',
            command: 'sudo apt-get clean && sudo apt-get autoremove -y',
            check: 'apt',
            explanation: '`apt-get clean` removes cached .deb files from /var/cache/apt/archives (safe, can always re-download). `autoremove` removes packages installed as dependencies that are no longer needed. Safe to run on any Ubuntu system, recovers 500MB–2GB commonly.'
          },
          {
            instruction: 'Truncate a growing log file safely (without restart)',
            command: 'sudo truncate -s 0 /var/log/syslog',
            check: 'truncate',
            explanation: '`truncate -s 0` empties a file without deleting it. Deleting a file while a process has it open does NOT free disk space until the process closes its file descriptor. Truncating empties the content while keeping the inode open — space is freed immediately.'
          },
          {
            instruction: 'Clean old systemd journal logs',
            command: 'sudo journalctl --vacuum-size=100M',
            check: 'journalctl',
            explanation: '`journalctl --vacuum-size=100M` keeps only 100MB of journal logs (stored in /var/log/journal). `--vacuum-time=7d` keeps only the last 7 days. In production, configure /etc/systemd/journald.conf: SystemMaxUse=500M to prevent unbounded growth.'
          },
          {
            instruction: 'Remove old kernel packages (free 200-500MB)',
            command: 'sudo apt-get autoremove --purge -y && dpkg -l | grep "^rc" | awk "{print $2}" | xargs sudo dpkg --purge 2>/dev/null',
            check: 'apt',
            explanation: 'Old kernel images in /boot eat 200-400MB each. autoremove removes unused kernels. `dpkg -l | grep "^rc"` finds packages removed but config left behind (rc = removed, config). Purging cleans them. Keep at least 2 kernels for rollback safety.'
          }
        ]
      },

      {
        id: 'mod3-ex5',
        title: 'tar, zip & Archiving',
        difficulty: 'beginner',
        time: '6 min',
        scenario: 'Before a major deployment you need to archive the current application, compress logs for long-term storage, and transfer a backup to another location.',
        steps: [
          {
            instruction: 'Create a compressed tar archive',
            command: 'tar -czf /tmp/app-backup-$(date +%Y%m%d).tar.gz /opt/app/',
            check: 'tar',
            explanation: '`tar -czf`: c=create, z=gzip compress, f=filename. The backup filename includes today\'s date. tar preserves permissions, ownership, and symlinks. Common extensions: .tar.gz (gzip, fast), .tar.bz2 (bzip2, smaller), .tar.xz (xz, best compression but slowest).'
          },
          {
            instruction: 'List contents of a tar archive without extracting',
            command: 'tar -tzf /tmp/app-backup-$(date +%Y%m%d).tar.gz | head -20',
            check: 'tar',
            explanation: '`tar -tzf` lists contents without extracting. Always verify archives before trusting them in backups. For integrity: `tar -tzf archive.tar.gz > /dev/null && echo "Archive OK"`. Add `--test-label` with GNU tar for embedded label verification.'
          },
          {
            instruction: 'Extract a specific file from an archive',
            command: 'tar -xzf /tmp/app-backup-$(date +%Y%m%d).tar.gz opt/app/config.yml -C /tmp/',
            check: 'tar',
            explanation: '`-x` = extract, `-C /tmp/` = change to destination directory before extracting. You can extract single files without extracting the whole archive. Path inside tar is relative (no leading /), so opt/app/config.yml not /opt/app/config.yml.'
          },
          {
            instruction: 'Compress a single large log file',
            command: 'gzip -k /var/log/syslog.1',
            check: 'gzip',
            explanation: '`gzip -k` compresses and keeps the original (default removes original). Creates syslog.1.gz. Alternative: `bzip2` (better ratio, slower), `zstd` (best speed/ratio balance, modern choice). `gunzip file.gz` or `gzip -d file.gz` decompresses.'
          },
          {
            instruction: 'Create a zip file (for compatibility)',
            command: 'zip -r /tmp/app-config.zip /etc/nginx/ /etc/ssl/certs/',
            check: 'zip',
            explanation: '`zip -r` = recursive. Zip is preferred when sharing files with Windows users. tar+gzip is standard on Linux and preserves Unix permissions; zip does not reliably. For cross-platform use of zip, add `-X` to exclude extra Unix attributes.'
          }
        ]
      },

      {
        id: 'mod3-ex6',
        title: 'NFS, tmpfs & Shared Mounts',
        difficulty: 'advanced',
        time: '8 min',
        scenario: 'Multiple EC2 instances in your Auto Scaling Group need to share application assets. You need to set up NFS and understand memory-backed filesystems.',
        steps: [
          {
            instruction: 'Check currently mounted tmpfs filesystems',
            command: 'mount | grep tmpfs',
            check: 'tmpfs',
            explanation: 'tmpfs is a memory-backed filesystem — blazing fast, but data is lost on reboot. /run, /dev/shm, /tmp are all tmpfs by default on Ubuntu. Use /dev/shm for inter-process shared memory. Key use: ramdisk caches, session data for ultra-low latency apps.'
          },
          {
            instruction: 'Mount a tmpfs volume for high-speed temp storage',
            command: 'sudo mount -t tmpfs -o size=512m tmpfs /mnt/ramdisk && df -h /mnt/ramdisk',
            check: 'tmpfs',
            explanation: 'Creates a 512MB RAM-backed filesystem at /mnt/ramdisk. Use for: temporary build artifacts, test data, session storage. Limit: consumes actual RAM. Data GONE on reboot/unmount. Never store anything you can\'t regenerate here.'
          },
          {
            instruction: 'Install NFS client tools',
            command: 'sudo apt-get install -y nfs-common',
            check: 'apt',
            explanation: '`nfs-common` provides mount.nfs and related utilities. NFS (Network File System) allows sharing directories over the network. On AWS, use Amazon EFS (Elastic File System) which is NFS v4.1 managed — no NFS server to maintain.'
          },
          {
            instruction: 'Mount an NFS/EFS share',
            command: 'sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576 fs-0abc123.efs.us-east-1.amazonaws.com:/ /mnt/efs',
            check: 'mount',
            explanation: 'AWS EFS mount options: nfsvers=4.1 (required), rsize/wsize=1048576 (1MB read/write buffer for performance). Better option: use aws-efs-utils which supports TLS encryption and automatic mount retry. Mount in /etc/fstab for persistence.'
          },
          {
            instruction: 'Check NFS mount statistics',
            command: 'nfsstat -m',
            check: 'nfsstat',
            explanation: '`nfsstat -m` shows NFS mount details including server address, options, and I/O statistics. For EFS performance troubleshooting, check `iostat -x 1` and `nfsiostat 1` to see read/write latency. EFS burst credits deplete under sustained I/O.'
          }
        ]
      }
    ]
  }
];
