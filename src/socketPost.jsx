import React, { useState, useEffect } from "react";
import getChats from "./utils/getChats";
import ChatWindow from "./components/Messages";
import socket from "./utils/socket";

function PostRestData() {
  const [chats, setChats] = useState([]);
  const [msg, setMsg] = useState("");
  const [to, setTo] = useState("");
  const [colored, setColored] = useState("");

  function handleUpdateMessage(updatedConversation) {
    console.log("updaeed chats", updatedConversation);

    setChats((prevChats) => {
      const updatedChats = [...prevChats];
      const index = updatedChats.findIndex(
        (chat) => chat.id === updatedConversation.chatPartner
      );

      if (index !== -1) {
        updatedChats[index] = {
          ...updatedChats[index],
          // photo: updatedConversation.photo,
          // lastMessage: updatedConversation.lastMessage,
          // lastMessageDate: updatedConversation.lastMessageDate,
          // lastLoginTime: updatedConversation.lastLoginTime,
          ...updatedConversation
        };
        console.log("after updaeed chats", updatedChats[index]);
      } else {
        updatedChats.push({
          messageCount: 1,
          id: updatedConversation.chatPartner,
          // lastMessage: updatedConversation.lastMessage,
          // lastMessageDate: updatedConversation.lastMessageDate,
          // fullName: updatedConversation.fullName,
          // photo: updatedConversation.photo,
          // lastLoginTime: updatedConversation.lastLoginTime,
          ...updatedConversation
        });
      }
      updatedChats.sort(
        (a, b) => new Date(b.lastMessageDate) - new Date(a.lastMessageDate)
      );
      return updatedChats;
    });
  }

  function handleReceivedMessage(message) {
    setChats((prevChats) => {
      const updatedChats = [...prevChats];
      const chatPartner = message.sender._id;

      console.log("erecieved", message);

      if (
        chatPartner === JSON.parse(window.localStorage.getItem("userdata"))._id
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

  // Callback to clear the unread count when messages are read
  function handleMessagesRead(partnerId) {
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === partnerId ? { ...chat, messageCount: 0 } : chat
      )
    );
  }

  useEffect(() => {
    socket.on("connect", () => {
      console.log("Connected via socket:", socket.connected);
      socket.emit("signin", window.localStorage.getItem("token"));

      getChats(setChats);
    });
    socket.on("updatedMessage", handleUpdateMessage);
    socket.on("receive", handleReceivedMessage);
    socket.on("lastSeenUpdate", (data) => {
      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === data.userId
            ? { ...chat, lastLoginTime: data.lastSeen }
            : chat
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

  return (
    <div
      className="container"
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        margin: "0",
        padding: "0",
      }}
    >
      {/* Left Chat List */}
      <div
        className="chat-list"
        style={{
          width: "30%",
          borderRight: "1px solid #ccc",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            padding: "1rem",
            borderBottom: "1px solid #ccc",
            backgroundColor: "#f7f7f7",
          }}
        >
          <h3>Chats</h3>
        </div>

        {console.log("chats", chats)}

        {chats.map((c, i) => (
          <div
            key={c.id}
            className={`chat-card ${colored === i ? "active" : ""}`}
            onClick={() => {
              setTo(c.id);
              setColored(i);
            }}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: "1rem",
              borderBottom: "1px solid #f0f0f0",
              backgroundColor: colored === i ? "#f5f7fb" : "white",
              transition: "background-color 0.2s ease",
              position: "relative",
            }}
            
          >
            {/* Avatar */}
            <div
              style={{
                marginRight: "1rem",
                width: "50px",
                height: "50px",
                borderRadius: "50%",
                backgroundColor: "#e8eaf6",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }}
            >
              {c.photo ? (
                <img
                  src={c.photo}
                  alt={c.fullName}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    fontSize: "1.2rem",
                    fontWeight: "500",
                    color: "#3f51b5",
                  }}
                >
                  {c.fullName}
                </span>
              )}
            </div>
            {/* Chat details */}
            <div style={{ flexGrow: 1 }}>
              <h4
                style={{
                  margin: 0,
                  fontSize: "1rem",
                  fontWeight: "600",
                  color: "#1a1a1a",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.fullName}
              </h4>
              <p
                style={{
                  margin: 0,
                  color: "#666",
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.lastMessage || "New conversation"}
              </p>
            </div>
            <div
              style={{
                fontSize: "0.8rem",
                color: "#666",
                marginLeft: "0.5rem",
              }}
            >
              {new Date(c.lastMessageDate).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {c.messageCount > 0 && (
              <div
                style={{
                  backgroundColor: "#3f51b5",
                  color: "white",
                  borderRadius: "12px",
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  fontWeight: "600",
                  minWidth: "24px",
                  textAlign: "center",
                  position: "absolute",
                  top: "5px",
                  right: "10px",
                }}
              >
                {c.messageCount}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Right Chat Area */}
      <div
        className="chat-area"
        style={{ width: "70%", display: "flex", flexDirection: "column" }}
      >
        {/* ChatWindow now receives an onCloseChat callback */}
        <div style={{ flexGrow: 1, overflowY: "auto", width: "100%" }}>
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
            <div style={{ padding: "1rem" }}>
              Select a chat to start conversation
            </div>
          )}
        </div>
        {/* Message input area */}
        <div
          style={{
            padding: "1rem",
            borderTop: "1px solid #ccc",
            backgroundColor: "#f7f7f7",
          }}
        >
          <form
            onSubmit={submitHandler}
            style={{ display: "flex", alignItems: "center" }}
          >
            <input
              type="text"
              placeholder="Type your message..."
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              style={{
                flexGrow: 1,
                padding: "0.5rem",
                marginRight: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
              }}
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
            <button
              type="button"
              onClick={socketSend}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#3f51b5",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Send
            </button>
            <input
              type="text"
              placeholder="To (id)"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              style={{
                marginLeft: "0.5rem",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid #ccc",
                width: "150px",
              }}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostRestData;
