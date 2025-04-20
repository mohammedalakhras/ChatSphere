import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../utils/socket";
import ChatHeader from "./ChatHeader";
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
                <p className={styles.messageText}>{msg.content}</p>
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