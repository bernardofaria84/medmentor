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
  
  const recordingRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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

  const startRecordingWeb = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error('Error starting web recording:', err);
      if (err.name === 'NotAllowedError') {
        setError('Permissão de microfone negada. Por favor, habilite nas configurações do navegador.');
      } else {
        setError('Erro ao acessar o microfone');
      }
      throw err;
    }
  };

  const stopRecordingWeb = async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        
        // Stop all tracks
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        
        resolve(blob);
      };

      mediaRecorder.stop();
    });
  };

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
      
      recordingRef.current = recording;
      setIsRecording(true);
      startTimer();
    } catch (err: any) {
      console.error('Error starting native recording:', err);
      setError('Erro ao iniciar gravação');
      throw err;
    }
  };

  const stopRecordingNative = async (): Promise<string | null> => {
    try {
      const recording = recordingRef.current;
      if (!recording) return null;

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;
      
      const { Audio } = require('expo-av');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      return uri;
    } catch (err) {
      console.error('Error stopping native recording:', err);
      return null;
    }
  };

  const transcribeAudio = async (audioData: Blob | string): Promise<string | null> => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        // Web: audioData is a Blob
        formData.append('audio', audioData as Blob, 'recording.webm');
      } else {
        // Native: audioData is a URI string
        const uri = audioData as string;
        const filename = uri.split('/').pop() || 'recording.m4a';
        formData.append('audio', {
          uri,
          name: filename,
          type: 'audio/m4a',
        } as any);
      }

      const response = await api.post('/api/transcribe', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      return response.data.text;
    } catch (err: any) {
      console.error('Transcription error:', err);
      const detail = err.response?.data?.detail || 'Erro na transcrição do áudio';
      setError(detail);
      return null;
    } finally {
      setIsTranscribing(false);
    }
  };

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
    setIsRecording(false);

    try {
      if (Platform.OS === 'web') {
        const blob = await stopRecordingWeb();
        if (!blob || blob.size === 0) {
          setError('Gravação vazia');
          return null;
        }
        return await transcribeAudio(blob);
      } else {
        const uri = await stopRecordingNative();
        if (!uri) {
          setError('Gravação falhou');
          return null;
        }
        return await transcribeAudio(uri);
      }
    } catch (err) {
      console.error('Error in stopRecording:', err);
      setError('Erro ao processar gravação');
      return null;
    }
  }, []);

  const cancelRecording = useCallback(() => {
    stopTimer();
    setIsRecording(false);
    setRecordingDuration(0);

    if (Platform.OS === 'web') {
      const mediaRecorder = mediaRecorderRef.current;
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
      }
      mediaRecorderRef.current = null;
      chunksRef.current = [];
    } else {
      const recording = recordingRef.current;
      if (recording) {
        recording.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
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
