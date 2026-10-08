// APP STATE
let appState = {
    studentName: localStorage.getItem('studentName') || 'Student',
    theme: localStorage.getItem('theme') || 'light',
    todos: JSON.parse(localStorage.getItem('todos')) || [],
    marks: JSON.parse(localStorage.getItem('marks')) || [],
    sessions: JSON.parse(localStorage.getItem('sessions')) || [],
    events: JSON.parse(localStorage.getItem('events')) || [],
    stickyNotes: JSON.parse(localStorage.getItem('stickyNotes')) || [],
    customSubjects: JSON.parse(localStorage.getItem('customSubjects')) || [],
    // TIMETABLE
    timetable: JSON.parse(localStorage.getItem('timetable')) || {
        numPeriods: 5,
        numDays: 6,
        periodNames: ['Period 1', 'Period 2', 'Period 3', 'Period 4', 'Period 5', '', '', '', '', ''],
        dayNames: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        grid: {} // { "0-0": "Subject", "0-1": "Subject", ... }
    },
    currentTab: 'today',
    timer: {
        isRunning: false,
        timeLeft: 0,
        totalTime: 0,
        subject: '',
        endTime: null
    }
};

// ==================== CUSTOM SUBJECTS MANAGER ====================
function addCustomSubject(subject) {
    if (subject && !appState.customSubjects.includes(subject)) {
        appState.customSubjects.push(subject);
        localStorage.setItem('customSubjects', JSON.stringify(appState.customSubjects));
        updateSubjectDropdowns();
    }
}

function updateSubjectDropdowns() {
    const existingCustomOptions = Array.from(subjectSelect.options).filter(opt => 
        opt.value !== '' && 
        opt.value !== 'English' && 
        opt.value !== 'Maths' && 
        opt.value !== 'Science' && 
        opt.value !== 'Social Studies' && 
        opt.value !== 'Hindi' && 
        opt.value !== 'Other'
    );
    existingCustomOptions.forEach(opt => opt.remove());
    
    appState.customSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectSelect.insertBefore(option, subjectSelect.querySelector('option[value="Other"]'));
    });
    
    const marksExistingCustom = Array.from(marksSubjectSelect.options).filter(opt => 
        opt.value !== '' && 
        opt.value !== 'English' && 
        opt.value !== 'Maths' && 
        opt.value !== 'Science' && 
        opt.value !== 'Social Studies' && 
        opt.value !== 'Hindi' && 
        opt.value !== 'Other'
    );
    marksExistingCustom.forEach(opt => opt.remove());
    
    appState.customSubjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        marksSubjectSelect.insertBefore(option, marksSubjectSelect.querySelector('option[value="Other"]'));
    });
}

// DOM ELEMENTS
const tabContents = document.querySelectorAll('.tab-content');
const navButtons = document.querySelectorAll('.nav-btn');
const pageTitle = document.getElementById('pageTitle');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const themeToggle = document.getElementById('themeToggle');
const studentNameInput = document.getElementById('studentNameInput');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');

// INITIALIZATION
function init() {
    setupTheme();
    updatePageTitle();
    updateSubjectDropdowns();
    setupEventListeners();
    renderAllSections();
    checkStreak();
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js');
    }
}

// ==================== THEME ====================
function setupTheme() {
    if (appState.theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }
}

themeToggle.addEventListener('change', (e) => {
    appState.theme = e.target.checked ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', appState.theme);
    syncToCloud();
});

// ==================== GOOGLE SIGN-IN + CLOUD SYNC ====================
let firebaseReady = false;
let db = null;
try {
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        firebaseReady = true;
    }
} catch (e) {
    console.log('Firebase not configured yet:', e);
}

const googleSignInBtn = document.getElementById('googleSignInBtn');
const googleAccountStatus = document.getElementById('googleAccountStatus');

if (googleSignInBtn) {
    googleSignInBtn.addEventListener('click', () => {
        if (!firebaseReady) {
            alert('Google Sign-In isn\'t set up yet. Add your Firebase project keys to firebase-config.js first.');
            return;
        }
        const provider = new firebase.auth.GoogleAuthProvider();
        firebase.auth().signInWithPopup(provider).catch((err) => {
            alert('Sign-in failed: ' + err.message);
        });
    });
}

function getLocalDataSnapshot() {
    return {
        studentName: appState.studentName,
        theme: appState.theme,
        todos: appState.todos,
        marks: appState.marks,
        sessions: appState.sessions,
        events: appState.events,
        stickyNotes: appState.stickyNotes,
        timetable: appState.timetable, // TIMETABLE
        streak: appState.streak,
        updatedAt: Date.now()
    };
}

function syncToCloud() {
    if (!firebaseReady || !db) return;
    const user = firebase.auth().currentUser;
    if (!user) return;
    db.collection('users').doc(user.uid).set(getLocalDataSnapshot(), { merge: true })
        .catch((err) => console.log('Cloud sync failed:', err));
}

function loadFromCloud(uid) {
    if (!firebaseReady || !db) return;
    db.collection('users').doc(uid).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            if (data.studentName !== undefined) { appState.studentName = data.studentName; localStorage.setItem('studentName', data.studentName); }
            if (data.theme !== undefined) { appState.theme = data.theme; localStorage.setItem('theme', data.theme); }
            if (data.todos !== undefined) { appState.todos = data.todos; localStorage.setItem('todos', JSON.stringify(data.todos)); }
            if (data.marks !== undefined) { appState.marks = data.marks; localStorage.setItem('marks', JSON.stringify(data.marks)); }
            if (data.sessions !== undefined) { appState.sessions = data.sessions; localStorage.setItem('sessions', JSON.stringify(data.sessions)); }
            if (data.events !== undefined) { appState.events = data.events; localStorage.setItem('events', JSON.stringify(data.events)); }
            if (data.stickyNotes !== undefined) { appState.stickyNotes = data.stickyNotes; localStorage.setItem('stickyNotes', JSON.stringify(data.stickyNotes)); }
            if (data.timetable !== undefined) { appState.timetable = data.timetable; localStorage.setItem('timetable', JSON.stringify(data.timetable)); } // TIMETABLE
            if (data.streak !== undefined) { appState.streak = data.streak; localStorage.setItem('streak', JSON.stringify(data.streak)); }

            document.body.classList.toggle('dark-theme', appState.theme === 'dark');
            themeToggle.checked = appState.theme === 'dark';

            renderAllSections();
            renderStreak();
        } else {
            syncToCloud();
        }
    }).catch((err) => console.log('Cloud load failed:', err));
}

if (firebaseReady) {
    firebase.auth().onAuthStateChanged((user) => {
        if (googleAccountStatus) {
            googleAccountStatus.textContent = user ? `Signed in as ${user.email}` : 'Not signed in';
        }
        if (user) {
            loadFromCloud(user.uid);
        }
    });
}

// ==================== PAGE TITLE ====================
function updatePageTitle() {
    const today = new Date();
    const options = { weekday: 'long', month: 'numeric', day: 'numeric' };
    pageTitle.textContent = today.toLocaleDateString('en-US', options);
}

setInterval(updatePageTitle, 60000);

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
    appState.currentTab = tabName;
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    navButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
}

navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ==================== SETTINGS ====================
settingsBtn.addEventListener('click', () => {
    studentNameInput.value = appState.studentName;
    settingsModal.classList.add('active');
});

document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
    });
});

document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
    });
});

saveSettingsBtn.addEventListener('click', () => {
    appState.studentName = studentNameInput.value || 'Student';
    localStorage.setItem('studentName', appState.studentName);
    syncToCloud();
    settingsModal.classList.remove('active');
});

// ==================== TODAY TAB ====================
function renderTodayTab() {
    if (appState.marks.length > 0) {
        const bySubject = {};
        appState.marks.forEach(m => {
            if (!bySubject[m.subject]) bySubject[m.subject] = [];
            bySubject[m.subject].push(m.percentage || m.score);
        });
        
        let lowestAvg = 100;
        let lowestSubject = '';
        Object.entries(bySubject).forEach(([subject, scores]) => {
            const avg = scores.reduce((a, b) => a + b) / scores.length;
            if (avg < lowestAvg) {
                lowestAvg = avg;
                lowestSubject = subject;
            }
        });
        
        if (lowestSubject) {
            document.getElementById('focusAreaText').textContent = 
                `${lowestSubject} is your weakest subject at ${Math.round(lowestAvg)}%`;
        }
    }
    
    const todayTasks = appState.todos.filter(t => !t.completed);
    const todayTasksList = document.getElementById('todayTasksList');
    todayTasksList.innerHTML = '';
    
    if (todayTasks.length === 0) {
        todayTasksList.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No tasks today!</p>';
    } else {
        todayTasks.slice(0, 5).forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';
            card.innerHTML = `
                <input type="checkbox" class="task-checkbox">
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    <div class="task-urgency-badge ${task.urgency}">${task.urgency}</div>
                </div>
            `;
            todayTasksList.appendChild(card);
        });
    }
    
    const todayStr = ymd(realToday.getFullYear(), realToday.getMonth(), realToday.getDate());
    const eventsList = document.getElementById('todayEventsList');
    eventsList.innerHTML = '';
    const todayEvents = appState.events.filter(e => e.date === todayStr);

    if (todayEvents.length === 0) {
        eventsList.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No events today.</p>';
    } else {
        todayEvents.forEach(ev => {
            const card = document.createElement('div');
            card.className = 'card';
            card.style.marginBottom = '8px';
            card.innerHTML = `
                <div style="font-weight: 600; color: var(--text-primary);">${ev.name}</div>
                <div style="font-size: 12px; color: var(--text-tertiary);">${ev.type}${ev.time ? ' • ' + ev.time : ''}</div>
            `;
            eventsList.appendChild(card);
        });
    }
}

// ==================== CALENDAR ====================
const realToday = new Date();
let calendarViewDate = new Date(realToday.getFullYear(), realToday.getMonth(), 1);

function pad2(n) { return String(n).padStart(2, '0'); }
function ymd(y, m, d) { return `${y}-${pad2(m + 1)}-${pad2(d)}`; }

function renderCalendar() {
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();

    const monthYear = document.getElementById('monthYear');
    monthYear.textContent = `${calendarViewDate.toLocaleString('default', { month: 'long' })} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';

    function makeCell(dateStr, label, extraClass) {
        const cell = document.createElement('div');
        cell.className = `calendar-cell${extraClass ? ' ' + extraClass : ''}`;
        cell.dataset.date = dateStr;

        const numSpan = document.createElement('span');
        numSpan.textContent = label;
        cell.appendChild(numSpan);

        if (appState.events.some(e => e.date === dateStr)) {
            const dot = document.createElement('span');
            dot.className = 'event-dot';
            cell.appendChild(dot);
        }

        cell.addEventListener('click', () => openAddEventModal(dateStr));
        calendarGrid.appendChild(cell);
    }

    const prevMonthIndex = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    for (let i = firstDay - 1; i >= 0; i--) {
        const d = daysInPrevMonth - i;
        makeCell(ymd(prevMonthYear, prevMonthIndex, d), d, 'other-month');
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear();
        makeCell(ymd(year, month, day), day, isToday ? 'today' : '');
    }

    const nextMonthIndex = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        makeCell(ymd(nextMonthYear, nextMonthIndex, day), day, 'other-month');
    }
}

document.getElementById('prevMonth').addEventListener('click', () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
    renderCalendar();
});
document.getElementById('nextMonth').addEventListener('click', () => {
    calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
    renderCalendar();
});

// ---- Add Event modal ----
const addEventModal = document.getElementById('addEventModal');
const addEventTitle = document.getElementById('addEventTitle');
const eventWarning = document.getElementById('eventWarning');
const existingEventsList = document.getElementById('existingEventsList');
const eventNameInput = document.getElementById('eventNameInput');
const eventTimeInput = document.getElementById('eventTimeInput');
const eventTypeSelect = document.getElementById('eventTypeSelect');
const eventNotesInput = document.getElementById('eventNotesInput');
const saveEventBtn = document.getElementById('saveEventBtn');

let currentEventDate = null;

function formatEventModalDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
    const day = d.getDate();
    const month = d.toLocaleDateString('en-US', { month: 'long' });
    return `${weekday}, ${day} ${month}`;
}

function renderExistingEventsForDate(dateStr) {
    const existing = appState.events.filter(e => e.date === dateStr);
    existingEventsList.innerHTML = '';

    if (existing.length === 0) {
        eventWarning.style.display = 'none';
        return;
    }

    eventWarning.style.display = 'block';
    existing.forEach((ev) => {
        const row = document.createElement('div');
        row.className = 'existing-event-item';
        row.innerHTML = `
            <div>
                <div class="existing-event-name">${ev.name}</div>
                <div class="existing-event-meta">${ev.type}${ev.time ? ' • ' + ev.time : ''}</div>
            </div>
            <button class="existing-event-delete">✕</button>
        `;
        row.querySelector('.existing-event-delete').addEventListener('click', () => {
            appState.events.splice(appState.events.indexOf(ev), 1);
            localStorage.setItem('events', JSON.stringify(appState.events));
            syncToCloud();
            renderExistingEventsForDate(dateStr);
            renderCalendar();
            renderTodayTab();
        });
        existingEventsList.appendChild(row);
    });
}

function openAddEventModal(dateStr) {
    currentEventDate = dateStr;
    addEventTitle.textContent = `Add Event — ${formatEventModalDate(dateStr)}`;
    eventNameInput.value = '';
    eventTimeInput.value = '';
    eventTypeSelect.value = 'Academic';
    eventNotesInput.value = '';
    renderExistingEventsForDate(dateStr);
    addEventModal.classList.add('active');
}

saveEventBtn.addEventListener('click', () => {
    const name = eventNameInput.value.trim();
    if (!name || !currentEventDate) return;

    appState.events.push({
        id: Date.now(),
        date: currentEventDate,
        name,
        time: eventTimeInput.value || '',
        type: eventTypeSelect.value,
        notes: eventNotesInput.value.trim()
    });
    localStorage.setItem('events', JSON.stringify(appState.events));
    syncToCloud();
    addEventModal.classList.remove('active');
    renderCalendar();
    renderTodayTab();
});

// ==================== STREAK ====================
appState.streak = JSON.parse(localStorage.getItem('streak')) || { count: 0, lastCheckDate: null };

function dateToStr(d) {
    return d.toISOString().split('T')[0];
}

function checkStreak() {
    const today = dateToStr(new Date());

    if (appState.streak.lastCheckDate === today) {
        renderStreak();
        return;
    }

    if (appState.streak.lastCheckDate) {
        const yesterday = dateToStr(new Date(Date.now() - 86400000));

        if (appState.streak.lastCheckDate === yesterday) {
            const dueYesterday = appState.todos.filter(t => t.deadline === yesterday);
            if (dueYesterday.length > 0) {
                const allDone = dueYesterday.every(t => t.completed);
                appState.streak.count = allDone ? appState.streak.count + 1 : 0;
            }
        } else {
            appState.streak.count = 0;
        }
    }

    appState.streak.lastCheckDate = today;
    localStorage.setItem('streak', JSON.stringify(appState.streak));
    syncToCloud();
    renderStreak();
}

function renderStreak() {
    const el = document.getElementById('streakBadge');
    if (!el) return;
    const n = appState.streak.count;
    el.textContent = `🔥 ${n} day${n === 1 ? '' : 's'} streak`;
}

// ==================== TO-DO ====================
const addTaskBtn = document.getElementById('addTaskBtn');
const addTaskModal = document.getElementById('addTaskModal');
const saveTaskBtn = document.getElementById('saveTaskBtn');
const taskTitleInput = document.getElementById('taskTitleInput');
const taskDeadlineInput = document.getElementById('taskDeadlineInput');
const taskPrioritySelect = document.getElementById('taskPrioritySelect');

addTaskBtn.addEventListener('click', () => {
    taskTitleInput.value = '';
    taskDeadlineInput.value = '';
    taskPrioritySelect.value = 'normal';
    addTaskModal.classList.add('active');
});

saveTaskBtn.addEventListener('click', () => {
    const title = taskTitleInput.value.trim();
    if (title) {
        appState.todos.push({
            title,
            urgency: taskPrioritySelect.value,
            deadline: taskDeadlineInput.value || null,
            completed: false
        });
        localStorage.setItem('todos', JSON.stringify(appState.todos));
        syncToCloud();
        addTaskModal.classList.remove('active');
        renderTodoList();
        renderTodayTab();
    }
});

function formatDeadline(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isOverdue(todo) {
    if (!todo.deadline || todo.completed) return false;
    return todo.deadline < dateToStr(new Date());
}

function renderTodoList() {
    const todoList = document.getElementById('todoList');
    const filter = document.querySelector('.filter-pill.active')?.dataset.filter || 'all';
    
    todoList.innerHTML = '';
    
    const filtered = appState.todos.filter(todo => {
        if (filter === 'all') return true;
        return todo.urgency === filter;
    });
    
    if (filtered.length === 0) {
        todoList.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No tasks</p>';
        return;
    }
    
    filtered.forEach((todo, index) => {
        const item = document.createElement('div');
        item.className = 'todo-item';
        item.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''}>
            <div class="todo-info">
                <div class="todo-title" style="${todo.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${todo.title}</div>
                <div class="todo-details">
                    <span class="task-urgency-badge ${todo.urgency}">${todo.urgency}</span>
                    ${todo.deadline ? `<span class="todo-deadline${isOverdue(todo) ? ' overdue' : ''}">📅 ${formatDeadline(todo.deadline)}</span>` : ''}
                </div>
            </div>
            <button class="todo-delete">🗑️</button>
        `;
        
        const checkbox = item.querySelector('.todo-checkbox');
        checkbox.addEventListener('change', () => {
            todo.completed = checkbox.checked;
            localStorage.setItem('todos', JSON.stringify(appState.todos));
            syncToCloud();
            renderTodoList();
            renderTodayTab();
        });
        
        const deleteBtn = item.querySelector('.todo-delete');
        deleteBtn.addEventListener('click', () => {
            appState.todos.splice(appState.todos.indexOf(todo), 1);
            localStorage.setItem('todos', JSON.stringify(appState.todos));
            syncToCloud();
            renderTodoList();
            renderTodayTab();
        });
        
        todoList.appendChild(item);
    });
}

document.querySelectorAll('.filter-pill').forEach(pill => {
    pill.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        e.target.classList.add('active');
        renderTodoList();
    });
});

// ---- Sticky Notes ----
const stickyNotesBtn = document.getElementById('stickyNotesBtn');
const stickyNotesModal = document.getElementById('stickyNotesModal');
const addStickyNoteBtn = document.getElementById('addStickyNoteBtn');
const toggleStickyDeleteMode = document.getElementById('toggleStickyDeleteMode');
const deleteSelectedStickyBtn = document.getElementById('deleteSelectedStickyBtn');
const stickyNotesGrid = document.getElementById('stickyNotesGrid');
const stickyDeletePanel = document.getElementById('stickyDeletePanel');
const NOTE_COLORS = ['#FFF3B0', '#FFD6E8', '#D6E8FF', '#D6FFE0', '#FFE0C2', '#E8D6FF'];

let stickyDeleteMode = false;
let selectedStickyNotes = new Set();

stickyNotesBtn.addEventListener('click', () => {
    stickyDeleteMode = false;
    selectedStickyNotes.clear();
    renderStickyNotes();
    stickyNotesModal.classList.add('active');
});

addStickyNoteBtn.addEventListener('click', () => {
    appState.stickyNotes.push({ 
        id: Date.now(), 
        text: '', 
        color: NOTE_COLORS[appState.stickyNotes.length % NOTE_COLORS.length] 
    });
    localStorage.setItem('stickyNotes', JSON.stringify(appState.stickyNotes));
    syncToCloud();
    renderStickyNotes();
});

toggleStickyDeleteMode.addEventListener('click', () => {
    stickyDeleteMode = !stickyDeleteMode;
    selectedStickyNotes.clear();
    stickyDeletePanel.style.display = stickyDeleteMode ? 'block' : 'none';
    renderStickyNotes();
    toggleStickyDeleteMode.style.opacity = stickyDeleteMode ? '1' : '0.6';
});

deleteSelectedStickyBtn.addEventListener('click', () => {
    appState.stickyNotes = appState.stickyNotes.filter(note => !selectedStickyNotes.has(note.id));
    localStorage.setItem('stickyNotes', JSON.stringify(appState.stickyNotes));
    syncToCloud();
    selectedStickyNotes.clear();
    stickyDeleteMode = false;
    stickyDeletePanel.style.display = 'none';
    toggleStickyDeleteMode.style.opacity = '0.6';
    renderStickyNotes();
});

function renderStickyNotes() {
    stickyNotesGrid.innerHTML = '';

    if (appState.stickyNotes.length === 0) {
        stickyNotesGrid.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 16px; grid-column: 1 / -1;">No sticky notes yet</p>';
        return;
    }

    appState.stickyNotes.forEach((note, idx) => {
        const div = document.createElement('div');
        div.className = 'sticky-note' + (stickyDeleteMode ? ' delete-mode' : '');
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'sticky-note-checkbox';
        checkbox.checked = selectedStickyNotes.has(note.id);
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedStickyNotes.add(note.id);
            } else {
                selectedStickyNotes.delete(note.id);
            }
        });
        
        const textarea = document.createElement('textarea');
        textarea.placeholder = 'Type here...';
        textarea.value = note.text || '';
        
        let saveTimeout;
        textarea.addEventListener('input', () => {
            if (!stickyDeleteMode) {
                note.text = textarea.value;
                clearTimeout(saveTimeout);
                saveTimeout = setTimeout(() => {
                    localStorage.setItem('stickyNotes', JSON.stringify(appState.stickyNotes));
                    syncToCloud();
                }, 500);
            }
        });
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'sticky-note-delete';
        deleteBtn.textContent = '🗑️';
        deleteBtn.style.display = stickyDeleteMode ? 'none' : 'flex';
        deleteBtn.addEventListener('click', () => {
            appState.stickyNotes.splice(appState.stickyNotes.indexOf(note), 1);
            localStorage.setItem('stickyNotes', JSON.stringify(appState.stickyNotes));
            syncToCloud();
            renderStickyNotes();
        });
        
        div.appendChild(checkbox);
        div.appendChild(textarea);
        div.appendChild(deleteBtn);
        stickyNotesGrid.appendChild(div);
    });
}

// ==================== TIMER ====================
let timerInterval;
const timerDisplay = document.getElementById('timerDisplay');
const minutesInput = document.getElementById('minutesInput');
const secondsInput = document.getElementById('secondsInput');
const subjectSelect = document.getElementById('subjectSelect');
const customSubjectInput = document.getElementById('customSubjectInput');
const timerToggleBtn = document.getElementById('timerToggleBtn');
const resetBtn = document.getElementById('resetBtn');

subjectSelect.addEventListener('change', () => {
    if (subjectSelect.value === 'Other') {
        customSubjectInput.style.display = 'block';
    } else {
        customSubjectInput.style.display = 'none';
    }
});

timerToggleBtn.addEventListener('click', toggleTimer);
resetBtn.addEventListener('click', resetTimer);

function toggleTimer() {
    if (appState.timer.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
}

function startTimer() {
    if (appState.timer.timeLeft === 0) {
        const m = parseInt(minutesInput.value) || 0;
        const s = parseInt(secondsInput.value) || 0;
        appState.timer.totalTime = m * 60 + s;
        appState.timer.timeLeft = appState.timer.totalTime;
        
        if (subjectSelect.value === 'Other') {
            appState.timer.subject = customSubjectInput.value || 'Study';
            if (customSubjectInput.value) {
                addCustomSubject(customSubjectInput.value);
            }
        } else {
            appState.timer.subject = subjectSelect.value || 'Study';
        }
    }
    
    if (appState.timer.timeLeft <= 0) return;
    
    appState.timer.isRunning = true;
    appState.timer.endTime = Date.now() + appState.timer.timeLeft * 1000;
    timerToggleBtn.textContent = 'Pause';
    minutesInput.disabled = true;
    secondsInput.disabled = true;
    subjectSelect.disabled = true;
    customSubjectInput.disabled = true;
    
    timerInterval = setInterval(tickTimer, 1000);
}

function tickTimer() {
    const remaining = Math.max(0, Math.round((appState.timer.endTime - Date.now()) / 1000));
    appState.timer.timeLeft = remaining;
    updateTimerDisplay();

    if (remaining <= 0) {
        clearInterval(timerInterval);
        appState.timer.isRunning = false;
        appState.timer.endTime = null;
        timerToggleBtn.textContent = 'Start';
        minutesInput.disabled = false;
        secondsInput.disabled = false;
        subjectSelect.disabled = false;
        customSubjectInput.disabled = false;

        appState.sessions.push({
            subject: appState.timer.subject,
            duration: appState.timer.totalTime / 60,
            date: new Date().toISOString()
        });
        localStorage.setItem('sessions', JSON.stringify(appState.sessions));
        syncToCloud();
        renderRecentSessions();

        playAlarmSound();
        showTimerNotification(`✅ Study Complete!\n${appState.timer.subject} - ${Math.round(appState.timer.totalTime / 60)} minutes`);
    }
}

function playAlarmSound() {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
        
        setTimeout(() => {
            const osc2 = audioContext.createOscillator();
            const gain2 = audioContext.createGain();
            osc2.connect(gain2);
            gain2.connect(audioContext.destination);
            osc2.frequency.value = 900;
            gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            osc2.start(audioContext.currentTime);
            osc2.stop(audioContext.currentTime + 0.3);
        }, 400);
    } catch (e) {
        console.log('Audio not available');
    }
}

function showTimerNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, var(--accent), #7c7cff);
        color: white;
        padding: 40px 50px;
        border-radius: 16px;
        font-size: 20px;
        font-weight: 700;
        z-index: 10000;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        text-align: center;
        animation: scaleInNotif 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        white-space: pre-line;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    if (!document.querySelector('style[data-timer-notif]')) {
        const style = document.createElement('style');
        style.setAttribute('data-timer-notif', 'true');
        style.textContent = `
            @keyframes scaleInNotif {
                from {
                    transform: translate(-50%, -50%) scale(0.5);
                    opacity: 0;
                }
                to {
                    transform: translate(-50%, -50%) scale(1);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden && appState.timer.isRunning) {
        tickTimer();
    }
});

function pauseTimer() {
    appState.timer.isRunning = false;
    clearInterval(timerInterval);
    if (appState.timer.endTime) {
        appState.timer.timeLeft = Math.max(0, Math.round((appState.timer.endTime - Date.now()) / 1000));
    }
    appState.timer.endTime = null;
    timerToggleBtn.textContent = 'Start';
}

function resetTimer() {
    clearInterval(timerInterval);
    appState.timer.isRunning = false;
    appState.timer.timeLeft = 0;
    appState.timer.totalTime = 0;
    appState.timer.endTime = null;
    timerToggleBtn.textContent = 'Start';
    minutesInput.disabled = false;
    secondsInput.disabled = false;
    minutesInput.value = '';
    secondsInput.value = '';
    updateTimerDisplay();
}

function updateTimerDisplay() {
    const m = Math.floor(appState.timer.timeLeft / 60);
    const s = appState.timer.timeLeft % 60;
    timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function renderRecentSessions() {
    const list = document.getElementById('recentSessionsList');
    list.innerHTML = '';
    
    if (appState.sessions.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No sessions yet</p>';
        return;
    }
    
    const byDate = {};
    appState.sessions.forEach((session, idx) => {
        const dateStr = new Date(session.date).toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
        
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push({ ...session, originalIndex: idx });
    });
    
    const sortedDates = Object.keys(byDate).sort((a, b) => {
        return new Date(b) - new Date(a);
    });
    
    sortedDates.forEach(dateStr => {
        const dateHeader = document.createElement('div');
        dateHeader.className = 'session-date-header';
        dateHeader.textContent = dateStr;
        list.appendChild(dateHeader);
        
        const subjectTotals = {};
        byDate[dateStr].forEach(session => {
            if (!subjectTotals[session.subject]) {
                subjectTotals[session.subject] = { duration: 0, sessions: [] };
            }
            subjectTotals[session.subject].duration += session.duration;
            subjectTotals[session.subject].sessions.push(session);
        });
        
        Object.entries(subjectTotals).forEach(([subject, data]) => {
            const item = document.createElement('div');
            item.className = 'session-item';
            const roundedDuration = Math.round(data.duration);
            
            item.innerHTML = `
                <div class="session-subject-row">
                    <span class="session-subject">${subject}</span>
                    <span class="session-duration">${roundedDuration} mins</span>
                </div>
                <div class="session-actions">
                    ${data.sessions.map((s, i) => `
                        <button class="session-delete-btn" data-index="${s.originalIndex}" title="Delete">🗑️</button>
                    `).join('')}
                </div>
            `;
            
            list.appendChild(item);
            
            item.querySelectorAll('.session-delete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.dataset.index);
                    appState.sessions.splice(idx, 1);
                    localStorage.setItem('sessions', JSON.stringify(appState.sessions));
                    syncToCloud();
                    renderRecentSessions();
                });
            });
        });
    });
}

// ==================== MARKS ====================
const addMarksBtn = document.getElementById('addMarksBtn');
const addMarksModal = document.getElementById('addMarksModal');
const saveMarksBtn = document.getElementById('saveMarksBtn');
const marksSubjectSelect = document.getElementById('marksSubjectSelect');
const customMarksSubjectInput = document.getElementById('customMarksSubjectInput');
const marksTitleInput = document.getElementById('marksTitleInput');
const marksScoreInput = document.getElementById('marksScoreInput');
const marksMaxInput = document.getElementById('marksMaxInput');
const percentageDisplay = document.getElementById('percentageDisplay');

marksSubjectSelect.addEventListener('change', () => {
    if (marksSubjectSelect.value === 'Other') {
        customMarksSubjectInput.style.display = 'block';
    } else {
        customMarksSubjectInput.style.display = 'none';
    }
});

if (marksScoreInput) {
    marksScoreInput.addEventListener('input', calculatePercentage);
}
if (marksMaxInput) {
    marksMaxInput.addEventListener('input', calculatePercentage);
}

function calculatePercentage() {
    const score = parseInt(marksScoreInput.value) || 0;
    const max = parseInt(marksMaxInput.value) || 100;
    const percentage = max > 0 ? Math.round((score / max) * 100) : 0;
    percentageDisplay.textContent = `${percentage}%`;
}

addMarksBtn.addEventListener('click', () => {
    marksSubjectSelect.value = '';
    marksTitleInput.value = '';
    marksScoreInput.value = '';
    marksMaxInput.value = '100';
    percentageDisplay.textContent = '0%';
    addMarksModal.classList.add('active');
});

saveMarksBtn.addEventListener('click', () => {
    let subject = marksSubjectSelect.value;
    
    if (subject === 'Other') {
        subject = customMarksSubjectInput.value || 'Other';
        if (customMarksSubjectInput.value) {
            addCustomSubject(customMarksSubjectInput.value);
        }
    }
    
    const title = marksTitleInput.value.trim();
    const score = parseInt(marksScoreInput.value);
    const maxScore = parseInt(marksMaxInput.value) || 100;
    
    if (subject && score >= 0) {
        const percentage = Math.round((score / maxScore) * 100);
        appState.marks.push({
            subject,
            title,
            score,
            maxScore,
            percentage,
            date: new Date().toISOString()
        });
        localStorage.setItem('marks', JSON.stringify(appState.marks));
        syncToCloud();
        addMarksModal.classList.remove('active');
        renderMarksList();
        renderTodayTab();
    }
});

function renderOverallPercentage() {
    const card = document.getElementById('overallPercentageCard');
    if (appState.marks.length === 0) {
        card.innerHTML = '';
        return;
    }
    const totalScore = appState.marks.reduce((sum, m) => sum + (m.score || 0), 0);
    const totalMax = appState.marks.reduce((sum, m) => sum + (m.maxScore || 100), 0);
    const overall = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    card.innerHTML = `
        <div class="overall-percentage-label">Overall Percentage (all subjects)</div>
        <div class="overall-percentage-value">${overall}%</div>
    `;
}

function renderMarksList() {
    const perfBars = document.getElementById('performanceBars');
    const history = document.getElementById('marksHistory');
    
    perfBars.innerHTML = '';
    history.innerHTML = '';

    renderOverallPercentage();
    
    if (appState.marks.length === 0) {
        perfBars.innerHTML = '<p style="color: var(--text-tertiary);">No scores yet</p>';
        history.innerHTML = '<p style="color: var(--text-tertiary);">No score history</p>';
        return;
    }
    
    const bySubject = {};
    appState.marks.forEach(m => {
        if (!bySubject[m.subject]) bySubject[m.subject] = [];
        bySubject[m.subject].push(m.percentage || m.score);
    });
    
    Object.entries(bySubject).forEach(([subject, scores]) => {
        const avg = scores.reduce((a, b) => a + b) / scores.length;
        const bar = document.createElement('div');
        bar.className = 'performance-bar';
        bar.innerHTML = `
            <div class="bar-subject">${subject}</div>
            <div class="bar-container">
                <div class="bar-fill" style="width: ${avg}%"></div>
            </div>
            <div class="bar-percentage">${Math.round(avg)}%</div>
        `;
        perfBars.appendChild(bar);
    });
    
    appState.marks.slice().reverse().forEach((mark, index) => {
        const entry = document.createElement('div');
        entry.className = 'mark-entry';
        const scoreDisplay = mark.maxScore ? `${mark.score}/${mark.maxScore}` : mark.score;
        const percentDisplay = mark.percentage || mark.score;
        entry.innerHTML = `
            <div class="mark-details">
                <div class="mark-subject">${mark.subject}${mark.title ? ' • ' + mark.title : ''}</div>
                <div class="mark-date">${new Date(mark.date).toLocaleDateString()}</div>
            </div>
            <div style="display: flex; gap: 12px; align-items: center;">
                <div style="text-align: right;">
                    <div style="font-weight: 600; color: var(--text-primary);">${scoreDisplay}</div>
                    <div style="font-size: 12px; color: var(--text-tertiary);">${percentDisplay}%</div>
                </div>
                <button class="mark-delete">🗑️</button>
            </div>
        `;
        
        const deleteBtn = entry.querySelector('.mark-delete');
        deleteBtn.addEventListener('click', () => {
            appState.marks.splice(appState.marks.length - 1 - index, 1);
            localStorage.setItem('marks', JSON.stringify(appState.marks));
            syncToCloud();
            renderMarksList();
            renderTodayTab();
        });
        
        history.appendChild(entry);
    });
}

// ==================== TIMETABLE (NEW FEATURE) ====================
const editTimetableBtn = document.getElementById('editTimetableBtn');
const editTimetableModal = document.getElementById('editTimetableModal');
const periodsInput = document.getElementById('periodsInput');
const daysInput = document.getElementById('daysInput');
const periodNamesContainer = document.getElementById('periodNamesContainer');
const dayNamesContainer = document.getElementById('dayNamesContainer');
const saveTimetableBtn = document.getElementById('saveTimetableBtn');
const timetableGrid = document.getElementById('timetableGrid');

editTimetableBtn.addEventListener('click', () => {
    periodsInput.value = appState.timetable.numPeriods;
    daysInput.value = appState.timetable.numDays;
    renderPeriodNameInputs();
    renderDayNameInputs();
    editTimetableModal.classList.add('active');
});

function renderPeriodNameInputs() {
    periodNamesContainer.innerHTML = '';
    const numPeriods = parseInt(periodsInput.value) || 5;
    
    for (let i = 0; i < numPeriods; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'setting-input';
        input.placeholder = `Period ${i + 1}`;
        input.value = appState.timetable.periodNames[i] || `Period ${i + 1}`;
        input.style.marginBottom = '8px';
        periodNamesContainer.appendChild(input);
    }
}

function renderDayNameInputs() {
    dayNamesContainer.innerHTML = '';
    const numDays = parseInt(daysInput.value) || 6;
    const defaultDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    for (let i = 0; i < numDays; i++) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'setting-input';
        input.placeholder = defaultDays[i] || `Day ${i + 1}`;
        input.value = appState.timetable.dayNames[i] || defaultDays[i];
        input.style.marginBottom = '8px';
        dayNamesContainer.appendChild(input);
    }
}

periodsInput.addEventListener('change', renderPeriodNameInputs);
daysInput.addEventListener('change', renderDayNameInputs);

saveTimetableBtn.addEventListener('click', () => {
    const numPeriods = parseInt(periodsInput.value) || 5;
    const numDays = parseInt(daysInput.value) || 6;
    
    const periodNames = [];
    Array.from(periodNamesContainer.querySelectorAll('input')).forEach((input, i) => {
        periodNames[i] = input.value.trim() || `Period ${i + 1}`;
    });
    
    const dayNames = [];
    Array.from(dayNamesContainer.querySelectorAll('input')).forEach((input, i) => {
        dayNames[i] = input.value.trim() || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i];
    });
    
    appState.timetable = {
        numPeriods,
        numDays,
        periodNames,
        dayNames,
        grid: appState.timetable.grid // Keep existing grid data
    };
    
    localStorage.setItem('timetable', JSON.stringify(appState.timetable));
    syncToCloud();
    editTimetableModal.classList.remove('active');
    renderTimetable();
});

function renderTimetable() {
    timetableGrid.innerHTML = '';
    const { numPeriods, numDays, periodNames, dayNames, grid } = appState.timetable;
    
    // Create table structure
    const table = document.createElement('div');
    table.className = 'timetable-table';
    
    // Header row (day names)
    const headerRow = document.createElement('div');
    headerRow.className = 'timetable-row header-row';
    const cornerCell = document.createElement('div');
    cornerCell.className = 'timetable-cell header-cell';
    cornerCell.textContent = 'Period';
    headerRow.appendChild(cornerCell);
    
    for (let d = 0; d < numDays; d++) {
        const cell = document.createElement('div');
        cell.className = 'timetable-cell header-cell';
        cell.textContent = dayNames[d] || `Day ${d + 1}`;
        headerRow.appendChild(cell);
    }
    table.appendChild(headerRow);
    
    // Data rows (periods)
    for (let p = 0; p < numPeriods; p++) {
        const row = document.createElement('div');
        row.className = 'timetable-row';
        
        const periodLabel = document.createElement('div');
        periodLabel.className = 'timetable-cell period-label';
        periodLabel.textContent = periodNames[p] || `Period ${p + 1}`;
        row.appendChild(periodLabel);
        
        for (let d = 0; d < numDays; d++) {
            const cell = document.createElement('div');
            cell.className = 'timetable-cell subject-cell';
            const key = `${p}-${d}`;
            const subject = grid[key] || '';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'timetable-input';
            input.placeholder = 'Subject';
            input.value = subject;
            
            input.addEventListener('change', () => {
                grid[key] = input.value.trim();
                localStorage.setItem('timetable', JSON.stringify(appState.timetable));
                syncToCloud();
            });
            
            cell.appendChild(input);
            row.appendChild(cell);
        }
        table.appendChild(row);
    }
    
    timetableGrid.appendChild(table);
}

// ==================== MORE MENU ====================
document.getElementById('marksMenuItem').addEventListener('click', () => switchTab('marks'));
document.getElementById('settingsMenuItem').addEventListener('click', () => settingsBtn.click());

// ==================== RENDER ALL ====================
function renderAllSections() {
    renderCalendar();
    renderTodoList();
    renderMarksList();
    renderRecentSessions();
    renderTimetable();
    renderTodayTab();
}

// START APP
init();
