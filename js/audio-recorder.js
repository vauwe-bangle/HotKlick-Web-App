/**
 * Audio Recorder
 */
class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.isRecording = false;
        this.recordingStartTime = 0;
        this.timerInterval = null;
        this.currentAudioBlob = null;
    }

    async initialize() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true } 
            });
            console.log('✅ Microphone access granted');
            return true;
        } catch (error) {
            console.error('❌ Microphone access denied:', error);
            alert('Mikrofon-Zugriff verweigert. Bitte erlaube den Zugriff.');
            return false;
        }
    }

    async startRecording() {
        if (this.isRecording) return;

        if (!this.stream) {
            const initialized = await this.initialize();
            if (!initialized) return false;
        }

        this.audioChunks = [];
        this.currentAudioBlob = null;

        try {
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus'
            });
        } catch (e) {
            this.mediaRecorder = new MediaRecorder(this.stream);
        }

        this.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.audioChunks.push(event.data);
            }
        };

        this.mediaRecorder.onstop = () => {
            this.currentAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
            console.log(`✅ Recording stopped. Size: ${(this.currentAudioBlob.size / 1024).toFixed(2)} KB`);
        };

        this.mediaRecorder.start();
        this.isRecording = true;
        this.recordingStartTime = Date.now();
        this.startTimer();

        console.log('🎤 Recording started');
        return true;
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return null;

        this.mediaRecorder.stop();
        this.isRecording = false;
        this.stopTimer();

        console.log('⏹ Recording stopped');
        return this.currentAudioBlob;
    }

    startTimer() {
        const display = document.getElementById('recordingTime');
        if (!display) return;

        display.style.display = 'block';

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.recordingStartTime;
            const seconds = Math.floor(elapsed / 1000);
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;

            display.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
        }, 100);
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    getAudioBlob() {
        return this.currentAudioBlob;
    }

    showPreview(audioBlob) {
        const preview = document.getElementById('audioPreview');
        if (!preview) return;

        const audioUrl = URL.createObjectURL(audioBlob);
        preview.src = audioUrl;
        preview.style.display = 'block';
        preview.load();
    }

    cleanup() {
        this.stopTimer();
        
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }

        this.audioChunks = [];
        this.currentAudioBlob = null;
    }
}

window.AudioRecorder = AudioR