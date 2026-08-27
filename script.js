// APP STATE
let appState = {
    studentName: localStorage.getItem('studentName') || 'Student',
    theme: localStorage.getItem('theme') || 'light',
    todos: JSON.parse(localStorage.getItem('todos')) || [],
    marks: JSON.parse(localStorage.getItem('marks')) || [],
    sessions: JSON.parse(localStorage.getItem('sessions')) || [],
    flashcards: JSON.parse(localStorage.getItem('flashcards')) || [],
    currentTab: 'today',
    timer: {
        isRunning: false,
        timeLeft: 0,
        totalTime: 0,
        subject: ''
    }
};

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
    applyRandomBackdrop();
    updatePageTitle();
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
    applyRandomBackdrop();
});

// ==================== BACKDROPS ====================
// Add your image paths/URLs here — one list for light mode, one for dark
// mode. Every time the app is opened, one image from the matching list
// is picked at random and set as the background (like unlocking a phone).
// Example: 'backdrops/light1.jpg' (put images in a "backdrops" folder next
// to index.html, or use full image URLs).
const LIGHT_BACKDROPS = [
    // 'backdrops/light1.jpg',
    // 'backdrops/light2.jpg',
];

const DARK_BACKDROPS = [
    // 'backdrops/dark1.jpg',
    // 'backdrops/dark2.jpg',
];

function applyRandomBackdrop() {
    const pool = appState.theme === 'dark' ? DARK_BACKDROPS : LIGHT_BACKDROPS;

    if (!pool || pool.length === 0) {
        document.body.classList.remove('has-backdrop');
        document.body.style.backgroundImage = '';
        return;
    }

    const pick = pool[Math.floor(Math.random() * pool.length)];
    document.body.style.backgroundImage = `url('${pick}')`;
    document.body.classList.add('has-backdrop');
}

// ==================== GOOGLE SIGN-IN ====================
// Needs firebase-config.js filled in with your Firebase project keys
// (Firebase Console -> Authentication -> enable "Google" sign-in method).
// Until that's done, the button just explains what's missing instead of
// breaking anything else in the app.
let firebaseReady = false;
try {
    if (typeof firebase !== 'undefined' && typeof firebaseConfig !== 'undefined' && firebaseConfig.apiKey) {
        firebase.initializeApp(firebaseConfig);
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
        firebase.auth().signInWithPopup(provider).then((result) => {
            if (googleAccountStatus) {
                googleAccountStatus.textContent = `Signed in as ${result.user.email}`;
            }
        }).catch((err) => {
            alert('Sign-in failed: ' + err.message);
        });
    });
}

if (firebaseReady) {
    firebase.auth().onAuthStateChanged((user) => {
        if (googleAccountStatus) {
            googleAccountStatus.textContent = user ? `Signed in as ${user.email}` : 'Not signed in';
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
    settingsModal.classList.remove('active');
});

// ==================== TODAY TAB ====================
function renderTodayTab() {
    // Focus Area - find weakest subject
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
    
    // Today's Tasks
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
    
    // Today's Events
    const eventsList = document.getElementById('todayEventsList');
    eventsList.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No events today.</p>';
}

// ==================== CALENDAR ====================
const realToday = new Date();
let calendarViewDate = new Date(realToday.getFullYear(), realToday.getMonth(), 1);

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

    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.textContent = daysInPrevMonth - i;
        calendarGrid.appendChild(cell);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell';
        cell.textContent = day;
        if (day === realToday.getDate() && month === realToday.getMonth() && year === realToday.getFullYear()) {
            cell.classList.add('today');
        }
        calendarGrid.appendChild(cell);
    }

    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const cell = document.createElement('div');
        cell.className = 'calendar-cell other-month';
        cell.textContent = day;
        calendarGrid.appendChild(cell);
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

// ==================== STREAK ====================
// Streak increases by 1 each day if ALL tasks that had a deadline of
// "yesterday" were completed. If no tasks were due, the streak is left
// unchanged. Missing a full day (app not opened) or leaving a due task
// incomplete resets it to 0.
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
            // no tasks were due yesterday -> streak stays as-is
        } else {
            // app wasn't opened the day right after -> streak broken
            appState.streak.count = 0;
        }
    }

    appState.streak.lastCheckDate = today;
    localStorage.setItem('streak', JSON.stringify(appState.streak));
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
            renderTodoList();
            renderTodayTab();
        });
        
        const deleteBtn = item.querySelector('.todo-delete');
        deleteBtn.addEventListener('click', () => {
            appState.todos.splice(appState.todos.indexOf(todo), 1);
            localStorage.setItem('todos', JSON.stringify(appState.todos));
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

// ==================== TIMER ====================
let timerInterval;
const timerDisplay = document.getElementById('timerDisplay');
const minutesInput = document.getElementById('minutesInput');
const secondsInput = document.getElementById('secondsInput');
const subjectSelect = document.getElementById('subjectSelect');
const timerToggleBtn = document.getElementById('timerToggleBtn');
const resetBtn = document.getElementById('resetBtn');

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
        appState.timer.subject = subjectSelect.value || 'Study';
    }
    
    if (appState.timer.timeLeft <= 0) return;
    
    appState.timer.isRunning = true;
    timerToggleBtn.textContent = 'Pause';
    minutesInput.disabled = true;
    secondsInput.disabled = true;
    
    timerInterval = setInterval(() => {
        appState.timer.timeLeft--;
        updateTimerDisplay();
        
        if (appState.timer.timeLeft <= 0) {
            clearInterval(timerInterval);
            appState.timer.isRunning = false;
            timerToggleBtn.textContent = 'Start';
            minutesInput.disabled = false;
            secondsInput.disabled = false;
            
            appState.sessions.push({
                subject: appState.timer.subject,
                duration: appState.timer.totalTime / 60,
                date: new Date().toISOString()
            });
            localStorage.setItem('sessions', JSON.stringify(appState.sessions));
            renderRecentSessions();
            
            alert('Great job! Study session complete.');
        }
    }, 1000);
}

function pauseTimer() {
    appState.timer.isRunning = false;
    clearInterval(timerInterval);
    timerToggleBtn.textContent = 'Start';
}

function resetTimer() {
    clearInterval(timerInterval);
    appState.timer.isRunning = false;
    appState.timer.timeLeft = 0;
    appState.timer.totalTime = 0;
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
    
    const recent = appState.sessions.slice(-5).reverse();
    
    if (recent.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No sessions yet</p>';
        return;
    }
    
    recent.forEach(session => {
        const item = document.createElement('div');
        item.className = 'session-item';
        item.innerHTML = `
            <div>
                <div class="session-subject">${session.subject}</div>
                <div class="session-date">${new Date(session.date).toLocaleDateString()}</div>
            </div>
            <div class="session-duration">${Math.round(session.duration)} min</div>
        `;
        list.appendChild(item);
    });
}

// ==================== MARKS ====================
const addMarksBtn = document.getElementById('addMarksBtn');
const addMarksModal = document.getElementById('addMarksModal');
const saveMarksBtn = document.getElementById('saveMarksBtn');
const marksSubjectSelect = document.getElementById('marksSubjectSelect');
const marksScoreInput = document.getElementById('marksScoreInput');
const marksMaxInput = document.getElementById('marksMaxInput');
const percentageDisplay = document.getElementById('percentageDisplay');

// Update percentage when score or max changes
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
    marksScoreInput.value = '';
    marksMaxInput.value = '100';
    percentageDisplay.textContent = '0%';
    addMarksModal.classList.add('active');
});

saveMarksBtn.addEventListener('click', () => {
    const subject = marksSubjectSelect.value;
    const score = parseInt(marksScoreInput.value);
    const maxScore = parseInt(marksMaxInput.value) || 100;
    
    if (subject && score >= 0) {
        const percentage = Math.round((score / maxScore) * 100);
        appState.marks.push({
            subject,
            score,
            maxScore,
            percentage,
            date: new Date().toISOString()
        });
        localStorage.setItem('marks', JSON.stringify(appState.marks));
        addMarksModal.classList.remove('active');
        renderMarksList();
        renderTodayTab();
    }
});

function renderMarksList() {
    const perfBars = document.getElementById('performanceBars');
    const history = document.getElementById('marksHistory');
    
    perfBars.innerHTML = '';
    history.innerHTML = '';
    
    if (appState.marks.length === 0) {
        perfBars.innerHTML = '<p style="color: var(--text-tertiary);">No scores yet</p>';
        history.innerHTML = '<p style="color: var(--text-tertiary);">No score history</p>';
        return;
    }
    
    // Performance bars by subject
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
    
    // History
    appState.marks.slice().reverse().forEach((mark, index) => {
        const entry = document.createElement('div');
        entry.className = 'mark-entry';
        const scoreDisplay = mark.maxScore ? `${mark.score}/${mark.maxScore}` : mark.score;
        const percentDisplay = mark.percentage || mark.score;
        entry.innerHTML = `
            <div class="mark-details">
                <div class="mark-subject">${mark.subject}</div>
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
            renderMarksList();
            renderTodayTab();
        });
        
        history.appendChild(entry);
    });
}

// ==================== MORE MENU ====================
document.getElementById('marksMenuItem').addEventListener('click', () => switchTab('marks'));
document.getElementById('flashcardsMenuItem').addEventListener('click', () => switchTab('flashcards'));
document.getElementById('settingsMenuItem').addEventListener('click', () => settingsBtn.click());

// ==================== FLASHCARDS ====================
const addFlashcardBtn = document.getElementById('addFlashcardBtn');
const addFlashcardModal = document.getElementById('addFlashcardModal');
const flashcardTitleInput = document.getElementById('flashcardTitleInput');
const flashcardNotesInput = document.getElementById('flashcardNotesInput');
const generateFlashcardsBtn = document.getElementById('generateFlashcardsBtn');

const viewFlashcardsModal = document.getElementById('viewFlashcardsModal');
const viewFlashcardsTitle = document.getElementById('viewFlashcardsTitle');
const flashcardFlip = document.getElementById('flashcardFlip');
const flashcardText = document.getElementById('flashcardText');
const cardCounter = document.getElementById('cardCounter');
const prevCardBtn = document.getElementById('prevCardBtn');
const nextCardBtn = document.getElementById('nextCardBtn');
const deleteFlashcardSetBtn = document.getElementById('deleteFlashcardSetBtn');

let viewerSetIndex = null;
let viewerCardIndex = 0;
let viewerShowingFront = true;

function renderFlashcardsList() {
    const list = document.getElementById('flashcardsList');
    list.innerHTML = '';

    if (!appState.flashcards || appState.flashcards.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No flashcards yet. Create your first set!</p>';
        return;
    }

    appState.flashcards.forEach((set, index) => {
        const item = document.createElement('div');
        item.className = 'card flashcard-item';
        item.innerHTML = `
            <div class="flashcard-title">${set.title}</div>
            <div class="flashcard-preview">${set.cards ? set.cards.length : 0} cards</div>
        `;
        item.addEventListener('click', () => openFlashcardViewer(index));
        list.appendChild(item);
    });
}

// ---- Local "AI-style" notes -> flashcards generator ----
// Splits notes into lines/sentences and turns each into a Q&A style card.
function generateFlashcardsFromNotes(notes) {
    const cards = [];
    let chunks = notes.split(/\n+/).map(l => l.trim()).filter(l => l.length > 3);

    if (chunks.length <= 1) {
        chunks = notes.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(s => s.length > 3);
    }

    const stopwords = new Set(['the','a','an','is','are','was','were','of','in','on','at','to','for','and','or','with','by','it','this','that','as','be','from','which','also','are','has','have','had']);

    chunks.forEach(chunk => {
        // "Term: Definition" or "Term - Definition" style lines
        const splitMatch = chunk.match(/^(.{2,50}?)\s*[:\-–—]\s*(.{3,})$/);
        if (splitMatch) {
            cards.push({ front: splitMatch[1].trim(), back: splitMatch[2].trim() });
            return;
        }

        // Otherwise create a fill-in-the-blank card from the most important word
        const words = chunk.split(/\s+/);
        let bestIdx = -1, bestLen = 0;
        words.forEach((w, i) => {
            const clean = w.replace(/[^a-zA-Z]/g, '');
            if (clean.length > bestLen && !stopwords.has(clean.toLowerCase())) {
                bestLen = clean.length;
                bestIdx = i;
            }
        });

        if (bestIdx !== -1 && bestLen > 2) {
            const answer = words[bestIdx].replace(/[^a-zA-Z]/g, '');
            const blanked = words.slice();
            blanked[bestIdx] = '_____';
            cards.push({ front: blanked.join(' '), back: `${answer}\n\n(${chunk})` });
        } else {
            cards.push({ front: 'What does this cover?', back: chunk });
        }
    });

    return cards;
}

if (addFlashcardBtn) {
    addFlashcardBtn.addEventListener('click', () => {
        flashcardTitleInput.value = '';
        flashcardNotesInput.value = '';
        addFlashcardModal.classList.add('active');
    });
}

if (generateFlashcardsBtn) {
    generateFlashcardsBtn.addEventListener('click', () => {
        const title = flashcardTitleInput.value.trim();
        const notes = flashcardNotesInput.value.trim();

        if (!title) {
            alert('Please enter a title');
            return;
        }
        if (!notes) {
            alert('Please paste some notes to generate flashcards from');
            return;
        }

        const cards = generateFlashcardsFromNotes(notes);

        if (!appState.flashcards) appState.flashcards = [];
        appState.flashcards.push({
            id: Date.now(),
            title,
            notes,
            cards,
            created: new Date().toISOString()
        });
        localStorage.setItem('flashcards', JSON.stringify(appState.flashcards));
        addFlashcardModal.classList.remove('active');
        renderFlashcardsList();
    });
}

// ---- Flashcard viewer (flip through generated cards) ----
function openFlashcardViewer(setIndex) {
    viewerSetIndex = setIndex;
    viewerCardIndex = 0;
    viewerShowingFront = true;
    const set = appState.flashcards[setIndex];
    viewFlashcardsTitle.textContent = set.title;
    updateFlashcardViewer();
    viewFlashcardsModal.classList.add('active');
}

function updateFlashcardViewer() {
    const set = appState.flashcards[viewerSetIndex];
    if (!set || !set.cards || set.cards.length === 0) {
        flashcardText.textContent = 'No cards in this set yet';
        cardCounter.textContent = '0 / 0';
        return;
    }
    const card = set.cards[viewerCardIndex];
    flashcardText.innerHTML = viewerShowingFront
        ? `${card.front}<span class="flashcard-flip-hint">Tap to flip</span>`
        : `${card.back}<span class="flashcard-flip-hint">Tap to flip back</span>`;
    flashcardFlip.classList.toggle('back', !viewerShowingFront);
    cardCounter.textContent = `${viewerCardIndex + 1} / ${set.cards.length}`;
}

if (flashcardFlip) {
    flashcardFlip.addEventListener('click', () => {
        viewerShowingFront = !viewerShowingFront;
        updateFlashcardViewer();
    });
}

if (prevCardBtn) {
    prevCardBtn.addEventListener('click', () => {
        const set = appState.flashcards[viewerSetIndex];
        if (!set || !set.cards.length) return;
        viewerCardIndex = (viewerCardIndex - 1 + set.cards.length) % set.cards.length;
        viewerShowingFront = true;
        updateFlashcardViewer();
    });
}

if (nextCardBtn) {
    nextCardBtn.addEventListener('click', () => {
        const set = appState.flashcards[viewerSetIndex];
        if (!set || !set.cards.length) return;
        viewerCardIndex = (viewerCardIndex + 1) % set.cards.length;
        viewerShowingFront = true;
        updateFlashcardViewer();
    });
}

if (deleteFlashcardSetBtn) {
    deleteFlashcardSetBtn.addEventListener('click', () => {
        if (viewerSetIndex === null) return;
        if (confirm('Delete this flashcard set?')) {
            appState.flashcards.splice(viewerSetIndex, 1);
            localStorage.setItem('flashcards', JSON.stringify(appState.flashcards));
            viewFlashcardsModal.classList.remove('active');
            renderFlashcardsList();
        }
    });
}

// ==================== RENDER ALL ====================
function renderAllSections() {
    renderCalendar();
    renderTodoList();
    renderMarksList();
    renderRecentSessions();
    renderFlashcardsList();
    renderTodayTab();
}

// START APP
init();
