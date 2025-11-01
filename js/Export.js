/**
 * HotKlick Export Functionality
 * Kompatibel mit Android App (PointEntity.kt)
 */

// Long-Press Handler für Export Button
let exportLongPressTimer = null;
let isExportLongPress = false;

function setupExportLongPress() {
    const btnExport = document.getElementById('btnExport');
    
    // Touch Events
    btnExport.addEventListener('touchstart', (e) => {
        isExportLongPress = false;
        exportLongPressTimer = setTimeout(() => {
            isExportLongPress = true;
            exportExercise();
            // Haptic Feedback
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 800); // 800ms für Long-Press
    });
    
    btnExport.addEventListener('touchend', (e) => {
        clearTimeout(exportLongPressTimer);
    });
    
    btnExport.addEventListener('touchmove', (e) => {
        clearTimeout(exportLongPressTimer);
    });
    
    // Mouse Events (für Desktop-Testing)
    btnExport.addEventListener('mousedown', (e) => {
        isExportLongPress = false;
        exportLongPressTimer = setTimeout(() => {
            isExportLongPress = true;
            exportExercise();
        }, 800);
    });
    
    btnExport.addEventListener('mouseup', (e) => {
        clearTimeout(exportLongPressTimer);
    });
    
    btnExport.addEventListener('mouseleave', (e) => {
        clearTimeout(exportLongPressTimer);
    });
}

// Export-Funktion (Android App kompatibel)
async function exportExercise() {
    if (!currentExercise) {
        alert('Keine Übung geladen!');
        return;
    }
    
    console.log('🔄 Export gestartet...');
    
    try {
        const zip = new JSZip();
        
        // 1. Hotspots im PointEntity Format
        const points = currentHotspots.map((hotspot, index) => ({
            id: index,
            name: hotspot.label || `Punkt ${index + 1}`,
            x: hotspot.x,
            y: hotspot.y,
            radius: hotspot.radius || 50,
            imageUri: null, // Wird nicht von Web-App verwendet
            text: hotspot.text || null,
            audioUri: hotspot.audioData ? `audio_${index}.webm` : null,
            exerciseName: currentExercise.name
        }));
        
        // 2. Metadata erstellen
        const metadata = {
            version: '1.0',
            exerciseName: currentExercise.name,
            created: currentExercise.created,
            modified: new Date().toISOString(),
            pointCount: points.length,
            points: points
        };
        
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));
        console.log('✅ Metadata erstellt:', points.length, 'Hotspots');
        
        // 3. Bild hinzufügen
        try {
            const imageBlob = await fetch(currentExercise.image).then(r => r.blob());
            zip.file('image.png', imageBlob);
            console.log('✅ Bild hinzugefügt');
        } catch (error) {
            console.error('❌ Fehler beim Hinzufügen des Bildes:', error);
            throw new Error('Bild konnte nicht geladen werden');
        }
        
        // 4. Audio-Dateien hinzufügen
        let audioCount = 0;
        for (let i = 0; i < currentHotspots.length; i++) {
            const hotspot = currentHotspots[i];
            if (hotspot.audioData) {
                try {
                    const audioBlob = await fetch(hotspot.audioData).then(r => r.blob());
                    zip.file(`audio_${i}.webm`, audioBlob);
                    audioCount++;
                } catch (error) {
                    console.warn(`⚠️ Audio ${i} konnte nicht hinzugefügt werden:`, error);
                }
            }
        }
        console.log('✅ Audio-Dateien hinzugefügt:', audioCount);
        
        // 5. ZIP generieren
        console.log('🔄 Generiere ZIP-Datei...');
        const content = await zip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 }
        });
        
        // 6. Dateiname erstellen
        const sanitizedName = currentExercise.name.replace(/[^a-z0-9]/gi, '_');
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const filename = `${sanitizedName}_${timestamp}.hkz`;
        
        // 7. Download starten
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Export erfolgreich:', filename);
        alert(`Export erfolgreich!\n\nDatei: ${filename}\nHotspots: ${points.length}\nAudio: ${audioCount}`);
        
    } catch (error) {
        console.error('❌ Export-Fehler:', error);
        alert('Fehler beim Exportieren:\n' + error.message);
    }
}

// Initialisierung nach DOM-Ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupExportLongPress);
} else {
    setupExportLongPress();
}

console.log('✅ export.js loaded');