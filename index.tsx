import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

// --- UTILITY FUNCTIONS ---

/**
 * Counts the words in a given string.
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * A simple debounce utility function.
 */
function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), delay);
  };
}

/**
 * Formats a Date object into a YYYY-MM-DD string.
 */
const toDateKey = (date: Date): string => date.toISOString().split('T')[0];

/**
 * Formats a Date object for display (e.g., "Sunday, October 19th, 2025").
 */
const formatDateForDisplay = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  // Suffix for the day (st, nd, rd, th)
  const day = date.getDate();
  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  if (day % 10 === 2 && day !== 12) suffix = 'nd';
  if (day % 10 === 3 && day !== 13) suffix = 'rd';
  
  return date.toLocaleDateString('en-US', options).replace(`, ${day},`, ` ${day}${suffix},`);
};

/**
 * Returns a shade of green based on the word count.
 */
const getWordCountColor = (count: number): string => {
    if (count >= 750) return '#2e7d32'; // Darkest green
    if (count >= 500) return '#4caf50'; // Dark green
    if (count >= 250) return '#81c784'; // Medium green
    if (count > 0) return '#c8e6c9';   // Lightest green
    return ''; // Default color from CSS
};


// --- COMPONENTS ---

interface MonthlyStreakTrackerProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    entries: Map<string, number>; // Map of 'YYYY-MM-DD' to word count
}

function MonthlyStreakTracker({ selectedDate, onDateSelect, entries }: MonthlyStreakTrackerProps) {
    const today = useMemo(() => new Date(), []);
    today.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();
    const totalDaysCompleted = entries.size;

    const handleDayClick = (day: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(day);
        if (newDate > today) return; // Don't allow selecting future dates
        onDateSelect(newDate);
    };

    const renderDaySquares = () => {
        const squares = [];
        for (let i = 1; i <= 31; i++) {
            if (i <= daysInMonth) {
                const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i);
                const dateKey = toDateKey(date);
                const isToday = toDateKey(today) === dateKey;
                const isSelected = toDateKey(selectedDate) === dateKey;
                const wordCount = entries.get(dateKey) || 0;
                const isFuture = date > today;
                
                let className = 'day-square';
                if (isSelected) className += ' is-selected';
                if (isToday) className += ' is-today';
                if (isFuture) className += ' is-future';
                
                const style = { backgroundColor: getWordCountColor(wordCount) };

                squares.push(<div key={i} className={className} style={style} onClick={() => handleDayClick(i)} title={date.toLocaleDateString()}></div>);
            } else {
                 squares.push(<div key={i} className="day-square is-invisible"></div>);
            }
        }
        return squares;
    };
    
    return (
        <div className="streak-tracker-container">
            <div className="day-grid">{renderDaySquares()}</div>
            <div className="streak-info">{totalDaysCompleted} days completed</div>
        </div>
    );
}


const AUTOSAVE_DELAY = 1500;

function JournalView() {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [text, setText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [status, setStatus] = useState('Ready');
    const [entries, setEntries] = useState(new Map<string, number>());

    // Load all entry keys and word counts on initial mount
    useEffect(() => {
        const allEntryData = new Map<string, number>();
        const allKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('journal-entry-'));
            
        allKeys.forEach(key => {
            const content = localStorage.getItem(key) || '';
            const wordCount = countWords(content);
            if (wordCount > 0) {
                const dateKey = key.replace('journal-entry-', '');
                allEntryData.set(dateKey, wordCount);
            }
        });
        setEntries(allEntryData);
    }, []);

    // Load content when selectedDate changes
    useEffect(() => {
        const dateKey = toDateKey(selectedDate);
        const savedContent = localStorage.getItem(`journal-entry-${dateKey}`) || '';
        setText(savedContent);
        setWordCount(countWords(savedContent));
        setStatus('Ready');
    }, [selectedDate]);

    const saveEntry = useCallback((dateToSave: Date, newText: string) => {
        setStatus('Saving...');
        try {
            const dateKey = toDateKey(dateToSave);
            const newWordCount = countWords(newText);
            localStorage.setItem(`journal-entry-${dateKey}`, newText);
            
            setEntries(prev => {
                const newMap = new Map(prev);
                if (newWordCount > 0) {
                    newMap.set(dateKey, newWordCount);
                } else {
                    newMap.delete(dateKey);
                }
                return newMap;
            });
            
            setTimeout(() => setStatus('Saved'), 500);
        } catch (error) {
            console.error('Failed to save entry:', error);
            setStatus('Save failed');
        }
    }, []);

    const debouncedSave = useMemo(() => 
        debounce((date: Date, newText: string) => saveEntry(date, newText), AUTOSAVE_DELAY),
        [saveEntry]
    );

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newText = event.target.value;
        setText(newText);
        setWordCount(countWords(newText));
        setStatus('Typing...');
        debouncedSave(selectedDate, newText);
    };

    const handleMonthChange = (direction: number) => {
        setSelectedDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setMonth(newDate.getMonth() + direction, 1); // Set to day 1 to avoid month-end issues
            return newDate;
        });
    };
    
    return (
        <>
            <header className="app-header">
                <div className="app-title">750 Words</div>
                <h1 className="date-display">{formatDateForDisplay(selectedDate)}</h1>
                <nav className="month-nav">
                    <button onClick={() => handleMonthChange(-1)} aria-label="Previous month">◀ Sep</button>
                    <span>{selectedDate.toLocaleString('en-US', { month: 'long' })}</span>
                    <button onClick={() => handleMonthChange(1)} aria-label="Next month">Oct ▶</button>
                </nav>
                <MonthlyStreakTracker 
                    selectedDate={selectedDate} 
                    onDateSelect={setSelectedDate}
                    entries={entries}
                />
            </header>
            <main className="editor-container">
                <textarea
                    className="editor-textarea"
                    placeholder="Write something here..."
                    value={text}
                    onChange={handleChange}
                    aria-label={`Journal entry for ${formatDateForDisplay(selectedDate)}`}
                />
            </main>
            <footer className="app-footer">
                Word Count: {wordCount} | {status}
            </footer>
        </>
    );
}

function App() {
  return (
    <div className="app-container">
      <JournalView />
    </div>
  );
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