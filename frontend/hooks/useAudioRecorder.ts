import { useState, useRef, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

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
  // Web: MediaRecorder-based (replaces Web Speech API)
  const mediaRecorderRef = useRef<{ recorder: MediaRecorder; chunks: Blob[]; stream: MediaStream } | null>(null);
  const recordingCancelledRef = useRef(false);
  // Native: expo-av based
  const transcriptRef = useRef<string>('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // ========== WEB: MediaRecorder → OpenAI Whisper ==========
  // Replaces the old Web Speech API approach.
  // Advantages: no session restarts, no duplicates, superior accuracy, works on all browsers.
  const startRecordingWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Pick the best supported MIME type (Chrome = webm/opus, Safari = mp4)
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/mp4')              ? 'audio/mp4' :
        '';

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorderRef.current = { recorder, chunks, stream };
      recordingCancelledRef.current = false;
      recorder.start(1000); // collect a chunk every second

      isRecordingRef.current = true;
      setIsRecording(true);
      setError(null);
      startTimer();
      console.log('🎤 MediaRecorder started, mimeType:', mimeType || 'browser default');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permissão de microfone negada. Habilite nas configurações do navegador.');
      } else {
        setError('Erro ao acessar o microfone. Verifique as permissões.');
      }
      throw err;
    }
  };

  const stopRecordingWeb = (): Promise<string | null> => {
    return new Promise((resolve) => {
      const current = mediaRecorderRef.current;
      if (!current) {
        resolve(null);
        return;
      }

      const { recorder, chunks, stream } = current;

      recorder.onstop = async () => {
        // Release microphone
        stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;

        // If the user cancelled, don't transcribe
        if (recordingCancelledRef.current) {
          resolve(null);
          return;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(chunks, { type: mimeType });

        if (blob.size === 0) {
          resolve(null);
          return;
        }

        // Map MIME type to file extension Whisper expects
        const ext =
          mimeType.includes('mp4') ? 'mp4' :
          mimeType.includes('ogg') ? 'ogg' :
          'webm';

        try {
          const formData = new FormData();
          formData.append('audio', blob, `recording.${ext}`);
          // api service handles auth token injection automatically
          const response = await api.post('/api/transcribe', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          resolve(response.data.text || null);
          console.log('✅ Whisper transcript:', response.data.text);
        } catch (err: any) {
          console.error('Whisper transcription error:', err);
          setError('Erro na transcrição. Tente novamente.');
          resolve(null);
        }
      };

      // Trigger onstop
      try {
        recorder.stop();
      } catch (e) {
        // Already stopped
        stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
        resolve(null);
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
      const current = mediaRecorderRef.current;
      if (current) {
        recordingCancelledRef.current = true; // Signal onstop to skip transcription
        isRecordingRef.current = false;
        current.stream.getTracks().forEach(track => track.stop());
        try { current.recorder.stop(); } catch (e) {}
        mediaRecorderRef.current = null;
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
