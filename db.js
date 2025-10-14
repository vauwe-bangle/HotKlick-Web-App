/**
 * HotKlick Database Handler
 * IndexedDB Wrapper für Exercises und Hotspots
 */

class Database {
    constructor() {
        this.db = null;
        this.DB_NAME = 'HotKlickDB';
        this.DB_VERSION = 1;
    }

    /**
     * Initialisiert die Datenbank
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

            request.onerror = () => {
                console.error('Database error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database initialized');
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Exercises Store
                if (!db.objectStoreNames.contains('exercises')) {
                    const exerciseStore = db.createObjectStore('exercises', { keyPath: 'id' });
                    exerciseStore.createIndex('name', 'name', { unique: false });
                    exerciseStore.createIndex('createdAt', 'createdAt', { unique: false });
                    console.log('Created exercises store');
                }

                // Hotspots Store
                if (!db.objectStoreNames.contains('hotspots')) {
                    const hotspotStore = db.createObjectStore('hotspots', { keyPath: 'id' });
                    hotspotStore.createIndex('exerciseId', 'exerciseId', { unique: false });
                    console.log('Created hotspots store');
                }
            };
        });
    }

    // ============================================
    // EXERCISE METHODS
    // ============================================

    /**
     * Fügt eine neue Übung hinzu
     */
    async addExercise(exercise) {
        const tx = this.db.transaction(['exercises'], 'readwrite');
        const store = tx.objectStore('exercises');
        
        return new Promise((resolve, reject) => {
            const request = store.add(exercise);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Gibt alle Übungen zurück
     */
    async getAllExercises() {
        const tx = this.db.transaction(['exercises'], 'readonly');
        const store = tx.objectStore('exercises');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Gibt eine spezifische Übung zurück
     */
    async getExercise(id) {
        const tx = this.db.transaction(['exercises'], 'readonly');
        const store = tx.objectStore('exercises');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Aktualisiert eine Übung
     */
    async updateExercise(exercise) {
        const tx = this.db.transaction(['exercises'], 'readwrite');
        const store = tx.objectStore('exercises');
        exercise.updatedAt = Date.now();
        
        return new Promise((resolve, reject) => {
            const request = store.put(exercise);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Löscht eine Übung und alle zugehörigen Hotspots
     */
    async deleteExercise(id) {
        return new Promise(async (resolve, reject) => {
            const tx = this.db.transaction(['exercises', 'hotspots'], 'readwrite');
            
            try {
                // Delete exercise
                const exerciseStore = tx.objectStore('exercises');
                await this._promisifyRequest(exerciseStore.delete(id));
                
                // Delete all associated hotspots
                const hotspotStore = tx.objectStore('hotspots');
                const index = hotspotStore.index('exerciseId');
                const hotspots = await this._getAllFromIndex(index, id);
                
                for (const hotspot of hotspots) {
                    await this._promisifyRequest(hotspotStore.delete(hotspot.id));
                }
                
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    // ============================================
    // HOTSPOT METHODS
    // ============================================

    /**
     * Fügt einen neuen Hotspot hinzu
     */
    async addHotspot(hotspot) {
        const tx = this.db.transaction(['hotspots'], 'readwrite');
        const store = tx.objectStore('hotspots');
        
        return new Promise((resolve, reject) => {
            const request = store.add(hotspot);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Gibt alle Hotspots einer Übung zurück
     */
    async getHotspots(exerciseId) {
        const tx = this.db.transaction(['hotspots'], 'readonly');
        const store = tx.objectStore('hotspots');
        const index = store.index('exerciseId');
        return this._getAllFromIndex(index, exerciseId);
    }

    /**
     * Gibt einen spezifischen Hotspot zurück
     */
    async getHotspot(id) {
        const tx = this.db.transaction(['hotspots'], 'readonly');
        const store = tx.objectStore('hotspots');
        
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Aktualisiert einen Hotspot
     */
    async updateHotspot(hotspot) {
        const tx = this.db.transaction(['hotspots'], 'readwrite');
        const store = tx.objectStore('hotspots');
        
        return new Promise((resolve, reject) => {
            const request = store.put(hotspot);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Löscht einen Hotspot
     */
    async deleteHotspot(id) {
        const tx = this.db.transaction(['hotspots'], 'readwrite');
        const store = tx.objectStore('hotspots');
        
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================
    // HELPER METHODS
    // ============================================

    /**
     * Gibt alle Einträge aus einem Index zurück
     */
    _getAllFromIndex(index, key) {
        return new Promise((resolve, reject) => {
            const request = index.getAll(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Macht einen Request zu einem Promise
     */
    _promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Generiert eine eindeutige ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}

// Export als globale Variable
window.Database = Database;