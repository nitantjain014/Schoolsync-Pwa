// ==================== INITIALIZATION ====================
let appState = {
    currentTab: 'today',
    theme: localStorage.getItem('theme') || 'light',
    autoRotate: localStorage.getItem('autoRotate') !== 'false',
    pinnedBackdrop: localStorage.getItem('pinnedBackdrop') || null,
    currentBackdropIndex: parseInt(localStorage.getItem('currentBackdropIndex')) || 0,
    todos: JSON.parse(localStorage.getItem('todos')) || [],
    marks: JSON.parse(localStorage.getItem('marks')) || [],
    notes: JSON.parse(localStorage.getItem('notes')) || [],
    timer: {
        timeLeft: 0,
        isRunning: false,
        totalTime: 0,
        subject: ''
    }
};

const BACKDROP_COUNT = 8; // bg1.jpg through bg8.jpg
const DARK_BACKDROPS = [4, 5, 6, 7, 8]; // bg4-bg8 for dark theme
const LIGHT_BACKDROPS = [1, 2, 3]; // bg1-bg3 for light theme

// ==================== DOM ELEMENTS ====================
const tabButtons = document.querySelectorAll('.tab-btn');
const navButtons = document.querySelectorAll('.nav-btn');
const tabContents = document.querySelectorAll('.tab-content');
const settingsBtn = document.querySelector('#settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const addModal = document.getElementById('addModal');
const themeToggle = document.getElementById('themeToggle');
const autoRotateToggle = document.getElementById('autoRotateToggle');
const modalCloses = document.querySelectorAll('.modal-close');
const carouselTrack = document.getElementById('carouselTrack');
const carouselDots = document.getElementById('carouselDots');
const activeBackdrop = document.getElementById('activeBackdrop');

// ==================== INITIALIZATION LOGIC ====================
function init() {
    setupTheme();
    setupCarousel();
    setupEventListeners();
    loadAllData();
    renderCalendar();
    renderTodoList();
    renderMarksList();
    renderNotesList();
}

// ==================== THEME SETUP ====================
function setupTheme() {
    if (appState.theme === 'dark') {
        document.body.classList.add('dark-theme');
        themeToggle.checked = true;
    }
    autoRotateToggle.checked = appState.autoRotate;
}

themeToggle.addEventListener('change', (e) => {
    appState.theme = e.target.checked ? 'dark' : 'light';
    document.body.classList.toggle('dark-theme');
    localStorage.setItem('theme', appState.theme);
    setupCarousel();
});

// ==================== CAROUSEL SETUP ====================
function setupCarousel() {
    const backdrops = appState.theme === 'dark' ? DARK_BACKDROPS : LIGHT_BACKDROPS;
    carouselTrack.innerHTML = '';
    carouselDots.innerHTML = '';

    backdrops.forEach((bgNum, index) => {
        const slide = document.createElement('div');
        slide.className = 'carousel-slide';
        if (index === 0) slide.classList.add('active');
        slide.style.backgroundImage = `url('bg${bgNum}.jpg')`;
        carouselTrack.appendChild(slide);

        const dot = document.createElement('div');
        dot.className = 'dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => setCarouselIndex(index, backdrops));
        carouselDots.appendChild(dot);
    });

    // Set initial backdrop
    updateActiveBackdrop(backdrops[appState.currentBackdropIndex]);

    // Auto-rotate on page load if enabled
    if (appState.autoRotate && !appState.pinnedBackdrop) {
        rotateBackdrop(backdrops);
    }
}

function setCarouselIndex(index, backdrops) {
    appState.currentBackdropIndex = index;
    appState.pinnedBackdrop = `bg${backdrops[index]}.jpg`;
    localStorage.setItem('currentBackdropIndex', index);
    localStorage.setItem('pinnedBackdrop', appState.pinnedBackdrop);
    updateCarousel(backdrops);
}

function rotateBackdrop(backdrops) {
    appState.currentBackdropIndex = (appState.currentBackdropIndex + 1) % backdrops.length;
    localStorage.setItem('currentBackdropIndex', appState.currentBackdropIndex);
    updateCarousel(backdrops);
}

function updateCarousel(backdrops) {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    
    slides.forEach((slide, index) => {
        slide.classList.remove('active', 'prev');
        if (index === appState.currentBackdropIndex) {
            slide.classList.add('active');
        } else if (index < appState.currentBackdropIndex) {
            slide.classList.add('prev');
        }
    });

    dots.forEach((dot, index) => {
        dot.classList.toggle('active', index === appState.currentBackdropIndex);
    });

    updateActiveBackdrop(backdrops[appState.currentBackdropIndex]);
}

function updateActiveBackdrop(bgNum) {
    activeBackdrop.style.backgroundImage = `url('bg${bgNum}.jpg')`;
}

autoRotateToggle.addEventListener('change', (e) => {
    appState.autoRotate = e.target.checked;
    localStorage.setItem('autoRotate', appState.autoRotate);
    if (appState.autoRotate) {
        appState.pinnedBackdrop = null;
        localStorage.removeItem('pinnedBackdrop');
    }
});

// ==================== TAB SWITCHING ====================
function switchTab(tabName) {
    appState.currentTab = tabName;
    
    // Update buttons
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    navButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
    
    // Update content
    tabContents.forEach(content => content.classList.toggle('active', content.id === `${tabName}-tab`));
    
    // Update header title
    const titles = {
        today: 'Today',
        todo: 'To-Do',
        timer: 'Timer',
        notes: 'Notes',
        marks: 'Marks',
        chat: 'Chat'
    };
    document.getElementById('appTitle').textContent = titles[tabName];
}

tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

navButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ==================== SETTINGS MODAL ====================
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
    renderBackdropPreview();
});

modalCloses.forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
    });
});

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

function renderBackdropPreview() {
    const backdrops = appState.theme === 'dark' ? DARK_BACKDROPS : LIGHT_BACKDROPS;
    const previewContainer = document.getElementById('backdropPreview');
    previewContainer.innerHTML = '';

    backdrops.forEach((bgNum) => {
        const item = document.createElement('div');
        item.className = 'backdrop-preview-item';
        item.style.backgroundImage = `url('bg${bgNum}.jpg')`;
        if (appState.currentBackdropIndex === backdrops.indexOf(bgNum)) {
            item.classList.add('active');
        }
        item.addEventListener('click', () => {
            appState.currentBackdropIndex = backdrops.indexOf(bgNum);
            appState.pinnedBackdrop = `bg${bgNum}.jpg`;
            localStorage.setItem('pinnedBackdrop', appState.pinnedBackdrop);
            localStorage.setItem('currentBackdropIndex', backdrops.indexOf(bgNum));
            updateCarousel(backdrops);
            renderBackdropPreview();
        });
        previewContainer.appendChild(item);
    });
}

// ==================== CALENDAR ====================
function renderCalendar() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const monthYear = document.getElementById('monthYear');
    monthYear.textContent = today.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const cell = createCalendarCell(daysInPrevMonth - i, 'other-month');
        calendarGrid.appendChild(cell);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const cell = createCalendarCell(day);
        if (day === today.getDate()) {
            cell.classList.add('today');
        }
        calendarGrid.appendChild(cell);
    }
    
    // Next month days
    const totalCells = calendarGrid.children.length;
    const remainingCells = 42 - totalCells;
    for (let day = 1; day <= remainingCells; day++) {
        const cell = createCalendarCell(day, 'other-month');
        calendarGrid.appendChild(cell);
    }
}

function createCalendarCell(day, className = '') {
    const cell = document.createElement('div');
    cell.className = `calendar-cell ${className}`;
    cell.textContent = day;
    return cell;
}

// Update calendar when month changes
document.getElementById('prevMonth').addEventListener('click', renderCalendar);
document.getElementById('nextMonth').addEventListener('click', renderCalendar);

// ==================== TO-DO MANAGEMENT ====================
function renderTodoList() {
    const todoList = document.getElementById('todoList');
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    
    todoList.innerHTML = '';
    
    const filtered = appState.todos.filter(todo => {
        if (filter === 'all') return true;
        return todo.urgency === filter;
    });
    
    filtered.forEach((todo, index) => {
        const item = document.createElement('div');
        item.className = 'todo-item';
        item.innerHTML = `
            <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-index="${index}">
            <div class="todo-content">
                <div class="todo-title">${todo.title}</div>
                <div class="task-urgency ${todo.urgency}">${todo.urgency.charAt(0).toUpperCase() + todo.urgency.slice(1)}</div>
            </div>
            <button class="todo-delete" data-index="${index}">🗑️</button>
        `;
        todoList.appendChild(item);
    });
    
    // Event listeners
    document.querySelectorAll('.todo-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            const index = e.target.dataset.index;
            appState.todos[index].completed = e.target.checked;
            saveTodos();
            renderTodoList();
        });
    });
    
    document.querySelectorAll('.todo-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            appState.todos.splice(index, 1);
            saveTodos();
            renderTodoList();
        });
    });
    
    // Render today's tasks preview
    const todayTasks = appState.todos.filter(t => !t.completed).slice(0, 3);
    const todayList = document.getElementById('todayTasksList');
    todayList.innerHTML = '';
    if (todayTasks.length === 0) {
        todayList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No tasks today!</p>';
    } else {
        todayTasks.forEach(task => {
            const taskEl = document.createElement('div');
            taskEl.className = 'task-item';
            taskEl.innerHTML = `
                <div class="task-title">${task.title}</div>
                <div class="task-urgency ${task.urgency}">${task.urgency}</div>
            `;
            todayList.appendChild(taskEl);
        });
    }
}

function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(appState.todos));
}

// Add Task button
document.querySelector('[data-tab="todo"] + .filter-buttons').previousElementSibling.querySelector('.add-btn')?.addEventListener('click', () => {
    openAddTaskModal();
});

function openAddTaskModal() {
    addModal.querySelector('#addModalTitle').textContent = 'Add Task';
    addModal.querySelector('#addModalBody').innerHTML = `
        <input type="text" id="taskTitle" placeholder="Task title" class="task-input">
        <select id="taskUrgency" class="task-urgency-select">
            <option value="normal">Normal</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
        </select>
        <button id="saveTaskBtn" class="add-btn">Add Task</button>
    `;
    addModal.classList.add('active');
    
    document.getElementById('saveTaskBtn').addEventListener('click', () => {
        const title = document.getElementById('taskTitle').value;
        const urgency = document.getElementById('taskUrgency').value;
        if (title.trim()) {
            appState.todos.push({ title, urgency, completed: false });
            saveTodos();
            renderTodoList();
            addModal.classList.remove('active');
        }
    });
}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        renderTodoList();
    });
});

// ==================== TIMER ====================
let timerInterval;

document.getElementById('timerToggleBtn').addEventListener('click', () => {
    if (appState.timer.isRunning) {
        pauseTimer();
    } else {
        startTimer();
    }
});

function startTimer() {
    if (appState.timer.timeLeft === 0) {
        const h = parseInt(document.getElementById('hoursInput').value) || 0;
        const m = parseInt(document.getElementById('minutesInput').value) || 0;
        const s = parseInt(document.getElementById('secondsInput').value) || 0;
        appState.timer.totalTime = h * 3600 + m * 60 + s;
        appState.timer.timeLeft = appState.timer.totalTime;
    }
    
    if (appState.timer.timeLeft <= 0) return;
    
    appState.timer.isRunning = true;
    document.getElementById('timerToggleBtn').textContent = 'Pause';
    
    timerInterval = setInterval(() => {
        appState.timer.timeLeft--;
        updateTimerDisplay();
        
        if (appState.timer.timeLeft <= 0) {
            clearInterval(timerInterval);
            appState.timer.isRunning = false;
            document.getElementById('timerToggleBtn').textContent = 'Start';
            alert('Time\'s up!');
        }
    }, 1000);
}

function pauseTimer() {
    appState.timer.isRunning = false;
    clearInterval(timerInterval);
    document.getElementById('timerToggleBtn').textContent = 'Start';
}

function updateTimerDisplay() {
    const hours = Math.floor(appState.timer.timeLeft / 3600);
    const minutes = Math.floor((appState.timer.timeLeft % 3600) / 60);
    const seconds = appState.timer.timeLeft % 60;
    
    document.getElementById('timerDisplay').textContent = 
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    
    // Update progress bar
    const progress = (appState.timer.timeLeft / appState.timer.totalTime) * 100 || 0;
    document.getElementById('progressBar').style.width = `${progress}%`;
}

// ==================== MARKS MANAGEMENT ====================
function renderMarksList() {
    const marksHistory = document.getElementById('marksHistory');
    marksHistory.innerHTML = '';
    
    if (appState.marks.length === 0) {
        marksHistory.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No scores yet</p>';
        updateMarksStats();
        return;
    }
    
    // Group by subject
    const bySubject = {};
    appState.marks.forEach(mark => {
        if (!bySubject[mark.subject]) bySubject[mark.subject] = [];
        bySubject[mark.subject].push(mark);
    });
    
    // Render performance bars
    const performanceBars = document.getElementById('performanceBars');
    performanceBars.innerHTML = '';
    
    Object.entries(bySubject).forEach(([subject, marks]) => {
        const avg = marks.reduce((sum, m) => sum + m.score, 0) / marks.length;
        const bar = document.createElement('div');
        bar.className = 'performance-bar';
        bar.innerHTML = `
            <div class="performance-bar-label">${subject}</div>
            <div class="performance-bar-container">
                <div class="performance-bar-fill" style="width: ${avg}%"></div>
            </div>
            <div class="performance-bar-score">${avg.toFixed(0)}/100</div>
        `;
        performanceBars.appendChild(bar);
    });
    
    // Render history
    appState.marks.forEach((mark, index) => {
        const entry = document.createElement('div');
        entry.className = 'mark-entry';
        entry.innerHTML = `
            <div class="mark-info">
                <div class="mark-subject">${mark.subject}</div>
                <div class="mark-date">${new Date(mark.date).toLocaleDateString()}</div>
            </div>
            <div class="mark-score">${mark.score}</div>
            <button class="mark-delete" data-index="${index}">🗑️</button>
        `;
        marksHistory.appendChild(entry);
    });
    
    document.querySelectorAll('.mark-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const index = e.target.dataset.index;
            appState.marks.splice(index, 1);
            saveMarks();
            renderMarksList();
        });
    });
    
    updateMarksStats();
}

function updateMarksStats() {
    if (appState.marks.length === 0) {
        document.getElementById('averageScore').textContent = '-';
        document.getElementById('highestScore').textContent = '-';
        document.getElementById('totalTests').textContent = '0';
        return;
    }
    
    const scores = appState.marks.map(m => m.score);
    const avg = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
    const highest = Math.max(...scores);
    
    document.getElementById('averageScore').textContent = avg;
    document.getElementById('highestScore').textContent = highest;
    document.getElementById('totalTests').textContent = appState.marks.length;
}

function saveMarks() {
    localStorage.setItem('marks', JSON.stringify(appState.marks));
}

// Add Score button
document.querySelector('[data-tab="marks"] + .filter-buttons')?.nextElementSibling?.querySelector('.add-btn')?.addEventListener('click', openAddScoreModal);

// Try to find and attach to the actual add button for marks
setTimeout(() => {
    const marksAddBtn = document.querySelector('[data-tab="marks"]')?.closest('.tab-btn')?.parentElement?.querySelector('.add-btn');
    if (marksAddBtn) {
        marksAddBtn.addEventListener('click', openAddScoreModal);
    }
}, 100);

// Also attach to marks header button
document.getElementById('marks-tab').querySelector('.add-btn')?.addEventListener('click', openAddScoreModal);

function openAddScoreModal() {
    addModal.querySelector('#addModalTitle').textContent = 'Add Score';
    addModal.querySelector('#addModalBody').innerHTML = `
        <select id="scoreSubject" class="task-input">
            <option value="">Select Subject</option>
            <option value="English">English</option>
            <option value="Maths">Maths</option>
            <option value="Science">Science</option>
            <option value="Social Studies">Social Studies</option>
            <option value="Hindi">Hindi</option>
            <option value="Sanskrit">Sanskrit</option>
            <option value="Other">Other</option>
        </select>
        <input type="number" id="scoreValue" placeholder="Score (0-100)" min="0" max="100" class="task-input">
        <button id="saveScoreBtn" class="add-btn">Add Score</button>
    `;
    addModal.classList.add('active');
    
    document.getElementById('saveScoreBtn').addEventListener('click', () => {
        const subject = document.getElementById('scoreSubject').value;
        const score = parseInt(document.getElementById('scoreValue').value);
        if (subject && score >= 0 && score <= 100) {
            appState.marks.push({ subject, score, date: new Date().toISOString() });
            saveMarks();
            renderMarksList();
            addModal.classList.remove('active');
        }
    });
}

// ==================== NOTES MANAGEMENT ====================
function renderNotesList() {
    const notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    
    if (appState.notes.length === 0) {
        notesList.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No notes yet</p>';
        return;
    }
    
    appState.notes.forEach((note, index) => {
        const card = document.createElement('div');
        card.className = 'note-card';
        card.innerHTML = `
            <strong>${note.title || 'Untitled'}</strong>
            <p>${note.content.substring(0, 50)}...</p>
            <small>${new Date(note.date).toLocaleDateString()}</small>
        `;
        card.addEventListener('click', () => editNote(index));
        notesList.appendChild(card);
    });
}

function editNote(index) {
    const note = appState.notes[index];
    document.getElementById('noteEditor').style.display = 'flex';
    document.getElementById('noteText').value = note.content;
    document.getElementById('saveNoteBtn').onclick = () => {
        appState.notes[index].content = document.getElementById('noteText').value;
        localStorage.setItem('notes', JSON.stringify(appState.notes));
        renderNotesList();
        document.getElementById('noteEditor').style.display = 'none';
    };
}

// Add Note button
document.getElementById('notes-tab').querySelector('.add-btn').addEventListener('click', () => {
    document.getElementById('noteEditor').style.display = 'flex';
    document.getElementById('noteText').value = '';
    document.getElementById('saveNoteBtn').onclick = () => {
        const content = document.getElementById('noteText').value;
        if (content.trim()) {
            appState.notes.push({ title: '', content, date: new Date().toISOString() });
            localStorage.setItem('notes', JSON.stringify(appState.notes));
            renderNotesList();
            document.getElementById('noteEditor').style.display = 'none';
        }
    };
});

// ==================== CHAT ====================
const chatMessages = document.getElementById('chatMessages');
const chatInput = document.getElementById('chatInput');
const chatSendBtn = document.getElementById('chatSendBtn');

chatSendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'chat-message user';
    userMsg.textContent = text;
    chatMessages.appendChild(userMsg);
    chatInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Simulate AI response (replace with actual Claude API call)
    setTimeout(() => {
        const aiMsg = document.createElement('div');
        aiMsg.className = 'chat-message ai';
        aiMsg.textContent = 'Got it! This is a placeholder. Connect to Claude API for real responses.';
        chatMessages.appendChild(aiMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 500);
}

// ==================== DATA LOADING ====================
function loadAllData() {
    // Data is already loaded from localStorage in init
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // All event listeners are set up in their respective sections
}

// ==================== SERVICE WORKER REGISTRATION ====================
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
        console.log('Service Worker registration failed:', err);
    });
}

// ==================== START APP ====================
init();
