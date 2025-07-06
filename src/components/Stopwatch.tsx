import React, { useState, useEffect, useCallback } from "react";
import cn from "classnames";
import { Preferences } from "@capacitor/preferences";
import { Dialog } from "@capacitor/dialog";
import { Clipboard } from "@capacitor/clipboard";
import "./Stopwatch.css";

interface Session {
  id: number;
  duration: number;
  timestamp: Date;
}

interface SavedSessionSet {
  id: string;
  name: string;
  sessions: Session[];
  totalTime: number;
  createdAt: Date;
}

interface SessionSummaryPeriod {
  startDate: Date;
  endDate: Date;
  sessions: SavedSessionSet[];
  totalTime: number;
  sessionCount: number;
}

export const Stopwatch: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [savedSessionSets, setSavedSessionSets] = useState<SavedSessionSet[]>([]);
  const [activeTab, setActiveTab] = useState<'stopwatch' | 'saved'>('stopwatch');
  const [selectedPeriod, setSelectedPeriod] = useState<SessionSummaryPeriod | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalActivePanel, setModalActivePanel] = useState<'summary' | 'sessions'>('summary');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [expandedSessionSets, setExpandedSessionSets] = useState<Set<string>>(new Set());

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => prevTime + 10);
      }, 10);
    }

    return () => clearInterval(intervalId);
  }, [isRunning]);

  // Load saved sessions on component mount
  useEffect(() => {
    loadSavedSessions();
  }, []);

  const loadSavedSessions = async () => {
    try {
      const { value } = await Preferences.get({ key: "savedSessionSets" });
      if (value) {
        const parsed = JSON.parse(value) as SavedSessionSet[];
        // Convert date strings back to Date objects
        const sessionsWithDates = parsed.map((sessionSet) => ({
          ...sessionSet,
          createdAt: new Date(sessionSet.createdAt),
          sessions: sessionSet.sessions.map((session) => ({
            ...session,
            timestamp: new Date(session.timestamp),
          })),
        }));
        setSavedSessionSets(sessionsWithDates);
      }
    } catch (error) {
      console.error("Error loading saved sessions:", error);
    }
  };

  const saveSessionSet = async () => {
    if (sessions.length === 0) return;

    // Show confirmation dialog
    const { value } = await Dialog.confirm({
      title: 'Save Session',
      message: `Save ${sessions.length} item${sessions.length !== 1 ? 's' : ''} with total duration of ${formatTime(calculateTotalTime())}?`,
      okButtonTitle: 'Save',
      cancelButtonTitle: 'Cancel'
    });

    // If user cancelled, return early
    if (!value) return;

    // Generate automatic session name based on date and time
    const now = new Date();
    const sessionName = `Session ${now.toLocaleDateString()} ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;

    const newSessionSet: SavedSessionSet = {
      id: Date.now().toString(),
      name: sessionName,
      sessions: [...sessions],
      totalTime: calculateTotalTime(),
      createdAt: new Date(),
    };

    try {
      const updatedSets = [...savedSessionSets, newSessionSet];
      await Preferences.set({
        key: "savedSessionSets",
        value: JSON.stringify(updatedSets),
      });
      setSavedSessionSets(updatedSets);
      setSessions([]);
      
      // Switch to saved sessions tab to show the newly saved session
      setActiveTab('saved');
      
      // Show success message
      await Dialog.alert({
        title: 'Success',
        message: 'Session saved successfully!',
        buttonTitle: 'OK'
      });
    } catch (error) {
      console.error("Error saving session:", error);
      await Dialog.alert({
        title: 'Error',
        message: 'Error saving session. Please try again.',
        buttonTitle: 'OK'
      });
    }
  };

  const deleteSavedSessionSet = async (id: string) => {
    const sessionToDelete = savedSessionSets.find(set => set.id === id);
    if (!sessionToDelete) return;

    // Show confirmation dialog
    const { value } = await Dialog.confirm({
      title: 'Delete Session',
      message: `Are you sure you want to delete "${sessionToDelete.name}"? This action cannot be undone.`,
      okButtonTitle: 'Delete',
      cancelButtonTitle: 'Cancel'
    });

    // If user cancelled, return early
    if (!value) return;

    try {
      const updatedSets = savedSessionSets.filter((set) => set.id !== id);
      await Preferences.set({
        key: "savedSessionSets",
        value: JSON.stringify(updatedSets),
      });
      setSavedSessionSets(updatedSets);
      
      // Switch to stopwatch tab if no saved sessions remain
      if (updatedSets.length === 0 && activeTab === 'saved') {
        setActiveTab('stopwatch');
      }

      // Show success message
      await Dialog.alert({
        title: 'Deleted',
        message: 'Session deleted successfully.',
        buttonTitle: 'OK'
      });
    } catch (error) {
      console.error("Error deleting session set:", error);
      await Dialog.alert({
        title: 'Error',
        message: 'Error deleting session. Please try again.',
        buttonTitle: 'OK'
      });
    }
  };

  const formatTime = useCallback((timeMs: number): string => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const centiseconds = Math.floor((timeMs % 1000) / 10);

    return `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}.${centiseconds.toString().padStart(2, "0")}`;
  }, []);

  const calculateTotalTime = useCallback((): number => {
    return sessions.reduce((total, session) => total + session.duration, 0);
  }, [sessions]);

  // Session summary logic - group saved sessions by bi-weekly periods
  const generateSessionSummary = useCallback((): SessionSummaryPeriod[] => {
    if (savedSessionSets.length === 0) return [];

    // Create a map to group sessions by period
    const periodsMap = new Map<string, SessionSummaryPeriod>();

    savedSessionSets.forEach((sessionSet) => {
      const date = sessionSet.createdAt;
      const year = date.getFullYear();
      const month = date.getMonth(); // 0-indexed
      const day = date.getDate();

      // Determine if this is first half (1-15) or second half (16-end) of the month
      const isFirstHalf = day <= 15;
      
      // Create period start and end dates
      let startDate: Date;
      let endDate: Date;
      
      if (isFirstHalf) {
        // First half: 1st to 15th
        startDate = new Date(year, month, 1);
        endDate = new Date(year, month, 15, 23, 59, 59, 999);
      } else {
        // Second half: 16th to end of month
        startDate = new Date(year, month, 16);
        // Get the last day of the month
        endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);
      }

      // Create a unique key for this period
      const periodKey = `${year}-${month}-${isFirstHalf ? 'first' : 'second'}`;

      if (!periodsMap.has(periodKey)) {
        periodsMap.set(periodKey, {
          startDate,
          endDate,
          sessions: [],
          totalTime: 0,
          sessionCount: 0,
        });
      }

      const period = periodsMap.get(periodKey)!;
      period.sessions.push(sessionSet);
      period.totalTime += sessionSet.totalTime;
      period.sessionCount += sessionSet.sessions.length;
    });

    // Convert map to array and sort by date (most recent first)
    return Array.from(periodsMap.values()).sort(
      (a, b) => b.startDate.getTime() - a.startDate.getTime()
    );
  }, [savedSessionSets]);

  const formatPeriodLabel = useCallback((period: SessionSummaryPeriod): string => {
    const startDate = period.startDate;
    const endDate = period.endDate;
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long' });
    const year = startDate.getFullYear();

    if (startDate.getDate() === 1 && startDate.getDate() <= 15) {
      return `${monthName} 1-15, ${year}`;
    } else {
      return `${monthName} 16-${endDate.getDate()}, ${year}`;
    }
  }, []);

  const handlePeriodClick = (period: SessionSummaryPeriod) => {
    setSelectedPeriod(period);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPeriod(null);
    setModalActivePanel('summary');
    setExpandedSessionSets(new Set()); // Reset expanded state when closing modal
  };

  const toggleSessionSetExpanded = (sessionSetId: string) => {
    setExpandedSessionSets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sessionSetId)) {
        newSet.delete(sessionSetId);
      } else {
        newSet.add(sessionSetId);
      }
      return newSet;
    });
  };

  const handleSwipeLeft = () => {
    if (modalActivePanel === 'summary') {
      setModalActivePanel('sessions');
    }
  };

  const handleSwipeRight = () => {
    if (modalActivePanel === 'sessions') {
      setModalActivePanel('summary');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart(touch.clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return;
    
    const touch = e.changedTouches[0];
    const touchEnd = touch.clientX;
    const diff = touchStart - touchEnd;
    
    // Minimum swipe distance
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        // Swiped left
        handleSwipeLeft();
      } else {
        // Swiped right
        handleSwipeRight();
      }
    }
    
    setTouchStart(null);
  };

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    if (time > 0) {
      const newSession: Session = {
        id: Date.now(),
        duration: time,
        timestamp: new Date(),
      };
      setSessions((prevSessions) => [...prevSessions, newSession]);
    }
    setTime(0);
    setIsRunning(false);
  };

  const handleReset = async () => {
    // Only show confirmation if there are sessions or if the timer is running/has time
    if (sessions.length > 0 || time > 0) {
      const { value } = await Dialog.confirm({
        title: 'Reset Stopwatch',
        message: 'Are you sure you want to reset? This will clear all current sessions and the timer.',
        okButtonTitle: 'Reset',
        cancelButtonTitle: 'Cancel'
      });

      // If user cancelled, return early
      if (!value) return;
    }

    setTime(0);
    setIsRunning(false);
    setSessions([]);
  };

  // Function to generate and copy histogram to clipboard
  const copyHistogramReport = useCallback(async () => {
    if (!selectedPeriod) return;

    try {
      // Show loading state
      await Dialog.alert({
        title: 'Generating Report',
        message: 'Creating your histogram report...',
        buttonTitle: 'OK'
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        await Dialog.alert({
          title: 'Error',
          message: 'Unable to create histogram. Canvas not supported.',
          buttonTitle: 'OK'
        });
        return;
      }

      // Set canvas dimensions
      const width = 1000;
      const height = 600;
      const padding = 80;
      canvas.width = width;
      canvas.height = height;

      // Generate daily breakdown for the selected period
      const dailyData = new Map<string, number>();
      
      // Initialize all days in the period with 0
      const startDate = new Date(selectedPeriod.startDate);
      const endDate = new Date(selectedPeriod.endDate);
      
      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        dailyData.set(dateKey, 0);
      }

      // Aggregate session time by day
      selectedPeriod.sessions.forEach(sessionSet => {
        sessionSet.sessions.forEach(session => {
          const sessionDate = session.timestamp.toISOString().split('T')[0];
          const currentTime = dailyData.get(sessionDate) || 0;
          dailyData.set(sessionDate, currentTime + session.duration);
        });
      });

      // Convert to sorted array
      const dailyArray = Array.from(dailyData.entries()).sort((a, b) => a[0].localeCompare(b[0]));
      const maxTime = Math.max(...dailyArray.map(([, time]) => time), 1); // Ensure at least 1 to avoid division by 0

      // Chart dimensions
      const chartWidth = width - 2 * padding;
      const chartHeight = height - 2 * padding - 80; // Extra space for title and labels

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Title
      ctx.fillStyle = '#2c3e50';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Daily Session Time', width / 2, 40);

      // Period subtitle
      ctx.font = '16px Arial';
      ctx.fillStyle = '#007bff';
      ctx.fillText(`${formatPeriodLabel(selectedPeriod)}`, width / 2, 70);

      // Draw bars
      const barWidth = chartWidth / dailyArray.length;
      const barSpacing = Math.max(2, barWidth * 0.1);
      const actualBarWidth = Math.max(1, barWidth - barSpacing);

      dailyArray.forEach(([dateStr, timeMs], index) => {
        const barHeight = maxTime > 0 ? (timeMs / maxTime) * chartHeight : 0;
        const x = padding + index * barWidth + barSpacing / 2;
        const y = padding + 80 + (chartHeight - barHeight);

        // Bar color - gradient based on intensity
        const intensity = timeMs / maxTime;
        if (timeMs > 0) {
          ctx.fillStyle = `rgba(0, 123, 255, ${0.3 + intensity * 0.7})`;
        } else {
          ctx.fillStyle = '#f8f9fa';
        }
        ctx.fillRect(x, y, actualBarWidth, barHeight);

        // Bar border
        ctx.strokeStyle = '#dee2e6';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, actualBarWidth, barHeight);

        // Time label on bar (if bar is tall enough and there's time)
        if (barHeight > 25 && timeMs > 0) {
          ctx.fillStyle = intensity > 0.5 ? '#ffffff' : '#2c3e50';
          ctx.font = '10px Arial';
          ctx.textAlign = 'center';
          const timeText = formatTime(timeMs);
          ctx.fillText(timeText, x + actualBarWidth / 2, y + 15);
        }

        // Date label below bar
        ctx.fillStyle = '#6c757d';
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        const date = new Date(dateStr);
        const dayLabel = date.getDate().toString();
        ctx.fillText(dayLabel, x + actualBarWidth / 2, height - padding + 15);

        // Month label (only on first day of month or first day)
        if (date.getDate() === 1 || index === 0) {
          ctx.fillStyle = '#2c3e50';
          ctx.font = 'bold 10px Arial';
          const monthLabel = date.toLocaleDateString('en-US', { month: 'short' });
          ctx.fillText(monthLabel, x + actualBarWidth / 2, height - padding + 30);
        }
      });

      // Y-axis labels
      ctx.fillStyle = '#6c757d';
      ctx.font = '12px Arial';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const value = (maxTime * i) / 5;
        const y = padding + 80 + chartHeight - (chartHeight * i) / 5;
        ctx.fillText(formatTime(value), padding - 10, y + 4);
        
        // Grid lines
        ctx.strokeStyle = '#f1f3f4';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + chartWidth, y);
        ctx.stroke();
      }

      // Legend
      ctx.fillStyle = '#6c757d';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Days of the month', width / 2, height - 15);

      // Convert canvas to blob and copy to clipboard
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        try {
          // First try: Check if clipboard permissions are available
          if (navigator.clipboard && navigator.clipboard.write) {
            // Try to get permission first
            try {
              const permission = await navigator.permissions.query({ name: 'clipboard-write' as PermissionName });
              if (permission.state === 'granted' || permission.state === 'prompt') {
                const item = new ClipboardItem({ 'image/png': blob });
                await navigator.clipboard.write([item]);
                
                await Dialog.alert({
                  title: 'Report Copied',
                  message: 'Histogram has been copied to your clipboard as an image. You can now paste it in other apps.',
                  buttonTitle: 'OK'
                });
                return;
              }
            } catch (permissionError) {
              console.log('Clipboard permission check failed:', permissionError);
            }
          }
          
          // Fallback 1: Use Capacitor clipboard with base64
          const dataUrl = canvas.toDataURL('image/png');
          await Clipboard.write({
            string: dataUrl
          });
          
          await Dialog.alert({
            title: 'Report Copied',
            message: 'Histogram has been copied to your clipboard as image data. You can paste it in apps that support base64 images.',
            buttonTitle: 'OK'
          });
          
        } catch (fallbackError) {
          console.error('All clipboard methods failed:', fallbackError);
          
          // Final fallback: Offer to download instead
          try {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `daily-sessions-${formatPeriodLabel(selectedPeriod).replace(/[^a-zA-Z0-9]/g, '-')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            
            await Dialog.alert({
              title: 'Downloaded Instead',
              message: 'Unable to copy to clipboard, so the histogram has been downloaded instead.',
              buttonTitle: 'OK'
            });
          } catch (downloadError) {
            console.error('Download fallback failed:', downloadError);
            await Dialog.alert({
              title: 'Copy Failed',
              message: 'Unable to copy histogram to clipboard or download. Please check your browser permissions.',
              buttonTitle: 'OK'
            });
          }
        }
      }, 'image/png');

    } catch (error) {
      console.error('Error generating histogram:', error);
      await Dialog.alert({
        title: 'Copy Error',
        message: 'Failed to generate histogram. Please try again.',
        buttonTitle: 'OK'
      });
    }
  }, [selectedPeriod, formatPeriodLabel, formatTime]);

  return (
    <div className="stopwatch-container">
      <div className="tabs-container">
        <button
          className={`tab-btn ${activeTab === 'stopwatch' ? 'active' : ''}`}
          onClick={() => setActiveTab('stopwatch')}
          aria-label="Stopwatch tab"
        >
          Stopwatch
        </button>
        {savedSessionSets.length > 0 && (
          <button
            className={`tab-btn ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
            aria-label="Saved sessions tab"
          >
            Saved Sessions
            <span className="tab-badge">{savedSessionSets.length}</span>
          </button>
        )}
      </div>

      {activeTab === 'stopwatch' && (
        <div className="tab-content">
          <div className="time-display">{formatTime(time)}</div>

          <div className={cn("controls", { "controls-spacing": sessions.length === 0 })}>
            {!isRunning ? (
              <button
                className="control-btn start-btn"
                onClick={handleStart}
                aria-label="Start stopwatch"
              >
                Start
              </button>
            ) : (
              <button
                className="control-btn stop-btn"
                onClick={handleStop}
                aria-label="Stop stopwatch"
              >
                Stop
              </button>
            )}

            <button
              className="control-btn reset-btn"
              onClick={handleReset}
              aria-label="Reset stopwatch"
            >
              Reset
            </button>
          </div>

          {sessions.length > 0 && (
            <div className="sessions-container">
              <div className="sessions-list">
                {sessions.map((session, index) => (
                  <div key={session.id} className="session-item">
                    <span className="session-number">
                      #{sessions.length - index}
                    </span>
                    <span className="session-duration">
                      {formatTime(session.duration)}
                    </span>
                    <span className="session-time">
                      {session.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>

              {sessions.length > 1 && (
                <div className="total-time-container">
                  <div className="total-time-display">
                    <span className="total-time-label">Total Time:</span>
                    <span className="total-time-value">
                      {formatTime(calculateTotalTime())}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <button
                  className="submit-btn"
                  onClick={saveSessionSet}
                  disabled={sessions.length === 0}
                  aria-label="Save current session"
                >
                  Save Session
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'saved' && (
        <div className="tab-content">
          {savedSessionSets.length > 0 ? (
            <div className="saved-sessions-container">
              <div className="saved-sessions-list">
                {savedSessionSets.map((sessionSet) => (
                  <div key={sessionSet.id} className="saved-session-item">
                    <div className="saved-session-header">
                      <span className="saved-session-name">{sessionSet.name}</span>
                      <button
                        className="delete-btn"
                        onClick={() => deleteSavedSessionSet(sessionSet.id)}
                        aria-label={`Delete ${sessionSet.name} session`}
                      >
                        ×
                      </button>
                    </div>
                    <div className="saved-session-info">
                      <span className="saved-session-count">
                        {sessionSet.sessions.length} session{sessionSet.sessions.length !== 1 ? 's' : ''}
                      </span>
                      <span className="saved-session-total">
                        {formatTime(sessionSet.totalTime)}
                      </span>
                      <span className="saved-session-date">
                        {sessionSet.createdAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Session Summary */}
              <div className="session-summary">
                <h3 className="session-summary-title">Summary by Period</h3>
                <div className="session-summary-periods">
                  {generateSessionSummary().map((period, index) => (
                    <div 
                      key={index} 
                      className="session-summary-period clickable"
                      onClick={() => handlePeriodClick(period)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handlePeriodClick(period);
                        }
                      }}
                      aria-label={`View details for ${formatPeriodLabel(period)}`}
                    >
                      <div className="session-summary-period-header">
                        <span className="session-summary-period-label">
                          {formatPeriodLabel(period)}
                        </span>
                        <span className="session-summary-period-total">
                          {formatTime(period.totalTime)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📝</div>
              <h3 className="empty-state-title">No Saved Sessions</h3>
              <p className="empty-state-description">
                Start timing sessions in the Stopwatch tab, then save them to see them here.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal for session period details */}
      {isModalOpen && selectedPeriod && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{formatPeriodLabel(selectedPeriod)}</h3>
              <button 
                className="modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            {/* Modal Navigation */}
            <div className="modal-nav">
              <button
                className={`modal-nav-btn ${modalActivePanel === 'summary' ? 'active' : ''}`}
                onClick={() => setModalActivePanel('summary')}
              >
                Summary
              </button>
              <button
                className={`modal-nav-btn ${modalActivePanel === 'sessions' ? 'active' : ''}`}
                onClick={() => setModalActivePanel('sessions')}
              >
                Session Sets ({selectedPeriod.sessions.length})
              </button>
            </div>

            {/* Carousel Container */}
            <div 
              className="modal-carousel"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="modal-carousel-track"
                style={{ 
                  transform: `translateX(${modalActivePanel === 'summary' ? '0%' : '-50%'})`,
                }}
              >
                {/* Panel 1: Summary */}
                <div className="modal-panel summary-panel">
                  <div className="modal-body">
                    <div className="modal-summary">
                      <div className="modal-summary-item">
                        <span className="modal-summary-label">Total Time:</span>
                        <span className="modal-summary-value">{formatTime(selectedPeriod.totalTime)}</span>
                      </div>
                      <div className="modal-summary-item">
                        <span className="modal-summary-label">Session Sets:</span>
                        <span className="modal-summary-value">{selectedPeriod.sessions.length}</span>
                      </div>
                      <div className="modal-summary-item">
                        <span className="modal-summary-label">Individual Sessions:</span>
                        <span className="modal-summary-value">{selectedPeriod.sessionCount}</span>
                      </div>
                    </div>

                    {/* Copy Report Button */}
                    <div className="modal-copy-report">
                      <button
                        className="copy-report-btn"
                        onClick={copyHistogramReport}
                        aria-label="Copy histogram report"
                      >
                        📊 Copy Report
                      </button>
                    </div>
                  </div>
                </div>

                {/* Panel 2: Session Sets */}
                <div className="modal-panel sessions-panel">
                  <div className="modal-body">
                    <div className="modal-sessions">
                      <h4 className="modal-sessions-title">Session Sets</h4>
                      <div className="modal-sessions-list">
                        {selectedPeriod.sessions.map((sessionSet) => (
                          <div key={sessionSet.id} className="modal-session-set">
                            <div 
                              className="modal-session-set-header"
                              onClick={() => toggleSessionSetExpanded(sessionSet.id)}
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  toggleSessionSetExpanded(sessionSet.id);
                                }
                              }}
                            >
                              <div className="modal-session-set-info">
                                <span className="modal-session-name">{sessionSet.name}</span>
                                <span className="modal-session-date">
                                  {sessionSet.createdAt.toLocaleDateString()}
                                </span>
                              </div>
                              <div className="modal-session-set-actions">
                                <span className="modal-session-total">{formatTime(sessionSet.totalTime)}</span>
                                <span className={`modal-session-expand-icon ${expandedSessionSets.has(sessionSet.id) ? 'expanded' : ''}`}>
                                  ▼
                                </span>
                              </div>
                            </div>
                            
                            <div className="modal-session-details">
                              <span className="modal-session-count">
                                {sessionSet.sessions.length} session{sessionSet.sessions.length !== 1 ? 's' : ''}
                              </span>
                            </div>

                            {/* Individual Sessions List - Only show when expanded */}
                            {expandedSessionSets.has(sessionSet.id) && (
                              <div className="modal-individual-sessions">
                                {sessionSet.sessions.map((session, index) => (
                                  <div key={session.id} className="modal-individual-session">
                                    <span className="modal-session-number">
                                      #{sessionSet.sessions.length - index}
                                    </span>
                                    <span className="modal-session-duration">
                                      {formatTime(session.duration)}
                                    </span>
                                    <span className="modal-session-time">
                                      {session.timestamp.toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Swipe Indicator */}
            <div className="modal-indicators">
              <div className={`modal-indicator ${modalActivePanel === 'summary' ? 'active' : ''}`}></div>
              <div className={`modal-indicator ${modalActivePanel === 'sessions' ? 'active' : ''}`}></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
