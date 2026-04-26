(() => {
  const REPO = 'CCoupel/claude_project_template';
  const API  = 'https://api.github.com';

  /* ── Version (latest tag) ── */
  fetch(`${API}/repos/${REPO}/tags?per_page=1`)
    .then(r => r.json())
    .then(tags => {
      const v = tags?.[0]?.name || '';
      if (v) document.querySelectorAll('.version-tag').forEach(el => el.textContent = v);
    })
    .catch(() => {});

  /* ── Roadmap (milestones + issues) ── */
  const lang = () => localStorage.getItem('cpt-lang') || 'fr';
  const t = {
    fr: {
      delivered: 'Livré', inprog: 'En cours', planned: 'À venir',
      open: 'ouverte(s)', closed: 'fermée(s)', issues: 'issues',
      noIssues: 'Aucune issue', error: 'Impossible de charger la roadmap depuis GitHub.'
    },
    en: {
      delivered: 'Delivered', inprog: 'In progress', planned: 'Planned',
      open: 'open', closed: 'closed', issues: 'issues',
      noIssues: 'No issues', error: 'Unable to load roadmap from GitHub.'
    }
  };

  function statusDot(state) {
    if (state === 'closed') return 'status-done';
    return 'status-inprog';
  }

  function colHeader(milestone, l) {
    const pct = milestone.open_issues + milestone.closed_issues > 0
      ? Math.round(milestone.closed_issues * 100 / (milestone.open_issues + milestone.closed_issues))
      : 0;
    const dot = statusDot(milestone.state);
    return `
      <div class="roadmap-col-header">
        <span class="status-dot ${dot}"></span>
        <span>${milestone.title}</span>
      </div>
      <div class="milestone-progress">
        <div class="milestone-progress-bar">
          <div class="milestone-progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="milestone-progress-label">${pct}% · ${milestone.closed_issues} ${l.closed} / ${milestone.open_issues + milestone.closed_issues} ${l.issues}</div>
      </div>`;
  }

  function issueItem(issue) {
    const icon = issue.state === 'closed' ? '✅' : '⚙';
    return `
      <div class="roadmap-item">
        <span class="roadmap-item-icon">${icon}</span>
        <div>
          <div class="roadmap-item-title">${issue.title}</div>
          <div class="roadmap-item-num">#${issue.number}</div>
        </div>
      </div>`;
  }

  async function loadRoadmap() {
    const el = document.getElementById('roadmap-content');
    if (!el) return;
    const l = t[lang()] || t.fr;

    try {
      const [msOpen, msClosed] = await Promise.all([
        fetch(`${API}/repos/${REPO}/milestones?state=open&sort=due_on&direction=asc&per_page=5`).then(r => r.json()),
        fetch(`${API}/repos/${REPO}/milestones?state=closed&sort=due_on&direction=desc&per_page=2`).then(r => r.json()),
      ]);

      const cols = [];

      /* Closed milestones (delivered) */
      for (const ms of (msClosed || []).slice(0, 2)) {
        const issues = await fetch(`${API}/repos/${REPO}/issues?milestone=${ms.number}&state=all&per_page=10`).then(r => r.json());
        cols.push(`
          <div class="roadmap-col">
            ${colHeader(ms, l)}
            <div class="roadmap-items">
              ${(issues || []).map(issueItem).join('') || `<div class="roadmap-item"><span class="roadmap-item-title" style="color:var(--muted)">${l.noIssues}</span></div>`}
            </div>
          </div>`);
      }

      /* Open milestones (in progress / planned) */
      for (const ms of (msOpen || []).slice(0, 3)) {
        const issues = await fetch(`${API}/repos/${REPO}/issues?milestone=${ms.number}&state=all&per_page=10`).then(r => r.json());
        cols.push(`
          <div class="roadmap-col">
            ${colHeader(ms, l)}
            <div class="roadmap-items">
              ${(issues || []).map(issueItem).join('') || `<div class="roadmap-item"><span class="roadmap-item-title" style="color:var(--muted)">${l.noIssues}</span></div>`}
            </div>
          </div>`);
      }

      /* Fallback if no milestones */
      if (cols.length === 0) {
        const issues = await fetch(`${API}/repos/${REPO}/issues?state=open&per_page=8&labels=roadmap`).then(r => r.json());
        cols.push(`
          <div class="roadmap-col">
            <div class="roadmap-col-header"><span class="status-dot status-plan"></span><span>${l.planned}</span></div>
            <div class="roadmap-items">
              ${(issues || []).map(issueItem).join('') || `<div class="roadmap-item"><span class="roadmap-item-title" style="color:var(--muted)">${l.noIssues}</span></div>`}
            </div>
          </div>`);
      }

      el.innerHTML = cols.join('');
    } catch (e) {
      el.innerHTML = `<div class="roadmap-error">${l.error}</div>`;
    }
  }

  loadRoadmap();

  /* Reload roadmap on lang change */
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => setTimeout(loadRoadmap, 100));
  });
})();
