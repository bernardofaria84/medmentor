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

    // Reset transcript accumulator for new recording
    transcriptRef.current = '';

    // Creates a NEW recognition instance — Chrome requires a fresh object on each restart
    const createSession = (): any => {
      const rec = new SpeechRecognition();
      rec.lang = 'pt-BR';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      // Track the highest result index already processed as final in THIS session.
      // This prevents re-processing when Chrome fires onresult with resultIndex=0
      // for previously finalized results (which causes the duplication bug).
      let lastProcessedFinalIndex = -1;

      rec.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          // Only process final results we haven't seen yet
          if (result.isFinal && i > lastProcessedFinalIndex) {
            transcriptRef.current = (transcriptRef.current + ' ' + result[0].transcript).trim();
            lastProcessedFinalIndex = i;
          }
        }
        console.log('🎤 Transcript:', transcriptRef.current);
      };

      rec.onerror = (event: any) => {
        // 'no-speech' and 'network' are recoverable — onend will fire and we restart
        if (event.error === 'not-allowed') {
          setError('Permissão de microfone negada. Habilite nas configurações do navegador.');
          isRecordingRef.current = false;
          setIsRecording(false);
          stopTimer();
        } else {
          console.warn('Speech recognition error (recoverable):', event.error);
        }
      };

      rec.onend = () => {
        console.log('Recognition session ended. isRecording:', isRecordingRef.current, 'hasResolver:', !!resolveRef.current);

        if (isRecordingRef.current && !resolveRef.current) {
          // Auto-restart with a BRAND NEW instance after a small delay
          // Chrome does NOT allow restarting the same recognition object after onend
          setTimeout(() => {
            if (!isRecordingRef.current || resolveRef.current) return;
            try {
              const newSession = createSession();
              newSession.start();
              recognitionRef.current = newSession;
              console.log('🔄 Recognition session restarted');
            } catch (e) {
              console.error('Failed to restart recognition:', e);
            }
          }, 150);
          return;
        }

        // User pressed stop — resolve with accumulated transcript
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
      console.log('🎤 Speech recognition started (pt-BR)');
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
