/**
 * HotKlick Main Application
 * Haupt-Logik für Navigation, UI und Basis-Funktionalität
 */

// ============================================
// GLOBAL STATE
// ============================================
const db = new Database();
let currentExercise = null;
let currentHotspots = [];
let currentMode = 'edit'; // 'edit', 'practice', 'deepening'

// ============================================
// APP INITIALIZATION
// ============================================
(async function init() {
    try {
        await db.init();
        console.log('✅ App initialized');
        
        await loadExercises();
        setupEventListeners();
        
        console.log('🚀 HotKlick ready!');
    } catch (error) {
        console.error('Failed to initialize app:', error);
        alert('Fehler beim Laden der App. Bitte Seite neu laden.');
    }
})();

// ============================================
// EVENT LISTENERS SETUP
// ============================================
function setupEventListeners() {
    // Navigation
    document.getElementById('btnBack').addEventListener('click', handleBack);
    document.getElementById('btnNewExercise').addEventListener('click', () => showModal('newExerciseModal'));
    
    // New Exercise Dialog
    document.getElementById('btnCancelNewExercise').addEventListener('click', () => {
        hideModal('newExerciseModal');
        resetNewExerciseForm();
    });
    document.getElementById('btnCreateExercise').addEventListener('click', createNewExercise);
    
    // Mode Toggle
    document.getElementById('btnEditMode').addEventListener('click', () => setMode('edit'));
    document.getElementById('btnPracticeMode').addEventListener('click', () => setMode('practice'));
    document.getElementById('btnDeepeningMode').addEventListener('click', () => setMode('deepening'));
    
    // Save Exercise
    document.getElementById('btnSave').addEventListener('click', saveExercise);
    
    // Text Dialog
    document.getElementById('btnCancelText').addEventListener('click', () => hideModal('textModal'));
    document.getElementById('btnSaveText').addEventListener('click', saveHotspotText);
    
    // Audio Dialog
    document.getElementById('btnCancelAudio').addEventListener('click', () => hideModal('audioModal'));
    document.getElementById('btnSaveAudio').addEventListener('click', saveHotspotAudio);
    
    // Canvas Events - werden später in canvas-manager.js implementiert
    setupCanvasEvents();
}

// ============================================
// SCREEN MANAGEMENT
// ============================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    document.getElementById('btnBack').style.display = screenId === 'homeScreen' ? 'none' : 'block';
}

function handleBack() {
    if (confirm('Möchtest du zum Startbildschirm zurückkehren? Ungespeicherte Änderungen gehen verloren.')) {
        currentExercise = null;
        currentHotspots = [];
        showScreen('homeScreen');
        loadExercises();
    }
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ============================================
// EXERCISE MANAGEMENT
// ============================================
async function loadExercises() {
    try {
        const exercises = await db.getAllExercises();
        const list = document.getElementById('exerciseList');
        
        if (exercises.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📚</div>
                    <p>Noch keine Übungen vorhanden</p>
                    <p style="font-size: 14px;">Erstelle deine erste Übung mit dem + Button</p>
                </div>
            `;
            return;
        }

        // Sortiere nach Datum (neueste zuerst)
        exercises.sort((a, b) => b.createdAt - a.createdAt);

        list.innerHTML = exercises.map(ex => {
            const date = new Date(ex.createdAt).toLocaleDateString('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            return `
                <div class="exercise-card" onclick="openExercise('${ex.id}')">
                    <img src="${ex.imageData}" alt="${ex.name}">
                    <div class="exercise-name">${escapeHtml(ex.name)}</div>
                    <div class="exercise-meta">${date}</div>
                </div>
            `;
        }).join('');
        
        console.log(`✅ Loaded ${exercises.length} exercises`);
    } catch (error) {
        console.error('Failed to load exercises:', error);
        alert('Fehler beim Laden der Übungen');
    }
}

async function createNewExercise() {
    const name = document.getElementById('newExerciseName').value.trim();
    const fileInput = document.getElementById('exerciseImage');
    
    if (!name) {
        alert('Bitte gib einen Übungsnamen ein');
        return;
    }
    
    if (!fileInput.files[0]) {
        alert('Bitte wähle ein Bild aus');
        return;
    }

    const file = fileInput.files[0];
    
    // Validiere Dateityp
    if (!file.type.startsWith('image/')) {
        alert('Bitte wähle eine gültige Bilddatei aus');
        return;
    }
    
    // Validiere Dateigröße (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
        alert('Das Bild ist zu groß. Maximale Größe: 10MB');
        return;
    }

    const reader = new FileReader();
    
    reader.onload = async (e) => {
        try {
            const exercise = {
                id: db.generateId(),
                name: name,
                imageName: file.name,
                imageData: e.target.result,
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            await db.addExercise(exercise);
            console.log('✅ Exercise created:', exercise.id);
            
            hideModal('newExerciseModal');
            resetNewExerciseForm();
            
            await loadExercises();
            openExercise(exercise.id);
        } catch (error) {
            console.error('Failed to create exercise:', error);
            alert('Fehler beim Erstellen der Übung');
        }
    };
    
    reader.onerror = () => {
        alert('Fehler beim Lesen der Bilddatei');
    };
    
    reader.readAsDataURL(file);
}

function resetNewExerciseForm() {
    document.getElementById('newExerciseName').value = '';
    document.getElementById('exerciseImage').value = '';
}

async function openExercise(exerciseId) {
    try {
        currentExercise = await db.getExercise(exerciseId);
        currentHotspots = await db.getHotspots(exerciseId);
        
        console.log(`✅ Opened exercise: ${currentExercise.name} with ${currentHotspots.length} hotspots`);
        
        document.getElementById('exerciseName').value = currentExercise.name;
        showScreen('canvasScreen');
        setMode('edit'); // Starte immer im Editiermodus
        loadCanvas();
    } catch (error) {
        console.error('Failed to open exercise:', error);
        alert('Fehler beim Öffnen der Übung');
    }
}

async function saveExercise() {
    if (!currentExercise) return;
    
    try {
        const newName = document.getElementById('exerciseName').value.trim();
        
        if (!newName) {
            alert('Bitte gib einen Übungsnamen ein');
            return;
        }
        
        currentExercise.name = newName;
        currentExercise.updatedAt = Date.now();
        
        await db.updateExercise(currentExercise);
        console.log('✅ Exercise saved');
        
        // Visual feedback
        const btnSave = document.getElementById('btnSave');
        const originalText = btnSave.textContent;
        btnSave.textContent = '✓ Gespeichert';
        setTimeout(() => {
            btnSave.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Failed to save exercise:', error);
        alert('Fehler beim Speichern');
    }
}

// ============================================
// CANVAS MANAGEMENT
// ============================================
function loadCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    const img = new Image();
    img.onload = () => {
        // Behalte Bildproportionen bei
        canvas.width = img.width;
        canvas.height = img.height;
        
        ctx.drawImage(img, 0, 0);
        drawHotspots();
        
        console.log(`✅ Canvas loaded: ${canvas.width}x${canvas.height}`);
    };
    
    img.onerror = () => {
        console.error('Failed to load image');
        alert('Fehler beim Laden des Bildes');
    };
    
    img.src = currentExercise.imageData;
}

function drawHotspots() {
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    // Lade Bild neu
    const img = new Image();
    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Zeichne alle Hotspots
        currentHotspots.forEach(hotspot => {
            const color = getHotspotColor(hotspot);
            
            // Zeichne Kreis
            ctx.beginPath();
            ctx.arc(hotspot.x, hotspot.y, hotspot.radius, 0, 2 * Math.PI);
            ctx.fillStyle = color.fill;
            ctx.fill();
            ctx.strokeStyle = color.stroke;
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Zeichne Label
            ctx.fillStyle = '#000';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(hotspot.label, hotspot.x, hotspot.y);
        });
    };
    img.src = currentExercise.imageData;
}

function getHotspotColor(hotspot) {
    const hasText = hotspot.text && hotspot.text.trim() !== '';
    const hasAudio = hotspot.audioBlob !== null;
    
    if (hasText && hasAudio) {
        return { fill: 'rgba(76, 175, 80, 0.6)', stroke: '#4CAF50' }; // Green
    } else if (hasAudio) {
        return { fill: 'rgba(33, 150, 243, 0.6)', stroke: '#2196F3' }; // Blue
    } else if (hasText) {
        return { fill: 'rgba(255, 193, 7, 0.6)', stroke: '#FFC107' }; // Yellow
    } else {
        return { fill: 'rgba(244, 67, 54, 0.6)', stroke: '#F44336' }; // Red
    }
}

// ============================================
// MODE MANAGEMENT
// ============================================
function setMode(mode) {
    currentMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (mode === 'edit') {
        document.getElementById('btnEditMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'crosshair';
    } else if (mode === 'practice') {
        document.getElementById('btnPracticeMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'pointer';
    } else if (mode === 'deepening') {
        document.getElementById('btnDeepeningMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'default';
    }
    
    console.log('Mode:', mode);
}

// ============================================
// CANVAS EVENTS (Placeholder - wird erweitert)
// ============================================
function setupCanvasEvents() {
    const canvas = document.getElementById('drawingCanvas');
    
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('dblclick', handleCanvasDoubleClick);
    
    console.log('✅ Canvas events setup');
}

function handleCanvasClick(e) {
    if (!currentExercise) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log(`Canvas click at: ${x}, ${y} (Mode: ${currentMode})`);
    
    // Wird in Phase 2 erweitert
}

function handleCanvasDoubleClick(e) {
    if (!currentExercise) return;
    
    const rect = e.target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    console.log(`Canvas double-click at: ${x}, ${y} (Mode: ${currentMode})`);
    
    // Wird in Phase 2 erweitert
}

// ============================================
// HOTSPOT DIALOG HANDLERS (Placeholder)
// ============================================
function saveHotspotText() {
    console.log('Save text - will be implemented in Phase 2');
    hideModal('textModal');
}

function saveHotspotAudio() {
    console.log('Save audio - will be implemented in Phase 2');
    hideModal('audioModal');
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally accessible
window.openExercise = openExercise;

console.log('✅ app.js loaded');