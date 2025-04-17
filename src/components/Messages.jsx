import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../utils/socket";
import ChatHeader from "./ChatHeader";

// دالة مساعدة لتحديد العرض والأسلوب بناءً على حالة الرسالة
const getStatusIndicator = (status) => {
  // يمكنك استبدال هذه النصوص بأيقونات، مثلاً باستخدام مكتبة FontAwesome أو Material Icons
  if (status === "sent") return "✓"; // رسالة مرسلة
  if (status === "delivered") return "✓✓"; // رسالة تم تسليمها
  if (status === "read") return "✓✓"; // رسالة تمت قراءتها
  return "";
};

const getStatusStyle = (status) => {
  if (status === "sent") return { color: "#999" };
  if (status === "delivered") return { color: "#91A48D" };
  if (status === "read") return { color: "#00FF00" };
  return {};
};

const ChatWindow = ({
  partnerId,
  myId,
  onMessagesRead,
  onCloseChat,
  partnerInfo,
  setChats,
}) => {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  // جلب الرسائل عند تغيير partnerId
  useEffect(() => {
    async function fetchMessages() {
      try {
        const token = window.localStorage.getItem("token");
        await axios
          .get(`${process.env.REACT_APP_SERVER_HOST}/api/chats/getMessages/${partnerId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then((res) => setMessages(res.data))
          .catch((err) => setMessages([]));
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    }

    if (partnerId) {
      fetchMessages();
    }
  }, [partnerId]);

  // استقبال الرسائل الجديدة عبر socket
  useEffect(() => {
    const handleReceiveMessage = (message) => {
      // تحويل sender إلى معرف فقط
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
      setMessages((prevMsgs) => {
        return prevMsgs.map((msg) =>
          msg._id === id ? { ...msg, status: status } : msg
        );
      });
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

  // Auto-scroll إلى الأسفل عند تحديث الرسائل
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // تعليم الرسائل الواردة كمقروءة وإعلام المكوّن الأب لتحديث عداد الرسائل
  useEffect(() => {
    let updated = false;
    messages.forEach((msg) => {
      // إذا كانت الرسالة واردة (sender ليس هو المستخدم) وحالتها ليست "read"
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "85vh" }}>
      {/* رأس المحادثة الجديد */}
      {partnerInfo && (
        <ChatHeader
          partnerInfo={partnerInfo}
          onClose={onCloseChat}
          setChats={setChats}
        />
      )}
      <div
        className="chat-window"
        style={{
          height: "85vh",
          overflowY: "auto",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "8px",
        }}
        ref={scrollRef}
      >
        {console.log(messages)}
        {messages.map((msg) => {
          const isMyMessage = msg.sender === myId;
          return (
            <div
              key={msg._id}
              style={{
                display: "flex",
                justifyContent: isMyMessage ? "flex-end" : "flex-start",
                marginBottom: "15px",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "10px 15px",
                  borderRadius: "20px",
                  backgroundColor: isMyMessage ? "#007bff" : "#ffffff",
                  color: isMyMessage ? "white" : "#333",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  wordBreak: "break-word",
                  position: "relative",
                }}
              >
                <p style={{ margin: "0 0 5px 0" }}>{msg.content}</p>
                <div
                  style={{
                    fontSize: "0.75em",
                    color: isMyMessage ? "#e0e0e0" : "#666",
                    textAlign: "right",
                  }}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {/* عرض مؤشر الحالة بجانب التوقيت */}
                  {isMyMessage && (
                    <span
                      style={{
                        marginLeft: "8px",
                        ...getStatusStyle(msg.status),
                      }}
                    >
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
