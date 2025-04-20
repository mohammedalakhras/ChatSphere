import React, { useState, useEffect } from "react";
import getChats from "./utils/getChats";
import ChatWindow from "./components/Messages";
import socket from "./utils/socket";
import styles from "./css/PostRestData.module.css";

function PostRestData() {
  const [chats, setChats] = useState([]);
  const [msg, setMsg] = useState("");
  const [to, setTo] = useState("");
  const [colored, setColored] = useState("");
  // Show chat list by default on larger screens; on mobile it will be off-canvas.
  const [showChatList, setShowChatList] = useState(window.innerWidth >= 768);

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
          lastMessageDate: message.createdAt,
          messageCount: (updatedChats[index].messageCount || 0) + 1,
          lastLoginTime: message.lastLoginTime,
        };
      } else {
        updatedChats.push({
          id: chatPartner,
          fullName: message.sender.fullName,
          photo: message.sender.photo,
          lastMessage: message.content,
          lastMessageDate: message.createdAt,
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
    socket.emit("sendMessage", {
      content: msg,
      receiver: to,
    });
    setMsg("");
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
              type="text"
              placeholder="Type your message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              className={styles.messageInput}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (msg.trim()) {
                    socketSend();
                    setMsg("");
                  }
                }
              }}
            />
            <button type="button" onClick={socketSend} className={styles.sendButton}>
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