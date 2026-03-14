/* ============================================================
   terminal-sim.js  —  Interactive Terminal Simulator
   Handles: input parsing, command output simulation,
   exercise step checking, history, tab-completion
   ============================================================ */

(function () {
  'use strict';

  /* ─── Virtual File-System State ─────────────────────────────── */
  const VFS = {
    cwd: '/home/ubuntu',
    env: {
      HOME: '/home/ubuntu',
      USER: 'ubuntu',
      SHELL: '/bin/bash',
      PATH: '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
      HOSTNAME: 'ip-172-31-44-23'
    },
    history: [],
    historyIndex: -1
  };

  /* ─── Fake command output library ───────────────────────────── */
  const FAKE_OUTPUTS = {
    'uname -a': 'Linux ip-172-31-44-23 6.1.0-1028-aws #28-Ubuntu SMP Wed Mar 19 14:00:17 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux',
    'uname -m': 'x86_64',
    'uname -r': '6.1.0-1028-aws',
    'hostname':  'ip-172-31-44-23',
    'hostname -I': '172.31.44.23 ',
    'whoami': 'ubuntu',
    'id': 'uid=1000(ubuntu) gid=1000(ubuntu) groups=1000(ubuntu),4(adm),20(dialout),24(cdrom),25(floppy),27(sudo),29(audio),30(dip),44(video),46(plugdev),118(netdev),119(docker)',
    'pwd': '/home/ubuntu',
    'uptime': ' 14:32:07 up  2:41,  1 user,  load average: 0.08, 0.12, 0.11',
    'nproc': '2',
    'nproc --all': '2',
    'date': new Date().toString().slice(0, 24),
    'free -h': `              total        used        free      shared  buff/cache   available
Mem:           3.8Gi       612Mi       1.9Gi       1.0Mi       1.3Gi       3.0Gi
Swap:             0B          0B          0B`,
    'free -m': `              total        used        free      shared  buff/cache   available
Mem:            3884         612        1921           1        1350        3062
Swap:              0           0           0`,
    'df -h': `Filesystem      Size  Used Avail Use% Mounted on
/dev/xvda1       20G  4.8G   15G  25% /
tmpfs           1.9G     0  1.9G   0% /dev/shm
tmpfs           776M  956K  775M   1% /run
/dev/xvda15     105M  6.1M   99M   6% /boot/efi`,
    'df -i': `Filesystem      Inodes  IUsed   IFree IUse% Mounted on
/dev/xvda1     1310720  86402 1224318    7% /
tmpfs           499025      1  499024    1% /dev/shm`,
    'lsblk': `NAME    MAJ:MIN RM  SIZE RO TYPE MOUNTPOINTS
xvda    202:0    0   20G  0 disk
├─xvda1 202:1    0 19.9G  0 part /
├─xvda14 202:14  0    4M  0 part
└─xvda15 202:15  0  106M  0 part /boot/efi`,
    'top': `top - 14:32:07 up  2:41,  1 user,  load average: 0.08, 0.12, 0.11
Tasks:  97 total,   1 running,  96 sleeping,   0 stopped,   0 zombie
%Cpu(s):  1.7 us,  0.5 sy,  0.0 ni, 97.6 id,  0.2 wa,  0.0 hi,  0.0 si
MiB Mem:   3884.7 total,   1921.3 free,    612.4 used,   1350.9 buff/cache
MiB Swap:     0.0 total,      0.0 free,      0.0 used.   3062.3 avail Mem

  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
  823 ubuntu    20   0   17280   8192   6400 S   0.7   0.2   0:00.91 bash
    1 root      20   0  166600  11264   8704 S   0.0   0.3   0:02.34 systemd
  488 root      20   0   35584   9472   8192 S   0.0   0.2   0:00.23 systemd-journal`,
    'vmstat 1 3': `procs -----------memory---------- ---swap-- -----io---- -system-- ------cpu-----
 r  b   swpd   free   buff  cache   si   so    bi    bo   in   cs us sy id wa st
 1  0      0 1966620 194456 1179312    0    0     2    12   84  131  1  0 98  0  0
 0  0      0 1966620 194456 1179312    0    0     0     0   64   96  0  0 100 0  0
 0  0      0 1966620 194456 1179312    0    0     0     0   59   91  0  0 100 0  0`,
    'ps aux': `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.2 166600 11264 ?        Ss   12:01   0:02 /usr/lib/systemd/systemd
root         488  0.0  0.2  35584  9472 ?        Ss   12:01   0:00 /lib/systemd/systemd-journald
root         552  0.0  0.1  23680  6144 ?        Ss   12:01   0:00 /lib/systemd/systemd-udevd
root         819  0.0  0.2  16024  8192 ?        Ss   12:01   0:00 sshd: /usr/sbin/sshd -D
ubuntu       823  0.0  0.2  17280  8192 pts/0    Ss   14:30   0:00 -bash
ubuntu       900  0.0  0.1  18700  4096 pts/0    R+   14:32   0:00 ps aux`,
    'ps aux --sort=-%cpu': `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
ubuntu       823  2.3  0.2  17280  8192 pts/0    Ss   14:30   0:00 -bash
root           1  0.0  0.2 166600 11264 ?        Ss   12:01   0:02 /usr/lib/systemd/systemd`,
    'ps aux --sort=-%mem': `USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.2 166600 11264 ?        Ss   12:01   0:02 /usr/lib/systemd/systemd
ubuntu       823  0.0  0.2  17280  8192 pts/0    Ss   14:30   0:00 -bash`,
    'netstat -tlnp': `Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address   Foreign Address  State   PID/Program
tcp        0      0 0.0.0.0:22      0.0.0.0:*        LISTEN  819/sshd
tcp6       0      0 :::22           :::*             LISTEN  819/sshd`,
    'ss -tlnp': `State  Recv-Q Send-Q  Local Address:Port   Peer Address:Port  Process
LISTEN 0      128         0.0.0.0:22         0.0.0.0:*   users:(("sshd",pid=819,fd=3))
LISTEN 0      128            [::]:22            [::]:*   users:(("sshd",pid=819,fd=4))`,
    'ip a': `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc fq_codel state UP group default qlen 1000
    link/ether 02:45:87:2f:9a:11 brd ff:ff:ff:ff:ff:ff
    inet 172.31.44.23/20 brd 172.31.47.255 scope global dynamic eth0`,
    'ip addr': `1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
    inet 127.0.0.1/8 scope host lo
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 9001 qdisc fq_codel state UP group default qlen 1000
    link/ether 02:45:87:2f:9a:11 brd ff:ff:ff:ff:ff:ff
    inet 172.31.44.23/20 brd 172.31.47.255 scope global dynamic eth0`,
    'ip route': `default via 172.31.32.1 dev eth0 proto dhcp src 172.31.44.23 metric 100
172.31.32.0/20 dev eth0 proto kernel scope link src 172.31.44.23`,
    'cat /etc/os-release': `PRETTY_NAME="Ubuntu 22.04.4 LTS"
NAME="Ubuntu"
VERSION_ID="22.04"
VERSION="22.04.4 LTS (Jammy Jellyfish)"
ID=ubuntu
ID_LIKE=debian
HOME_URL="https://www.ubuntu.com/"
SUPPORT_URL="https://help.ubuntu.com/"
BUG_REPORT_URL="https://bugs.launchpad.net/ubuntu/"
VERSION_CODENAME=jammy`,
    'cat /etc/hostname': 'ip-172-31-44-23',
    'cat /etc/passwd': `root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash`,
    'cat /proc/cpuinfo': `processor	: 0
vendor_id	: GenuineIntel
model name	: Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz
cpu MHz		: 2400.098
cache size	: 30720 KB
processor	: 1
vendor_id	: GenuineIntel
model name	: Intel(R) Xeon(R) CPU E5-2676 v3 @ 2.40GHz`,
    'env': `SHELL=/bin/bash
HOME=/home/ubuntu
LOGNAME=ubuntu
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
TERM=xterm-256color
USER=ubuntu
HOSTNAME=ip-172-31-44-23`,
    'echo $SHELL': '/bin/bash',
    'echo $HOME': '/home/ubuntu',
    'echo $PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
    'echo $USER': 'ubuntu',
    'history': `    1  sudo apt update
    2  sudo apt upgrade -y
    3  df -h
    4  free -h
    5  ps aux
    6  systemctl status nginx
    7  tail -f /var/log/nginx/access.log
    8  history`,
    'systemctl status': `● ip-172-31-44-23
    State: running
     Jobs: 0 queued
   Failed: 0 units
    Since: Mon 2026-03-16 12:01:02 UTC; 2h 31min ago
   CGroup: /
           ├─init.scope
           │ └─1 /usr/lib/systemd/systemd`,
    'systemctl status nginx': `● nginx.service - A high performance web server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Mon 2026-03-16 12:01:08 UTC; 2h 31min ago
       Docs: man:nginx(8)
    Process: 601 ExecStartPre=/usr/sbin/nginx -t -q -g daemon on; master_process on;
   Main PID: 621 (nginx)
      Tasks: 3 (limit: 4612)
     Memory: 7.7M
        CPU: 102ms
     CGroup: /system.slice/nginx.service
             ├─621 "nginx: master process /usr/sbin/nginx -g daemon on; master_process on;"
             ├─622 "nginx: worker process"
             └─623 "nginx: worker process"`,
    'systemctl status sshd': `● ssh.service - OpenBSD Secure Shell server
     Loaded: loaded (/lib/systemd/system/ssh.service; enabled; preset: enabled)
     Active: active (running) since Mon 2026-03-16 12:01:05 UTC; 2h 31min ago
    Process: 819 ExecStartPre=/usr/sbin/sshd -t
   Main PID: 827 (sshd)
      Tasks: 1 (limit: 4612)
     Memory: 3.5M
        CPU: 28ms`,
    'systemctl list-units --failed': `  UNIT LOAD ACTIVE SUB DESCRIPTION
0 loaded units listed.`,
    'systemctl list-units --type=service': `  UNIT                     LOAD   ACTIVE SUB     DESCRIPTION
  cron.service             loaded active running Regular background program processing daemon
  dbus.service             loaded active running D-Bus System Message Bus
  getty@tty1.service       loaded active running Getty on tty1
  nginx.service            loaded active running A high performance web server
  ssh.service              loaded active running OpenBSD Secure Shell server
  systemd-journald.service loaded active running Journal Service

LOAD   = Reflects whether the unit definition was properly loaded.
ACTIVE = The high-level unit activation state.
SUB    = The low-level unit activation state.

6 loaded units listed.`,
    'sudo systemctl status nginx': `● nginx.service - A high performance web server
     Loaded: loaded (/lib/systemd/system/nginx.service; enabled; preset: enabled)
     Active: active (running) since Mon 2026-03-16 12:01:08 UTC; 2h 31min ago
   Main PID: 621 (nginx)
     CGroup: /system.slice/nginx.service
             ├─621 "nginx: master process"
             ├─622 "nginx: worker process"
             └─623 "nginx: worker process"`,
    'sudo systemctl restart nginx': '[sudo] Restarting nginx... done.',
    'sudo systemctl reload nginx': '[sudo] Reloading nginx... done.',
    'sudo systemctl start nginx': '[sudo] Starting nginx... done.',
    'sudo systemctl stop nginx': '[sudo] Stopping nginx... done.',
    'sudo systemctl enable nginx': 'Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → /lib/systemd/system/nginx.service.',
    'sudo systemctl disable nginx': 'Removed /etc/systemd/system/multi-user.target.wants/nginx.service.',
    'sudo systemctl daemon-reload': '(daemon-reload: configuration reloaded)',
    'ls': 'Desktop  Documents  Downloads  Music  Pictures  Public  Templates  Videos',
    'ls -la': `total 60
drwxr-x--- 6 ubuntu ubuntu 4096 Mar 16 12:01 .
drwxr-xr-x 3 root   root   4096 Mar 16 11:59 ..
-rw------- 1 ubuntu ubuntu  100 Mar 16 14:28 .bash_history
-rw-r--r-- 1 ubuntu ubuntu  220 Jan  6  2022 .bash_logout
-rw-r--r-- 1 ubuntu ubuntu 3526 Jan  6  2022 .bashrc
drwx------ 2 ubuntu ubuntu 4096 Mar 16 12:01 .cache
drwxrwxr-x 2 ubuntu ubuntu 4096 Mar 16 12:01 .ssh
-rw-r--r-- 1 ubuntu ubuntu  807 Jan  6  2022 .profile
drwxr-xr-x 2 ubuntu ubuntu 4096 Mar 16 12:01 Desktop
drwxr-xr-x 2 ubuntu ubuntu 4096 Mar 16 12:01 Documents`,
    'ls -lh /var/log': `total 2.8M
drwxr-x--- 2 root      adm     4.0K Mar 16 12:01 apt
-rw-r----- 1 syslog    adm      17K Mar 16 14:30 auth.log
-rw-r--r-- 1 root      root    2.2K Mar 16 12:01 bootstrap.log
drwxr-xr-x 2 root      root    4.0K Mar 16 12:01 cloud-init
-rw-r--r-- 1 root      root    132K Mar 16 12:08 cloud-init.log
drwxr-xr-x 2 root      root    4.0K Mar 16 12:01 dist-upgrade
drwxr-sr-x 4 root      adm     4.0K Jan 12 00:41 journal
drwxrwxr-x 2 root      syslog  4.0K Mar 16 12:01 nginx
-rw-r----- 1 syslog    adm     389K Mar 16 14:31 syslog`,
    'ls /': `bin   boot  dev  etc  home  lib  lib32  lib64  libx32  lost+found  media
mnt  opt  proc  root  run  sbin  snap  srv  sys  tmp  usr  var`,
    'ls /var/log': `apt  auth.log  bootstrap.log  cloud-init  cloud-init.log  dist-upgrade
dpkg.log  journal  kern.log  landscape  nginx  syslog  unattended-upgrades`,
    'ls -la /var/log': `total 2860
drwxrwxr-x 11 root   syslog   4096 Mar 16 12:01 .
drwxr-xr-x 14 root   root     4096 Jan 12 00:41 ..
drwxr-x---  2 root   adm      4096 Mar 16 12:01 apt
-rw-r-----  1 syslog adm     17408 Mar 16 14:30 auth.log
-rw-r-----  1 syslog adm    389120 Mar 16 14:31 syslog`,
    'cat /var/log/auth.log': `Mar 16 12:01:05 ip-172-31-44-23 sshd[819]: Server listening on 0.0.0.0 port 22.
Mar 16 14:30:11 ip-172-31-44-23 sshd[895]: Accepted publickey for ubuntu from 203.0.113.42 port 52341 ssh2
Mar 16 14:30:11 ip-172-31-44-23 sshd[895]: pam_unix(sshd:session): session opened for user ubuntu`,
    'sudo tail -f /var/log/syslog': `Mar 16 14:32:01 ip-172-31-44-23 CRON[901]: (root) CMD (   cd / && run-parts --report /etc/cron.hourly)
Mar 16 14:32:01 ip-172-31-44-23 cron[488]: (*system*) RELOAD (cron/crontab)
Mar 16 14:33:01 ip-172-31-44-23 CRON[910]: (ubuntu) CMD (/usr/local/bin/backup.sh)
[Following /var/log/syslog — press Ctrl+C to stop]`,
    'sudo dmesg | tail -20': `[    0.000000] Linux version 6.1.0-1028-aws (Ubuntu 22.04)
[    0.726813] ACPI: IRQ0 used by override.
[    2.132941] EXT4-fs (xvda1): mounted filesystem
[    3.871024] cloud-init[489]: Cloud-init v. 24.1 running
[    7.224891] systemd[1]: Startup finished in 3.102s (kernel) + 4.122s (userspace)`,
    'sudo journalctl -xe': `Mar 16 14:30:01 ip-172-31-44-23 sshd[895]: Accepted publickey for ubuntu
Mar 16 14:30:01 ip-172-31-44-23 systemd[1]: Started Session 3 of User ubuntu.
Mar 16 14:32:01 ip-172-31-44-23 CRON[901]: (root) CMD (run-parts --report /etc/cron.hourly)`,
    'sudo journalctl -u nginx': `Mar 16 12:01:08 ip-172-31-44-23 systemd[1]: Starting nginx...
Mar 16 12:01:08 ip-172-31-44-23 nginx[600]: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
Mar 16 12:01:08 ip-172-31-44-23 nginx[600]: nginx: configuration file /etc/nginx/nginx.conf test is successful
Mar 16 12:01:08 ip-172-31-44-23 systemd[1]: Started A high performance web server.`,
    'sudo journalctl -u nginx -n 50': `Mar 16 12:01:08 ip-172-31-44-23 systemd[1]: Starting nginx...
Mar 16 12:01:08 ip-172-31-44-23 nginx[600]: nginx: configuration file /etc/nginx/nginx.conf test is successful
Mar 16 12:01:08 ip-172-31-44-23 systemd[1]: Started A high performance web server.`,
    'sudo cat /etc/nginx/nginx.conf': `user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
    # multi_accept on;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    ssl_protocols TLSv1.2 TLSv1.3;
    gzip on;
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}`,
    'sudo nginx -t': `nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful`,
    'sudo apt update': `Hit:1 http://us-east-1.ec2.archive.ubuntu.com/ubuntu jammy InRelease
Hit:2 http://us-east-1.ec2.archive.ubuntu.com/ubuntu jammy-updates InRelease
Hit:3 http://security.ubuntu.com/ubuntu jammy-security InRelease
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
12 packages can be upgraded. Run 'apt list --upgradable' to see them.`,
    'sudo apt upgrade -y': `Reading package lists... Done
Building dependency tree... Done
The following packages will be upgraded:
  curl libcurl4 libssl3 openssl python3 python3-minimal tzdata
6 upgraded, 0 newly installed, 0 to remove.
Need to get 4,218 kB of archives.
After this operation, 8,192 B of additional disk space will be used.
Get:1 http://security.ubuntu.com/ubuntu jammy-security/main amd64 openssl amd64 3.0.2-0ubuntu1.15 [1,139 kB]
Fetched 4,218 kB in 2s (2,109 kB/s)
Processing triggers for man-db (2.10.2-1) ...
Processing triggers for libc-bin (2.35-0ubuntu3.6) ...`,
    'sudo apt install nginx -y': `Reading package lists... Done
Building dependency tree... Done
The following NEW packages will be installed:
  nginx nginx-common
After this operation, 2,148 kB of additional disk space will be used.
Selecting previously unselected package nginx-common.
Setting up nginx-common (1.18.0-6ubuntu14.4) ...
Setting up nginx (1.18.0-6ubuntu14.4) ...
Processing triggers for man-db (2.10.2-1) ...`,
    'sudo apt install curl -y': `Reading package lists... Done
Building dependency tree... Done
curl is already the newest version (7.81.0-1ubuntu1.15).
0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.`,
    'crontab -l': `# Edit this file to introduce tasks to be run by cron.
# m h  dom mon dow   command
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1
*/5 * * * * /usr/local/bin/healthcheck.sh`,
    'cat /etc/crontab': `# /etc/crontab: system-wide crontab
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin:
17 *    * * *   root    cd / && run-parts --report /etc/cron.hourly
25 6    * * *   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6    * * 7   root    test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )`,
    'who': 'ubuntu   pts/0        2026-03-16 14:30 (203.0.113.42)',
    'w': `14:32:07 up  2:41,  1 user,  load average: 0.08, 0.12, 0.11
USER     TTY      FROM             LOGIN@   IDLE JCPU   PCPU WHAT
ubuntu   pts/0    203.0.113.42     14:30    0.00s  0.05s  0.00s w`,
    'last': `ubuntu   pts/0        203.0.113.42     Mon Mar 16 14:30   still logged in
ubuntu   pts/0        203.0.113.42     Sun Mar 15 22:07 - 22:09  (00:01)
reboot   system boot  6.1.0-1028-aws   Mon Mar 16 12:01   still running`,
    'sudo useradd -m devops': '(User devops created)',
    'sudo usermod -aG sudo devops': '(User devops added to sudo group)',
    'sudo passwd devops': 'Enter new UNIX password: \nRetype new UNIX password: \npasswd: password updated successfully',
    'sudo userdel -r devops': '(User devops and home directory removed)',
    'groups': 'ubuntu adm dialout cdrom floppy sudo audio dip video plugdev netdev docker',
    'cat /etc/group': `root:x:0:
sudo:x:27:ubuntu
docker:x:119:ubuntu
ubuntu:x:1000:`,
    'ssh-keygen -t ed25519 -C "devops@ec2"': `Generating public/private ed25519 key pair.
Enter file in which to save the key (/home/ubuntu/.ssh/id_ed25519):
Enter passphrase (empty for no passphrase):
Enter same passphrase again:
Your identification has been saved in /home/ubuntu/.ssh/id_ed25519
Your public key has been saved in /home/ubuntu/.ssh/id_ed25519.pub
The key fingerprint is:
SHA256:xK2mP73nQ8sLvYcF1dRe9jWbUoHiTkNGXZyMA4hq5wE devops@ec2
The key's randomart image is:
+--[ED25519 256]--+
|        .o+.     |
|       o.oo      |
|      = +  +     |
|     = O o= .    |
|    . B S+.+     |
|   . + =.=+ o    |
|    o + +.=+ .   |
|     . o.o+.o    |
|      ..oo+E     |
+----[SHA256]-----+`,
    'docker ps': `CONTAINER ID   IMAGE     COMMAND                  CREATED         STATUS         PORTS     NAMES
(no containers running)`,
    'docker images': `REPOSITORY   TAG       IMAGE ID       CREATED        SIZE
(no images)`,
    'docker info': `Client: Docker Engine - Community
 Version:    25.0.3
 Context:    default
Server:
 Containers: 0
  Running: 0
  Paused: 0
  Stopped: 0
 Images: 0
 Server Version: 25.0.3
 Storage Driver: overlay2
 Logging Driver: json-file
 Operating System: Ubuntu 22.04.4 LTS
 Architecture: x86_64`,
    'docker version': `Client: Docker Engine - Community
 Version:           25.0.3
 API version:       1.44
 Go version:        go1.21.6
Server: Docker Engine - Community
 Engine:
  Version:          25.0.3
  API version:      1.44 (minimum version 1.24)`,
    'git --version': 'git version 2.43.0',
    'git status': `On branch main
Your branch is up to date with 'origin/main'.

nothing to commit, working tree clean`,
    'git log --oneline -10': `a3f821c (HEAD -> main, origin/main) feat: add auto-scaling configuration
b2e94d7 fix: correct nginx upstream timeout
c1d83f6 chore: update CloudWatch agent config
d0e72a5 feat: deploy monitoring stack
e9f61b4 hotfix: fix memory leak in connection pool
f8g50c3 docs: update runbook for high latency`,
    'git log --oneline --graph --all -10': `* a3f821c (HEAD -> main, origin/main) feat: add auto-scaling configuration
* b2e94d7 fix: correct nginx upstream timeout
| * 7c3d8e1 (feature/new-dashboard) feat: dashboard v2 WIP
|/
* c1d83f6 chore: update CloudWatch agent config
* d0e72a5 feat: deploy monitoring stack`,
    'ansible --version': `ansible [core 2.16.4]
  config file = /etc/ansible/ansible.cfg
  configured module search path = ['/home/ubuntu/.ansible/plugins/modules']
  ansible python module location = /usr/lib/python3/dist-packages/ansible
  ansible collection location = /home/ubuntu/.ansible/collections:/usr/share/ansible/collections
  executable location = /usr/bin/ansible
  python version = 3.10.12 (main, Nov 20 2023, 15:14:05)`,
    'aws --version': 'aws-cli/2.15.17 Python/3.11.6 Linux/6.1.0-1028-aws botocore/2.4.5',
    'aws sts get-caller-identity': `{
    "UserId": "AIDAIOSFODNN7EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/devops-engineer"
}`,
    'curl http://169.254.169.254/latest/meta-data/instance-id': 'i-0abc1234567890def',
    'curl http://169.254.169.254/latest/meta-data/public-ipv4': '54.173.42.191',
    'curl http://169.254.169.254/latest/meta-data/public-hostname': 'ec2-54-173-42-191.compute-1.amazonaws.com',
    'curl http://169.254.169.254/latest/meta-data/instance-type': 't3.small',
    'curl http://169.254.169.254/latest/meta-data/placement/availability-zone': 'us-east-1a',
    'curl http://169.254.169.254/latest/meta-data/iam/security-credentials/': 'ec2-role',
    'curl -s http://localhost/health': '{"status":"ok","uptime":9617}',
    'pip3 --version': 'pip 22.0.2 from /usr/lib/python3/dist-packages/pip (python 3.10)',
    'python3 --version': 'Python 3.10.12',
    'node --version': 'v20.11.0',
    'npm --version': '10.2.5',
    'nginx -v': 'nginx version: nginx/1.18.0 (Ubuntu)',
    '/usr/sbin/nginx -v': 'nginx version: nginx/1.18.0 (Ubuntu)',
    'sudo nginx -s reload': '(nginx: gracefully reloaded configuration)',
    'openssl version': 'OpenSSL 3.0.2 15 Mar 2022 (Library: OpenSSL 3.0.2 15 Mar 2022)',
    'ufw status': 'Status: inactive',
    'sudo ufw status': `Status: active

To                         Action      From
--                         ------      ----
22/tcp                     ALLOW       Anywhere
80/tcp                     ALLOW       Anywhere
443/tcp                    ALLOW       Anywhere`,
    'sudo iptables -L': `Chain INPUT (policy ACCEPT)
target     prot opt source   destination
ACCEPT     tcp  --  anywhere anywhere   tcp dpt:ssh
ACCEPT     tcp  --  anywhere anywhere   tcp dpt:http

Chain FORWARD (policy DROP)
target     prot opt source   destination

Chain OUTPUT (policy ACCEPT)
target     prot opt source   destination`,
    'sudo lsof -i :80': `COMMAND  PID     USER   FD   TYPE DEVICE SIZE/OFF NODE NAME
nginx    621     root    6u  IPv4  21837      0t0  TCP *:http (LISTEN)
nginx    622 www-data    6u  IPv4  21837      0t0  TCP *:http (LISTEN)`,
    'sudo lsof +L1': `(No deleted-but-open files found)`,
    'iostat -xz 1 3': `Linux 6.1.0-1028-aws (ip-172-31-44-23)   03/16/2026   _x86_64_    (2 CPU)

Device            r/s     w/s    rkB/s    wkB/s   rrqm/s   wrqm/s  %rrqm  %wrqm r_await w_await aqu-sz rareq-sz wareq-sz  svctm  %util
xvda             1.32    3.87    34.12   102.45     0.00     1.21   0.00  23.85    0.51    1.03   0.00    25.85    26.46   0.19   0.10`,
    'mpstat -P ALL 1 3': `Linux 6.1.0-1028-aws  03/16/2026  _x86_64_  (2 CPU)
14:32:07     CPU    %usr   %nice    %sys %iowait    %irq   %soft  %steal  %guest   %idle
14:32:08     all    1.49    0.00    0.50    0.00    0.00    0.00    0.00    0.00   98.01
14:32:08       0    2.00    0.00    1.00    0.00    0.00    0.00    0.00    0.00   97.00
14:32:08       1    1.00    0.00    0.00    0.00    0.00    0.00    0.00    0.00   99.00`,
    'sudo htop': `(htop requires a real terminal. Use: top, ps aux, or mpstat for process/CPU stats)`,
    'htop': `(htop requires a real terminal. Use: top, ps aux, or mpstat for process/CPU stats)`,
    'exit': '__EXIT__',
    'logout': '__EXIT__',
    'clear': '__CLEAR__',
    'reset': '__CLEAR__',
    'help': `__HELP__`,
    ':q': `(This is a terminal, not vim. Type 'exit' to close.)`,
    ':wq': `(This is a terminal, not vim. Type 'exit' to close.)`,
    'q': `(To quit a pager, press q. To exit the terminal, type 'exit'.)`,
  };

  /* ─── Prefix-based output generators ─────────────────────────── */
  function matchPrefix(cmd) {
    const prefixes = [
      { p: 'echo ', fn: c => c.slice(5).replace(/^["']|["']$/g, '').replace(/\$HOME/g,'/home/ubuntu').replace(/\$USER/g,'ubuntu').replace(/\$SHELL/g,'/bin/bash').replace(/\$HOSTNAME/g,'ip-172-31-44-23') },
      { p: 'cat ', fn: c => {
        const f = c.slice(4).trim();
        if (f === '/etc/os-release') return FAKE_OUTPUTS['cat /etc/os-release'];
        if (f === '/etc/hostname') return FAKE_OUTPUTS['cat /etc/hostname'];
        if (f === '/etc/passwd') return FAKE_OUTPUTS['cat /etc/passwd'];
        if (f === '/var/log/auth.log') return FAKE_OUTPUTS['cat /var/log/auth.log'];
        if (f === '/etc/crontab') return FAKE_OUTPUTS['cat /etc/crontab'];
        return `cat: ${f}: No such file or directory`;
      }},
      { p: 'ls ', fn: c => {
        const parts = c.slice(3).trim().split(' ');
        const path = parts[parts.length - 1];
        if (path.startsWith('/var/log')) return FAKE_OUTPUTS['ls /var/log'];
        if (path === '/') return FAKE_OUTPUTS['ls /'];
        return `(contents of ${path})`;
      }},
      { p: 'cd ', fn: c => {
        const target = c.slice(3).trim();
        VFS.cwd = target.startsWith('/') ? target : VFS.cwd + '/' + target;
        return '';
      }},
      { p: 'mkdir ', fn: c => { const d = c.slice(6).replace(/-p\s+/, '').trim(); return `(Directory created: ${d})`; }},
      { p: 'rm ', fn: c => `(Removed: ${c.slice(3).replace(/-rf?\s+/,'').trim()})`},
      { p: 'touch ', fn: c => `(File created: ${c.slice(6).trim()})`},
      { p: 'chmod ', fn: c => { const parts = c.slice(6).trim().split(' '); return `(Permissions set: ${parts[0]} on ${parts[1] || ''})`; }},
      { p: 'chown ', fn: c => `(Ownership changed)`},
      { p: 'mv ', fn: c => `(Moved/renamed)`},
      { p: 'cp ', fn: c => `(Copied)`},
      { p: 'sudo apt install ', fn: c => {
        const pkg = c.replace(/sudo apt(-get)? install -?y?\s+/, '').trim();
        return `Reading package lists... Done\nBuilding dependency tree... Done\nThe following NEW packages will be installed:\n  ${pkg}\nAfter this operation, 1,024 kB of additional disk space will be used.\nSelecting previously unselected package ${pkg}.\nSetting up ${pkg}... done.`;
      }},
      { p: 'sudo apt-get install ', fn: c => {
        const pkg = c.replace(/sudo apt(-get)? install -?y?\s+/, '').trim();
        return `Reading package lists... Done\nThe following NEW packages will be installed:\n  ${pkg}\nSetting up ${pkg}... done.`;
      }},
      { p: 'cat > ', fn: () => `(File written successfully)`},
      { p: 'tee ', fn: () => `(Content written to file)`},
      { p: 'sudo tee ', fn: () => `(Content written to file with sudo)`},
      { p: 'ping ', fn: c => {
        const host = c.replace(/ping\s+(-c\s+\d+\s+)?/, '').trim();
        return `PING ${host}: 56 data bytes\n64 bytes from ${host}: icmp_seq=1 ttl=58 time=0.834 ms\n64 bytes from ${host}: icmp_seq=2 ttl=58 time=0.712 ms\n--- ${host} ping statistics ---\n2 packets transmitted, 2 received, 0% packet loss`;
      }},
      { p: 'curl ', fn: c => {
        if (c.includes('169.254.169.254')) {
          if (c.includes('instance-id')) return 'i-0abc1234567890def';
          if (c.includes('public-ipv4')) return '54.173.42.191';
          if (c.includes('instance-type')) return 't3.small';
          return 'ec2-metadata';
        }
        return `HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"status":"ok"}`;
      }},
      { p: 'grep ', fn: c => {
        const parts = c.split(' ');
        const pattern = parts[1] || 'pattern';
        return `(grep output: lines matching '${pattern}')`;
      }},
      { p: 'awk ', fn: () => `(awk processed output)`},
      { p: 'sed ', fn: () => `(sed output)`},
      { p: 'find ', fn: c => {
        const parts = c.split(/\s+/);
        const path = parts[1] || '/';
        return `${path}/file1\n${path}/dir1/file2\n(2 found)`;
      }},
      { p: 'tail ', fn: c => {
        if (c.includes('/var/log/syslog')) return `Mar 16 14:32:01 ip-172-31-44-23 CRON[901]: (root) CMD (run-parts --report /etc/cron.hourly)\nMar 16 14:33:01 ip-172-31-44-23 CRON[910]: (ubuntu) CMD (/usr/local/bin/backup.sh)`;
        if (c.includes('/var/log/nginx')) return `203.0.113.42 - - [16/Mar/2026:14:32:07 +0000] "GET / HTTP/1.1" 200 612 "-" "curl/7.81.0"\n54.173.1.5 - - [16/Mar/2026:14:31:55 +0000] "GET /api/health HTTP/1.1" 200 18`;
        return `(last lines of log)`;
      }},
      { p: 'head ', fn: () => `(first lines of file)`},
      { p: 'wc ', fn: c => {
        if (c.includes('-l')) return '      42 (filename)';
        return '     42    198   1024 (filename)';
      }},
      { p: 'du ', fn: c => {
        const target = c.split(' ').pop();
        return `4.0K\t${target}/subdir1\n8.0K\t${target}/subdir2\n24K\t${target}`;
      }},
      { p: 'tar ', fn: c => {
        if (c.includes('-czf')) return `(Archive created successfully)`;
        if (c.includes('-xzf')) return `(Archive extracted successfully)`;
        if (c.includes('-tf') || c.includes('-tvf')) return `drwxr-xr-x root/root   0 2026-03-16 14:31 ./\n-rw-r--r-- root/root 4096 2026-03-16 14:31 ./file.conf`;
        return `(tar completed)`;
      }},
      { p: 'rsync ', fn: () => `(rsync: sending incremental file list\n./\nfile.conf\n\nsent 1,234 bytes  received 42 bytes  2,552.00 bytes/sec)`},
      { p: 'scp ', fn: () => `(scp: file transferred successfully)`},
      { p: 'ssh ', fn: c => {
        if (c.includes('@')) return `Welcome to Ubuntu 22.04.4 LTS (connected via SSH)`;
        return `(SSH connected)`;
      }},
      { p: 'sudo ', fn: c => {
        const sub = c.slice(5);
        return getCommandOutput(sub);
      }},
      { p: 'docker ', fn: c => {
        if (c.includes('run')) return `(Container started — ID: abc123def456)`;
        if (c.includes('ps')) return FAKE_OUTPUTS['docker ps'];
        if (c.includes('logs')) return `(container log output)`;
        if (c.includes('exec')) return `(Entered container shell — type 'exit' to return)`;
        if (c.includes('stop')) return `(Container stopped)`;
        if (c.includes('rm')) return `(Container removed)`;
        if (c.includes('pull')) return `Using default tag: latest\nlatest: Pulling from library/nginx\nDigest: sha256:abc123...\nStatus: Downloaded newer image for nginx:latest`;
        if (c.includes('build')) return `[+] Building 12.3s\n => [1/4] FROM node:20-alpine\n => [2/4] RUN npm ci --only=production\n => [3/4] COPY . .\n => [4/4] exporting to image\n => => writing image sha256:abc123...\n => => naming to myapp:1.0.0`;
        if (c.includes('system df')) return FAKE_OUTPUTS['docker system df'];
        if (c.includes('image prune')) return `Deleted Images:\nuntagged: nginx@sha256:abc...\nTotal reclaimed space: 245MB`;
        if (c.includes('volume')) return `(Volume operation completed)`;
        if (c.includes('network')) return `(Network operation completed)`;
        if (c.includes('inspect')) return `[{"Id":"abc123...","Name":"/web","State":{"Status":"running","Pid":1234},"NetworkSettings":{"IPAddress":"172.17.0.2"}}]`;
        return `(docker command executed)`;
      }},
      { p: 'systemctl ', fn: c => {
        if (c.includes('status nginx')) return FAKE_OUTPUTS['systemctl status nginx'];
        if (c.includes('status sshd') || c.includes('status ssh')) return FAKE_OUTPUTS['systemctl status sshd'];
        if (c.includes('start ')) return `(Service started)`;
        if (c.includes('stop ')) return `(Service stopped)`;
        if (c.includes('restart ')) return `(Service restarted)`;
        if (c.includes('reload ')) return `(Service reloaded)`;
        if (c.includes('enable ')) return `Created symlink → enabled.`;
        if (c.includes('disable ')) return `Removed symlink.`;
        if (c.includes('daemon-reload')) return FAKE_OUTPUTS['sudo systemctl daemon-reload'];
        if (c.includes('--failed')) return FAKE_OUTPUTS['systemctl list-units --failed'];
        if (c.includes('list-units')) return FAKE_OUTPUTS['systemctl list-units --type=service'];
        return `(systemctl command executed)`;
      }},
      { p: 'journalctl ', fn: c => {
        if (c.includes('-u nginx')) return FAKE_OUTPUTS['sudo journalctl -u nginx'];
        if (c.includes('-xe')) return FAKE_OUTPUTS['sudo journalctl -xe'];
        return `(journal output)`;
      }},
      { p: 'aws ', fn: c => {
        if (c.includes('sts get-caller-identity')) return FAKE_OUTPUTS['aws sts get-caller-identity'];
        if (c.includes('ec2 describe-instances')) return `{ "Reservations": [{ "Instances": [{ "InstanceId": "i-0abc1234567890def", "State": { "Name": "running" }, "InstanceType": "t3.small", "PublicIpAddress": "54.173.42.191" }] }] }`;
        if (c.includes('s3 sync') || c.includes('s3 cp')) return `upload: ./file.log to s3://bucket/file.log\n(Sync complete: 3 files uploaded)`;
        if (c.includes('secretsmanager')) return `{"SecretString": "db-password-value"}`;
        if (c.includes('cloudwatch')) return `{ "Datapoints": [{ "Timestamp": "2026-03-16T13:00:00Z", "Average": 12.5, "Unit": "Percent" }] }`;
        if (c.includes('ssm start-session')) return `Starting session with SessionId: ubuntu-abc123...`;
        if (c.includes('ssm send-command')) return `{ "Command": { "CommandId": "abc123", "Status": "Success" } }`;
        if (c.includes('sns publish')) return `{ "MessageId": "abc123-def456" }`;
        return `(AWS CLI command executed)`;
      }},
      { p: 'git ', fn: c => {
        if (c.includes('clone')) return `Cloning into 'repository'...\nremote: Enumerating objects: 128, done.\nResolving deltas: 100% (64/64), done.`;
        if (c.includes('log')) return FAKE_OUTPUTS['git log --oneline -10'];
        if (c.includes('status')) return FAKE_OUTPUTS['git status'];
        if (c.includes('add')) return `(Changes staged for commit)`;
        if (c.includes('commit')) return `[main abc1234] commit message\n 1 file changed, 3 insertions(+)`;
        if (c.includes('push')) return `Enumerating objects: 5, done.\nWriting objects: 100% (3/3), 312 bytes | 312.00 KiB/s, done.\nTo github.com:org/repo.git\n   b2e94d7..a3f821c  main -> main`;
        if (c.includes('pull')) return `Already up to date.`;
        if (c.includes('checkout -b')) return `Switched to a new branch '${c.split(' ').pop()}'`;
        if (c.includes('checkout')) return `Switched to branch '${c.split(' ').pop()}'`;
        if (c.includes('branch')) return `* main\n  feature/dashboard\n  hotfix/nginx-config`;
        if (c.includes('config')) return `(git config updated)`;
        if (c.includes('stash')) return `Saved working directory and index state WIP on main: a3f821c feat: update`;
        if (c.includes('diff')) return `(no differences)`;
        if (c.includes('fetch')) return `(Remote refs updated)`;
        return `(git command executed)`;
      }},
      { p: 'ansible', fn: c => {
        if (c.includes('--version')) return FAKE_OUTPUTS['ansible --version'];
        if (c.includes('-m ping')) return `10.0.1.10 | SUCCESS => {\n    "ansible_facts": {},\n    "changed": false,\n    "ping": "pong"\n}\n10.0.1.11 | SUCCESS => {\n    "ansible_facts": {},\n    "changed": false,\n    "ping": "pong"\n}`;
        if (c.includes('-m shell')) return `10.0.1.10 | CHANGED | rc=0 >>\n(command output)\n10.0.1.11 | CHANGED | rc=0 >>\n(command output)`;
        if (c.includes('playbook')) return `PLAY [Configure webservers] ****\nTASK [Gathering Facts] ****\nok: [10.0.1.10]\nTASK [Install nginx] ****\nok: [10.0.1.10]\nTASK [Start and enable nginx] ****\nok: [10.0.1.10]\nPLAY RECAP ****\n10.0.1.10: ok=3  changed=0  unreachable=0  failed=0`;
        return `(ansible command executed)`;
      }},
      { p: 'sysctl ', fn: c => {
        const key = c.replace(/sysctl\s+(-w\s+)?/, '').split('=')[0].trim();
        const val = c.includes('=') ? c.split('=')[1].trim() : null;
        if (val) return `${key} = ${val}`;
        const sysvals = {'net.core.somaxconn':'65535','vm.swappiness':'10','net.ipv4.tcp_tw_reuse':'1','kernel.randomize_va_space':'2'};
        return `${key} = ${sysvals[key] || '(value)'}`;
      }},
      { p: 'ss ', fn: c => {
        if (c.includes('-tlnp')) return FAKE_OUTPUTS['ss -tlnp'];
        return `State   Recv-Q  Send-Q  Local Address:Port  Peer Address:Port\nESTAB   0       0       172.31.44.23:22    203.0.113.42:52341`;
      }},
      { p: 'nmap ', fn: c => {
        const host = c.split(' ').pop();
        return `Starting Nmap scan report for ${host}\nHost is up (0.0012s latency).\nPORT   STATE  SERVICE\n22/tcp open   ssh\n80/tcp open   http\nNmap done: 1 IP address (1 host up) scanned`;
      }},
      { p: 'strace ', fn: () => `(strace output — system calls traced)`},
      { p: 'lsof ', fn: c => {
        if (c.includes(':80')) return FAKE_OUTPUTS['sudo lsof -i :80'];
        return `(open files list)`;
      }},
      { p: 'kill ', fn: c => `(Signal sent to process)`},
      { p: 'pkill ', fn: c => `(Process killed by name: ${c.split(' ').pop()})`},
      { p: 'nice ', fn: () => `(Process started with adjusted priority)`},
      { p: 'renice ', fn: c => `(Priority updated)`},
    ];

    for (const { p, fn } of prefixes) {
      if (cmd.startsWith(p) || cmd === p.trim()) {
        return fn(cmd);
      }
    }
    return null;
  }

  /* ─── Main output resolver ───────────────────────────────────── */
  function getCommandOutput(rawInput) {
    const cmd = rawInput.trim();
    if (!cmd) return '';

    // Handle && and ; chaining — run each part and join outputs
    // Split on && or ; but NOT inside quotes, and not inside $(...) 
    if (/&&|(?<![<>]);(?![<>])/.test(cmd) && !cmd.includes('|')) {
      const parts = cmd.split(/\s*&&\s*|\s*;\s*/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 1) {
        return parts.map(p => getCommandOutput(p)).filter(o => o !== '').join('\n');
      }
    }

    // Exact match first
    if (FAKE_OUTPUTS[cmd] !== undefined) return FAKE_OUTPUTS[cmd];

    // Try sudo prefix strip for exact match
    if (cmd.startsWith('sudo ') && FAKE_OUTPUTS[cmd.slice(5)] !== undefined) {
      return FAKE_OUTPUTS[cmd.slice(5)];
    }

    // Prefix matching
    const prefixResult = matchPrefix(cmd);
    if (prefixResult !== null) return prefixResult;

    // Pipe — run last segment message
    if (cmd.includes('|')) {
      const right = cmd.split('|').pop().trim();
      if (right.startsWith('grep ')) {
        return `(filtered output — matching grep pattern)`;
      }
      if (right === 'wc -l') return `       7`;
      if (right.startsWith('awk')) return `(awk-processed output)`;
      if (right.startsWith('sort')) return `(sorted output)`;
      if (right.startsWith('head')) return `(first 10 lines of output)`;
      if (right.startsWith('tail')) return `(last 10 lines of output)`;
      return `(piped command output)`;
    }

    // Redirection
    if (cmd.includes('>>') || cmd.includes('>')) {
      return `(output redirected to file)`;
    }

    // Heredoc
    if (cmd.includes('<<')) {
      return `(heredoc content written)`;
    }

    // Unknown command
    return `bash: ${cmd.split(' ')[0]}: command not found`;
  }

  /* ─── Exercise Step Checker ──────────────────────────────────── */
  function checkStep(userInput, step) {
    const input = userInput.trim().toLowerCase();
    const check = (step.check || step.command || '').toLowerCase();

    if (!check) return true;

    // Accept if user typed the exact expected command
    if (userInput.trim() === step.command) return true;

    // Accept if the input contains the main check keyword(s)
    const keywords = check.split(/\s+/).filter(k => k.length > 2 && !['the','and','with','for','--'].includes(k));
    const matchCount = keywords.filter(kw => input.includes(kw)).length;
    return matchCount >= Math.max(1, Math.ceil(keywords.length * 0.5));
  }

  /* ─── Terminal DOM wiring ─────────────────────────────────────── */
  const termOutput     = document.getElementById('terminal-output');
  const termInput      = document.getElementById('terminal-input');
  const termPromptHost = document.getElementById('prompt-host');
  const termPromptPath = document.getElementById('prompt-path');

  if (termPromptHost) termPromptHost.textContent = 'ubuntu@ip-172-31-44-23';

  function updatePrompt() {
    if (termPromptPath) {
      const display = VFS.cwd.startsWith('/home/ubuntu') ? VFS.cwd.replace('/home/ubuntu', '~') : VFS.cwd;
      termPromptPath.textContent = display;
    }
  }
  updatePrompt();

  /* ─── Append a line to terminal ──────────────────────────────── */
  function termAppend(text, cls) {
    if (!termOutput) return;
    if (!text && cls !== 't-prompt') return;

    const lines = String(text).split('\n');
    lines.forEach(line => {
      const div = document.createElement('div');
      div.className = cls || 't-output';
      div.textContent = line;
      termOutput.appendChild(div);
    });
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function termEcho(cmd) {
    if (!termOutput) return;
    const div = document.createElement('div');
    div.className = 't-cmd-echo';
    div.innerHTML = `<span class="t-prompt-inline">ubuntu@ip-172-31-44-23:${(VFS.cwd.replace('/home/ubuntu','~'))}$</span> <span>${escapeHtml(cmd)}</span>`;
    termOutput.appendChild(div);
    termOutput.scrollTop = termOutput.scrollHeight;
  }

  function escapeHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  /* ─── History navigation (↑/↓) ──────────────────────────────── */
  function handleHistoryNav(e) {
    if (!termInput) return;
    if (e.key === 'ArrowUp') {
      if (VFS.historyIndex < VFS.history.length - 1) {
        VFS.historyIndex++;
        termInput.value = VFS.history[VFS.history.length - 1 - VFS.historyIndex] || '';
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (VFS.historyIndex > 0) {
        VFS.historyIndex--;
        termInput.value = VFS.history[VFS.history.length - 1 - VFS.historyIndex] || '';
      } else {
        VFS.historyIndex = -1;
        termInput.value = '';
      }
      e.preventDefault();
    }
  }

  /* ─── Tab completion ─────────────────────────────────────────── */
  const TAB_COMPLETIONS = [
    'ls','cd','cat','echo','sudo','systemctl','journalctl','grep','awk','sed','find',
    'tail','head','wc','df','du','free','top','ps','kill','pkill','ping','curl',
    'ssh','scp','rsync','tar','gzip','chmod','chown','mkdir','rm','mv','cp','touch',
    'uname','hostname','whoami','id','date','uptime','nproc','env','history','which',
    'apt','apt-get','pip3','git','docker','ansible','aws','nginx','systemctl',
    'node','npm','python3','openssl','ssl','vim','nano','less','more','man'
  ];
  function handleTabComplete(e) {
    if (e.key !== 'Tab' || !termInput) return;
    e.preventDefault();
    const val = termInput.value;
    const parts = val.split(' ');
    const last = parts[parts.length - 1];
    if (!last) return;
    const match = TAB_COMPLETIONS.find(c => c.startsWith(last));
    if (match) {
      parts[parts.length - 1] = match;
      termInput.value = parts.join(' ') + ' ';
    }
  }

  /* ─── Build the "HELP" modal content string ──────────────────── */
  const HELP_TEXT = `Available shortcuts:
  Ctrl+C     Cancel current command (clears input)
  ↑ / ↓      Navigate command history
  Tab        Auto-complete command
  Ctrl+L     Clear terminal screen

Tips:
  - Type the command shown in the exercise step
  - Commands are checked for key words, not exact match
  - The exercise advances when the check passes
  - Use the 'Hint' button if stuck`;

  /* ─── Main input handler ─────────────────────────────────────── */
  function handleTerminalInput(e) {
    if (e.key !== 'Enter' || !termInput) return;
    const raw = termInput.value.trim();
    if (!raw) return;

    // Save to history
    VFS.history.push(raw);
    VFS.historyIndex = -1;
    termInput.value = '';

    // Echo command
    termEcho(raw);

    // Special commands
    const out = getCommandOutput(raw);

    if (out === '__EXIT__') {
      termAppend('(Connection closed — refresh to reconnect)', 't-output');
      termInput.disabled = true;
      return;
    }
    if (out === '__CLEAR__') {
      if (termOutput) termOutput.innerHTML = '';
      updatePrompt();
      return;
    }
    if (out === '__HELP__') {
      termAppend(HELP_TEXT, 't-output');
    } else if (out) {
      const cls = out.includes('command not found') || out.includes('No such file') ? 't-error' : 't-output';
      termAppend(out, cls);
    }

    // Update cwd display after cd
    updatePrompt();

    // Notify app.js of the command for exercise checking
    if (typeof window.onTerminalCommand === 'function') {
      window.onTerminalCommand(raw, out);
    }
  }

  /* ─── Ctrl+C handler ─────────────────────────────────────────── */
  function handleCtrlC(e) {
    if (e.ctrlKey && e.key === 'c' && termInput) {
      termEcho(termInput.value + '^C');
      termInput.value = '';
      e.preventDefault();
    }
    if (e.ctrlKey && e.key === 'l') {
      if (termOutput) termOutput.innerHTML = '';
      e.preventDefault();
    }
  }

  /* ─── Event listeners ────────────────────────────────────────── */
  if (termInput) {
    termInput.addEventListener('keydown', handleTerminalInput);
    termInput.addEventListener('keydown', handleHistoryNav);
    termInput.addEventListener('keydown', handleTabComplete);
    termInput.addEventListener('keydown', handleCtrlC);
  }

  // Click anywhere in terminal to focus input
  const termWindow = document.getElementById('terminal-window');
  if (termWindow && termInput) {
    termWindow.addEventListener('click', () => termInput.focus());
  }

  /* ─── Welcome message ────────────────────────────────────────── */
  function printWelcome() {
    const lines = [
      'Ubuntu 22.04.4 LTS  ·  AWS EC2  ·  Kernel 6.1.0-1028-aws',
      '',
      'Welcome to the Linux DevOps Academy terminal.',
      'Type commands from the active exercise step.',
      'Press ↑/↓ for history, Tab for completion, Ctrl+L to clear.',
      '',
    ];
    lines.forEach(l => termAppend(l, 't-output'));
  }
  printWelcome();

  /* ─── Public API ─────────────────────────────────────────────── */
  window.TermSim = {
    appendOutput : termAppend,
    checkStep    : checkStep,
    getOutput    : getCommandOutput,
    focusInput   : () => termInput && termInput.focus(),
    clearScreen  : () => { if (termOutput) termOutput.innerHTML = ''; },
    printWelcome : printWelcome,
    cwd          : () => VFS.cwd,
  };

}());
