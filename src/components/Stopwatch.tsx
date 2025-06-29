import React, { useState, useEffect, useCallback } from "react";
import "./Stopwatch.css";

interface Session {
  id: number;
  duration: number;
  timestamp: Date;
}

export const Stopwatch: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime((prevTime) => prevTime + 10);
      }, 10);
    }

    return () => clearInterval(intervalId);
  }, [isRunning]);

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

  const submitTimeData = useCallback(async (): Promise<void> => {
    // Mock API call that simulates server request
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1500); // Simulate 1.5 second API call
    });
  }, [sessions, calculateTotalTime]);

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

  const handleReset = () => {
    setTime(0);
    setIsRunning(false);
    setSessions([]);
  };

  const handleSubmitTime = async () => {
    setIsSubmitting(true);
    try {
      await submitTimeData();
      // Reset application to original state on success
      setTime(0);
      setIsRunning(false);
      setSessions([]);
    } catch (error) {
      console.error("Failed to submit time data:", error);
      // In a real app, you might show an error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stopwatch-container">
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
          {sessions.length > 0 && (
            <button
              className="submit-btn"
              onClick={handleSubmitTime}
              disabled={isSubmitting}
              aria-label="Submit time data"
            >
              {isSubmitting ? "Submitting..." : "Submit Time"}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
