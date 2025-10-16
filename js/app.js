/**
 * HotKlick Main Application
 * Haupt-Logik für Navigation, UI und Basis-Funktionalität
 */

// ============================================
// GLOBAL STATE
// ============================================
const db = new Database();
const canvasManager = new CanvasManager();
const audioRecorder = new AudioRecorder();
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
        
        // Initialisiere Canvas Manager
        const canvas = document.getElementById('drawingCanvas');
        canvasManager.init(canvas);
        
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
    
    // Mode Toggle - Practice & Deepening mit normalem Click
    document.getElementById('btnPracticeMode').addEventListener('click', () => setMode('practice'));
    document.getElementById('btnDeepeningMode').addEventListener('click', () => setMode('deepening'));
    
    // Edit Mode mit Long-Press
    setupEditModeButton();
    
    // Radius Controls
    document.getElementById('btnIncreaseRadius').addEventListener('click', () => {
        canvasManager.increaseRadius();
    });
    document.getElementById('btnDecreaseRadius').addEventListener('click', () => {
        canvasManager.decreaseRadius();
    });
    
    // Save Exercise
    document.getElementById('btnSave').addEventListener('click', saveExercise);
    
    // Text Dialog
    document.getElementById('btnCancelText').addEventListener('click', () => {
        hideModal('textModal');
        canvasManager.selectedHotspot = null;
    });
    document.getElementById('btnSaveText').addEventListener('click', saveHotspotText);
    
    // Audio Dialog
    document.getElementById('btnCancelAudio').addEventListener('click', () => {
        audioRecorder.stopRecording();
        audioRecorder.cleanup();
        hideModal('audioModal');
    });
    document.getElementById('btnSaveAudio').addEventListener('click', saveHotspotAudio);
    document.getElementById('btnStartRecording').addEventListener('click', startRecording);
    document.getElementById('btnStopRecording').addEventListener('click', stopRecording);
    
    // Canvas Events - werden später in canvas-manager.js implementiert
    setupCanvasEvents();
}

// ============================================
// EDIT MODE BUTTON (Long-Press)
// ============================================
let editModeTimer = null;
let editModeLongPressTriggered = false;

function setupEditModeButton() {
    const btnEdit = document.getElementById('btnEditMode');
    
    // Mouse Events
    btnEdit.addEventListener('mousedown', () => {
        editModeLongPressTriggered = false;
        console.log('🖱️ Edit button pressed - waiting 500ms...');
        
        editModeTimer = setTimeout(() => {
            console.log('✅ Long-press on Edit button detected!');
            editModeLongPressTriggered = true;
            setMode('edit');
            
            // Visuelles Feedback
            btnEdit.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btnEdit.style.transform = 'scale(1)';
            }, 100);
        }, 500);
    });
    
    btnEdit.addEventListener('mouseup', () => {
        clearTimeout(editModeTimer);
        if (!editModeLongPressTriggered) {
            console.log('⚠️ Edit button: Zu kurz gedrückt (Long-Press erforderlich)');
            alert('Bitte den Editiermodus-Button länger gedrückt halten (500ms)');
        }
    });
    
    btnEdit.addEventListener('mouseleave', () => {
        clearTimeout(editModeTimer);
    });
    
    // Touch Events
    btnEdit.addEventListener('touchstart', (e) => {
        e.preventDefault();
        editModeLongPressTriggered = false;
        
        editModeTimer = setTimeout(() => {
            editModeLongPressTriggered = true;
            setMode('edit');
            
            btnEdit.style.transform = 'scale(0.95)';
            setTimeout(() => {
                btnEdit.style.transform = 'scale(1)';
            }, 100);
        }, 500);
    });
    
    btnEdit.addEventListener('touchend', (e) => {
        e.preventDefault();
        clearTimeout(editModeTimer);
        if (!editModeLongPressTriggered) {
            alert('Bitte den Editiermodus-Button länger gedrückt halten (500ms)');
        }
    });
    
    btnEdit.addEventListener('touchcancel', () => {
        clearTimeout(editModeTimer);
    });
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
        setMode('practice'); // Starte immer im Übungsmodus
        canvasManager.resetRadius(); // Reset radius auf Standard
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
    if (!currentExercise) return;
    canvasManager.loadImage(currentExercise.imageData);
}

function drawHotspots() {
    canvasManager.redraw();
}

function getHotspotColor(hotspot) {
    return canvasManager.getHotspotColor(hotspot);
}

// ============================================
// MODE MANAGEMENT
// ============================================
function setMode(mode) {
    currentMode = mode;
    
    console.log(`🔄 Switching to mode: ${mode}`);
    
    // Update UI
    document.querySelectorAll('.mode-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Zeige/Verstecke Radius-Controls
    const radiusControls = document.getElementById('radiusControls');
    
    if (!radiusControls) {
        console.error('❌ Radius controls element not found!');
        return;
    }
    
    console.log(`📍 Radius controls element found:`, radiusControls);
    
    if (mode === 'edit') {
        document.getElementById('btnEditMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'crosshair';
        radiusControls.classList.remove('hidden');
        console.log('✅ Radius controls shown (edit mode)');
    } else if (mode === 'practice') {
        document.getElementById('btnPracticeMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'pointer';
        radiusControls.classList.add('hidden');
        console.log('👻 Radius controls hidden (practice mode)');
    } else if (mode === 'deepening') {
        document.getElementById('btnDeepeningMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'default';
        radiusControls.classList.add('hidden');
        console.log('👻 Radius controls hidden (deepening mode)');
    }
    
    // Redraw canvas mit neuer Transparenz
    if (currentExercise) {
        canvasManager.redraw();
    }
    
    console.log('✅ Mode switched:', mode);
}

// ============================================
// CANVAS EVENTS (Placeholder - wird erweitert)
// ============================================
function setupCanvasEvents() {
    // Events werden jetzt vom CanvasManager verwaltet
    console.log('✅ Canvas events delegated to CanvasManager');
}

function handleCanvasClick(e) {
    // Nicht mehr benötigt - wird von CanvasManager verwaltet
}

function handleCanvasDoubleClick(e) {
    // Nicht mehr benötigt - wird von CanvasManager verwaltet
}

// ============================================
// HOTSPOT DIALOG HANDLERS
// ============================================
function saveHotspotText() {
    const label = document.getElementById('hotspotLabel').value.trim();
    const text = document.getElementById('hotspotText').value.trim();
    
    if (!label) {
        alert('Bitte gib ein Label ein');
        return;
    }
    
    canvasManager.saveText(label, text);
    hideModal('textModal');
}

async function startRecording() {
    console.log('🎤 Start recording button clicked');
    
    const btnStart = document.getElementById('btnStartRecording');
    const btnStop = document.getElementById('btnStopRecording');
    const preview = document.getElementById('audioPreview');
    
    preview.style.display = 'none';
    
    console.log('📱 Requesting microphone access...');
    const started = await audioRecorder.startRecording();
    
    if (started) {
        console.log('✅ Recording started successfully');
        btnStart.style.display = 'none';
        btnStop.style.display = 'inline-block';
    } else {
        console.error('❌ Failed to start recording');
    }
}

function stopRecording() {
    const btnStart = document.getElementById('btnStartRecording');
    const btnStop = document.getElementById('btnStopRecording');
    
    audioRecorder.stopRecording();
    
    btnStart.style.display = 'inline-block';
    btnStop.style.display = 'none';
    
    // Zeige Vorschau
    const audioBlob = audioRecorder.getAudioBlob();
    if (audioBlob) {
        audioRecorder.showPreview(audioBlob);
    }
}

function saveHotspotAudio() {
    const audioBlob = audioRecorder.getAudioBlob();
    
    if (!audioBlob) {
        alert('Bitte erst eine Audio-Aufnahme machen');
        return;
    }
    
    if (!canvasManager.selectedHotspot) {
        alert('Kein Hotspot ausgewählt');
        return;
    }
    
    canvasManager.saveAudio(audioBlob);
    audioRecorder.cleanup();
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