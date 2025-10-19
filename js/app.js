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

    // Deepening Mode Buttons
    const btnDeepText = document.getElementById('btnDeepText');
    const btnDeepAudio = document.getElementById('btnDeepAudio');
    const btnDeepBoth = document.getElementById('btnDeepBoth');
    const btnDeepBack = document.getElementById('btnDeepBack');
    
    if (btnDeepText) btnDeepText.addEventListener('click', () => startDeepening('text'));
    if (btnDeepAudio) btnDeepAudio.addEventListener('click', () => startDeepening('audio'));
    if (btnDeepBoth) btnDeepBoth.addEventListener('click', () => startDeepening('both'));
    if (btnDeepBack) btnDeepBack.addEventListener('click', () => setMode('practice'));

    // Task Count Dialog
    const btnCancelTasks = document.getElementById('btnCancelTasks');
    const btnStartTasks = document.getElementById('btnStartTasks');
    
    if (btnCancelTasks) btnCancelTasks.addEventListener('click', () => hideModal('taskCountModal'));
    if (btnStartTasks) btnStartTasks.addEventListener('click', startDeepeningTasks);
    
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
        resetAudioDialog();
    });
    document.getElementById('btnSaveAudio').addEventListener('click', saveHotspotAudio);
    document.getElementById('btnStartRecording').addEventListener('click', startRecording);
    document.getElementById('btnStopRecording').addEventListener('click', stopRecording);
    
    // Audio-Quelle wählen
    document.getElementById('btnChooseRecord').addEventListener('click', () => {
        document.getElementById('choiceSection').style.display = 'none';
        document.getElementById('recordSection').style.display = 'block';
        document.getElementById('fileSection').style.display = 'none';
    });
    document.getElementById('btnChooseFile').addEventListener('click', () => {
        document.getElementById('choiceSection').style.display = 'none';
        document.getElementById('recordSection').style.display = 'none';
        document.getElementById('fileSection').style.display = 'block';
    });
    
    // Zurück zur Auswahl
    document.getElementById('btnBackToChoice1').addEventListener('click', () => {
        document.getElementById('choiceSection').style.display = 'block';
        document.getElementById('recordSection').style.display = 'none';
        audioRecorder.stopRecording();
    });
    document.getElementById('btnBackToChoice2').addEventListener('click', () => {
        document.getElementById('choiceSection').style.display = 'block';
        document.getElementById('fileSection').style.display = 'none';
    });
    
    document.getElementById('audioFileInput').addEventListener('change', handleAudioFileUpload);
    
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
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        console.log('✅ Modal shown:', modalId);
    } else {
        console.error('❌ Modal not found:', modalId);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        console.log('✅ Modal hidden:', modalId);
    }
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
    
    // Update UI
    document.querySelectorAll('.mode-toggle button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const radiusControls = document.getElementById('radiusControls');
    
    if (mode === 'edit') {
        document.getElementById('btnEditMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'crosshair';
        radiusControls.classList.remove('hidden');
        
        // Verstecke Deepening Controls
        const deepeningControls = document.getElementById('deepeningControls');
        if (deepeningControls) deepeningControls.classList.add('hidden');
        
    } else if (mode === 'practice') {
        document.getElementById('btnPracticeMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'pointer';
        radiusControls.classList.add('hidden');
        
        // Verstecke Deepening Controls
        const deepeningControls = document.getElementById('deepeningControls');
        if (deepeningControls) deepeningControls.classList.add('hidden');
        
    } else if (mode === 'deepening') {
        document.getElementById('btnDeepeningMode').classList.add('active');
        document.getElementById('drawingCanvas').style.cursor = 'pointer';
        radiusControls.classList.add('hidden');
        
        // Zeige Deepening Controls
        const deepeningControls = document.getElementById('deepeningControls');
        if (deepeningControls) deepeningControls.classList.remove('hidden');
    }
    
    // Redraw canvas
    if (currentExercise) {
        canvasManager.redraw();
    }
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

// Reset Audio Dialog (muss vor openAudioDialog definiert sein)
function resetAudioDialog() {
    console.log('🔧 resetAudioDialog called');
    
    // Prüfe ob Elemente existieren
    const choiceSection = document.getElementById('choiceSection');
    const recordSection = document.getElementById('recordSection');
    const fileSection = document.getElementById('fileSection');
    
    if (!choiceSection || !recordSection || !fileSection) {
        console.error('❌ Audio dialog elements not found!');
        console.log('choiceSection:', choiceSection);
        console.log('recordSection:', recordSection);
        console.log('fileSection:', fileSection);
        return;
    }
    
    // Zeige nur Auswahl-Buttons
    choiceSection.style.display = 'block';
    recordSection.style.display = 'none';
    fileSection.style.display = 'none';
    
    // Reset Aufnahme
    const btnStart = document.getElementById('btnStartRecording');
    const btnStop = document.getElementById('btnStopRecording');
    const recordTime = document.getElementById('recordingTime');
    const audioPreview = document.getElementById('audioPreview');
    
    if (btnStart) btnStart.style.display = 'inline-block';
    if (btnStop) btnStop.style.display = 'none';
    if (recordTime) recordTime.style.display = 'none';
    if (audioPreview) audioPreview.style.display = 'none';
    
    // Reset Datei-Upload
    const fileInput = document.getElementById('audioFileInput');
    const filePreview = document.getElementById('audioFilePreview');
    
    if (fileInput) fileInput.value = '';
    if (filePreview) filePreview.style.display = 'none';
    
    console.log('✅ resetAudioDialog completed');
}

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
    const fileInput = document.getElementById('audioFileInput');
    
    // Prüfe ob Audio von Aufnahme oder Datei
    if (audioBlob) {
        // Von Aufnahme
        canvasManager.saveAudio(audioBlob);
    } else if (fileInput.files && fileInput.files[0]) {
        // Von Datei
        canvasManager.saveAudio(fileInput.files[0]);
    } else {
        alert('Bitte erst Audio aufnehmen oder Datei auswählen');
        return;
    }
    
    audioRecorder.cleanup();
    hideModal('audioModal');
    resetAudioDialog();
}

function handleAudioFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    console.log('📁 Audio file selected:', file.name, file.type);
    
    // Zeige Vorschau
    const preview = document.getElementById('audioFilePreview');
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.style.display = 'block';
    preview.load();
}

// ============================================
// DEEPENING MODE
// ============================================
let deepeningMode = null; // Global am Anfang von app.js

function startDeepening(mode) {
    deepeningMode = mode;
    console.log('🎯 Starting deepening mode:', mode);
    showModal('taskCountModal');
}

function startDeepeningTasks() {
    const count = parseInt(document.getElementById('taskCount').value);
    
    if (!count || count < 1) {
        alert('Bitte mindestens 1 Aufgabe eingeben');
        return;
    }
    
    hideModal('taskCountModal');
    console.log('✅ Starting', count, 'tasks in mode:', deepeningMode);
    alert('Starte ' + count + ' Aufgaben im Modus: ' + deepeningMode);
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
window.canvasManager = canvasManager;
window.audioRecorder = audioRecorder;
window.resetAudioDialog = resetAudioDialog;

console.log('✅ app.js loaded');