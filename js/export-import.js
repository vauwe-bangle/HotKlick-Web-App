/**
 * HotKlick Export/Import Handler
 * Android-kompatibles Export/Import System
 * Format: PointEntity.kt kompatibel (id, name, x, y, radius, imageUri, text, audioUri, exerciseName)
 */

class ExportImportManager {
    constructor() {
        this.LONG_PRESS_DELAY = 800; // 800ms für Export Long-Press
        this.exportTimer = null;
        this.longPressTriggered = false;
    }

    /**
     * Setup Event Listeners für Export/Import Buttons
     */
    setupEventListeners() {
        const btnExport = document.getElementById('btnExport');
        const btnImport = document.getElementById('btnImport');

        if (btnExport) {
            // Mouse Events
            btnExport.addEventListener('mousedown', () => this.startExportLongPress());
            btnExport.addEventListener('mouseup', () => this.cancelExportLongPress());
            btnExport.addEventListener('mouseleave', () => this.cancelExportLongPress());

            // Touch Events
            btnExport.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startExportLongPress();
            });
            btnExport.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.cancelExportLongPress();
            });
            btnExport.addEventListener('touchcancel', () => this.cancelExportLongPress());

            console.log('✅ Export button long-press listeners attached');
        }

        if (btnImport) {
            btnImport.addEventListener('click', () => this.handleImport());
            console.log('✅ Import button listener attached');
        }
    }

    /**
     * Start Long-Press Timer für Export
     */
    startExportLongPress() {
        this.longPressTriggered = false;
        console.log('⏱️ Export long-press started (800ms)...');

        this.exportTimer = setTimeout(() => {
            console.log('✅ Export long-press triggered!');
            this.longPressTriggered = true;
            this.handleExport();
        }, this.LONG_PRESS_DELAY);
    }

    /**
     * Cancel Long-Press Timer
     */
    cancelExportLongPress() {
        if (this.exportTimer) {
            clearTimeout(this.exportTimer);
            this.exportTimer = null;
            
            if (!this.longPressTriggered) {
                console.log('⏱️ Export long-press cancelled');
            }
        }
    }

    /**
     * Export aktuelle Übung als ZIP (Android-kompatibel)
     */
    async handleExport() {
        if (!currentExercise) {
            alert('Keine Übung geladen!');
            return;
        }

        try {
            console.log('📦 Starting export for exercise:', currentExercise.name);
            
            // Erstelle ZIP mit JSZip
            const zip = new JSZip();
            
            // 1. Übungsbild hinzufügen
            const imageBlob = await this.dataUrlToBlob(currentExercise.imageData);
            const imageFilename = 'image.jpg';
            zip.file(imageFilename, imageBlob);
            console.log('✅ Image added to ZIP:', imageFilename);
            
            // 2. Hotspots zu JSON konvertieren (Android-Format)
            const hotspotsData = await this.prepareHotspotsForExport(currentHotspots, imageFilename);
            zip.file('hotspots.json', JSON.stringify(hotspotsData, null, 2));
            console.log('✅ Hotspots JSON added to ZIP');
            
            // 3. Audio-Dateien hinzufügen
            let audioCounter = 1;
            for (const hotspot of currentHotspots) {
                if (hotspot.audioBlob) {
                    const audioFilename = `audio_${audioCounter}.webm`;
                    zip.file(audioFilename, hotspot.audioBlob);
                    console.log(`✅ Audio added to ZIP: ${audioFilename}`);
                    audioCounter++;
                }
            }
            
            // 4. Metadata hinzufügen
            const metadata = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                exerciseName: currentExercise.name,
                hotspotCount: currentHotspots.length,
                appType: 'HotKlick-Web'
            };
            zip.file('metadata.json', JSON.stringify(metadata, null, 2));
            console.log('✅ Metadata added to ZIP');
            
            // 5. ZIP generieren und downloaden
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            const filename = `${this.sanitizeFilename(currentExercise.name)}_${Date.now()}.zip`;
            this.downloadBlob(zipBlob, filename);
            
            console.log('✅ Export completed:', filename);
            alert(`✅ Export erfolgreich!\n\nDatei: ${filename}`);
            
        } catch (error) {
            console.error('❌ Export failed:', error);
            alert('❌ Export fehlgeschlagen: ' + error.message);
        }
    }

    /**
     * Bereitet Hotspots für Export vor (Android-Format mit relativen Koordinaten)
     */
    async prepareHotspotsForExport(hotspots, imageFilename) {
        const exportData = [];
        let audioCounter = 1;

        // WICHTIG: Hole AKTUELLE Canvas-Dimensionen (nicht die festen 1024x600!)
        const canvas = document.getElementById('drawingCanvas');
        const canvasWidth = canvas.width;   // Tatsächliche Breite (z.B. 2048)
        const canvasHeight = canvas.height; // Tatsächliche Höhe (z.B. 1536)
        
        console.log(`📏 Export: Canvas dimensions: ${canvasWidth}x${canvasHeight}`);

        for (const hotspot of hotspots) {
            const audioUri = hotspot.audioBlob ? `audio_${audioCounter}.webm` : '';
            if (hotspot.audioBlob) audioCounter++;

            // Konvertiere zu relativen Koordinaten (0.0 - 1.0)
            const relativeX = hotspot.x / canvasWidth;
            const relativeY = hotspot.y / canvasHeight;
            const relativeRadius = hotspot.radius / canvasWidth; // Radius relativ zur Breite

            console.log(`📍 Export ${hotspot.label}: absolute(${hotspot.x}, ${hotspot.y}) → relative(${relativeX.toFixed(4)}, ${relativeY.toFixed(4)})`);

            // Android PointEntity Format
            exportData.push({
                id: hotspot.id,
                name: hotspot.label, // Android nutzt "name" statt "label"
                x: relativeX,
                y: relativeY,
                radius: relativeRadius,
                imageUri: imageFilename,
                text: hotspot.text || '',
                audioUri: audioUri,
                exerciseName: currentExercise.name,
                // Web-spezifische Flags für Kompatibilität
                hasText: hotspot.hasText || false,
                hasAudio: hotspot.hasAudio || false
            });
        }

        return exportData;
    }

    /**
     * Import ZIP-Datei (Android-kompatibel)
     */
    async handleImport() {
        console.log('📥 Import triggered');

        // Erstelle File Input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.zip';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                console.log('📦 Loading ZIP file:', file.name);
                await this.importFromZip(file);
            } catch (error) {
                console.error('❌ Import failed:', error);
                alert('❌ Import fehlgeschlagen: ' + error.message);
            }
        };

        input.click();
    }

    /**
     * Importiert Übung aus ZIP-Datei
     */
    async importFromZip(zipFile) {
        const zip = new JSZip();
        const zipData = await zip.loadAsync(zipFile);
        
        console.log('📦 ZIP loaded, files:', Object.keys(zipData.files));

        // 1. Lade Metadata
        let metadata = null;
        if (zipData.files['metadata.json']) {
            const metadataText = await zipData.files['metadata.json'].async('text');
            metadata = JSON.parse(metadataText);
            console.log('✅ Metadata loaded:', metadata);
        }

        // 2. Lade Hotspots JSON
        if (!zipData.files['hotspots.json']) {
            throw new Error('hotspots.json nicht gefunden in ZIP');
        }
        const hotspotsText = await zipData.files['hotspots.json'].async('text');
        const hotspotsData = JSON.parse(hotspotsText);
        console.log('✅ Hotspots loaded:', hotspotsData.length);

        // 3. Lade Übungsbild
        let imageData = null;
        const imageFilename = hotspotsData[0]?.imageUri || 'image.jpg';
        if (zipData.files[imageFilename]) {
            const imageBlob = await zipData.files[imageFilename].async('blob');
            imageData = await this.blobToDataUrl(imageBlob);
            console.log('✅ Image loaded');
        } else {
            throw new Error('Übungsbild nicht gefunden: ' + imageFilename);
        }

        // 3b. Lade Bild ins Canvas um die ECHTEN Dimensionen zu bekommen
        await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.getElementById('drawingCanvas');
                canvas.width = img.width;
                canvas.height = img.height;
                console.log(`📏 Import: Image loaded, canvas resized to ${img.width}x${img.height}`);
                resolve();
            };
            img.onerror = () => reject(new Error('Fehler beim Laden des Bildes'));
            img.src = imageData;
        });

        // 4. Erstelle neue Übung in DB
        const exerciseName = metadata?.exerciseName || hotspotsData[0]?.exerciseName || 'Importierte Übung';
        const newExercise = {
            id: db.generateId(),
            name: exerciseName,
            imageData: imageData,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        await db.addExercise(newExercise);
        console.log('✅ Exercise created:', newExercise.id);

        // 5. Lade Audio-Dateien und erstelle Hotspots
        const importedHotspots = [];
        
        // Hole Canvas-Dimensionen für Koordinaten-Konvertierung
        const canvas = document.getElementById('drawingCanvas');
        const canvasWidth = canvas.width;
        const canvasHeight = canvas.height;
        
        console.log(`📏 Import: Target canvas dimensions: ${canvasWidth}x${canvasHeight}`);
        
        for (const hotspotData of hotspotsData) {
            // Lade Audio falls vorhanden
            let audioBlob = null;
            if (hotspotData.audioUri && zipData.files[hotspotData.audioUri]) {
                audioBlob = await zipData.files[hotspotData.audioUri].async('blob');
                console.log(`✅ Audio loaded: ${hotspotData.audioUri}`);
            }

            // Konvertiere relative Koordinaten (0.0-1.0) zu absoluten Pixel-Werten
            // Falls Werte > 1.0 sind, handelt es sich um alte absolute Werte (Rückwärtskompatibilität)
            const isRelative = hotspotData.x <= 1.0 && hotspotData.y <= 1.0;
            const absoluteX = isRelative ? hotspotData.x * canvasWidth : hotspotData.x;
            const absoluteY = isRelative ? hotspotData.y * canvasHeight : hotspotData.y;
            const absoluteRadius = isRelative ? hotspotData.radius * canvasWidth : hotspotData.radius;

            console.log(`📍 Import ${hotspotData.name}: relative(${hotspotData.x.toFixed(4)}, ${hotspotData.y.toFixed(4)}) → absolute(${Math.round(absoluteX)}, ${Math.round(absoluteY)})`);

            // Erstelle Hotspot
            const newHotspot = {
                id: db.generateId(), // Neue ID generieren für diese Datenbank
                exerciseId: newExercise.id,
                label: hotspotData.name, // Android nutzt "name"
                x: absoluteX,
                y: absoluteY,
                radius: absoluteRadius,
                text: hotspotData.text || '',
                audioBlob: audioBlob,
                hasText: (hotspotData.text && hotspotData.text.trim() !== '') || hotspotData.hasText || false,
                hasAudio: audioBlob !== null || hotspotData.hasAudio || false
            };

            await db.addHotspot(newHotspot);
            importedHotspots.push(newHotspot);
        }

        console.log('✅ Import completed:', importedHotspots.length, 'hotspots');
        
        // 6. Aktualisiere UI
        await loadExercises();
        
        alert(`✅ Import erfolgreich!\n\n${exerciseName}\n${importedHotspots.length} Hotspots importiert`);
        
        // Optional: Öffne importierte Übung direkt
        openExercise(newExercise.id);
    }

    /**
     * Konvertiert Data URL zu Blob
     */
    async dataUrlToBlob(dataUrl) {
        const response = await fetch(dataUrl);
        return await response.blob();
    }

    /**
     * Konvertiert Blob zu Data URL
     */
    async blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    /**
     * Bereinigt Dateinamen (entfernt ungültige Zeichen)
     */
    sanitizeFilename(name) {
        return name.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, '_');
    }

    /**
     * Lädt Blob als Download herunter
     */
    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('💾 Download started:', filename);
    }
}

// Export als globale Variable
window.ExportImportManager = ExportImportManager;
console.log('✅ export-import.js loaded');