import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../utils/socket";
import ChatHeader from "./ChatHeader";
import CustomAudioPlayer from "./CustomAudioPlayer";
import styles from "./css/ChatWindow.module.css";

const ChatWindow = ({
  partnerId,
  myId,
  onMessagesRead,
  onCloseChat,
  partnerInfo,
  setChats,
}) => {
  const [messages, setMessages] = useState([]);
  const [skips, setSkips] = useState(0);
  const [loading, setLoading] = useState(false);
  const [mediaElements, setMediaElements] = useState({});
  const scrollRef = useRef(null);

  // helper function for status indicator
  const getStatusIndicator = (status) => {
    if (status === "sent") return "✓";
    if (status === "delivered") return "✓✓";
    if (status === "read") return "✓✓";
    return "";
  };

  // helper function returning CSS class based on status
  const getStatusClassName = (status) => {
    if (status === "sent") return styles.statusSent;
    if (status === "delivered") return styles.statusDelivered;
    if (status === "read") return styles.statusRead;
    return "";
  };

  // function to fetch messages based on skip value
  const fetchMessages = async (currentSkips) => {
    try {
      const token = window.localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.REACT_APP_SERVER_HOST}/api/chats/getMessages/${partnerId}/${currentSkips}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return res.data;
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  };

  // load initial messages when partnerId changes
  useEffect(() => {
    if (partnerId) {
      setSkips(0);
      fetchMessages(0).then((initialMessages) => {
        setMessages(initialMessages);
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      });
    }
  }, [partnerId]);

  // listen for incoming messages and status updates via socket
  useEffect(() => {
    const handleReceiveMessage = (message) => {
      console.log("message", message);
      // convert sender to id only
      message.sender = message.sender._id;
      if (
        partnerId &&
        ((message.sender === partnerId && message.receiver === myId) ||
          (message.sender === myId && message.receiver === partnerId))
      ) {
        setMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg._id === message._id)) {
            return prevMessages;
          }
          return [...prevMessages, message];
        });
      }
    };

    const handleChangeMessageStatus = ({ id, status }) => {
      setMessages((prevMsgs) =>
        prevMsgs.map((msg) =>
          msg._id === id ? { ...msg, status: status } : msg
        )
      );
    };

    socket.on("receive", handleReceiveMessage);
    socket.on("LoadNewMessage", handleReceiveMessage);
    socket.on("changeMessageStatus", handleChangeMessageStatus);

    return () => {
      socket.off("receive", handleReceiveMessage);
      socket.off("LoadNewMessage", handleReceiveMessage);
      socket.off("changeMessageStatus", handleChangeMessageStatus);
    };
  }, [partnerId, myId]);

  // auto-scroll to the bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // mark received messages as read and notify parent
  useEffect(() => {
    let updated = false;
    messages.forEach((msg) => {
      if (msg.sender !== myId && msg.status !== "read") {
        msg.sender = { _id: msg.sender };
        socket.emit("messageRead", msg);
        updated = true;
      }
    });
    if (updated && onMessagesRead) {
      onMessagesRead(partnerId);
    }
  }, [messages, myId, partnerId]);

  // load older messages when scrolling to the top
  const handleScroll = async () => {
    if (scrollRef.current.scrollTop === 0 && !loading) {
      setLoading(true);
      const previousHeight = scrollRef.current.scrollHeight;
      const newSkip = skips + 1;
      const olderMessages = await fetchMessages(newSkip);
      if (olderMessages && olderMessages.length > 0) {
        setMessages((prevMsgs) => [...olderMessages, ...prevMsgs]);
        setSkips(newSkip);
        const newHeight = scrollRef.current.scrollHeight;
        scrollRef.current.scrollTop = newHeight - previousHeight;
      }
      setLoading(false);
    }
  };

  const createMediaElement = (media) => {
    if (!media || !media.url) return null;

    const mediaUrl = media.url;

    switch (media.type) {
      case 'image':
        return (
          <img 
            src={mediaUrl} 
            alt="Shared image" 
            className={styles.mediaContent}
            onError={(e) => {
              console.error("Error loading image");
              e.target.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEyIDJDNi40NzcgMiAyIDYuNDc3IDIgMTJzNC40NzcgMTAgMTAgMTAgMTAtNC40NzcgMTAtMTBTMTcuNTIzIDIgMTIgMnptMSAxNWgtMnYtMmgydjJ6bTAtNGgtMlY3aDJ2NnoiIGZpbGw9IiNGRjU3MjIiLz48L3N2Zz4=";
              e.target.classList.add(styles.errorImage);
              
              // Add deleted message text
              const errorElement = document.createElement('div');
              errorElement.className = styles.mediaError;
              errorElement.innerHTML = '<span class="' + styles.mediaErrorIcon + '">🗑️</span> Image not found or deleted from server';
              e.target.parentNode.appendChild(errorElement);
            }}
          />
        );
      case 'video':
        return (
          <video 
            controls 
            className={styles.mediaContent}
            onError={(e) => {
              console.error("Error loading video");
              e.target.style.display = 'none';
              const errorElement = document.createElement('div');
              errorElement.className = styles.mediaError;
              errorElement.innerHTML = '<span class="' + styles.mediaErrorIcon + '">🗑️</span> Video not found or deleted from server';
              e.target.parentNode.appendChild(errorElement);
            }}
          >
            <source 
              src={mediaUrl} 
              type="video/mp4" 
            />
            Your browser does not support the video tag.
          </video>
        );
      case 'audio':
        return (
          <div className={styles.voiceMessageContainer}>
            <CustomAudioPlayer 
              src={mediaUrl}
              onError={(error) => {
                console.error("Error loading audio:", error);
              }}
            />
          </div>
        );
      case 'document':
        return (
          <a 
            href={mediaUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.documentLink}
            // onClick={(e) => {
            //   // Prevent navigation if the link might be broken
             
              
            //   // Test if the document exists by making a HEAD request
            //   fetch(mediaUrl, { method: 'HEAD' })
            //     .then(response => {
            //       if (response.ok) {
            //         // File exists, navigate to it
            //         window.open(mediaUrl, '_blank', 'noopener,noreferrer');
            //       } else {
            //         // File doesn't exist, show error
            //         const errorElement = document.createElement('div');
            //         errorElement.className = styles.mediaError;
            //         errorElement.innerHTML = '<span class="' + styles.mediaErrorIcon + '">🗑️</span> Document not found or deleted from server';
            //         e.target.parentNode.appendChild(errorElement);
            //         e.target.style.display = 'none';
            //       }
            //     })
            //     .catch(() => {
            //       // Error making request, assume file doesn't exist
            //       const errorElement = document.createElement('div');
            //       errorElement.className = styles.mediaError;
            //       errorElement.innerHTML = '<span class="' + styles.mediaErrorIcon + '">🗑️</span> Document not found or deleted from server';
            //       e.target.parentNode.appendChild(errorElement);
            //       e.target.style.display = 'none';
            //     });
            // }}
          >
            <span>📄</span> Document
          </a>
        );
      default:
        return null;
    }
  };

  // Create media elements when messages change
  useEffect(() => {
    const newMediaElements = {};
    
    for (const msg of messages) {
      if (msg.media && msg.media.url) {
        newMediaElements[msg._id] = createMediaElement(msg.media);
      }
    }
    
    setMediaElements(newMediaElements);
  }, [messages]);

  return (
    <div className={styles.chatContainer}>
      {partnerInfo && (
        <ChatHeader
          partnerInfo={partnerInfo}
          onClose={onCloseChat}
          setChats={setChats}
        />
      )}
      <div
        className={styles.messagesContainer}
        ref={scrollRef}
        onScroll={handleScroll}
      >
        {messages.map((msg) => {
          const isMyMessage = msg.sender === myId;
          return (
            <div
              key={msg._id}
              className={`${styles.messageRow} ${
                isMyMessage ? styles.myRow : styles.partnerRow
              }`}
            >
              <div
                className={`${styles.messageBubble} ${
                  isMyMessage ? styles.myMessage : styles.partnerMessage
                }`}
              >
                {msg.media && mediaElements[msg._id]}
                {msg.content && <p className={styles.messageText}>{msg.content}</p>}
                <div
                  className={`${styles.timeIndicator} ${
                    isMyMessage ? styles.timeMy : styles.timePartner
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {isMyMessage && (
                    <span className={getStatusClassName(msg.status)}>
                      {getStatusIndicator(msg.status)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatWindow;