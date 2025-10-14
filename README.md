# HotKlick-Web-App
Einem Bild werden Hotspots zugeordnet, welchen Text und Audio hinterlegt sind. Hotspots are assigned to an image, and these hotspots contain associated text and audio content.

# 🎯 HotKlick Web-App

Interaktive Lern-App mit Hotspots auf Bildern - Progressive Web App (PWA)

## 📁 Projektstruktur

```
hotklick-web/
├── index.html              # Haupt-HTML-Datei
├── manifest.json           # PWA Manifest (wird später erstellt)
├── sw.js                   # Service Worker (wird später erstellt)
│
├── css/
│   └── main.css           # ✅ Haupt-Stylesheet (komplett)
│
└── js/
    ├── db.js              # ✅ IndexedDB Handler (komplett)
    └── app.js             # ✅ Haupt-App Logik (Phase 1)
```

## ✅ Phase 1 - Abgeschlossen

### Was funktioniert:
- ✅ **IndexedDB Setup** - Vollständige Datenbankstruktur
- ✅ **Übungsmanagement** - Erstellen, Laden, Speichern
- ✅ **Bildupload** - Mit Validierung (Typ & Größe)
- ✅ **Übungsliste** - Grid-Layout mit Karten
- ✅ **Navigation** - Screen-Wechsel & Back-Button
- ✅ **Canvas-Rendering** - Bild wird korrekt dargestellt
- ✅ **Modal-Dialoge** - Für neue Übungen
- ✅ **Responsive Design** - Desktop & Mobile optimiert
- ✅ **Mode-Toggle** - Edit/Practice/Deepening (UI)

### Datenbank-Schema:

#### Exercises
```javascript
{
  id: "abc123",
  name: "Anatomie Herz",
  imageName: "heart.jpg",
  imageData: "data:image/jpeg;base64,...",
  createdAt: 1634567890000,
  updatedAt: 1634567890000
}
```

#### Hotspots
```javascript
{
  id: "xyz789",
  exerciseId: "abc123",
  x: 250.5,
  y: 180.3,
  radius: 20,
  label: "A1",
  text: "Rechte Herzkammer",
  audioBlob: Blob | null,
  hasText: true,
  hasAudio: false
}
```

## 🎨 Design-Prinzipien

### Farbschema (wie Android-App)
```css
--primary: #2196F3        /* Material Blue */
--secondary: #FF9800      /* Orange */
--success: #4CAF50        /* Green */
--danger: #F44336         /* Red */
--warning: #FFC107        /* Yellow */
```

### Hotspot-Farben
- 🔴 **Rot**: Nur Koordinaten (leer)
- 🟡 **Gelb**: Nur Text
- 🔵 **Blau**: Nur Audio
- 🟢 **Grün**: Text + Audio (komplett)

## 🚀 Installation & Start

### Lokale Entwicklung
1. Alle Dateien in einen Ordner kopieren
2. Mit einem lokalen Webserver starten (z.B. Live Server in VS Code)
3. Browser öffnen: `http://localhost:5500`

### Browser-Anforderungen
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS Safari 14+, Chrome Android 90+

## 📝 Nächste Schritte (Phase 2)

### Editor-Modus Implementation
- [ ] Hotspot-Erstellung bei Click
- [ ] Hotspot-Löschung bei Click auf Hotspot
- [ ] Text-Dialog bei Doppelklick
- [ ] Audio-Dialog bei Dreifach-Klick (oder Lang-Press)
- [ ] Hotspot-Rendering mit Farbcodierung
- [ ] Touch-Events für Mobile

### Technische Details Phase 2
- Canvas Event-Handling mit Koordinaten-Berechnung
- Collision Detection für Hotspot-Clicks
- Modal-Dialoge mit Daten-Binding
- MediaRecorder API für Audio-Aufnahme

## 🔧 Technologie-Stack

### Core
- **Vanilla JavaScript (ES6+)** - Kein Framework
- **IndexedDB** - Lokale Datenspeicherung
- **HTML5 Canvas** - Hotspot-Rendering
- **CSS Grid + Flexbox** - Layout

### APIs (geplant)
- **MediaRecorder API** - Audio-Aufnahme
- **Web Audio API** - Audio-Wiedergabe
- **File System Access API** - Datei-Handling
- **Service Worker API** - Offline-Funktionalität

### Libraries
- **JSZip** (3.10.1) - ZIP Export/Import

## 📱 Progressive Web App Features (geplant)

- [ ] Offline-Verfügbarkeit
- [ ] Installierbar auf Home-Screen
- [ ] App-ähnliches Gefühl
- [ ] Push-Benachrichtigungen (optional)

## 🐛 Bekannte Einschränkungen

### Phase 1
- Canvas-Clicks noch ohne Funktion
- Hotspot-Erstellung noch nicht implementiert
- Audio-Funktionalität fehlt
- Keine Touch-Gesten für Mobile

## 📄 Lizenz

Zu definieren

## 👨‍💻 Entwicklung

### Ordnung im Code
- ✅ CSS ausgelagert in `css/main.css`
- ✅ JavaScript modular aufgeteilt
- ✅ Kommentierte Code-Sections
- ✅ Konsistente Namenskonventionen

### Code-Konventionen
- CamelCase für Variablen/Funktionen
- PascalCase für Klassen
- Kebab-case für CSS-Klassen
- Sprechende Namen (deutsch für UI, englisch für Code)

---

**Status:** 🟢 Phase 1 abgeschlossen - Bereit für Phase 2!