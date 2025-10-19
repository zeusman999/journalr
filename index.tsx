import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title, LineElement, CategoryScale, LinearScale, PointElement } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(ArcElement, Tooltip, Legend, Title, LineElement, CategoryScale, LinearScale, PointElement);

// --- STREAK DEFINITIONS ---
const STREAK_REWARDS = [
    { days: 3, title: '3-Day Habit', description: 'You\'ve written for 3 days in a row!', shape: 'triangle' },
    { days: 7, title: 'Weekly Wordsmith', description: 'A full week of consistent writing.', shape: 'square' },
    { days: 14, title: 'Fortnight Thinker', description: 'Two weeks straight! Your mind must be clear.', shape: 'circle' },
    { days: 30, title: 'Monthly Maven', description: 'An entire month of dedication. Incredible!', shape: 'star' }
];


// --- ANALYSIS DICTIONARY ---

const ANALYSIS_KEYWORDS = {
  feeling: {
    'Anxiety / Fear': ['anxious', 'anxiety', 'fear', 'scared', 'worry', 'worried', 'nervous', 'stress', 'stressful', 'dread', 'afraid', 'panic', 'panicked', 'overwhelmed', 'tense', 'unease', 'terror', 'horror', 'pressure', 'threat'],
    'Joy / Happiness': ['happy', 'joy', 'joyful', 'cheerful', 'delighted', 'ecstatic', 'glad', 'content', 'pleased', 'excited', 'amazing', 'wonderful', 'fantastic', 'great', 'good', 'love', 'blessed', 'grateful', 'thankful', 'vibrant'],
    'Sadness / Grief': ['sad', 'sadness', 'grief', 'cry', 'cried', 'tears', 'unhappy', 'miserable', 'depressed', 'dejected', 'heartbroken', 'despair', 'lonely', 'alone', 'empty', 'down', 'somber', 'regret', 'hurt', 'pain'],
    'Anger / Frustration': ['angry', 'anger', 'mad', 'furious', 'rage', 'frustrated', 'annoyed', 'irritated', 'pissed', 'livid', 'resent', 'bitter', 'outrage', 'fury', 'hate', 'agitated', 'exasperated'],
    'Love / Affection': ['love', 'loving', 'care', 'caring', 'adore', 'cherish', 'affection', 'fond', 'passion', 'passionate', 'heartfelt', 'tender', 'warm', 'connected', 'appreciate', 'relationship', 'friend', 'family'],
  },
  topic: {
    'Work / Career': ['work', 'job', 'career', 'office', 'company', 'project', 'task', 'meeting', 'email', 'boss', 'colleague', 'coworker', 'deadline', 'presentation', 'salary', 'promotion', 'professional', 'corporate', 'business'],
    'Family / Home': ['family', 'home', 'mom', 'dad', 'parent', 'sister', 'brother', 'sibling', 'kids', 'children', 'son', 'daughter', 'husband', 'wife', 'partner', 'house', 'apartment', 'relatives'],
    'Health / Wellness': ['health', 'healthy', 'sick', 'ill', 'doctor', 'hospital', 'medicine', 'pain', 'body', 'mind', 'fitness', 'exercise', 'gym', 'food', 'diet', 'sleep', 'tired', 'energy', 'wellness', 'mental health'],
    'Self / Personal Growth': ['i', 'me', 'my', 'myself', 'feel', 'think', 'believe', 'learn', 'grow', 'improve', 'self', 'goal', 'habit', 'journal', 'read', 'understand', 'reflect', 'introspection', 'mindset', 'future'],
  },
  mindset: {
    'Positive': ['yes', 'can', 'will', 'great', 'good', 'wonderful', 'amazing', 'success', 'achieve', 'accomplished', 'proud', 'confident', 'hopeful', 'optimistic', 'possible', 'certain', 'definite', 'solution', 'resolve', 'clear'],
    'Negative': ['no', 'not', 'can\'t', 'won\'t', 'bad', 'terrible', 'awful', 'failure', 'fail', 'mistake', 'wrong', 'doubt', 'regret', 'hopeless', 'pessimistic', 'impossible', 'problem', 'issue', 'difficult', 'hard'],
    'Certain': ['know', 'knew', 'certainly', 'definitely', 'absolutely', 'will', 'is', 'are', 'was', 'always', 'fact', 'confirm', 'proven', 'understand', 'understood', 'realize'],
    'Uncertain': ['maybe', 'perhaps', 'wonder', 'if', 'could', 'might', 'should', 'possibly', 'guess', 'assume', 'suppose', 'unsure', 'unclear', 'question', 'seem', 'appear'],
  },
  time: {
    'Past': ['yesterday', 'before', 'ago', 'last', 'past', 'remembered', 'recalled', 'reflected', 'was', 'were', 'had', 'did', 'used to', 'previously', 'back then', 'history'],
    'Present': ['today', 'now', 'currently', 'present', 'is', 'am', 'are', 'doing', 'feeling', 'thinking', 'at the moment', 'this', 'here'],
    'Future': ['tomorrow', 'future', 'next', 'soon', 'will', 'plan', 'planning', 'goal', 'hope', 'wish', 'anticipate', 'expect', 'looking forward', 'going to', 'someday'],
  },
  perspective: {
    'I (Self-focused)': ['i', 'me', 'my', 'mine', 'myself'],
    'We (Group-focused)': ['we', 'us', 'our', 'ours', 'ourselves'],
    'Them (Other-focused)': ['he', 'she', 'they', 'him', 'her', 'them', 'his', 'hers', 'theirs', 'that person', 'people'],
  }
};

type AnalysisResult = {
    [category: string]: { [subCategory: string]: number };
};

function analyzeText(text: string): AnalysisResult {
    const words = text.toLowerCase().match(/\b(\w+)\b/g) || [];
    const results: AnalysisResult = {};

    for (const category in ANALYSIS_KEYWORDS) {
        results[category] = {};
        for (const subCategory in ANALYSIS_KEYWORDS[category]) {
            results[category][subCategory] = 0;
            for (const keyword of ANALYSIS_KEYWORDS[category][subCategory]) {
                const regex = new RegExp(`\\b${keyword.replace("'", "'")}\\b`, 'g');
                const matches = text.toLowerCase().match(regex);
                if (matches) {
                    results[category][subCategory] += matches.length;
                }
            }
        }
    }
    return results;
}


// --- UTILITY FUNCTIONS ---

function debounce<T extends (...args: any[]) => void>(func: T, delay: number) {
  let timeout: number;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = window.setTimeout(() => func(...args), delay);
  };
}

const toDateKey = (date: Date): string => date.toISOString().split('T')[0];

const formatDateForDisplay = (date: Date): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  const day = date.getDate();
  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  if (day % 10 === 2 && day !== 12) suffix = 'nd';
  if (day % 10 === 3 && day !== 13) suffix = 'rd';
  
  return date.toLocaleDateString('en-US', options).replace(/(\d+)/, `$1${suffix}`);
};

const getWeekRange = (date: Date): { start: Date, end: Date } => {
    const start = new Date(date);
    const day = start.getDay(); // Sunday - 0, Monday - 1, ...
    const diff = start.getDate() - day; // Adjust to Sunday
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    
    return { start, end };
};

const getWordCountColor = (count: number): string => {
    if (count >= 750) return '#2e7d32';
    if (count >= 500) return '#4caf50';
    if (count >= 250) return '#81c784';
    if (count > 0) return '#c8e6c9';
    return '';
};

function calculateStreaks(entryKeys: string[]): { currentStreak: number, longestStreak: number } {
    if (entryKeys.length === 0) return { currentStreak: 0, longestStreak: 0 };

    const sortedDates = entryKeys.map(key => new Date(key.replace(/-/g, '/'))).sort((a, b) => a.getTime() - b.getTime());
    const dateSet = new Set(entryKeys);
    
    // Calculate Longest Streak
    let longestStreak = 0;
    let currentLongestStreak = 0;
    if (sortedDates.length > 0) {
        longestStreak = 1;
        currentLongestStreak = 1;
        for (let i = 1; i < sortedDates.length; i++) {
            const prevDate = sortedDates[i - 1];
            const currentDate = sortedDates[i];
            const diffTime = currentDate.getTime() - prevDate.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                currentLongestStreak++;
            } else {
                currentLongestStreak = 1;
            }
            if (currentLongestStreak > longestStreak) {
                longestStreak = currentLongestStreak;
            }
        }
    }
    
    // Calculate Current Streak
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let dateToCheck = new Date(today); // Start with today
    
    while (dateSet.has(toDateKey(dateToCheck))) {
        currentStreak++;
        dateToCheck.setDate(dateToCheck.getDate() - 1); // Go to the previous day
    }

    return { currentStreak, longestStreak };
}


// --- DATA STORE ABSTRACTION ---
// This section prepares the app for a real database by abstracting data operations.
// Currently, it uses localStorage, but can be easily swapped out later.

function countWords(text: string): number {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(Boolean).length;
}

const dataStore = {
    async login(email: string): Promise<void> {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userEmail', email);
    },

    async logout(): Promise<void> {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userEmail');
    },

    async isLoggedIn(): Promise<boolean> {
        return localStorage.getItem('isLoggedIn') === 'true';
    },

    async getUserEmail(): Promise<string | null> {
        return localStorage.getItem('userEmail');
    },

    async getEntry(dateKey: string): Promise<string | null> {
        return localStorage.getItem(`journal-entry-${dateKey}`);
    },

    async saveEntry(dateKey: string, content: string): Promise<void> {
        const wordCount = countWords(content);
        if (wordCount > 0) {
            localStorage.setItem(`journal-entry-${dateKey}`, content);
        } else {
            // If the entry is empty, remove it to keep storage clean.
            localStorage.removeItem(`journal-entry-${dateKey}`);
        }
    },

    async getAllEntries(): Promise<Map<string, number>> {
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
        return allEntryData;
    },

    async getAllEntriesWithContent(): Promise<Map<string, string>> {
        const allEntryData = new Map<string, string>();
        const allKeys = Object.keys(localStorage)
            .filter(key => key.startsWith('journal-entry-'));
        
        allKeys.forEach(key => {
            const content = localStorage.getItem(key) || '';
            if (content) {
                const dateKey = key.replace('journal-entry-', '');
                allEntryData.set(dateKey, content);
            }
        });
        return allEntryData;
    },

    async saveWordCountHistory(dateKey: string, history: Array<{ timestamp: number; wordCount: number }>): Promise<void> {
        localStorage.setItem(`journal-history-${dateKey}`, JSON.stringify(history));
    },

    async getWordCountHistory(dateKey: string): Promise<Array<{ timestamp: number; wordCount: number }> | null> {
        const data = localStorage.getItem(`journal-history-${dateKey}`);
        return data ? JSON.parse(data) : null;
    }
};

// --- COMPONENTS ---

function LoginPage({ onLogin }: { onLogin: (email: string) => void }) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const email = formData.get('email') as string;
        onLogin(email);
    };

    return (
        <div className="login-container">
            <h1 className="login-title">750 Words</h1>
            <p className="login-description">
                Clear your mind. One day at a time.
                <br />
                The goal is simple: write 750 words every day.
            </p>
            <form className="login-form" onSubmit={handleSubmit}>
                <p className="login-form-intro">Enter your email to start your journey.</p>
                <input type="email" name="email" placeholder="you@example.com" required aria-label="Email Address"/>
                <button type="submit">Start Writing</button>
            </form>
        </div>
    );
}


interface MonthlyStreakTrackerProps {
    selectedDate: Date;
    onDateSelect: (date: Date) => void;
    entries: Map<string, number>;
}

function MonthlyStreakTracker({ selectedDate, onDateSelect, entries }: MonthlyStreakTrackerProps) {
    const today = useMemo(() => new Date(), []);
    today.setHours(0, 0, 0, 0);

    const daysInMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate();

    const handleDayClick = (day: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(day);
        if (newDate > today) return;
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
            <div className="streak-info">{entries.size} days completed</div>
        </div>
    );
}

const AUTOSAVE_DELAY = 1500;

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onExport: (options: { range: string; format: string }) => void;
    selectedDate: Date;
}

function ExportModal({ isOpen, onClose, onExport, selectedDate }: ExportModalProps) {
    const [range, setRange] = useState('current_month');
    const [format, setFormat] = useState('txt');

    if (!isOpen) return null;

    const handleExportClick = () => {
        onExport({ range, format });
    };

    const monthName = selectedDate.toLocaleString('default', { month: 'long' });

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h2>Export Journal</h2>

                <fieldset className="export-fieldset">
                    <legend>Date Range</legend>
                    <select value={range} onChange={e => setRange(e.target.value)} aria-label="Export date range">
                        <option value="today">Today ({formatDateForDisplay(selectedDate).split(',')[1].trim()})</option>
                        <option value="current_week">This Week</option>
                        <option value="current_month">This Month ({monthName})</option>
                        <option value="all">All Entries</option>
                    </select>
                </fieldset>

                <fieldset className="export-fieldset">
                    <legend>Format</legend>
                    <div className="format-selector" role="radiogroup" aria-label="Export file format">
                        <button role="radio" aria-checked={format === 'txt'} className={format === 'txt' ? 'active' : ''} onClick={() => setFormat('txt')}>.txt</button>
                        <button role="radio" aria-checked={format === 'md'} className={format === 'md' ? 'active' : ''} onClick={() => setFormat('md')}>.md</button>
                        <button role="radio" aria-checked={format === 'pdf'} className={format === 'pdf' ? 'active' : ''} onClick={() => setFormat('pdf')}>.pdf</button>
                    </div>
                </fieldset>

                <div className="modal-actions">
                    <button onClick={onClose} className="button-secondary">Cancel</button>
                    <button onClick={handleExportClick} className="button-primary">Export</button>
                </div>
            </div>
        </div>
    );
}

interface SearchResult {
    date: Date;
    snippet: string;
}

interface SearchResultsViewProps {
    results: SearchResult[];
    query: string;
    onViewEntry: (dateKey: string) => void;
}

function SearchResultsView({ results, query, onViewEntry }: SearchResultsViewProps) {
    if (results.length === 0) {
        return (
            <div className="search-results-empty">
                <p>No entries found for "{query}".</p>
            </div>
        );
    }

    return (
        <div className="search-results-list">
            {results.map(({ date, snippet }) => (
                <div key={date.toISOString()} className="search-result-item">
                    <div className="search-result-header">
                        <h3 className="search-result-date">{formatDateForDisplay(date)}</h3>
                        <button className="button-view-entry" onClick={() => onViewEntry(toDateKey(date))}>View Entry →</button>
                    </div>
                    <p className="search-result-snippet" dangerouslySetInnerHTML={{ __html: snippet }}></p>
                </div>
            ))}
        </div>
    );
}

interface JournalViewProps {
    onNavigate: (route: Route) => void;
    initialDateKey?: string;
}

function JournalView({ onNavigate, initialDateKey }: JournalViewProps) {
    const [selectedDate, setSelectedDate] = useState(initialDateKey ? new Date(initialDateKey.replace(/-/g, '/')) : new Date());
    const [text, setText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [status, setStatus] = useState('Ready');
    const [entries, setEntries] = useState(new Map<string, number>());
    const [isExportModalOpen, setExportModalOpen] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);
    const isFutureDate = selectedDate > today;
    
    useEffect(() => {
        const fetchEntries = async () => {
            const allEntryData = await dataStore.getAllEntries();
            setEntries(allEntryData);
        };
        fetchEntries();
    }, []);

    useEffect(() => {
        const fetchEntry = async () => {
            const dateKey = toDateKey(selectedDate);
            const savedContent = await dataStore.getEntry(dateKey) || '';
            setText(savedContent);
            setWordCount(countWords(savedContent));
            setStatus('Ready');
        };
        fetchEntry();
    }, [selectedDate]);

    const saveEntry = useCallback(async (dateToSave: Date, newText: string) => {
        setStatus('Saving...');
        try {
            const dateKey = toDateKey(dateToSave);
            await dataStore.saveEntry(dateKey, newText);
            const newWordCount = countWords(newText);
            
            if (newWordCount > 0) {
                let history = await dataStore.getWordCountHistory(dateKey) || [];
                const lastPoint = history.length > 0 ? history[history.length - 1] : null;
                
                if (history.length === 0) {
                    history.push({ timestamp: Date.now() - 1000, wordCount: 0 });
                }
                
                if (!lastPoint || lastPoint.wordCount !== newWordCount) {
                    history.push({ timestamp: Date.now(), wordCount: newWordCount });
                    await dataStore.saveWordCountHistory(dateKey, history);
                }
            } else {
                 await dataStore.saveWordCountHistory(dateKey, []);
            }
            
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
    
    const handleCaretMove = useCallback(() => {
        setTimeout(() => {
            const textarea = textareaRef.current;
            if (!textarea) return;
            
            const style = window.getComputedStyle(textarea);
            const lineHeight = parseFloat(style.lineHeight) || (parseFloat(style.fontSize) * 1.2);
            if (isNaN(lineHeight)) return;

            const textUpToCursor = textarea.value.substring(0, textarea.selectionStart);
            const currentLineNumber = textUpToCursor.split('\n').length;
            
            const caretY = (currentLineNumber - 1) * lineHeight;
            const scrollTriggerZoneStart = textarea.scrollTop + (textarea.clientHeight * 0.7);
            
            if (caretY > scrollTriggerZoneStart) {
                const targetScrollTop = caretY - (textarea.clientHeight / 2);
                
                const start = textarea.scrollTop;
                const end = targetScrollTop;
                const duration = 200; // ms
                let startTime = 0;

                const animateScroll = (timestamp: number) => {
                    if (!startTime) startTime = timestamp;
                    const progress = timestamp - startTime;
                    const percentage = Math.min(progress / duration, 1);
                    const easedPercentage = 1 - Math.pow(1 - percentage, 3); // easeOutCubic
                    
                    textarea.scrollTop = start + (end - start) * easedPercentage;
                    
                    if (progress < duration) {
                        requestAnimationFrame(animateScroll);
                    }
                };
                requestAnimationFrame(animateScroll);
            }
        }, 0);
    }, []);

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
            newDate.setMonth(newDate.getMonth() + direction, 1);
            return newDate;
        });
    };
    
    const handleExport = async ({ range, format }: { range: string, format: string }) => {
        setStatus('Exporting...');
        const entriesMap = await dataStore.getAllEntriesWithContent();
        
        const sortedEntries = Array.from(entriesMap.entries())
            .map(([dateKey, content]) => ({ date: new Date(dateKey.replace(/-/g, '/')), content }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());

        let filteredEntries = sortedEntries;

        if (range === 'today') {
            const todayKey = toDateKey(selectedDate);
            filteredEntries = sortedEntries.filter(entry => toDateKey(entry.date) === todayKey);
        } else if (range === 'current_week') {
            const { start, end } = getWeekRange(selectedDate);
            filteredEntries = sortedEntries.filter(entry => {
                const entryDate = entry.date;
                return entryDate >= start && entryDate <= end;
            });
        } else if (range === 'current_month') {
            const currentMonth = selectedDate.getMonth();
            const currentYear = selectedDate.getFullYear();
            filteredEntries = sortedEntries.filter(entry => 
                entry.date.getMonth() === currentMonth && entry.date.getFullYear() === currentYear
            );
        }
        
        if (filteredEntries.length === 0) {
            alert("No entries found for the selected range.");
            setStatus('Ready');
            setExportModalOpen(false);
            return;
        }

        const fileName = `750-words-export-${new Date().toISOString().split('T')[0]}`;

        if (format === 'txt') {
            const fileContent = filteredEntries.map(entry => {
                const dateString = formatDateForDisplay(entry.date);
                return `--- ${dateString} ---\n\n${entry.content}\n\n`;
            }).join('');

            const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.txt`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if (format === 'md') {
            const fileContent = filteredEntries.map(entry => {
                const dateString = formatDateForDisplay(entry.date);
                return `# ${dateString}\n\n${entry.content}\n\n`;
            }).join('');

            const blob = new Blob([fileContent], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${fileName}.md`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } else if (format === 'pdf') {
            const doc = new jsPDF();
            const pageHeight = doc.internal.pageSize.height;
            const margin = 20;
            let y = margin;
            const lineHeight = 7;
            const pageWidth = doc.internal.pageSize.width - margin * 2;

            filteredEntries.forEach((entry, index) => {
                if (y > pageHeight - margin - 20 && index > 0) { // Check if we need a new page
                    doc.addPage();
                    y = margin;
                }
                
                if (index > 0) y += lineHeight * 2;
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.text(formatDateForDisplay(entry.date), margin, y);
                y += lineHeight * 2;
                
                doc.setFont('times', 'normal');
                doc.setFontSize(12);

                const lines = doc.splitTextToSize(entry.content, pageWidth);
                lines.forEach((line: string) => {
                    if (y > pageHeight - margin) {
                        doc.addPage();
                        y = margin;
                    }
                    doc.text(line, margin, y);
                    y += lineHeight;
                });
            });

            doc.save(`${fileName}.pdf`);
        }
        
        setExportModalOpen(false);
        setStatus('Ready');
    };

    const getMonthName = (date, offset = 0) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        return newDate.toLocaleString('en-US', { month: 'short' });
    }
    
    const hasEntryForSelectedDate = entries.has(toDateKey(selectedDate));
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0,0,0,0);
    
    const prevMonth = new Date(selectedDate);
    prevMonth.setMonth(prevMonth.getMonth() -1, 1);
    const isPrevMonthCurrent = prevMonth.getTime() === currentMonth.getTime();

    const nextMonth = new Date(selectedDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    const isNextMonthCurrent = nextMonth.getTime() === currentMonth.getTime();

    return (
        <>
            <header className="app-header">
                <div className="header-top">
                    <div className="app-title">750 Words</div>
                    <nav className="main-nav">
                        {hasEntryForSelectedDate && (
                            <button onClick={() => onNavigate({ name: 'stats', params: { dateKey: toDateKey(selectedDate) } })}>
                                View Stats
                            </button>
                        )}
                        {text.trim().length > 0 && (
                            <button onClick={() => setExportModalOpen(true)}>Export</button>
                        )}
                         <button onClick={() => onNavigate({ name: 'settings' })}>Your Account</button>
                    </nav>
                </div>
                
                <h1 className="date-display">{formatDateForDisplay(selectedDate)}</h1>
                <nav className="month-nav">
                    <button onClick={() => handleMonthChange(-1)} aria-label="Previous month" className={isPrevMonthCurrent ? 'is-current-month' : ''}>◀ {getMonthName(selectedDate, -1)}</button>
                    <span>{selectedDate.toLocaleString('en-US', { month: 'long' })}</span>
                    <button onClick={() => handleMonthChange(1)} aria-label="Next month" className={isNextMonthCurrent ? 'is-current-month' : ''}>{getMonthName(selectedDate, 1)} ▶</button>
                </nav>
                <MonthlyStreakTracker 
                    selectedDate={selectedDate} 
                    onDateSelect={setSelectedDate}
                    entries={entries}
                />
            </header>
            <main className="editor-container">
                <textarea
                    ref={textareaRef}
                    className="editor-textarea"
                    placeholder={isFutureDate ? "You can't write in the future... yet." : "Write something here..."}
                    value={text}
                    onChange={handleChange}
                    onKeyUp={handleCaretMove}
                    onMouseUp={handleCaretMove}
                    aria-label={`Journal entry for ${formatDateForDisplay(selectedDate)}`}
                    disabled={isFutureDate}
                />
            </main>
            <footer className="app-footer">
                Word Count: {wordCount} | {status}
            </footer>
            <ExportModal 
                isOpen={isExportModalOpen} 
                onClose={() => setExportModalOpen(false)} 
                onExport={handleExport}
                selectedDate={selectedDate}
            />
        </>
    );
}

const STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'has', 'have', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'with']);

function WordCloud({ text }: { text: string }) {
    const words = useMemo(() => {
        const wordCounts = new Map<string, number>();
        const matches = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];

        matches.forEach(word => {
            if (!STOP_WORDS.has(word)) {
                wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
            }
        });

        const sortedWords = Array.from(wordCounts.entries())
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 50); // Limit to top 50 words

        if (sortedWords.length === 0) return [];

        const minCount = sortedWords.length > 0 ? sortedWords[sortedWords.length - 1].count : 1;
        const maxCount = sortedWords.length > 0 ? sortedWords[0].count : 1;

        const minFontSize = 16;
        const maxFontSize = 36;
        
        return sortedWords.map(({ word, count }) => {
            let fontSize = minFontSize;
            if (maxCount > minCount) {
                 const scale = (count - minCount) / (maxCount - minCount);
                 fontSize = minFontSize + scale * (maxFontSize - minFontSize);
            } else if (maxCount === minCount && sortedWords.length > 0) {
                fontSize = (minFontSize + maxFontSize) / 2;
            }
           
            return { word, fontSize };
        });

    }, [text]);

    if (words.length === 0) {
        return null;
    }

    return (
        <>
            <h3 className="word-cloud-title">Cloud O' Words</h3>
            <div className="word-cloud-container">
                {words.map(({ word, fontSize }) => (
                    <span
                        key={word}
                        className="word-cloud-word"
                        style={{ fontSize: `${fontSize}px` }}
                    >
                        {word}
                    </span>
                ))}
            </div>
        </>
    );
}


interface DailyStatsViewProps {
    onNavigate: (route: Route) => void;
    dateKey: string;
}

function DailyStatsView({ onNavigate, dateKey }: DailyStatsViewProps) {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
    const [content, setContent] = useState<string | null>(null);
    const [wordCountHistory, setWordCountHistory] = useState<Array<{ timestamp: number; wordCount: number }> | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const statsGridRef = useRef<HTMLElement>(null);


    useEffect(() => {
        const fetchAndAnalyze = async () => {
            const entryContent = await dataStore.getEntry(dateKey);
            if (entryContent) {
                setContent(entryContent);
                setAnalysis(analyzeText(entryContent));
            } else {
                setAnalysis(null);
                setContent(null);
            }
        };

        const fetchHistory = async () => {
            const history = await dataStore.getWordCountHistory(dateKey);
            if (history && history.length > 1) { 
                setWordCountHistory(history);
            }
        };

        fetchAndAnalyze();
        fetchHistory();
    }, [dateKey]);

    const date = useMemo(() => {
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, [dateKey]);

    const handleExportStats = async () => {
        if (!statsGridRef.current || isExporting) return;

        setIsExporting(true);
        try {
            const canvas = await html2canvas(statsGridRef.current, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                backgroundColor: '#ffffff', // Explicitly set background for capture
            });

            const image = canvas.toDataURL('image/png', 1.0);
            const link = document.createElement('a');
            link.href = image;
            link.download = `750-words-stats-${dateKey}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to export stats:", error);
            alert("Sorry, there was an error exporting your stats.");
        } finally {
            setIsExporting(false);
        }
    };

    const createWordCountChartData = useMemo(() => {
        if (!wordCountHistory) return null;

        const labels = wordCountHistory.map(p => 
            new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        );
        const data = wordCountHistory.map(p => p.wordCount);

        return {
            labels,
            datasets: [{
                label: 'Word Count',
                data,
                fill: true,
                backgroundColor: 'rgba(46, 125, 50, 0.2)',
                borderColor: '#2e7d32',
                pointBackgroundColor: '#2e7d32',
                tension: 0.3,
            }],
        };
    }, [wordCountHistory]);
    
    const wordCountChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: 'Writing Progress Throughout the Day',
                font: { size: 16 }
            },
        },
        scales: {
            y: {
                beginAtZero: true,
                title: { display: true, text: 'Word Count' }
            },
            x: {
                title: { display: true, text: 'Time' }
            }
        }
    };


    if (!analysis) {
        return (
             <div className="stats-container">
                <header className="app-header">
                     <div className="header-top">
                        <div className="app-title">750 Words</div>
                        <nav className="main-nav">
                            <button onClick={() => onNavigate({name: 'journal'})}>Journal</button>
                        </nav>
                    </div>
                    <h1 className="date-display">No entry found for this day.</h1>
                </header>
            </div>
        );
    }
    
    const getDominantCategory = (categoryData: { [key: string]: number }) => {
        const entries = Object.entries(categoryData);
        if (entries.length === 0 || entries.every(([, value]) => value === 0)) {
            return 'N/A';
        }
        return entries.reduce((a, b) => a[1] > b[1] ? a : b)[0];
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom' as const,
            },
            title: {
                display: true,
                font: {
                    size: 16,
                }
            },
        },
    };

    const createChartData = (category: string, colors: string[]) => {
        const data = analysis[category];
        const labels = Object.keys(data);
        const values = Object.values(data);

        // Filter out empty values for cleaner charts
        const filteredLabels = labels.filter((_, i) => values[i] > 0);
        const filteredValues = values.filter(v => v > 0);
        
        if (filteredValues.length === 0) return null;

        return {
            labels: filteredLabels,
            datasets: [{
                data: filteredValues,
                backgroundColor: colors,
            }],
        };
    };

    const mindsetChartData = createChartData('mindset', ['#4CAF50', '#F44336', '#2196F3', '#FFC107']);
    const timeChartData = createChartData('time', ['#9C27B0', '#00BCD4', '#FF9800']);
    const perspectiveChartData = createChartData('perspective', ['#E91E63', '#3F51B5', '#795548']);


    return (
        <div className="stats-container">
            <header className="app-header">
                <div className="header-top">
                    <div className="app-title">750 Words</div>
                    <nav className="main-nav">
                        <button onClick={() => onNavigate({name: 'journal'})}>Journal</button>
                        <button onClick={handleExportStats} disabled={isExporting}>
                            {isExporting ? 'Exporting...' : 'Export Stats'}
                        </button>
                    </nav>
                </div>
                <h1 className="date-display">Daily Stats</h1>
                <p className="stats-date-subtitle">{formatDateForDisplay(date)}</p>
            </header>
            <main className="stats-grid" ref={statsGridRef}>
                {createWordCountChartData && (
                    <div className="stat-card chart-card chart-card-full-width">
                        <Line options={wordCountChartOptions} data={createWordCountChartData} />
                    </div>
                )}
                <div className="stat-card highlight-card">
                    <div className="stat-label">Feeling Mostly</div>
                    <div className="stat-value">{getDominantCategory(analysis.feeling)}</div>
                </div>
                <div className="stat-card highlight-card">
                    <div className="stat-label">Thinking Mostly About</div>
                    <div className="stat-value">{getDominantCategory(analysis.topic)}</div>
                </div>
                
                {mindsetChartData && <div className="stat-card chart-card">
                    <Doughnut options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Mindset'}} }} data={mindsetChartData} />
                </div>}
                {timeChartData && <div className="stat-card chart-card">
                    <Doughnut options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Time Orientation'}} }} data={timeChartData} />
                </div>}
                {perspectiveChartData && <div className="stat-card chart-card">
                    <Doughnut options={{...chartOptions, plugins: {...chartOptions.plugins, title: {...chartOptions.plugins.title, text: 'Perspective'}} }} data={perspectiveChartData} />
                </div>}
                
                {content && (
                    <>
                        <div className="stat-card word-cloud-card">
                            <WordCloud text={content} />
                        </div>
                        <div className="stat-card entry-display-card">
                            <h3 className="entry-display-title">Your Entry</h3>
                            <p className="entry-display-content">{content}</p>
                        </div>
                    </>
                )}

            </main>
            <footer className="app-footer">
                Your writing journey at a glance.
            </footer>
        </div>
    );
}

function RewardShape({ shape, unlocked }: { shape: string; unlocked: boolean }) {
    const className = `reward-shape shape-${shape} ${!unlocked ? 'is-locked' : ''}`;
    return <div className={className} title={unlocked ? `Unlocked: ${shape}` : 'Locked'}></div>;
}

interface SettingsViewProps {
    onNavigate: (route: Route) => void;
    onLogout: () => void;
}

function SettingsView({ onNavigate, onLogout }: SettingsViewProps) {
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [status, setStatus] = useState('Ready');
    const [streakData, setStreakData] = useState<{ currentStreak: number, longestStreak: number } | null>(null);

    useEffect(() => {
        const fetchUserAndStreaks = async () => {
            const email = await dataStore.getUserEmail();
            setUserEmail(email);

            const allEntries = await dataStore.getAllEntries();
            const entryKeys = Array.from(allEntries.keys());
            const streaks = calculateStreaks(entryKeys);
            setStreakData(streaks);
        };
        fetchUserAndStreaks();
    }, []);

    const createSnippet = (text: string, query: string): string => {
        const regex = new RegExp(query, 'i');
        const matchIndex = text.search(regex);
        if (matchIndex === -1) return text.substring(0, 200);

        const SNIPPET_RADIUS = 80;
        const startIndex = Math.max(0, matchIndex - SNIPPET_RADIUS);
        const endIndex = Math.min(text.length, matchIndex + query.length + SNIPPET_RADIUS);

        let snippet = text.substring(startIndex, endIndex);

        if (startIndex > 0) snippet = `... ${snippet}`;
        if (endIndex < text.length) snippet = `${snippet} ...`;

        const highlightRegex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        return snippet.replace(highlightRegex, (match) => `<mark>${match}</mark>`);
    };

    const performSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        setStatus('Searching...');
        const allEntries = await dataStore.getAllEntriesWithContent();
        const results: SearchResult[] = [];
        const lowerCaseQuery = query.toLowerCase();

        for (const [dateKey, content] of allEntries.entries()) {
            if (content.toLowerCase().includes(lowerCaseQuery)) {
                results.push({
                    date: new Date(dateKey.replace(/-/g, '/')),
                    snippet: createSnippet(content, query),
                });
            }
        }
        
        results.sort((a, b) => b.date.getTime() - a.date.getTime());
        setSearchResults(results);
        setStatus('Ready');

    }, []);

    const debouncedSearch = useMemo(() => debounce(performSearch, 300), [performSearch]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value;
        setSearchQuery(query);
        debouncedSearch(query);
    };

    const handleViewEntry = (dateKey: string) => {
        onNavigate({ name: 'journal', params: { initialDateKey: dateKey } });
    };

    const username = userEmail ? userEmail.split('@')[0] : 'Writer';

    return (
        <div className="settings-container">
             <header className="header-top">
                <div className="app-title">750 Words</div>
                <nav className="main-nav">
                    <button onClick={() => onNavigate({name: 'journal'})}>Journal</button>
                </nav>
            </header>
            <main>
                <div className="settings-header">
                    <h1>Your account</h1>
                </div>
                <div className="settings-main-content">
                    <div className="settings-top-row">
                        <div className="user-info-card">
                            <p>
                                Hello, <strong>{username}</strong> ⚡️.
                            </p>
                            <button className="logout-button" onClick={onLogout}>Logout</button>
                        </div>
                        <div className="search-widget">
                            <h2>Search your writing</h2>
                            <div className="floating-input-group">
                                <input
                                    type="search"
                                    id="account-search"
                                    placeholder="Enter keywords"
                                    className="search-input"
                                    value={searchQuery}
                                    onChange={handleSearchChange}
                                    aria-label="Search journal entries"
                                />
                                <label htmlFor="account-search">Enter keywords</label>
                            </div>
                        </div>
                    </div>
                     {streakData && (
                        <div className="streaks-widget">
                            <h2>Your Streaks &amp; Achievements</h2>
                            <div className="streaks-overview">
                                <div className="streak-stat">
                                    <span className="streak-value">{streakData.currentStreak}</span>
                                    <span className="streak-label">Current Streak</span>
                                </div>
                                <div className="streak-stat">
                                    <span className="streak-value">{streakData.longestStreak}</span>
                                    <span className="streak-label">Longest Streak</span>
                                </div>
                            </div>
                            <div className="achievement-list">
                                {STREAK_REWARDS.map(reward => (
                                    <div 
                                        key={reward.days} 
                                        className={`achievement-item ${streakData.longestStreak >= reward.days ? 'is-unlocked' : ''}`}
                                    >
                                        <RewardShape shape={reward.shape} unlocked={streakData.longestStreak >= reward.days} />
                                        <div className="achievement-details">
                                            <h4>{reward.title}</h4>
                                            <p>{reward.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {isSearching && searchQuery.trim().length > 0 && (
                    <SearchResultsView results={searchResults} query={searchQuery} onViewEntry={handleViewEntry} />
                )}
            </main>
        </div>
    )
}

interface Route {
    name: 'journal' | 'stats' | 'settings';
    params?: { [key: string]: any };
}

function MainApp({ onLogout }: { onLogout: () => void }) {
    const [route, setRoute] = useState<Route>({ name: 'journal' });

    return (
        <>
            {route.name === 'journal' && <JournalView onNavigate={setRoute} initialDateKey={route.params?.initialDateKey} />}
            {route.name === 'stats' && route.params?.dateKey && <DailyStatsView onNavigate={setRoute} dateKey={route.params.dateKey} />}
            {route.name === 'settings' && <SettingsView onNavigate={setRoute} onLogout={onLogout} />}
        </>
    );
}

function App() {
    // Using null for loading state, boolean for logged in/out status
    const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

    useEffect(() => {
        const checkLoginStatus = async () => {
            const status = await dataStore.isLoggedIn();
            setIsLoggedIn(status);
        };
        checkLoginStatus();
    }, []);

    const handleLogin = async (email: string) => {
        await dataStore.login(email);
        setIsLoggedIn(true);
    };

    const handleLogout = async () => {
        await dataStore.logout();
        setIsLoggedIn(false);
    };



    if (isLoggedIn === null) {
        return (
            <div className="app-container">
                <div className="loading-container">
                    <p>Loading your journal...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="app-container">
            {isLoggedIn ? <MainApp onLogout={handleLogout} /> : <LoginPage onLogin={handleLogin} />}
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