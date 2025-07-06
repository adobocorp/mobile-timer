import React, { useState, useEffect, useCallback } from "react";
import { Preferences } from "@capacitor/preferences";
import { Dialog } from "@capacitor/dialog";
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

  const formatPeriodLabel = (period: SessionSummaryPeriod): string => {
    const startDate = period.startDate;
    const endDate = period.endDate;
    const monthName = startDate.toLocaleDateString('en-US', { month: 'long' });
    const year = startDate.getFullYear();

    if (startDate.getDate() === 1 && startDate.getDate() <= 15) {
      return `${monthName} 1-15, ${year}`;
    } else {
      return `${monthName} 16-${endDate.getDate()}, ${year}`;
    }
  };

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

          <div className="controls">
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

              <div className="save-session-container">
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
