// ---------- Storage helpers ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e) { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
};

let tasks = store.get('ss_tasks', []);
let events = store.get('ss_events', []); // {id, date:'YYYY-MM-DD', name, time, type, notes}
let marks = store.get('ss_marks', []);   // {subject, test, scored, total}
let timerLog = store.get('ss_timerlog', []);
let chatHistory = store.get('ss_chat', []);
let settings = store.get('ss_settings', { theme: 'dark', name: '' });

function saveAll() {
  store.set('ss_tasks', tasks);
  store.set('ss_events', events);
  store.set('ss_marks', marks);
  store.set('ss_timerlog', timerLog);
  store.set('ss_chat', chatHistory);
  store.set('ss_settings', settings);
}

// ---------- Navigation ----------
const screens = document.querySelectorAll('.screen');
const navBtns = document.querySelectorAll('.nav-btn');

function showScreen(name) {
  screens.forEach(s => s.classList.toggle('active', s.id === 'screen-' + name));
  navBtns.forEach(b => b.classList.toggle('active', b.dataset.nav === name || (name!=='today'&&name!=='calendar'&&name!=='todo'&&name!=='timer' && b.dataset.nav==='more')));
  if (name === 'today') renderToday();
  if (name === 'calendar') renderCalendar();
  if (name === 'todo') renderTodo();
  if (name === 'timer') renderTimerLog();
  if (name === 'marks') renderMarks();
  if (name === 'chatbot') renderChat();
}

document.querySelectorAll('[data-nav]').forEach(el => {
  el.addEventListener('click', () => showScreen(el.dataset.nav));
});
document.querySelectorAll('[data-back]').forEach(el => {
  el.addEventListener('click', () => showScreen(el.dataset.back));
});

// ---------- Theme ----------
function applyTheme() {
  document.documentElement.classList.toggle('light', settings.theme === 'light');
  document.getElementById('themeToggle').checked = settings.theme === 'dark';
}
document.getElementById('themeToggle').addEventListener('change', (e) => {
  settings.theme = e.target.checked ? 'dark' : 'light';
  applyTheme(); saveAll();
});
document.getElementById('studentNameInput').addEventListener('input', (e) => {
  settings.name = e.target.value; saveAll();
});
document.getElementById('resetDataBtn').addEventListener('click', () => {
  if (confirm('This will delete all your tasks, events, marks and history. Continue?')) {
    tasks = []; events = []; marks = []; timerLog = []; chatHistory = [];
    saveAll();
    renderToday(); renderCalendar(); renderTodo(); renderMarks(); renderChat();
    alert('All data cleared.');
  }
});

// ---------- Dates ----------
function todayISO() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function fmtNiceDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}
function daysUntil(iso) {
  const now = new Date(todayISO() + 'T00:00:00');
  const target = new Date(iso + 'T00:00:00');
  return Math.round((target - now) / 86400000);
}
function urgencyOf(iso) {
  const d = daysUntil(iso);
  if (d <= 2) return 'High';
  if (d <= 7) return 'Medium';
  return 'Low';
}

// ---------- TODAY ----------
function renderToday() {
  document.getElementById('todayDate').textContent = fmtNiceDate(todayISO());

  // focus area from marks
  const focusEl = document.getElementById('focusText');
  if (marks.length === 0) {
    focusEl.textContent = 'Add marks to see your weakest subject.';
  } else {
    const bySubject = {};
    marks.forEach(m => {
      if (!bySubject[m.subject]) bySubject[m.subject] = { scored:0, total:0 };
      bySubject[m.subject].scored += Number(m.scored);
      bySubject[m.subject].total += Number(m.total);
    });
    let weakest = null, weakestPct = 101;
    Object.keys(bySubject).forEach(sub => {
      const pct = (bySubject[sub].scored / bySubject[sub].total) * 100;
      if (pct < weakestPct) { weakestPct = pct; weakest = sub; }
    });
    focusEl.innerHTML = `<b>${weakest}</b> is your weakest subject at ${weakestPct.toFixed(0)}%.`;
  }

  const todayTasksEl = document.getElementById('todayTasks');
  const dueToday = tasks.filter(t => t.due === todayISO() && !t.done);
  todayTasksEl.innerHTML = dueToday.length
    ? dueToday.map(t => taskRowHTML(t)).join('')
    : `<div class="empty-hint">No tasks due today.</div>`;
  attachTaskListeners(todayTasksEl);

  const todayEventsEl = document.getElementById('todayEvents');
  const evToday = events.filter(e => e.date === todayISO());
  todayEventsEl.innerHTML = evToday.length
    ? evToday.map(e => eventRowHTML(e)).join('')
    : `<div class="empty-hint">No events today.</div>`;
}

function taskRowHTML(t) {
  const tagClass = t.urgency === 'High' ? 'tag-high' : t.urgency === 'Medium' ? 'tag-medium' : 'tag-low';
  return `<div class="list-item" data-id="${t.id}">
    <button class="done-check ${t.done?'checked':''}" data-check="${t.id}">${t.done?'&#10003;':''}</button>
    <div style="flex:1;">
      <div class="li-main ${t.done?'done':''}">${escapeHtml(t.name)}</div>
      <div class="li-sub">${escapeHtml(t.subject||'')}${t.subject?' &middot; ':''}${t.due}</div>
    </div>
    <span class="tag ${tagClass}">${t.urgency}</span>
    <button class="li-delete" data-del="${t.id}">&times;</button>
  </div>`;
}
function eventRowHTML(e) {
  const tagClass = e.type === 'Academic' ? 'tag-academic' : 'tag-cocurricular';
  return `<div class="list-item">
    <div style="flex:1;">
      <div class="li-main">${escapeHtml(e.name)}</div>
      <div class="li-sub">${e.time||''}${e.notes? ' &middot; '+escapeHtml(e.notes):''}</div>
    </div>
    <span class="tag ${tagClass}">${e.type}</span>
  </div>`;
}
function escapeHtml(s) { return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

function attachTaskListeners(container) {
  container.querySelectorAll('[data-check]').forEach(b => {
    b.addEventListener('click', () => {
      const t = tasks.find(x => x.id === b.dataset.check);
      t.done = !t.done; saveAll(); renderToday(); renderTodo();
    });
  });
  container.querySelectorAll('[data-del]').forEach(b => {
    b.addEventListener('click', () => {
      tasks = tasks.filter(x => x.id !== b.dataset.del); saveAll(); renderToday(); renderTodo();
    });
  });
}

// ---------- TO-DO ----------
function renderTodo() {
  const order = { High: 0, Medium: 1, Low: 2 };
  const sorted = [...tasks].sort((a,b) => {
    if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
    return a.due.localeCompare(b.due);
  });
  const el = document.getElementById('todoList');
  el.innerHTML = sorted.length ? sorted.map(t => taskRowHTML(t)).join('') : `<div class="empty-hint">No tasks yet. Add one above.</div>`;
  attachTaskListeners(el);
}
document.getElementById('addTaskBtn').addEventListener('click', () => {
  const name = document.getElementById('taskNameInput').value.trim();
  const subject = document.getElementById('taskSubjectInput').value.trim();
  const due = document.getElementById('taskDueInput').value;
  if (!name || !due) { alert('Please enter a task name and due date.'); return; }
  tasks.push({ id: 't'+Date.now(), name, subject, due, urgency: urgencyOf(due), done: false });
  saveAll();
  document.getElementById('taskNameInput').value = '';
  document.getElementById('taskSubjectInput').value = '';
  document.getElementById('taskDueInput').value = '';
  renderTodo(); renderToday();
});

// ---------- CALENDAR ----------
let calViewDate = new Date();
let selectedDateISO = null;

function renderCalendar() {
  const y = calViewDate.getFullYear(), m = calViewDate.getMonth();
  document.getElementById('calMonthLabel').textContent = calViewDate.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const firstDay = new Date(y, m, 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(y, m+1, 0).getDate();
  const daysInPrevMonth = new Date(y, m, 0).getDate();

  const cells = [];
  for (let i = startOffset - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, other: true, m: m-1 });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, other: false, m: m });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, other: true, m: m+1 });

  cells.forEach(c => {
    const cellDate = new Date(y, c.m, c.day);
    const iso = cellDate.getFullYear()+'-'+String(cellDate.getMonth()+1).padStart(2,'0')+'-'+String(cellDate.getDate()).padStart(2,'0');
    const isToday = iso === todayISO();
    const dayEvents = events.filter(e => e.date === iso);
    const div = document.createElement('div');
    div.className = 'cal-cell' + (c.other ? ' other-month' : '') + (isToday ? ' is-today' : '');
    div.innerHTML = `<span>${c.day}</span>` + (dayEvents.length ? `<div class="dot-row">${dayEvents.slice(0,3).map(()=>'<span class="dot"></span>').join('')}</div>` : '');
    div.addEventListener('click', () => openDateSheet(iso));
    grid.appendChild(div);
  });
}
document.getElementById('calPrev').addEventListener('click', () => { calViewDate.setMonth(calViewDate.getMonth()-1); renderCalendar(); });
document.getElementById('calNext').addEventListener('click', () => { calViewDate.setMonth(calViewDate.getMonth()+1); renderCalendar(); });

function openDateSheet(iso) {
  selectedDateISO = iso;
  document.getElementById('sheetDateTitle').textContent = fmtNiceDate(iso);
  const list = events.filter(e => e.date === iso);
  const el = document.getElementById('sheetEventList');
  el.innerHTML = list.length ? list.map(e => `<div class="list-item">
      <div style="flex:1;"><div class="li-main">${escapeHtml(e.name)}</div><div class="li-sub">${e.time||''}</div></div>
      <button class="li-delete" data-delev="${e.id}">&times;</button>
    </div>`).join('') : `<div class="empty-hint">No events on this date.</div>`;
  el.querySelectorAll('[data-delev]').forEach(b => {
    b.addEventListener('click', () => {
      events = events.filter(x => x.id !== b.dataset.delev);
      saveAll(); openDateSheet(iso); renderCalendar(); renderToday();
    });
  });
  document.getElementById('dateSheetOverlay').classList.add('active');
}
document.getElementById('sheetCloseBtn').addEventListener('click', () => document.getElementById('dateSheetOverlay').classList.remove('active'));
document.getElementById('sheetAddEventBtn').addEventListener('click', () => {
  document.getElementById('dateSheetOverlay').classList.remove('active');
  const existing = events.filter(e => e.date === selectedDateISO);
  document.getElementById('clashWarning').style.display = existing.length ? 'block' : 'none';
  document.getElementById('eventNameInput').value = '';
  document.getElementById('eventTimeInput').value = '';
  document.getElementById('eventNotesInput').value = '';
  document.getElementById('eventFormOverlay').classList.add('active');
});
document.getElementById('cancelEventBtn').addEventListener('click', () => {
  document.getElementById('eventFormOverlay').classList.remove('active');
});
document.getElementById('saveEventBtn').addEventListener('click', () => {
  const name = document.getElementById('eventNameInput').value.trim();
  if (!name) { alert('Please enter an event name.'); return; }
  events.push({
    id: 'e'+Date.now(),
    date: selectedDateISO,
    name,
    time: document.getElementById('eventTimeInput').value,
    type: document.getElementById('eventTypeInput').value,
    notes: document.getElementById('eventNotesInput').value.trim()
  });
  saveAll();
  document.getElementById('eventFormOverlay').classList.remove('active');
  renderCalendar(); renderToday();
});

// ---------- TIMER ----------
let timerSeconds = 25*60, timerInterval = null, timerRunning = false;
function updateTimerDisplay() {
  const m = Math.floor(timerSeconds/60), s = timerSeconds%60;
  document.getElementById('timerDisplay').textContent = `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}
document.getElementById('timerStartBtn').addEventListener('click', () => {
  if (timerRunning) return;
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      clearInterval(timerInterval); timerRunning = false;
      const subj = document.getElementById('timerSubjectInput').value.trim() || 'General';
      timerLog.unshift({ date: todayISO(), subject: subj, minutes: 25 });
      saveAll(); renderTimerLog();
      alert('Session complete! Great work.');
      timerSeconds = 25*60; updateTimerDisplay();
    }
  }, 1000);
});
document.getElementById('timerPauseBtn').addEventListener('click', () => { clearInterval(timerInterval); timerRunning = false; });
document.getElementById('timerResetBtn').addEventListener('click', () => { clearInterval(timerInterval); timerRunning = false; timerSeconds = 25*60; updateTimerDisplay(); });
function renderTimerLog() {
  const el = document.getElementById('timerLog');
  el.innerHTML = timerLog.length ? timerLog.slice(0,10).map(l => `<div class="list-item">
      <div style="flex:1;"><div class="li-main">${escapeHtml(l.subject)}</div><div class="li-sub">${l.date}</div></div>
      <span class="tag tag-low">${l.minutes} min</span>
    </div>`).join('') : `<div class="empty-hint">No sessions logged yet.</div>`;
}
updateTimerDisplay();

// ---------- MARKS ----------
document.getElementById('addMarkBtn').addEventListener('click', () => {
  const subject = document.getElementById('markSubjectInput').value.trim();
  const test = document.getElementById('markTestInput').value.trim();
  const scored = document.getElementById('markScoredInput').value;
  const total = document.getElementById('markTotalInput').value;
  if (!subject || !scored || !total) { alert('Please fill subject, marks scored, and total.'); return; }
  marks.push({ subject, test, scored: Number(scored), total: Number(total) });
  saveAll();
  document.getElementById('markSubjectInput').value = '';
  document.getElementById('markTestInput').value = '';
  document.getElementById('markScoredInput').value = '';
  document.getElementById('markTotalInput').value = '';
  renderMarks();
});
function renderMarks() {
  const el = document.getElementById('marksChart');
  if (marks.length === 0) { el.innerHTML = `<div class="empty-hint">No results yet. Add one above.</div>`; return; }
  const bySubject = {};
  marks.forEach(m => {
    if (!bySubject[m.subject]) bySubject[m.subject] = { scored:0, total:0 };
    bySubject[m.subject].scored += m.scored;
    bySubject[m.subject].total += m.total;
  });
  el.innerHTML = Object.keys(bySubject).map(sub => {
    const pct = (bySubject[sub].scored / bySubject[sub].total) * 100;
    return `<div class="bar-row">
      <div class="bar-label">${escapeHtml(sub)}</div>
      <div class="bar-track"><div class="bar-fill ${pct<50?'weak':''}" style="width:${pct}%;"></div></div>
      <div class="bar-pct">${pct.toFixed(0)}%</div>
    </div>`;
  }).join('');
}

// ---------- CHATBOT (simple local helper, no external API) ----------
function renderChat() {
  const el = document.getElementById('chatMessages');
  el.innerHTML = chatHistory.map(m => `<div class="msg ${m.role}">${escapeHtml(m.text)}</div>`).join('');
  el.scrollTop = el.scrollHeight;
}
function localHomeworkReply(q) {
  const lower = q.toLowerCase();
  if (lower.includes('formula') || lower.includes('equation')) return "Try writing down what's given and what you need to find first — that usually points to the right formula. Want to tell me the exact question?";
  if (lower.includes('essay') || lower.includes('paragraph')) return "For a strong paragraph: start with a topic sentence, add 2-3 supporting details, then a closing line that ties back to the topic.";
  if (lower.includes('history') || lower.includes('social')) return "Good approach: note the cause, the key event, and the effect/result — that structure works for most history answers.";
  return "That's a good question — break it into smaller parts: what do you already know, and what's the one thing you're stuck on? Tell me that part and I'll help you work through it.";
}
document.getElementById('chatSendBtn').addEventListener('click', sendChat);
document.getElementById('chatInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChat(); });
function sendChat() {
  const input = document.getElementById('chatInput');
  const text = input.value.trim();
  if (!text) return;
  chatHistory.push({ role:'user', text });
  chatHistory.push({ role:'bot', text: localHomeworkReply(text) });
  saveAll();
  input.value = '';
  renderChat();
}

// ---------- FLASHCARDS (simple local generator, no external API) ----------
document.getElementById('generateFlashcardsBtn').addEventListener('click', () => {
  const notes = document.getElementById('notesInput').value.trim();
  if (!notes) { alert('Paste some notes first.'); return; }
  const sentences = notes.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length > 15);
  const count = Math.max(2, Math.min(10, Math.round(sentences.length / 1)));
  const chosen = sentences.slice(0, count);
  document.getElementById('flashcardSummary').textContent = `Generated ${chosen.length} flashcard${chosen.length!==1?'s':''} from your notes.`;
  const listEl = document.getElementById('flashcardList');
  listEl.innerHTML = chosen.map((s, i) => {
    const words = s.split(' ');
    const blankIdx = Math.min(words.length-1, Math.floor(words.length/2));
    const answer = words[blankIdx].replace(/[.,!?]/g,'');
    const question = words.map((w,idx) => idx===blankIdx ? '_____' : w).join(' ');
    return `<div class="flashcard" data-i="${i}"><div class="fc-q">${escapeHtml(question)}</div><div class="fc-a">${escapeHtml(answer)}</div></div>`;
  }).join('');
  listEl.querySelectorAll('.flashcard').forEach(card => {
    card.addEventListener('click', () => card.classList.toggle('revealed'));
  });
});

// ---------- Init ----------
document.getElementById('studentNameInput').value = settings.name || '';
applyTheme();
showScreen('today');

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}
