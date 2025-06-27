import React, { useState, useEffect, useCallback } from 'react';
import './Stopwatch.css';

export const Stopwatch: React.FC = () => {
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isRunning) {
      intervalId = setInterval(() => {
        setTime(prevTime => prevTime + 10);
      }, 10);
    }

    return () => clearInterval(intervalId);
  }, [isRunning]);

  const formatTime = useCallback((timeMs: number): string => {
    const minutes = Math.floor(timeMs / 60000);
    const seconds = Math.floor((timeMs % 60000) / 1000);
    const centiseconds = Math.floor((timeMs % 1000) / 10);

    return `${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`;
  }, []);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handleStop = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setTime(0);
    setIsRunning(false);
  };

  return (
    <div className="stopwatch-container">
      <div className="time-display">
        {formatTime(time)}
      </div>

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
    </div>
  );
};
