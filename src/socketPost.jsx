import React, { useState, useEffect, useRef } from "react";
import getChats from "./utils/getChats";
import ChatWindow from "./components/Messages";
import socket from "./utils/socket";
import styles from "./css/PostRestData.module.css";
import axios from "axios";


function PostRestData(props) {
  const [chats, setChats] = useState([]);
  const [msg, setMsg] = useState("");
  const [to, setTo] = useState("");
  const [colored, setColored] = useState("");
  // Show chat list by default on larger screens; on mobile it will be off-canvas.
  const [showChatList, setShowChatList] = useState(window.innerWidth >= 768);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [audioChunks, setAudioChunks] = useState([]);
  const mediaRecorderRef = useRef(null);
  const [recordingStatus, setRecordingStatus] = useState('');
  const [pendingMedia, setPendingMedia] = useState(null);


  if ( !localStorage.getItem("token") || ! localStorage.getItem("userdata"))
    props.history.push("/signin");

  // Update conversation details from server events.
  function handleUpdateMessage(updatedConversation) {
    setChats((prevChats) => {
      const updatedChats = [...prevChats];
      const index = updatedChats.findIndex(
        (chat) => chat.id === updatedConversation.chatPartner
      );
      if (index !== -1) {
        updatedChats[index] = {
          ...updatedChats[index],
          lastMessageDate: updatedConversation.lastMessageDate,
          lastLoginTime: updatedConversation.lastLoginTime,
          ...updatedConversation,
        };
      } else {
        updatedChats.push({
          messageCount: 1,
          id: updatedConversation.chatPartner,
          lastMessageDate: updatedConversation.lastMessageDate,
          lastLoginTime: updatedConversation.lastLoginTime,
          ...updatedConversation,
        });
      }
      updatedChats.sort(
        (a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
      );
      return updatedChats;
    });
  }

  // Update chat list when a new message is received.
  function handleReceivedMessage(message) {
    setChats((prevChats) => {
      const updatedChats = [...prevChats];
      const chatPartner = message.sender._id;
      if (
        chatPartner === JSON.parse(window.localStorage.getItem("userdata"))
          ._id
      ) {
        socket.emit("messageRead", message);
        handleMessagesRead(chatPartner);
      } else {
        socket.emit("messageDelivered", message);
      }
      const index = updatedChats.findIndex((chat) => chat.id === chatPartner);
      if (index !== -1) {
        updatedChats[index] = {
          ...updatedChats[index],
          messageId: message._id,
          lastMessage: message.content,
          lastMessageDate: message.sentAt,
          messageCount: (updatedChats[index].messageCount || 0) + 1,
          lastLoginTime: message.lastLoginTime,
        };
      } else {
        updatedChats.push({
          id: chatPartner,
          fullName: message.sender.fullName,
          photo: message.sender.photo,
          lastMessage: message.content,
          lastMessageDate: message.sentAt,
          messageCount: 1,
        });
      }
      updatedChats.sort(
        (a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
      );
      return updatedChats;
    });
  }

  // Reset unread message count when messages are read.
  function handleMessagesRead(partnerId) {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === partnerId ? { ...chat, messageCount: 0 } : chat
      )
    );
  }

  useEffect(() => {
    socket.on("connect", () => {
      console.log("socket.connected", socket.connected);
      socket.emit("signin", window.localStorage.getItem("token"));
      getChats(setChats);
    });
    socket.on("updatedMessage", handleUpdateMessage);
    socket.on("receive", handleReceivedMessage);
    socket.on("lastSeenUpdate", (data) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === data.userId ? { ...chat, lastLoginTime: data.lastSeen } : chat
        )
      );
    });
    return () => {
      socket.off("updatedMessage");
      socket.off("receive");
      socket.off("lastSeenUpdate");
    };
  }, []);

  const submitHandler = (e) => {
    e.preventDefault();
  };

  const socketSend = () => {
    // If there's pending media and some text or it's just media, create and send the message
    if (pendingMedia || msg.trim()) {
      const messageData = {
        content: msg,
        receiver: to,
      };

      // Add media if we have pending files
      if (pendingMedia) {
        messageData.media = pendingMedia;
      }

      socket.emit("sendMessage", messageData);
      setMsg("");
      
      // Clear pending media after sending
      if (pendingMedia) {
        setPendingMedia(null);
      }
    }
  };

  // When a chat card is clicked, mark it as selected.
  const handleChatCardClick = (c, i) => {
    setTo(c.id);
    setColored(i);
    // On small screens, collapse the chat list after a selection.
    if (window.innerWidth < 768) {
      setShowChatList(false);
    }
  };

  const handleFileUpload = async (file, recordingDuration = null) => {
    if (!file || !to) return;

    try {
      setUploading(true);
      
      // Extract duration from filename if available and not provided
      if (!recordingDuration && file.name.includes('voice-message-')) {
        const durationMatch = file.name.match(/voice-message-(\d+)-sec/);
        if (durationMatch && durationMatch[1]) {
          recordingDuration = parseFloat(durationMatch[1]);
        }
      }
      
      // Create custom filename with duration if available
      let filename = file.name;
      if (recordingDuration && file.type.startsWith('audio/') && !filename.includes('-sec.')) {
        const extension = file.name.split('.').pop();
        filename = `voice-message-${Math.round(recordingDuration)}-sec.${extension}`;
      }
      
      // Get presigned URL from backend
      const response = await axios.post(
        `${process.env.REACT_APP_SERVER_HOST}/api/chats/uploadURL`,
        {
          filename: filename,
          contentType: file.type
        },
        {
          headers: {
            Authorization: `Bearer ${window.localStorage.getItem("token")}`
          }
        }
      );

      const { key, url } = response.data;

      // Upload file to S3
      await axios.put(url, file, {
        headers: {
          'Content-Type': file.type
        }
      });

      // Prepare media info but don't send message yet
      const mediaType = file.type.startsWith('image/') ? 'image' :
                      file.type.startsWith('video/') ? 'video' :
                      file.type.startsWith('audio/') ? 'audio' : 'document';

      // Store this media as pending for when user clicks send
      setPendingMedia({
        url: key,
        type: mediaType,
        duration: recordingDuration
      });

      // Add indicator that media is attached to the message
      if (mediaType === 'audio') {
        setRecordingStatus('Voice message ready to send');
      } else {
        setRecordingStatus(`${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)} attached`);
      }
      setTimeout(() => setRecordingStatus(''), 3000);

    } catch (error) {
      console.error("Error uploading file:", error);
      setRecordingStatus(`Error: ${error.message || 'Upload failed'}`);
      setTimeout(() => setRecordingStatus(''), 3000);
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const startRecording = async () => {
    try {
      // Clear any pending media before starting a new recording
      if (pendingMedia) {
        setPendingMedia(null);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Use higher bitrate for better quality
      const recorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      });
      mediaRecorderRef.current = recorder;
      const chunks = [];
      const startTime = Date.now(); // Track recording start time
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        // Calculate recording duration
        const recordingDuration = (Date.now() - startTime) / 1000;
        console.log("Recorded duration:", recordingDuration);
        
        setRecordingStatus(`Processing... (${Math.round(recordingDuration)}s)`);
        setUploading(true);
        
        try {
          // Create the audio file with duration in the filename
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          const audioFile = new File(
            [audioBlob], 
            `voice-message-${Math.round(recordingDuration)}-sec.webm`, 
            { 
              type: 'audio/webm',
              lastModified: Date.now(),
            }
          );
          
          // Upload the file directly
          await handleFileUpload(audioFile, recordingDuration);
        } catch (error) {
          console.error('Error processing audio:', error);
          setRecordingStatus(`Error: ${error.message || 'Processing failed'}`);
          setTimeout(() => setRecordingStatus(''), 3000);
        } finally {
          setIsRecording(false);
          setAudioChunks([]);
          setUploading(false);
        }
      };

      recorder.start();
      setIsRecording(true);
      setMediaRecorder(recorder);
      setRecordingStatus('Recording...');
    } catch (error) {
      console.error('Error accessing microphone:', error);
      setRecordingStatus('Error: ' + error.message);
      setTimeout(() => setRecordingStatus(''), 3000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setRecordingStatus('Processing...');
    }
  };

  return (
    <div className={styles.container}>
      {/* Left Chat List */}
      <div className={`${styles.chatList} ${showChatList ? styles.show : ""}`}>
        <div className={styles.chatListHeader}>
          <h3>Chats</h3>
          {window.innerWidth < 768 && (
            <button
              onClick={() => setShowChatList(false)}
              className={styles.closeList}
            >
              &times;
            </button>
          )}
        </div>
        {chats.map((c, i) => (
          <div
            key={c.id}
            className={`${styles.chatCard} ${colored === i ? styles.active : ""}`}
            onClick={() => handleChatCardClick(c, i)}
          >
            <div className={styles.avatar}>
              {c.photo ? (
                <img src={c.photo} alt={c.fullName} />
              ) : (
                <span>{c.fullName ? c.fullName[0] : ""}</span>
              )}
            </div>
            <div className={styles.chatDetails}>
              <h4 className={styles.chatName}>{c.fullName}</h4>
              <p className={styles.chatMessage}>{c.lastMessage || "New conversation"}</p>
            </div>
            <div className={styles.chatTime}>
              {new Date(c.lastMessageDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {c.messageCount > 0 && <div className={styles.badge}>{c.messageCount}</div>}
          </div>
        ))}
      </div>

      {/* Right Chat Area */}
      <div className={styles.chatArea}>
        {/* Mobile Header to toggle Chat List */}
        {window.innerWidth < 768 && (
          <div className={styles.mobileHeader}>
            <button
              className={styles.toggleButton}
              onClick={() => setShowChatList(true)}
            >
              &#9776;
            </button>
            {to && (
              <span className={styles.mobileChatTitle}>
                {chats.find((chat) => chat.id === to)?.fullName || ""}
              </span>
            )}
          </div>
        )}
        <div className={styles.chatAreaContent}>
          {to ? (
            <ChatWindow
              partnerId={to}
              myId={JSON.parse(window.localStorage.getItem("userdata"))._id}
              onMessagesRead={handleMessagesRead}
              onCloseChat={() => {
                setTo("");
                setColored("");
              }}
              partnerInfo={chats.find((chat) => chat.id === to)}
              setChats={setChats}
            />
          ) : (
            <div className={styles.emptyChat}>Select a chat to start a conversation</div>
          )}
        </div>
        <div className={styles.chatInputArea}>
          <form onSubmit={submitHandler} className={styles.messageForm}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.uploadButton}
              disabled={uploading || !to}
            >
              {uploading ? <span className={styles.uploadingText}>Uploading...</span> : '📎'}
            </button>
            <button
              type="button"
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              className={`${styles.voiceButton} ${isRecording ? styles.recording : ''}`}
              disabled={!to || uploading}
              title={recordingStatus || "Hold to record voice message"}
            >
              {isRecording ? '🎤' : '🎤'}
              {recordingStatus && <span className={styles.recordingStatus}>{recordingStatus}</span>}
            </button>
            <div className={styles.messageInputContainer}>
              <textarea
                placeholder={pendingMedia ? "Add a message or send..." : "Type your message..."}
                value={msg}
                onChange={(e) => setMsg(e.target.value)}
                className={`${styles.messageInput} ${pendingMedia ? styles.withMedia : ''}`}
                rows="1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    socketSend();
                  }
                }}
              ></textarea>
              {pendingMedia && (
                <div className={styles.attachmentIndicator}>
                  {pendingMedia.type === 'image' ? '🖼️' : 
                   pendingMedia.type === 'video' ? '🎬' : 
                   pendingMedia.type === 'audio' ? '🎤' : '📄'}
                  <button 
                    className={styles.removeAttachment}
                    onClick={(e) => {
                      e.preventDefault(); // Prevent form submission
                      e.stopPropagation(); // Prevent event bubbling
                      setPendingMedia(null);
                      setRecordingStatus('Attachment removed');
                      setTimeout(() => setRecordingStatus(''), 1500);
                    }}
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <button 
              type="button" 
              onClick={socketSend} 
              className={styles.sendButton}
              disabled={!to || (!msg.trim() && !pendingMedia)}
            >
              Send
            </button>
            <input
              type="text"
              placeholder="To (id)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={styles.toInput}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostRestData;