import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';

/**
 * Counts the words in a given string.
 * @param text The string to count words from.
 * @returns The number of words.
 */
function countWords(text: string): number {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // This regex splits on any whitespace character and filters out empty strings.
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * A simple debounce utility function for the browser.
 * @param func The function to debounce.
 * @param delay The debounce delay in milliseconds.
 * @returns A debounced version of the function.
 */
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), delay);
  };
}

interface WordCountBarProps {
  count: number;
  goal: number;
}

function WordCountBar({ count, goal }: WordCountBarProps) {
  const progress = Math.min((count / goal) * 100, 100);

  return (
    <div className="word-count-bar" aria-live="polite">
      <div className="word-count-bar-content">
        <div className="word-count-text">
          Word Count: <span>{count}</span> / {goal}
        </div>
        <div className="progress-bar-container" title={`${progress.toFixed(0)}% complete`}>
          <div
            className="progress-bar-fill"
            style={{ width: `${progress}%` }}
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          ></div>
        </div>
      </div>
    </div>
  );
}

const JOURNAL_GOAL = 750;
const AUTOSAVE_DELAY = 2000; // 2 seconds

function JournalEditor() {
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [status, setStatus] = useState('Ready');

  const getTodaysDateKey = () => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `journal-entry-${today}`;
  };

  // Fetch today's entry from localStorage on initial load
  useEffect(() => {
    try {
      setStatus('Loading...');
      const savedContent = localStorage.getItem(getTodaysDateKey());
      if (savedContent !== null) {
        setText(savedContent);
        setWordCount(countWords(savedContent));
      }
      setStatus('Ready');
    } catch (error) {
      console.error('Failed to load entry from localStorage:', error);
      setStatus('Error loading');
    }
  }, []);

  // Save function using localStorage
  const saveEntry = useCallback((newText: string) => {
    setStatus('Saving...');
    try {
      localStorage.setItem(getTodaysDateKey(), newText);
      // Simulate async save for better UX feedback
      setTimeout(() => setStatus('Saved'), 500);
    } catch (error) {
      console.error('Failed to save entry to localStorage:', error);
      setStatus('Save failed');
    }
  }, []);
  
  // Create a debounced version of the save function
  const debouncedSave = useCallback(
    debounce(saveEntry, AUTOSAVE_DELAY),
    [saveEntry]
  );

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = event.target.value;
    setText(newText);
    setWordCount(countWords(newText));
    setStatus('Typing...');
    debouncedSave(newText);
  };

  return (
    <div className="journal-editor">
      <header className="editor-header">
          <h1>Vibe Coding</h1>
          <p>Your daily journaling space.</p>
      </header>
      <main className="editor-container">
        <textarea
          className="editor-textarea"
          placeholder="Start writing..."
          value={text}
          onChange={handleChange}
          aria-label="Journal Entry"
        />
      </main>
      <footer className="status-text" aria-live="polite">{status}</footer>
      <WordCountBar count={wordCount} goal={JOURNAL_GOAL} />
    </div>
  );
}

function App() {
  return <JournalEditor />;
}

const container = document.getElementById('root');
if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
}