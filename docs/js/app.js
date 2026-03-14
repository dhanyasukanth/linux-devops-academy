/* ============================================================
   app.js  —  Main Application Orchestrator  (v2 — HTML-aligned)
   ============================================================ */

(function () {
  'use strict';

  /* ─── Merge all curriculum parts ────────────────────────────── */
  const CURRICULUM = [
    ...(window.CURRICULUM_PART1 || []),
    ...(window.CURRICULUM_PART2 || []),
    ...(window.CURRICULUM_PART3 || []),
    ...(window.CURRICULUM_PART4 || []),
  ];

  /* ─── App State ──────────────────────────────────────────────── */
  const State = {
    activeModuleId:   null,
    activeExerciseId: null,
    activeStepIndex:  0,
    progress: {},
    sandboxMode:      false,
  };

  /* ─── DOM references (matched to actual index.html IDs) ─────── */
  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);

  const DOM = {
    // Sidebar
    moduleNav:       $('module-nav'),
    overallBar:      $('overall-bar'),
    overallPct:      $('overall-pct'),
    stepsDone:       $('steps-done'),
    stepsTotal:      $('steps-total'),
    sidebarSearch:   $('sidebar-search'),
    sandboxBtn:      $('sandbox-toggle-btn'),
    resetBtn:        $('reset-progress-btn'),

    // Footer
    footerBar:       $('footer-bar'),
    footerPct:       $('footer-pct'),
    footerSteps:     $('footer-steps'),
    footerModName:   $('footer-module-name'),
    footerExName:    $('footer-exercise-name'),

    // Main / breadcrumb
    bcModule:        $('bc-module'),
    bcSep:           $('bc-sep'),
    bcExercise:      $('bc-exercise'),

    // Top-bar buttons
    hintBtn:         $('hint-btn'),
    skipBtn:         $('skip-btn'),
    cheatBtn:        $('cheat-btn'),
    helpBtn:         $('help-btn'),

    // Lesson area
    welcomeScreen:   $('welcome-screen'),
    lessonContent:   $('lesson-content'),
    overviewGrid:    $('overview-grid'),

    // Exercise slots
    exDiffBadge:     $('ex-difficulty-badge'),
    exTimeBadge:     $('ex-time-badge'),
    exModLabel:      $('ex-module-label'),
    exTitle:         $('ex-title'),
    scenarioText:    $('scenario-text'),
    stepCounter:     $('step-counter'),
    stepsList:       $('steps-list'),
    explanationBox:  $('explanation-box'),
    explanationText: $('explanation-text'),
    closeExplanation:$('close-explanation'),

    // Cheat sheet
    cheatModal:      $('cheat-modal'),
    cheatContent:    $('cheat-content'),

    // Help modal
    helpModal:       $('help-modal'),

    // Toasts
    hintToast:       $('hint-toast'),
    hintMessage:     $('hint-message'),
    successToast:    $('success-toast'),
    successMessage:  $('success-message'),

    // Filter pills + cheat tabs (NodeLists)
    filterPills:     $$('#filter-pills .pill'),
    cheatTabs:       $$('#cheat-tabs .tab'),
  };

  /* ─── Persistence ────────────────────────────────────────────── */
  const STORAGE_KEY = 'linux-academy-progress-v2';

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) Object.assign(State.progress, JSON.parse(raw));
    } catch (_) {}
  }

  function saveProgress() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(State.progress)); } catch (_) {}
  }

  /* ─── Progress calculations ──────────────────────────────────── */
  function getTotalExercises() {
    return CURRICULUM.reduce((n, m) => n + m.exercises.length, 0);
  }
  function getCompletedExercises() {
    return Object.values(State.progress).filter(p => p.completed).length;
  }
  function getModuleProgress(mod) {
    const total = mod.exercises.length;
    const done  = mod.exercises.filter(ex => State.progress[ex.id]?.completed).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }

  function updateProgressBars() {
    const total = getTotalExercises();
    const done  = getCompletedExercises();
    const pct   = total ? Math.round((done / total) * 100) : 0;

    if (DOM.overallBar) DOM.overallBar.style.width = pct + '%';
    if (DOM.overallPct) DOM.overallPct.textContent = pct + '%';
    if (DOM.footerBar)  DOM.footerBar.style.width  = pct + '%';
    if (DOM.footerPct)  DOM.footerPct.textContent  = pct + '%';
    if (DOM.stepsDone)  DOM.stepsDone.textContent  = done;
    if (DOM.stepsTotal) DOM.stepsTotal.textContent = total;

    // Sidebar module badges
    CURRICULUM.forEach(mod => {
      const mp    = getModuleProgress(mod);
      const badge = $(`mod-badge-${mod.id}`);
      if (badge) {
        badge.textContent = `${mp.done}/${mp.total}`;
        badge.className   = 'mod-progress-badge' + (mp.pct === 100 ? ' complete' : '');
      }
    });
  }

  /* ─── Sidebar rendering ──────────────────────────────────────── */
  function renderSidebar(filter = 'all', query = '') {
    if (!DOM.moduleNav) return;
    DOM.moduleNav.innerHTML = '';

    CURRICULUM.forEach(mod => {
      const mp   = getModuleProgress(mod);
      const diff = mod.difficulty || 'intermediate';

      if (filter !== 'all' && diff !== filter) return;
      if (query) {
        const titleMatch = mod.title.toLowerCase().includes(query.toLowerCase());
        const exMatch    = mod.exercises.some(ex => ex.title.toLowerCase().includes(query.toLowerCase()));
        if (!titleMatch && !exMatch) return;
      }

      const group = document.createElement('div');
      group.className = 'module-group' + (State.activeModuleId === mod.id ? ' expanded' : '');
      group.id = `group-${mod.id}`;

      const header = document.createElement('div');
      header.className = 'module-header' + (State.activeModuleId === mod.id ? ' active' : '');
      header.innerHTML = `
        <span class="mod-icon">${mod.icon || '📋'}</span>
        <span class="mod-title">${mod.title}</span>
        <span id="mod-badge-${mod.id}" class="mod-progress-badge${mp.pct === 100 ? ' complete' : ''}">${mp.done}/${mp.total}</span>
        <span class="expand-arrow">${State.activeModuleId === mod.id ? '▾' : '▸'}</span>
      `;
      header.addEventListener('click', () => toggleModule(mod.id));
      group.appendChild(header);

      const exList = document.createElement('ul');
      exList.className = 'exercise-list' + (State.activeModuleId === mod.id ? ' visible' : '');

      mod.exercises.forEach(ex => {
        if (query &&
            !ex.title.toLowerCase().includes(query.toLowerCase()) &&
            !mod.title.toLowerCase().includes(query.toLowerCase())) return;

        const done = State.progress[ex.id]?.completed;
        const item = document.createElement('li');
        item.className = 'exercise-item'
          + (State.activeExerciseId === ex.id ? ' active' : '')
          + (done ? ' done' : '');
        item.innerHTML = `
          <span class="ex-status-icon">${done ? '✓' : '○'}</span>
          <span class="ex-title">${ex.title}</span>
          <span class="ex-meta">${ex.time || ''}</span>
        `;
        item.addEventListener('click', () => loadExercise(mod.id, ex.id));
        exList.appendChild(item);
      });

      group.appendChild(exList);
      DOM.moduleNav.appendChild(group);
    });
  }

  function toggleModule(modId) {
    State.activeModuleId = State.activeModuleId === modId ? null : modId;
    renderSidebar(getActiveFilter(), DOM.sidebarSearch ? DOM.sidebarSearch.value : '');
  }

  function getActiveFilter() {
    const pill = document.querySelector('#filter-pills .pill.active');
    return pill ? (pill.dataset.filter || 'all') : 'all';
  }

  /* ─── Load + render exercise ─────────────────────────────────── */
  function loadExercise(modId, exId) {
    const mod = CURRICULUM.find(m => m.id === modId);
    if (!mod) return;
    const ex  = mod.exercises.find(e => e.id === exId);
    if (!ex) return;

    State.activeModuleId   = modId;
    State.activeExerciseId = exId;
    State.sandboxMode      = false;

    const savedSteps = State.progress[exId]?.steps || [];
    State.activeStepIndex = savedSteps.findIndex(s => !s);
    if (State.activeStepIndex === -1) State.activeStepIndex = 0;

    renderExercise(mod, ex);
    renderSidebar(getActiveFilter(), DOM.sidebarSearch ? DOM.sidebarSearch.value : '');
    updateProgressBars();
    if (window.TermSim) window.TermSim.focusInput();
  }

  function renderExercise(mod, ex) {
    // Show lesson content, hide welcome screen
    if (DOM.welcomeScreen) DOM.welcomeScreen.hidden = true;
    if (DOM.lessonContent) DOM.lessonContent.hidden = false;

    // Enable hint/skip
    if (DOM.hintBtn) DOM.hintBtn.disabled = false;
    if (DOM.skipBtn) DOM.skipBtn.disabled = false;

    // Breadcrumb
    if (DOM.bcModule)   DOM.bcModule.textContent = mod.title;
    if (DOM.bcSep)      DOM.bcSep.hidden = false;
    if (DOM.bcExercise) { DOM.bcExercise.textContent = ex.title; DOM.bcExercise.hidden = false; }

    // Footer
    if (DOM.footerModName) DOM.footerModName.textContent = mod.title;
    if (DOM.footerExName)  DOM.footerExName.textContent  = ex.title;

    // Exercise header
    const diffColors = { beginner: 'var(--green)', intermediate: '#d29922', advanced: 'var(--red)' };
    if (DOM.exDiffBadge) {
      DOM.exDiffBadge.textContent = ex.difficulty || 'intermediate';
      DOM.exDiffBadge.style.color = diffColors[ex.difficulty] || '#d29922';
    }
    if (DOM.exTimeBadge)  DOM.exTimeBadge.textContent  = `⏱ ${ex.time || '8 min'}`;
    if (DOM.exModLabel)   DOM.exModLabel.textContent   = mod.icon + ' ' + mod.title;
    if (DOM.exTitle)      DOM.exTitle.textContent      = ex.title;
    if (DOM.scenarioText) DOM.scenarioText.textContent = ex.scenario;

    // Steps
    const savedSteps = State.progress[ex.id]?.steps || new Array(ex.steps.length).fill(false);
    if (DOM.stepCounter) DOM.stepCounter.textContent = `${savedSteps.filter(Boolean).length} / ${ex.steps.length}`;

    if (DOM.stepsList) {
      DOM.stepsList.innerHTML = '';
      ex.steps.forEach((step, i) => {
        const done   = savedSteps[i];
        const active = i === State.activeStepIndex;

        const li = document.createElement('li');
        li.className = 'step-item' + (done ? ' done' : active ? ' active' : ' pending');
        li.id = `step-item-${i}`;
        li.innerHTML = `
          <div class="step-number">${done ? '✓' : i + 1}</div>
          <div class="step-body">
            <div class="step-instruction">${step.instruction}</div>
            <div class="step-command-wrap">
              <code class="step-command">${escHtml(step.command)}</code>
              <button class="run-cmd-btn" data-cmd="${escHtml(step.command)}" title="Copy to terminal">↗</button>
            </div>
            <button class="explain-toggle">▶ Why this works</button>
            <div class="step-explanation" style="display:none">${step.explanation}</div>
          </div>
        `;

        // Wire "↗" copy-to-terminal
        li.querySelector('.run-cmd-btn').addEventListener('click', () => {
          const termInput = $('terminal-input');
          if (termInput) { termInput.value = step.command; termInput.focus(); }
        });

        // Wire explanation toggle
        const toggle = li.querySelector('.explain-toggle');
        const expBox = li.querySelector('.step-explanation');
        toggle.addEventListener('click', () => {
          const open = expBox.style.display !== 'none';
          expBox.style.display = open ? 'none' : 'block';
          toggle.textContent = open ? '▶ Why this works' : '▼ Why this works';
        });

        DOM.stepsList.appendChild(li);
      });
    }

    // Hide explanation box initially
    if (DOM.explanationBox) DOM.explanationBox.hidden = true;

    // Footer step dots
    renderStepDots(ex.steps.length, State.activeStepIndex, savedSteps);

    // Scroll lesson to top
    if (DOM.lessonContent) DOM.lessonContent.scrollTop = 0;
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  /* ─── Step dots ──────────────────────────────────────────────── */
  function renderStepDots(total, activeIdx, savedSteps) {
    if (!DOM.footerSteps) return;
    DOM.footerSteps.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = 'step-dot' + (savedSteps[i] ? ' done' : '') + (i === activeIdx ? ' active' : '');
      dot.title = `Step ${i + 1}`;
      dot.addEventListener('click', () => jumpToStep(i));
      DOM.footerSteps.appendChild(dot);
    }
  }

  function jumpToStep(idx) {
    if (!State.activeExerciseId) return;
    State.activeStepIndex = idx;
    const mod = CURRICULUM.find(m => m.id === State.activeModuleId);
    const ex  = mod && mod.exercises.find(e => e.id === State.activeExerciseId);
    if (mod && ex) renderExercise(mod, ex);
  }

  /* ─── Terminal command handler (step checking) ───────────────── */
  window.onTerminalCommand = function (userInput) {
    if (State.sandboxMode || !State.activeExerciseId) return;

    const mod = CURRICULUM.find(m => m.id === State.activeModuleId);
    const ex  = mod && mod.exercises.find(e => e.id === State.activeExerciseId);
    if (!mod || !ex) return;

    const step = ex.steps[State.activeStepIndex];
    if (!step) return;

    const passed = window.TermSim ? window.TermSim.checkStep(userInput, step) : userInput.includes(step.check || step.command.split(' ')[0]);
    if (!passed) return;

    // Initialise progress entry if needed
    if (!State.progress[ex.id]) {
      State.progress[ex.id] = { completed: false, steps: new Array(ex.steps.length).fill(false) };
    }
    State.progress[ex.id].steps[State.activeStepIndex] = true;

    // Show the explanation for this step
    if (DOM.explanationBox && DOM.explanationText) {
      DOM.explanationText.textContent = step.explanation;
      DOM.explanationBox.hidden = false;
    }

    const isLast = State.activeStepIndex === ex.steps.length - 1;

    if (isLast) {
      State.progress[ex.id].completed = true;
      saveProgress();
      showSuccessToast(ex.title);
      State.activeStepIndex = 0;
    } else {
      State.activeStepIndex++;
      saveProgress();
    }

    renderExercise(mod, ex);
    renderSidebar(getActiveFilter(), DOM.sidebarSearch ? DOM.sidebarSearch.value : '');
    updateProgressBars();

    if (window.TermSim) {
      window.TermSim.appendOutput(
        isLast ? '✓ Exercise complete! Excellent work.' : `✓ Step passed — next step unlocked.`,
        't-success'
      );
    }
  };

  /* ─── Hint ───────────────────────────────────────────────────── */
  function showHint() {
    if (!State.activeExerciseId) return;
    const mod  = CURRICULUM.find(m => m.id === State.activeModuleId);
    const ex   = mod && mod.exercises.find(e => e.id === State.activeExerciseId);
    const step = ex && ex.steps[State.activeStepIndex];
    if (!step || !DOM.hintToast) return;

    if (DOM.hintMessage) DOM.hintMessage.textContent = `Try: ${step.command.split(' ').slice(0, 3).join(' ')} ...`;
    DOM.hintToast.classList.remove('hidden');
    DOM.hintToast.classList.add('visible');
    setTimeout(() => {
      DOM.hintToast.classList.remove('visible');
      DOM.hintToast.classList.add('hidden');
    }, 5000);
  }

  /* ─── Skip step ──────────────────────────────────────────────── */
  function skipStep() {
    if (!State.activeExerciseId) return;
    const mod = CURRICULUM.find(m => m.id === State.activeModuleId);
    const ex  = mod && mod.exercises.find(e => e.id === State.activeExerciseId);
    if (!mod || !ex) return;

    if (!State.progress[ex.id]) {
      State.progress[ex.id] = { completed: false, steps: new Array(ex.steps.length).fill(false) };
    }
    State.progress[ex.id].steps[State.activeStepIndex] = true;
    const isLast = State.activeStepIndex === ex.steps.length - 1;
    if (isLast) { State.progress[ex.id].completed = true; State.activeStepIndex = 0; }
    else { State.activeStepIndex++; }

    saveProgress();
    renderExercise(mod, ex);
    renderSidebar(getActiveFilter(), DOM.sidebarSearch ? DOM.sidebarSearch.value : '');
    updateProgressBars();
  }

  /* ─── Success toast ──────────────────────────────────────────── */
  function showSuccessToast(exTitle) {
    if (!DOM.successToast) return;
    if (DOM.successMessage) DOM.successMessage.textContent = `"${exTitle}" — complete!`;
    DOM.successToast.classList.remove('hidden');
    DOM.successToast.classList.add('visible');
    setTimeout(() => {
      DOM.successToast.classList.remove('visible');
      DOM.successToast.classList.add('hidden');
    }, 4000);
  }

  /* ─── Sandbox mode ───────────────────────────────────────────── */
  function enterSandbox() {
    State.sandboxMode      = true;
    State.activeExerciseId = null;

    if (DOM.welcomeScreen) DOM.welcomeScreen.hidden = false;
    if (DOM.lessonContent) DOM.lessonContent.hidden = true;
    if (DOM.bcModule)   DOM.bcModule.textContent = 'Sandbox Mode';
    if (DOM.bcSep)      DOM.bcSep.hidden = true;
    if (DOM.bcExercise) DOM.bcExercise.hidden = true;
    if (DOM.hintBtn) DOM.hintBtn.disabled = true;
    if (DOM.skipBtn) DOM.skipBtn.disabled = true;

    // Repurpose welcome screen for sandbox message
    if (DOM.welcomeScreen) {
      const hero = DOM.welcomeScreen.querySelector('.welcome-hero');
      if (hero) {
        hero.innerHTML = `
          <div class="welcome-logo">🖥</div>
          <h1 class="welcome-title">Sandbox Terminal</h1>
          <p class="welcome-subtitle">Free-form practice — no exercise checking.</p>
          <p class="welcome-desc">Type any Linux/DevOps command. The terminal simulates realistic Ubuntu EC2 output.<br>
          Click any command below to paste it into the terminal.</p>
          <div class="sandbox-suggestions">
            <code>uname -a</code><code>df -h</code><code>ps aux</code>
            <code>systemctl status nginx</code><code>ss -tlnp</code>
            <code>docker ps</code><code>aws sts get-caller-identity</code>
            <code>git log --oneline -10</code><code>free -h</code>
          </div>
        `;
        hero.querySelectorAll('code').forEach(el => {
          el.style.cursor = 'pointer';
          el.addEventListener('click', () => {
            const ti = $('terminal-input');
            if (ti) { ti.value = el.textContent; ti.focus(); }
          });
        });
      }
    }

    if (window.TermSim) {
      window.TermSim.appendOutput('--- Sandbox mode active — commands are free-form ---', 't-output');
      window.TermSim.focusInput();
    }
  }

  /* ─── Reset progress ─────────────────────────────────────────── */
  function resetProgress() {
    if (!confirm('Reset ALL progress? This cannot be undone.')) return;
    State.progress         = {};
    State.activeModuleId   = null;
    State.activeExerciseId = null;
    State.activeStepIndex  = 0;
    saveProgress();
    showWelcome();
    renderSidebar();
    updateProgressBars();
  }

  /* ─── Welcome / overview screen ──────────────────────────────── */
  function showWelcome() {
    if (DOM.welcomeScreen) DOM.welcomeScreen.hidden = false;
    if (DOM.lessonContent) DOM.lessonContent.hidden = true;
    if (DOM.bcModule)   DOM.bcModule.textContent = 'Select a module';
    if (DOM.bcSep)      DOM.bcSep.hidden = true;
    if (DOM.bcExercise) DOM.bcExercise.hidden = true;
    if (DOM.hintBtn) DOM.hintBtn.disabled = true;
    if (DOM.skipBtn) DOM.skipBtn.disabled = true;
    if (DOM.footerModName) DOM.footerModName.textContent = '';
    if (DOM.footerExName)  DOM.footerExName.textContent  = '';

    // Build overview grid
    if (DOM.overviewGrid) {
      DOM.overviewGrid.innerHTML = CURRICULUM.map(mod => {
        const mp = getModuleProgress(mod);
        return `
          <div class="overview-card" data-mod="${mod.id}" style="cursor:pointer">
            <span class="ov-icon">${mod.icon || '📋'}</span>
            <span class="ov-title">${mod.title}</span>
            <div class="ov-bar"><div class="ov-fill" style="width:${mp.pct}%"></div></div>
            <span class="ov-pct">${mp.pct}%</span>
          </div>
        `;
      }).join('');

      DOM.overviewGrid.querySelectorAll('.overview-card').forEach(card => {
        card.addEventListener('click', () => {
          const mod = CURRICULUM.find(m => m.id === card.dataset.mod);
          if (mod && mod.exercises.length) loadExercise(mod.id, mod.exercises[0].id);
        });
      });
    }
  }

  /* ─── Cheat sheet ────────────────────────────────────────────── */
  const CHEAT_DATA = {
    nav: [
      { cmd: 'pwd',              desc: 'Print current directory' },
      { cmd: 'ls -la',           desc: 'List all files with details' },
      { cmd: 'find / -name "*.log" 2>/dev/null', desc: 'Find files by name' },
      { cmd: 'which nginx',      desc: 'Locate an executable' },
      { cmd: 'history | grep ssh', desc: 'Search command history' },
      { cmd: 'ctrl+r',           desc: 'Reverse interactive search' },
    ],
    users: [
      { cmd: 'id',               desc: 'Show current user + groups' },
      { cmd: 'sudo useradd -m username', desc: 'Create user with home dir' },
      { cmd: 'sudo usermod -aG docker ubuntu', desc: 'Add user to group' },
      { cmd: 'sudo usermod -L username', desc: 'Lock account' },
      { cmd: 'sudo visudo',      desc: 'Edit sudoers safely' },
      { cmd: 'ssh-keygen -t ed25519', desc: 'Generate SSH key pair' },
    ],
    proc: [
      { cmd: 'ps aux --sort=-%cpu', desc: 'Processes by CPU usage' },
      { cmd: 'ps aux --sort=-%mem', desc: 'Processes by memory' },
      { cmd: 'kill -15 <PID>',   desc: 'Graceful SIGTERM' },
      { cmd: 'kill -9 <PID>',    desc: 'Force SIGKILL' },
      { cmd: 'pkill -f "node"',  desc: 'Kill by process name' },
      { cmd: 'strace -c -p <PID>', desc: 'Syscall summary for PID' },
      { cmd: 'lsof -p <PID>',    desc: 'All open files for PID' },
    ],
    net: [
      { cmd: 'ip addr',          desc: 'All network interfaces' },
      { cmd: 'ip route',         desc: 'Routing table' },
      { cmd: 'ss -tlnp',         desc: 'TCP listening sockets + PIDs' },
      { cmd: 'dig +short google.com', desc: 'DNS lookup' },
      { cmd: 'nc -zv host 80',   desc: 'TCP port check' },
      { cmd: 'tcpdump -i eth0 port 80 -n', desc: 'Capture packets' },
      { cmd: 'curl -w "%{time_total}" -s -o /dev/null url', desc: 'Request timing' },
    ],
    logs: [
      { cmd: 'journalctl -u nginx -n 100 -f', desc: 'Follow service logs' },
      { cmd: 'journalctl -p err -xb', desc: 'Error logs current boot' },
      { cmd: 'journalctl --since "1 hour ago"', desc: 'Logs from last hour' },
      { cmd: 'tail -f /var/log/nginx/error.log', desc: 'Follow nginx errors' },
      { cmd: 'grep "ERROR" /var/log/app.log | wc -l', desc: 'Count errors' },
      { cmd: 'awk \'{print $1}\' access.log | sort | uniq -c | sort -rn', desc: 'Top IPs' },
    ],
    pkg: [
      { cmd: 'sudo apt update && sudo apt upgrade -y', desc: 'Update + upgrade all packages' },
      { cmd: 'sudo apt install -y <pkg>', desc: 'Install a package' },
      { cmd: 'apt-cache show <pkg> | grep Version', desc: 'Show available versions' },
      { cmd: 'sudo apt-mark hold <pkg>', desc: 'Pin package version' },
      { cmd: 'dpkg -l | grep linux-image', desc: 'List kernel versions' },
      { cmd: 'sudo reboot', desc: 'Reboot (for kernel updates)' },
    ],
    ec2: [
      { cmd: 'aws sts get-caller-identity', desc: 'Current IAM identity' },
      { cmd: 'aws ec2 describe-instances --query "..." --output table', desc: 'List EC2 instances' },
      { cmd: 'aws s3 sync ./dir s3://bucket/', desc: 'Sync to S3' },
      { cmd: 'aws secretsmanager get-secret-value --secret-id name', desc: 'Fetch secret' },
      { cmd: 'aws ssm start-session --target i-0abc123', desc: 'SSM shell into EC2' },
      { cmd: 'aws logs tail /aws/ec2/app --follow', desc: 'Stream CloudWatch logs' },
      { cmd: 'curl http://169.254.169.254/latest/meta-data/instance-id', desc: 'Get instance ID (IMDS)' },
    ],
    dock: [
      { cmd: 'docker ps -a',     desc: 'All containers (running + stopped)' },
      { cmd: 'docker logs -f --tail 50 ctr', desc: 'Follow container logs' },
      { cmd: 'docker exec -it ctr bash', desc: 'Shell into running container' },
      { cmd: 'docker system df', desc: 'Disk usage breakdown' },
      { cmd: 'docker system prune -f', desc: 'Remove unused resources' },
      { cmd: 'docker build -t name:tag .', desc: 'Build image' },
      { cmd: 'docker compose up -d', desc: 'Start stack (detached)' },
      { cmd: 'docker compose down --volumes', desc: 'Tear down stack + volumes' },
    ],
    sec: [
      { cmd: 'sudo sshd -t',     desc: 'Test sshd_config syntax' },
      { cmd: 'sudo fail2ban-client status sshd', desc: 'fail2ban jail status' },
      { cmd: 'sudo auditctl -w /etc/passwd -p wa', desc: 'Audit writes to passwd' },
      { cmd: 'openssl x509 -noout -dates -in cert.pem', desc: 'Check cert expiry' },
      { cmd: 'sudo lynis audit system --quick', desc: 'CIS security audit' },
      { cmd: 'find / -perm -4000 -type f 2>/dev/null', desc: 'Find SUID files' },
    ],
    git: [
      { cmd: 'git log --oneline --graph --all', desc: 'Visual history' },
      { cmd: 'git diff HEAD~1 HEAD --stat', desc: 'Files changed in last commit' },
      { cmd: 'git stash && git stash pop', desc: 'Save/restore uncommitted work' },
      { cmd: 'git checkout -b feature/name', desc: 'Create and switch branch' },
      { cmd: 'git rebase -i HEAD~3', desc: 'Interactive rebase last 3 commits' },
      { cmd: 'git cherry-pick <hash>', desc: 'Apply single commit' },
    ],
  };

  function renderCheatSheet() {
    DOM.cheatTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        DOM.cheatTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderCheatTab(tab.dataset.tab);
      });
    });
    // Render first tab immediately
    if (DOM.cheatTabs[0]) renderCheatTab(DOM.cheatTabs[0].dataset.tab);
  }

  function renderCheatTab(key) {
    if (!DOM.cheatContent) return;
    const rows = CHEAT_DATA[key] || [];
    DOM.cheatContent.innerHTML = `<table class="cheat-table">
      <thead><tr><th>Command</th><th>Description</th></tr></thead>
      <tbody>
        ${rows.map(r => `<tr><td><code>${escHtml(r.cmd)}</code></td><td>${r.desc}</td></tr>`).join('')}
      </tbody>
    </table>`;
  }

  /* ─── Filter pills ───────────────────────────────────────────── */
  function initFilterPills() {
    DOM.filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        DOM.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        renderSidebar(pill.dataset.filter || 'all', DOM.sidebarSearch ? DOM.sidebarSearch.value : '');
      });
    });
  }

  /* ─── Search ─────────────────────────────────────────────────── */
  function initSearch() {
    if (!DOM.sidebarSearch) return;
    DOM.sidebarSearch.addEventListener('input', () => {
      renderSidebar(getActiveFilter(), DOM.sidebarSearch.value);
    });
  }

  /* ─── Modals ─────────────────────────────────────────────────── */
  function initModals() {
    if (DOM.cheatBtn) DOM.cheatBtn.addEventListener('click', () => DOM.cheatModal && DOM.cheatModal.classList.replace('hidden', 'open') || DOM.cheatModal.classList.add('open'));
    if (DOM.helpBtn)  DOM.helpBtn.addEventListener('click',  () => DOM.helpModal  && (DOM.helpModal.classList.replace('hidden', 'open') || DOM.helpModal.classList.add('open')));

    // Close buttons (data-close attribute)
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.close;
        const el = target ? $(target) : btn.closest('.modal-overlay');
        if (el) { el.classList.remove('open'); el.classList.add('hidden'); }
      });
    });

    // Click outside
    [DOM.cheatModal, DOM.helpModal].forEach(modal => {
      if (!modal) return;
      modal.addEventListener('click', e => {
        if (e.target === modal) { modal.classList.remove('open'); modal.classList.add('hidden'); }
      });
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        [DOM.cheatModal, DOM.helpModal].forEach(m => {
          if (m) { m.classList.remove('open'); m.classList.add('hidden'); }
        });
      }
      if (e.key === '?' && !isTyping()) DOM.helpModal  && (DOM.helpModal.classList.remove('hidden'),  DOM.helpModal.classList.add('open'));
      if (e.key === 'c' && !isTyping()) DOM.cheatModal && (DOM.cheatModal.classList.remove('hidden'), DOM.cheatModal.classList.add('open'));
    });
  }

  function isTyping() {
    const t = document.activeElement && document.activeElement.tagName;
    return t === 'INPUT' || t === 'TEXTAREA';
  }

  /* ─── Hint-close button ──────────────────────────────────────── */
  function initHintClose() {
    const closeBtn = $('hint-close-btn');
    if (closeBtn && DOM.hintToast) {
      closeBtn.addEventListener('click', () => {
        DOM.hintToast.classList.remove('visible');
        DOM.hintToast.classList.add('hidden');
      });
    }
  }

  /* ─── Explanation close ──────────────────────────────────────── */
  function initExplanationClose() {
    if (DOM.closeExplanation && DOM.explanationBox) {
      DOM.closeExplanation.addEventListener('click', () => { DOM.explanationBox.hidden = true; });
    }
  }

  /* ─── Clear terminal button ──────────────────────────────────── */
  function initTerminalControls() {
    const clearBtn = $('clear-terminal-btn');
    if (clearBtn && window.TermSim) clearBtn.addEventListener('click', () => window.TermSim.clearScreen());

    const copyBtn = $('copy-last-cmd-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        const ti = $('terminal-input');
        if (ti && ti.value) navigator.clipboard && navigator.clipboard.writeText(ti.value);
      });
    }
  }

  /* ─── Overview grid CSS (injected if not in stylesheet) ─────── */
  function injectOverviewStyles() {
    const s = document.createElement('style');
    s.textContent = `
      .overview-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(200px,1fr)); gap:12px; margin-top:12px; }
      .overview-card { background:var(--surface-2); border:1px solid var(--border); border-radius:8px;
        padding:12px 14px; display:flex; align-items:center; gap:10px; transition:border-color 0.2s; }
      .overview-card:hover { border-color:var(--blue); }
      .ov-icon  { font-size:1.2rem; flex-shrink:0; }
      .ov-title { flex:1; font-size:0.82rem; font-weight:600; min-width:0;
        white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
      .ov-bar   { width:50px; height:4px; background:var(--surface-3); border-radius:2px; flex-shrink:0; overflow:hidden; }
      .ov-fill  { height:100%; background:var(--blue); border-radius:2px; transition:width 0.4s; }
      .ov-pct   { font-size:0.7rem; color:var(--text-muted); width:28px; text-align:right; flex-shrink:0; }
      .sandbox-suggestions { margin-top:16px; }
      .sandbox-suggestions code { display:inline-block; margin:4px; background:var(--surface-3);
        border:1px solid var(--border); color:var(--prompt-color); font-family:var(--font-mono);
        font-size:0.82rem; padding:4px 10px; border-radius:5px; cursor:pointer; transition:border-color 0.15s; }
      .sandbox-suggestions code:hover { border-color:var(--blue); color:var(--blue); }
    `;
    document.head.appendChild(s);
  }

  /* ─── Boot ───────────────────────────────────────────────────── */
  function init() {
    loadProgress();
    injectOverviewStyles();
    showWelcome();
    renderSidebar();
    updateProgressBars();
    renderCheatSheet();
    initFilterPills();
    initSearch();
    initModals();
    initHintClose();
    initExplanationClose();
    initTerminalControls();

    if (DOM.hintBtn) DOM.hintBtn.addEventListener('click', showHint);
    if (DOM.skipBtn) DOM.skipBtn.addEventListener('click', skipStep);
    if (DOM.sandboxBtn) DOM.sandboxBtn.addEventListener('click', enterSandbox);
    if (DOM.resetBtn)   DOM.resetBtn.addEventListener('click',   resetProgress);

    // Open first incomplete module in sidebar
    const suggestMod = CURRICULUM.find(m => getModuleProgress(m).pct < 100);
    if (suggestMod) { State.activeModuleId = suggestMod.id; renderSidebar(); }

    console.log(`[Linux Academy] ${CURRICULUM.length} modules, ${getTotalExercises()} exercises loaded.`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.LinuxAcademy = { State, CURRICULUM, loadExercise, resetProgress };
}());

