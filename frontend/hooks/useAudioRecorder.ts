import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isTranscribing: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string | null>;
  cancelRecording: () => void;
  error: string | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const isRecordingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((text: string | null) => void) | null>(null);
  const MAX_DURATION = 180; // 3 minutes

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (e) {}
      }
    };
  }, []);

  const startTimer = () => {
    setRecordingDuration(0);
    timerRef.current = setInterval(() => {
      setRecordingDuration(prev => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  // ========== WEB: Use Browser's Speech Recognition API ==========
  const startRecordingWeb = async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      throw new Error('SpeechRecognition not supported');
    }

    transcriptRef.current = '';

    // ── Cross-session deduplication ──────────────────────────────────────────
    // When Chrome restarts a session it may re-process buffered audio from the
    // previous session, causing the same words to appear twice.
    // This function removes any suffix-prefix overlap between what was already
    // captured (existing) and the new chunk just received from the new session.
    const deduplicateOverlap = (existing: string, newChunk: string): string => {
      if (!existing || !newChunk) return newChunk;
      const existingWords = existing.trim().split(/\s+/);
      const newWords = newChunk.trim().split(/\s+/);
      const maxCheck = Math.min(existingWords.length, newWords.length, 20);
      for (let n = maxCheck; n >= 2; n--) {
        const tail = existingWords.slice(-n).join(' ').toLowerCase();
        const head = newWords.slice(0, n).join(' ').toLowerCase();
        if (tail === head) {
          console.log(`🔍 Dedup: removed ${n} overlapping words`);
          return newWords.slice(n).join(' ');
        }
      }
      return newChunk;
    };

    // Prevent multiple simultaneous restart attempts
    let restartCooldown = false;

    // Creates a NEW recognition instance — Chrome requires a fresh object on restart
    const createSession = (): any => {
      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      // KEY: interimResults=false → Chrome only fires onresult for FINALIZED phrases.
      // interimResults=true causes the "estou estou estou com estou com uma..." 
      // accumulation pattern on Chrome mobile/Android (each growing interim 
      // update fires as isFinal=true on some platforms).
      rec.interimResults = false;
      rec.maxAlternatives = 1;

      let lastProcessedIndex = -1;

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal && i > lastProcessedIndex) {
            const chunk = event.results[i][0].transcript.trim();
            if (chunk) {
              // Remove any overlap with previously captured text (cross-session dedup)
              const clean = deduplicateOverlap(transcriptRef.current, chunk);
              if (clean) {
                transcriptRef.current = (transcriptRef.current + ' ' + clean).trim();
              }
            }
            lastProcessedIndex = i;
          }
        }
        console.log('🎤 Transcript:', transcriptRef.current);
      };

      rec.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setError('Permissão de microfone negada. Habilite nas configurações do navegador.');
          isRecordingRef.current = false;
          setIsRecording(false);
          stopTimer();
        } else {
          // 'no-speech', 'network', 'aborted' — recoverable, onend will handle restart
          console.warn('Speech recognition error (recoverable):', event.error);
        }
      };

      rec.onend = () => {
        console.log('Session ended. isRecording:', isRecordingRef.current, 'resolver:', !!resolveRef.current);

        if (isRecordingRef.current && !resolveRef.current && !restartCooldown) {
          // Cooldown prevents multiple rapid restarts if Chrome fires onend repeatedly
          restartCooldown = true;
          setTimeout(() => {
            restartCooldown = false;
            if (!isRecordingRef.current || resolveRef.current) return;
            try {
              const newSession = createSession();
              newSession.start();
              recognitionRef.current = newSession;
              console.log('🔄 Session restarted');
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }, 300);
          return;
        }

        // User pressed stop — resolve with full accumulated transcript
        if (resolveRef.current) {
          resolveRef.current(transcriptRef.current.trim() || null);
          resolveRef.current = null;
        }
        isRecordingRef.current = false;
        setIsRecording(false);
        stopTimer();
      };

      return rec;
    };

    try {
      const recognition = createSession();
      recognition.start();
      recognitionRef.current = recognition;
      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
      startTimer();
      console.log('🎤 Speech recognition started (pt-BR, continuous, no interims)');
    } catch (err: any) {
      console.error('Error starting speech recognition:', err);
      setError('Erro ao iniciar reconhecimento de voz');
      throw err;
    }
  };

  const stopRecordingWeb = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        resolve(transcriptRef.current.trim() || null);
        return;
      }

      // Set up resolve for when onend fires
      resolveRef.current = resolve;
      
      // Stop recognition - this triggers onend
      try {
        recognition.stop();
      } catch (e) {
        // Already stopped
        const text = transcriptRef.current.trim();
        resolve(text || null);
        resolveRef.current = null;
      }
    });
  };

  // ========== NATIVE: Use expo-av recording + backend transcription ==========
  const recordingObjRef = useRef<any>(null);

  const startRecordingNative = async () => {
    try {
      const { Audio } = require('expo-av');
      
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Permissão de microfone negada');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      await recording.startAsync();
      
      recordingObjRef.current = recording;
      setIsRecording(true);
      setError(null);
      startTimer();
    } catch (err: any) {
      console.error('Error starting native recording:', err);
      setError('Erro ao iniciar gravação');
      throw err;
    }
  };

  const stopRecordingNative = async (): Promise<string | null> => {
    // Native path: record and try to transcribe via backend
    // If backend fails, return null with error message
    try {
      const recording = recordingObjRef.current;
      if (!recording) return null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingObjRef.current = null;
      
      const { Audio } = require('expo-av');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      if (!uri) return null;

      // Try to send to backend for transcription
      setIsTranscribing(true);
      const api = require('../services/api').default;
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'recording.m4a';
      formData.append('audio', {
        uri,
        name: filename,
        type: 'audio/m4a',
      } as any);

      const response = await api.post('/api/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      return response.data.text;
    } catch (err: any) {
      console.error('Native transcription error:', err);
      setError('Gravação capturada, mas transcrição falhou. Tente usar o navegador Chrome para reconhecimento de voz.');
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

  // ========== PUBLIC API ==========
  
  const startRecording = useCallback(async () => {
    setError(null);
    try {
      if (Platform.OS === 'web') {
        await startRecordingWeb();
      } else {
        await startRecordingNative();
      }
    } catch (err) {
      setIsRecording(false);
      stopTimer();
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string | null> => {
    stopTimer();

    try {
      if (Platform.OS === 'web') {
        setIsTranscribing(true);
        const text = await stopRecordingWeb();
        setIsTranscribing(false);
        setIsRecording(false);
        return text;
      } else {
        setIsRecording(false);
        return await stopRecordingNative();
      }
    } catch (err) {
      console.error('Error in stopRecording:', err);
      setError('Erro ao processar gravação');
      setIsRecording(false);
      setIsTranscribing(false);
      return null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    stopTimer();
    setIsRecording(false);
    setRecordingDuration(0);
    setError(null);
    transcriptRef.current = '';

    if (Platform.OS === 'web') {
      const recognition = recognitionRef.current;
      if (recognition) {
        isRecordingRef.current = false; // Prevent auto-restart in onend
        resolveRef.current = null; // Don't resolve on cancel
        try { recognition.abort(); } catch (e) {}
        recognitionRef.current = null;
      }
    } else {
      const recording = recordingObjRef.current;
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
        recordingObjRef.current = null;
      }
    }
  }, []);

  return {
    isRecording,
    isTranscribing,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    error,
  };
}
