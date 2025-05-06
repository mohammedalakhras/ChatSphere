import React, { useState, useRef, useEffect } from 'react';
import styles from './css/CustomAudioPlayer.module.css';

const CustomAudioPlayer = ({ src, onError }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFileDeleted, setIsFileDeleted] = useState(false);
  const audioRef = useRef(null);
  const isPlayingRef = useRef(false);
  
  // Function to extract duration from filename (for our custom generated files)
  const extractDurationFromFilename = (url) => {
    try {
      // Pattern matches: voice-message-XX-sec.(mp3|webm) where XX is the duration in seconds
      const match = url.match(/voice-message-(\d+)-sec\.(mp3|webm)/i);
      if (match && match[1]) {
        return parseFloat(match[1]);
      }
    } catch (e) {
      console.log("Failed to extract duration from filename", e);
    }
    return null;
  };
  
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Reset states when src changes
    setIsLoading(true);
    setError(null);
    setDuration(0);
    setCurrentTime(0);
    setIsPlaying(false);
    isPlayingRef.current = false;

    // Try to extract duration from filename if it's our custom recorded file
    const filenameDuration = extractDurationFromFilename(src);
    if (filenameDuration) {
      console.log("Duration from filename:", filenameDuration);
      setDuration(filenameDuration);
      setIsLoading(false);
    }

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        console.log("Duration from loadedmetadata:", audio.duration);
        setDuration(audio.duration);
        setIsLoading(false);
      } else if (filenameDuration) {
        // If audio duration is not available but we have filename duration, use that
        setIsLoading(false);
      } else {
        // If no valid duration available, try from the audio element directly
        console.log("No valid duration available, using 0");
        setIsLoading(false);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Try to get duration again if it wasn't available initially
      if ((duration === 0 || !duration) && audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        console.log("Duration from timeupdate:", audio.duration);
        setDuration(audio.duration);
      }
    };

    const handleDurationChange = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        console.log("Duration from durationchange:", audio.duration);
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
      setCurrentTime(0);
    };

    const handleError = (e) => {
      console.error('Audio error:', e);
      
      // Check if the error is due to a missing file (404)
      let errorMsg = 'Error playing audio';
      let isDeleted = false;
      
      if (e.target && e.target.error) {
        // MEDIA_ERR_SRC_NOT_SUPPORTED often indicates a 404/missing file
        if (e.target.error.code === e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED) {
          errorMsg = 'Audio file not found or deleted from server';
          isDeleted = true;
        }
      }
      
      setError(errorMsg);
      setIsFileDeleted(isDeleted);
      setIsPlaying(false);
      isPlayingRef.current = false;
      setIsLoading(false);
      
      if (onError) onError(errorMsg);
      
      // If we have a duration from the filename, we can still display it
      if (filenameDuration) {
        setIsLoading(false);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      isPlayingRef.current = true;
    };

    const handlePause = () => {
      setIsPlaying(false);
      isPlayingRef.current = false;
    };

    const handleLoadStart = () => {
      if (!filenameDuration) {
        setIsLoading(true);
      }
    };

    const handleCanPlay = () => {
      setIsLoading(false);
      // Try to get duration on canplay event
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        console.log("Duration from canplay:", audio.duration);
        setDuration(audio.duration);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    // Try to load duration immediately
    if (audio.readyState >= 2) {
      if (audio.duration && !isNaN(audio.duration) && audio.duration !== Infinity) {
        console.log("Duration from initial check:", audio.duration);
        setDuration(audio.duration);
        setIsLoading(false);
      } else if (filenameDuration) {
        // If we have a duration from the filename, we can use that
        setIsLoading(false);
      }
    }

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [src, duration, onError]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlayingRef.current) {
        await audioRef.current.pause();
      } else {
        await audioRef.current.play();
      }
    } catch (error) {
      console.error('Error toggling play state:', error);
      const errorMsg = 'Error playing audio';
      setError(errorMsg);
      setIsPlaying(false);
      isPlayingRef.current = false;
      if (onError) onError(errorMsg);
    }
  };

  const formatTime = (time) => {
    if (isNaN(time) || time === Infinity || time === 0) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.audioPlayer}>
      <audio 
        ref={audioRef} 
        src={src} 
        preload="metadata"
        crossOrigin="anonymous"
        onError={(e) => {
          console.error('Audio element error:', e);
          
          // Check for 404 errors
          let errorMsg = 'Audio loading failed';
          let isDeleted = false;
          
          // If we can detect a 404 status in the error, mark as deleted
          const url = e.target.src;
          if (url && (url.includes('404') || 
              e.target.error && e.target.error.code === e.target.error.MEDIA_ERR_SRC_NOT_SUPPORTED)) {
            errorMsg = 'Audio file not found or deleted from server';
            isDeleted = true;
          }
          
          setIsFileDeleted(isDeleted);
          if (onError) onError(errorMsg);
        }}
      />
      <button 
        className={`${styles.playButton} ${isPlaying ? styles.playing : ''} ${isLoading ? styles.loading : ''} ${isFileDeleted ? styles.deleted : ''}`}
        onClick={togglePlay}
        disabled={error !== null || isLoading}
      >
        {isLoading ? '⌛' : isFileDeleted ? '🗑️' : isPlaying ? '⏸' : '▶'}
      </button>
      <div className={styles.timeDisplay}>
        <span>{formatTime(currentTime)}</span>
        <span className={styles.duration}>/ {formatTime(duration)}</span>
      </div>
      {error && <div className={`${styles.error} ${isFileDeleted ? styles.deletedError : ''}`}>{error}</div>}
    </div>
  );
};

CustomAudioPlayer.defaultProps = {
  onError: null
};

export default CustomAudioPlayer; 