/**
 * HotKlick Canvas Manager
 * Verwaltung von Canvas-Events und Hotspot-Interaktionen
 */

class CanvasManager {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.clickTimeout = null;
        this.clickCount = 0;
        this.lastClickTime = 0;
        this.DOUBLE_CLICK_DELAY = 300; // ms
        this.LONG_PRESS_DELAY = 500; // ms für Long-Press
        this.currentRadius = 20; // Aktueller Hotspot-Radius (Start bei 20)
        this.MIN_RADIUS = 10;
        this.MAX_RADIUS = 120;
        this.RADIUS_STEP = 10;
        this.selectedHotspot = null;
        this.longPressTimer = null;
        this.longPressTriggered = false;
        this.pressStartCoords = null;
    }

    init(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.setupEvents();
        console.log('✅ Canvas Manager initialized');
    }

    setupEvents() {
        console.log('🔧 Setting up canvas events...');
        
        // Mouse Events
        this.canvas.addEventListener('mousedown', (e) => {
            console.log('🖱️ Mouse down detected');
            this.handleMouseDown(e);
        });
        this.canvas.addEventListener('mouseup', (e) => {
            console.log('🖱️ Mouse up detected');
            this.handleMouseUp(e);
        });
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseleave', (e) => this.cancelLongPress());
        
        // Prevent default double-click selection
        this.canvas.addEventListener('dblclick', (e) => e.preventDefault());
        
        // Touch support for mobile
        // Touch support for mobile - WITH ERROR HANDLING
        this.canvas.addEventListener('touchstart', (e) => {
            console.log('📱 Touch start detected');
            console.log('   About to call handleTouchStart...');
            console.log('   this.handleTouchStart exists?', typeof this.handleTouchStart);
            try {
                this.handleTouchStart(e);
                console.log('   handleTouchStart completed');
            } catch (error) {
                console.error('❌ ERROR in handleTouchStart:', error);
                console.error('   Error stack:', error.stack);
            }
        });
        this.canvas.addEventListener('touchend', (e) => {
            console.log('📱 Touch end detected');
            console.log('   About to call handleTouchEnd...');
            console.log('   this.handleTouchEnd exists?', typeof this.handleTouchEnd);
            try {
                this.handleTouchEnd(e);
                console.log('   handleTouchEnd completed');
            } catch (error) {
                console.error('❌ ERROR in handleTouchEnd:', error);
                console.error('   Error stack:', error.stack);
            }
        });
        this.canvas.addEventListener('touchmove', (e) => {
            try {
                this.handleTouchMove(e);
            } catch (error) {
                console.error('❌ ERROR in handleTouchMove:', error);
            }
        });
        this.canvas.addEventListener('touchcancel', (e) => this.cancelLongPress());
        
        console.log('✅ Canvas events setup complete');
    }

    /**
     * Mouse Down Handler - Start Long-Press Timer
     */
    handleMouseDown(e) {
        console.log('🔽 Mouse down handler called');
        const coords = this.getCanvasCoordinates(e);
        console.log(`📍 Coordinates: x=${coords.x}, y=${coords.y}`);
        console.log(`📋 Current mode: ${currentMode}`);
        
        this.pressStartCoords = coords;
        this.longPressTriggered = false;
        
        // Starte Long-Press Timer
        console.log('⏱️ Starting long-press timer (500ms)...');
        this.longPressTimer = setTimeout(() => {
            console.log('✅ Long-press timer fired!');
            this.handleLongPress(coords);
        }, this.LONG_PRESS_DELAY);
    }

    /**
     * Mouse Up Handler - Click oder Doppelklick
     */
    handleMouseUp(e) {
        this.cancelLongPress();
        
        if (this.longPressTriggered) {
            return; // Long-Press wurde bereits behandelt
        }
        
        const coords = this.getCanvasCoordinates(e);
        const now = Date.now();
        
        // Doppelklick-Erkennung
        if (now - this.lastClickTime < this.DOUBLE_CLICK_DELAY) {
            this.clickCount++;
        } else {
            this.clickCount = 1;
        }
        
        this.lastClickTime = now;
        
        // Warte kurz, um zu sehen ob noch ein Klick kommt
        clearTimeout(this.clickTimeout);
        
        this.clickTimeout = setTimeout(() => {
            if (this.clickCount === 1) {
                this.handleSingleClick(coords);
            } else if (this.clickCount >= 2) {
                this.handleDoubleClick(coords);
            }
            this.clickCount = 0;
        }, this.DOUBLE_CLICK_DELAY);
    }

    /**
     * Mouse Move Handler - Cancel Long-Press bei Bewegung
     */
    handleMouseMove(e) {
        if (!this.pressStartCoords) return;
        
        const coords = this.getCanvasCoordinates(e);
        const dx = coords.x - this.pressStartCoords.x;
        const dy = coords.y - this.pressStartCoords.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Wenn sich Maus bewegt hat, cancel Long-Press
        if (distance > 10) {
            this.cancelLongPress();
        }
    }

    /**
     * Touch Start Handler
     */
    handleTouchStart(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('📱 Touch start');
        const touch = e.touches[0];
        const coords = this.getTouchCoordinates(touch);
        console.log(`   Coords: (${coords.x}, ${coords.y}), Mode: ${currentMode}`);
        
        this.pressStartCoords = coords;
        this.longPressTriggered = false;
        
        // Starte Long-Press Timer
        this.longPressTimer = setTimeout(() => {
            console.log('✅ Long-press triggered');
            this.handleLongPress(coords);
        }, this.LONG_PRESS_DELAY);
    }

    /**
     * Touch End Handler
     */
    handleTouchEnd(e) {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('📱 Touch end');
        console.log('   Step 1: Canceling long-press timer');
        this.cancelLongPress();
        
        console.log('   Step 2: Check longPressTriggered =', this.longPressTriggered);
        if (this.longPressTriggered) {
            console.log('   ⚠️ Long-press was active, skipping tap detection');
            this.pressStartCoords = null; // Reset auch hier
            return;
        }
        
        console.log('   Step 3: Check pressStartCoords =', this.pressStartCoords);
        if (!this.pressStartCoords) {
            console.log('   ⚠️ No pressStartCoords - EXITING');
            return;
        }
        
        const coords = this.pressStartCoords;
        const now = Date.now();
        const timeDiff = now - this.lastClickTime;
        
        console.log(`   Step 4: Time since last tap: ${timeDiff}ms`);
        console.log(`   Step 5: DOUBLE_CLICK_DELAY = ${this.DOUBLE_CLICK_DELAY}ms`);
        
        // Doppel-Tap Erkennung (mit Mindestabstand gegen zu schnelle Doppeltaps)
        if (timeDiff < this.DOUBLE_CLICK_DELAY && timeDiff > 50) {
            this.clickCount++;
            console.log(`   👆👆 Double-tap detected! Count: ${this.clickCount}`);
        } else {
            this.clickCount = 1;
            console.log('   👆 Single tap');
        }
        
        this.lastClickTime = now;
        
        console.log('   Step 6: Clearing existing timeout');
        clearTimeout(this.clickTimeout);
        
        console.log(`   Step 7: Setting timeout of ${this.DOUBLE_CLICK_DELAY}ms`);
        this.clickTimeout = setTimeout(() => {
            console.log(`   🎯 Timeout fired! Final action: ${this.clickCount === 1 ? 'SINGLE' : 'DOUBLE'} tap`);
            if (this.clickCount === 1) {
                this.handleSingleClick(coords);
            } else if (this.clickCount >= 2) {
                this.handleDoubleClick(coords);
            }
            this.clickCount = 0;
        }, this.DOUBLE_CLICK_DELAY);
        
        // Reset pressStartCoords NACH dem Speichern von coords
        this.pressStartCoords = null;
        
        console.log('   ✅ Touch end handler complete');
    }

    /**
     * Touch Move Handler
     */
    handleTouchMove(e) {
        if (!this.pressStartCoords || e.touches.length === 0) return;
        
        const touch = e.touches[0];
        const coords = this.getTouchCoordinates(touch);
        const dx = coords.x - this.pressStartCoords.x;
        const dy = coords.y - this.pressStartCoords.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 10) {
            this.cancelLongPress();
        }
    }

    /**
     * Bricht Long-Press Timer ab
     */
    cancelLongPress() {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        // NICHT hier pressStartCoords löschen - wird in handleTouchEnd gemacht
    }

    /**
     * Long-Press Handler - Hotspot erstellen oder Audio-Dialog
     */
    handleLongPress(coords) {
        console.log('🔥 Long-press triggered!');
        console.log(`📋 Mode: ${currentMode}`);
        console.log(`📍 Coords: x=${coords.x}, y=${coords.y}`);
        
        this.longPressTriggered = true;
        
        if (currentMode === 'edit') {
            console.log('✏️ Edit mode - checking for existing hotspot...');
            
            // Prüfe ob bereits Hotspot an Position
            const existingHotspot = this.findHotspotAt(coords.x, coords.y);
            
            if (existingHotspot) {
                console.log('🎤 Hotspot exists - opening audio dialog:', existingHotspot.label);
                // Long-Press auf existierenden Hotspot → Audio-Dialog öffnen
                this.openAudioDialog(existingHotspot);
            } else {
                console.log('✅ No hotspot found - creating new one...');
                // Erstelle neuen Hotspot
                this.createHotspot(coords.x, coords.y);
                
                // Visuelles Feedback
                this.canvas.style.transform = 'scale(0.98)';
                setTimeout(() => {
                    this.canvas.style.transform = 'scale(1)';
                }, 100);
            }
        } else {
            console.log(`⚠️ Not in edit mode (current: ${currentMode})`);
        }
    }

    /**
     * Single Click Handler
     * Edit-Modus: Hotspot löschen
     * Practice-Modus: Text anzeigen + Piep
     * Deepening-Modus: Antwort prüfen (auch bei Leer-Klick)
     */
    handleSingleClick(coords) {
        const hotspot = this.findHotspotAt(coords.x, coords.y);
        
        if (currentMode === 'edit') {
            if (hotspot) {
                this.deleteHotspot(hotspot);
            }
        } else if (currentMode === 'practice') {
            if (hotspot) {
                // Piep abspielen
                if (typeof window.playClickBeep === 'function') {
                    window.playClickBeep();
                }
                this.showHotspotText(hotspot);
            }
        } else if (currentMode === 'deepening') {
            // Prüfe Antwort - auch wenn kein Hotspot getroffen wurde (null)
            window.checkDeepeningAnswer(hotspot);
        }
    }

    /**
     * Double Click Handler
     * Edit-Modus: Text-Dialog öffnen
     * Practice-Modus: Audio abspielen + Text
     */
    handleDoubleClick(coords) {
        const hotspot = this.findHotspotAt(coords.x, coords.y);
        
        if (!hotspot) return;
        
        if (currentMode === 'edit') {
            this.editHotspot(hotspot);
        } else if (currentMode === 'practice') {
            this.showHotspotTextAndAudio(hotspot);
        }
    }

    /**
     * Touch-Handler für Mobile
     */
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('click', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }

    /**
     * Konvertiert Bildschirm- zu Canvas-Koordinaten
     */
    getCanvasCoordinates(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    /**
     * Konvertiert Touch- zu Canvas-Koordinaten
     */
    getTouchCoordinates(touch) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        
        return {
            x: (touch.clientX - rect.left) * scaleX,
            y: (touch.clientY - rect.top) * scaleY
        };
    }

    /**
     * Findet Hotspot an gegebenen Koordinaten
     */
    findHotspotAt(x, y) {
        return currentHotspots.find(hotspot => {
            const dx = x - hotspot.x;
            const dy = y - hotspot.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            return distance <= hotspot.radius;
        });
    }

    /**
     * Erstellt neuen Hotspot
     */
    async createHotspot(x, y) {
        console.log('🎯 Creating hotspot...');
        
        // Generiere nächstes Label (A1, A2, ...)
        const nextLabel = this.generateNextLabel();
        console.log(`🏷️ Generated label: ${nextLabel}`);
        
        const hotspot = {
            id: db.generateId(),
            exerciseId: currentExercise.id,
            x: Math.round(x),
            y: Math.round(y),
            radius: this.currentRadius, // Verwende aktuellen Radius
            label: nextLabel,
            text: '',
            audioBlob: null,
            hasText: false,
            hasAudio: false
        };

        console.log('💾 Saving hotspot to database...', hotspot);

        try {
            await db.addHotspot(hotspot);
            currentHotspots.push(hotspot);
            this.redraw();
            console.log(`✅ Hotspot created successfully: ${nextLabel} at (${hotspot.x}, ${hotspot.y}) with radius ${hotspot.radius}`);
        } catch (error) {
            console.error('❌ Failed to create hotspot:', error);
            alert('Fehler beim Erstellen des Hotspots: ' + error.message);
        }
    }

    /**
     * Erhöht Hotspot-Radius
     */
    increaseRadius() {
        if (this.currentRadius < this.MAX_RADIUS) {
            this.currentRadius += this.RADIUS_STEP;
            this.updateRadiusDisplay();
            console.log(`📏 Radius increased to ${this.currentRadius}px`);
        }
    }

    /**
     * Verkleinert Hotspot-Radius
     */
    decreaseRadius() {
        if (this.currentRadius > this.MIN_RADIUS) {
            this.currentRadius -= this.RADIUS_STEP;
            this.updateRadiusDisplay();
            console.log(`📏 Radius decreased to ${this.currentRadius}px`);
        }
    }

    /**
     * Aktualisiert Radius-Anzeige
     */
    updateRadiusDisplay() {
        const display = document.getElementById('radiusDisplay');
        if (display) {
            display.textContent = `${this.currentRadius}px`;
        }
    }

    /**
     * Setzt Radius zurück auf Standard
     */
    resetRadius() {
        this.currentRadius = 20; // Start bei 20px
        this.updateRadiusDisplay();
    }

    /**
     * Löscht Hotspot
     */
    async deleteHotspot(hotspot) {
        if (!confirm(`Hotspot "${hotspot.label}" wirklich löschen?`)) {
            return;
        }

        try {
            await db.deleteHotspot(hotspot.id);
            currentHotspots = currentHotspots.filter(h => h.id !== hotspot.id);
            this.redraw();
            console.log(`✅ Hotspot deleted: ${hotspot.label}`);
        } catch (error) {
            console.error('Failed to delete hotspot:', error);
            alert('Fehler beim Löschen des Hotspots');
        }
    }

    /**
     * Öffnet Text-Dialog für Hotspot
     */
    editHotspot(hotspot) {
        this.selectedHotspot = hotspot;
        
        // Fülle Dialog mit aktuellen Daten
        document.getElementById('hotspotLabel').value = hotspot.label;
        document.getElementById('hotspotText').value = hotspot.text || '';
        
        showModal('textModal');
    }

    /**
     * Öffnet Audio-Dialog für Hotspot
     */
    openAudioDialog(hotspot) {
        console.log('🎬 openAudioDialog called for:', hotspot.label);
        this.selectedHotspot = hotspot;
        
        console.log('🔄 Calling resetAudioDialog...');
        try {
            if (typeof window.resetAudioDialog === 'function') {
                window.resetAudioDialog();
                console.log('✅ resetAudioDialog executed');
            } else {
                console.error('❌ resetAudioDialog is not a function:', typeof window.resetAudioDialog);
            }
        } catch (error) {
            console.error('❌ Error in resetAudioDialog:', error);
        }
        
        console.log('🔄 Calling showModal...');
        try {
            showModal('audioModal');
            console.log('✅ showModal executed');
        } catch (error) {
            console.error('❌ Error in showModal:', error);
        }
    }

    /**
     * Speichert Text-Änderungen
     */
    async saveText(label, text) {
        if (!this.selectedHotspot) return;

        this.selectedHotspot.label = label.trim() || this.selectedHotspot.label;
        this.selectedHotspot.text = text.trim();
        this.selectedHotspot.hasText = this.selectedHotspot.text !== '';

        try {
            await db.updateHotspot(this.selectedHotspot);
            
            // Update in currentHotspots Array
            const index = currentHotspots.findIndex(h => h.id === this.selectedHotspot.id);
            if (index !== -1) {
                currentHotspots[index] = this.selectedHotspot;
            }
            
            this.redraw();
            console.log(`✅ Hotspot updated: ${this.selectedHotspot.label}`);
        } catch (error) {
            console.error('Failed to update hotspot:', error);
            alert('Fehler beim Speichern');
        }

        this.selectedHotspot = null;
    }

    /**
     * Speichert Audio
     */
    async saveAudio(audioBlob) {
        if (!this.selectedHotspot) return;

        this.selectedHotspot.audioBlob = audioBlob;
        this.selectedHotspot.hasAudio = true;

        try {
            await db.updateHotspot(this.selectedHotspot);
            
            // Update in currentHotspots Array
            const index = currentHotspots.findIndex(h => h.id === this.selectedHotspot.id);
            if (index !== -1) {
                currentHotspots[index] = this.selectedHotspot;
            }
            
            this.redraw();
            console.log(`✅ Audio saved for hotspot: ${this.selectedHotspot.label}`);
        } catch (error) {
            console.error('Failed to save audio:', error);
            alert('Fehler beim Speichern des Audios');
        }

        this.selectedHotspot = null;
    }

    /**
     * Zeigt Hotspot-Text an (Practice-Modus) - in der Textbox unten
     */
    showHotspotText(hotspot) {
        if (!hotspot.hasText) {
            const questionText = document.getElementById('questionText');
            const btnClose = document.getElementById('btnCloseText');
            
            if (questionText) questionText.textContent = 'Dieser Hotspot hat keinen Text';
            if (btnClose) btnClose.style.display = 'block';
            
            // Automatisch nach 2 Sekunden ausblenden
            setTimeout(() => {
                if (questionText.textContent === 'Dieser Hotspot hat keinen Text') {
                    questionText.textContent = '';
                    if (btnClose) btnClose.style.display = 'none';
                }
            }, 2000);
            return;
        }

        // Zeige Text in der Textbox
        const questionText = document.getElementById('questionText');
        const btnClose = document.getElementById('btnCloseText');
        
        if (questionText) {
            // Konvertiere URLs in klickbare Links
            const textWithLinks = this.convertLinksToHtml(hotspot.text);
            questionText.innerHTML = textWithLinks;
        }
        
        if (btnClose) btnClose.style.display = 'block';
        
        console.log('✅ Text shown in question box:', hotspot.text);
    }

    /**
     * Konvertiert URLs im Text zu klickbaren Links
     */
    convertLinksToHtml(text) {
        // Regex für URLs (http://, https://, www.)
        const urlRegex = /(https?:\/\/[^\s]+)|(www\.[^\s]+)/gi;
        
        return text.replace(urlRegex, (url) => {
            // Füge https:// hinzu wenn nur www
            const href = url.startsWith('www.') ? 'https://' + url : url;
            return `<a href="${href}" target="_blank" style="color: #2196F3; text-decoration: underline;">${url}</a>`;
        });
    }

    /**
     * Zeigt Text und spielt Audio (Practice-Modus, Doppelklick)
     */
    showHotspotTextAndAudio(hotspot) {
        // Zeige Text
        if (hotspot.hasText) {
            this.showHotspotText(hotspot);
        }
        
        // Spiele Audio
        if (hotspot.hasAudio && hotspot.audioBlob) {
            const audio = new Audio(URL.createObjectURL(hotspot.audioBlob));
            audio.play().catch(error => {
                console.error('Audio playback failed:', error);
            });
        } else if (!hotspot.hasText && !hotspot.hasAudio) {
            alert('Dieser Hotspot hat weder Text noch Audio');
        }
    }

    /**
     * Generiert nächstes Label (A1, A2, ..., A9, B1, B2, ...)
     */
    generateNextLabel() {
        if (currentHotspots.length === 0) {
            return 'A1';
        }

        // Finde höchstes Label
        const labels = currentHotspots.map(h => h.label).sort();
        const lastLabel = labels[labels.length - 1];
        
        // Parse Label (z.B. "A1" → letter: "A", number: 1)
        const match = lastLabel.match(/^([A-Z])(\d+)$/);
        if (!match) {
            return 'A1'; // Fallback
        }

        let letter = match[1];
        let number = parseInt(match[2]);

        // Erhöhe Nummer
        number++;
        
        // Bei 10 → nächster Buchstabe
        if (number > 9) {
            letter = String.fromCharCode(letter.charCodeAt(0) + 1);
            number = 1;
        }

        return `${letter}${number}`;
    }

    /**
     * Zeichnet Canvas neu
     */
    redraw() {
        if (!currentExercise) {
            console.warn('⚠️ No current exercise - cannot redraw');
            return;
        }

        console.log(`🎨 Redrawing canvas with ${currentHotspots.length} hotspots`);

        const img = new Image();
        img.onload = () => {
            // Lösche Canvas
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // Zeichne Bild
            this.ctx.drawImage(img, 0, 0);
            
            // Zeichne Hotspots
            console.log('🎨 Drawing hotspots...');
            currentHotspots.forEach((hotspot, index) => {
                console.log(`  → Drawing hotspot ${index + 1}/${currentHotspots.length}: ${hotspot.label} at (${hotspot.x}, ${hotspot.y})`);
                this.drawHotspot(hotspot);
            });
            
            console.log('✅ Redraw complete');
        };
        
        img.onerror = () => {
            console.error('❌ Failed to load image for redraw');
        };
        
        img.src = currentExercise.imageData;
    }

    /**
     * Zeichnet einzelnen Hotspot
     */
    drawHotspot(hotspot) {
        // Im Practice- und Deepening-Modus: Hotspots NICHT zeichnen
        if (currentMode === 'practice' || currentMode === 'deepening') {
            console.log(`  👻 Hotspot ${hotspot.label} hidden (${currentMode} mode)`);
            return;
        }
        
        console.log(`  🔵 Drawing circle at (${hotspot.x}, ${hotspot.y}) with radius ${hotspot.radius}`);
        
        const color = this.getHotspotColor(hotspot);
        console.log(`  🎨 Color: ${color.stroke}, Mode: ${currentMode}`);
        
        // Zeichne Kreis (nur im Edit-Modus)
        this.ctx.beginPath();
        this.ctx.arc(hotspot.x, hotspot.y, hotspot.radius, 0, 2 * Math.PI);
        this.ctx.fillStyle = color.fill;
        this.ctx.fill();
        this.ctx.strokeStyle = color.stroke;
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Zeichne Label
        this.ctx.fillStyle = '#000';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(hotspot.label, hotspot.x, hotspot.y);
        
        console.log(`  ✅ Hotspot ${hotspot.label} drawn`);
    }

    /**
     * Bestimmt Hotspot-Farbe basierend auf Inhalt
     */
    getHotspotColor(hotspot) {
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

    /**
     * Lädt Canvas mit Bild
     */
    loadImage(imageData) {
        const img = new Image();
        img.onload = () => {
            this.canvas.width = img.width;
            this.canvas.height = img.height;
            this.ctx.drawImage(img, 0, 0);
            this.redraw();
            console.log(`✅ Canvas loaded: ${this.canvas.width}x${this.canvas.height}`);
        };
        img.onerror = () => {
            console.error('Failed to load image');
            alert('Fehler beim Laden des Bildes');
        };
        img.src = imageData;
    }

    /**
     * Hebt Hotspot durch Blinken hervor (für falsche Antworten)
     */
    highlightHotspot(hotspot) {
        console.log('💡 Highlighting hotspot:', hotspot.label);
        
        let blinkCount = 0;
        const maxBlinks = 3;
        const blinkInterval = 250; // ms
        
        const blinkTimer = setInterval(() => {
            // Toggle zwischen sichtbar und unsichtbar
            if (blinkCount % 2 === 0) {
                // Zeichne Hotspot in Rot mit minimalem Radius (10px)
                this.ctx.beginPath();
                this.ctx.arc(hotspot.x, hotspot.y, 10, 0, 2 * Math.PI);
                this.ctx.fillStyle = 'rgba(244, 67, 54, 0.7)';
                this.ctx.fill();
                this.ctx.strokeStyle = '#F44336';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();
                
                // Label
                this.ctx.fillStyle = '#FFF';
                this.ctx.font = 'bold 16px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(hotspot.label, hotspot.x, hotspot.y);
            } else {
                // Redraw normal (versteckt den Hotspot wieder)
                this.redraw();
            }
            
            blinkCount++;
            
            if (blinkCount >= maxBlinks * 2) {
                clearInterval(blinkTimer);
                this.redraw(); // Zurück zu normalem Zustand
            }
        }, blinkInterval);
    }
}

// Export als globale Variable
window.CanvasManager = CanvasManager;