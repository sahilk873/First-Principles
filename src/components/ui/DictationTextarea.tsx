'use client';

import { useState, useRef, useEffect, TextareaHTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface DictationTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  label?: string;
  error?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

export const DictationTextarea = forwardRef<HTMLTextAreaElement, DictationTextareaProps>(
  ({ label, error, hint, value, onChange, className, disabled, placeholder, rows = 4, ...props }, ref) => {
    const [isListening, setIsListening] = useState(false);
    const [isSupported, setIsSupported] = useState(false);
    const recognitionRef = useRef<ISpeechRecognition | null>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Combine refs
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(textareaRef.current);
        } else {
          ref.current = textareaRef.current;
        }
      }
    }, [ref]);

    useEffect(() => {
      // Check for Web Speech API support
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsSupported(!!SpeechRecognitionAPI);

      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI() as ISpeechRecognition;
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }

      return () => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      };
    }, []);

    // Update the onresult handler when value changes
    useEffect(() => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }
          
          if (finalTranscript) {
            const newValue = value ? `${value} ${finalTranscript}` : finalTranscript;
            onChange(newValue.trim());
          }
        };
      }
    }, [value, onChange]);

    const toggleDictation = () => {
      if (!recognitionRef.current) return;

      if (isListening) {
        recognitionRef.current.stop();
        setIsListening(false);
      } else {
        recognitionRef.current.start();
        setIsListening(true);
      }
    };

    return (
      <div className="w-full">
        {label && (
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-slate-700">{label}</label>
            {isSupported && (
              <button
                type="button"
                onClick={toggleDictation}
                disabled={disabled}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  isListening
                    ? 'bg-rose-100 text-rose-700 animate-pulse'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                  disabled && 'opacity-50 cursor-not-allowed'
                )}
              >
                {isListening ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </span>
                    Stop Recording
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                    Dictate
                  </>
                )}
              </button>
            )}
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={clsx(
              'w-full rounded-lg border bg-white px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition-all',
              'focus:outline-none focus:ring-2 resize-none',
              error
                ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20'
                : isListening
                ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20 bg-rose-50/30'
                : 'border-slate-300 focus:border-blue-500 focus:ring-blue-500/20',
              disabled && 'bg-slate-50 cursor-not-allowed',
              className
            )}
            {...props}
          />

          {/* Dictation indicator */}
          {isListening && (
            <div className="absolute bottom-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
              Listening...
            </div>
          )}
        </div>

        {hint && !error && <p className="mt-1.5 text-sm text-slate-500">{hint}</p>}
        {error && <p className="mt-1.5 text-sm text-rose-600">{error}</p>}

        {!isSupported && (
          <p className="mt-1.5 text-xs text-slate-400">
            Voice dictation is not supported in this browser
          </p>
        )}
      </div>
    );
  }
);

DictationTextarea.displayName = 'DictationTextarea';
