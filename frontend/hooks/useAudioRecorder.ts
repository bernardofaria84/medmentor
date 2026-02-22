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
  
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<((text: string | null) => void) | null>(null);

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
    // Check for Speech Recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.');
      throw new Error('SpeechRecognition not supported');
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    transcriptRef.current = '';
    
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript + ' ';
        } else {
          interimTranscript += result[0].transcript;
        }
      }
      
      transcriptRef.current = (finalTranscript + interimTranscript).trim();
      console.log('🎤 Transcript update:', transcriptRef.current);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Permissão de microfone negada. Habilite nas configurações do navegador.');
      } else if (event.error === 'no-speech') {
        // This is normal - no speech detected yet
        console.log('No speech detected, continuing...');
      } else {
        setError(`Erro no reconhecimento: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      // If we're still in recording state, the user hasn't stopped yet
      // Resolve any pending promise
      if (resolveRef.current) {
        const text = transcriptRef.current.trim();
        resolveRef.current(text || null);
        resolveRef.current = null;
      }
      setIsRecording(false);
      stopTimer();
    };

    recognitionRef.current = recognition;
    
    try {
      recognition.start();
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
