import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import dataStore, { countWords } from './dataStore';

ChartJS.register(ArcElement, Tooltip, Legend, Title);

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

const getWordCountColor = (count: number): string => {
    if (count >= 750) return '#2e7d32';
    if (count >= 500) return '#4caf50';
    if (count >= 250) return '#81c784';
    if (count > 0) return '#c8e6c9';
    return '';
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

interface JournalViewProps {
    onNavigate: (route: Route) => void;
    onLogout: () => void;
}

function JournalView({ onNavigate, onLogout }: JournalViewProps) {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [text, setText] = useState('');
    const [wordCount, setWordCount] = useState(0);
    const [status, setStatus] = useState('Ready');
    const [entries, setEntries] = useState(new Map<string, number>());

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
            newDate.setMonth(newDate.getMonth() + direction, 1);
            return newDate;
        });
    };

    const getMonthName = (date, offset = 0) => {
        const newDate = new Date(date);
        newDate.setMonth(newDate.getMonth() + offset);
        return newDate.toLocaleString('en-US', { month: 'short' });
    }
    
    const hasEntryForSelectedDate = entries.has(toDateKey(selectedDate));

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
                         <button onClick={onLogout}>Logout</button>
                    </nav>
                </div>
                <h1 className="date-display">{formatDateForDisplay(selectedDate)}</h1>
                <nav className="month-nav">
                    <button onClick={() => handleMonthChange(-1)} aria-label="Previous month">◀ {getMonthName(selectedDate, -1)}</button>
                    <span>{selectedDate.toLocaleString('en-US', { month: 'long' })}</span>
                    <button onClick={() => handleMonthChange(1)} aria-label="Next month">{getMonthName(selectedDate, 1)} ▶</button>
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

interface DailyStatsViewProps {
    onNavigate: (route: Route) => void;
    dateKey: string;
}

function DailyStatsView({ onNavigate, dateKey }: DailyStatsViewProps) {
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    useEffect(() => {
        const fetchAndAnalyze = async () => {
            const content = await dataStore.getEntry(dateKey);
            if (content) {
                setAnalysis(analyzeText(content));
            } else {
                setAnalysis(null);
            }
        };
        fetchAndAnalyze();
    }, [dateKey]);

    const date = useMemo(() => {
        const [year, month, day] = dateKey.split('-').map(Number);
        return new Date(year, month - 1, day);
    }, [dateKey]);

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
        const filteredLabels = labels.filter((_, i) => (values[i] as number) > 0);
        const filteredValues = values.filter(v => (v as number) > 0);
        
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
                    </nav>
                </div>
                <h1 className="date-display">Daily Stats</h1>
                <p className="stats-date-subtitle">{formatDateForDisplay(date)}</p>
            </header>
            <main className="stats-grid">
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

            </main>
            <footer className="app-footer">
                Your writing journey at a glance.
            </footer>
        </div>
    );
}

interface Route {
    name: 'journal' | 'stats';
    params?: { [key: string]: any };
}

function MainApp({ onLogout }: { onLogout: () => void }) {
    const [route, setRoute] = useState<Route>({ name: 'journal' });

    return (
        <>
            {route.name === 'journal' && <JournalView onNavigate={setRoute} onLogout={onLogout} />}
            {route.name === 'stats' && route.params?.dateKey && <DailyStatsView onNavigate={setRoute} dateKey={route.params.dateKey} />}
        </>
    );
}

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const checkLoginStatus = async () => {
            const status = await dataStore.isLoggedIn();
            setIsLoggedIn(status);
            setIsLoading(false);
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

    if (isLoading) {
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
