import React, { useEffect } from "react";
import socket from "../utils/socket";

const ChatHeader = ({ partnerInfo, onClose, setChats }) => {
  useEffect(() => {
    const handleLastSeenUpdate = (data) => {
      console.log("data", data, "\npartnerInfo", partnerInfo);

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === data.partnerId
            ? { ...chat, lastLoginTime: data.lastSeen }
            : chat
        )
      );
    };

    socket.on("lastSeenUpdate", handleLastSeenUpdate);
    return () => {
      socket.off("lastSeenUpdate", handleLastSeenUpdate);
    };
  }, [partnerInfo, setChats]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "10px",
        backgroundColor: "#f7f7f7",
        borderBottom: "1px solid #ccc",
      }}
    >
      <div
        style={{
          marginRight: "10px",
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          overflow: "hidden",
        }}
      >
        {partnerInfo.photo ? (
          <img
            src={partnerInfo.photo}
            alt={partnerInfo.fullName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              marginRight: "1rem",
              width: "50px",
              height: "50px",
              borderRadius: "50",
              backgroundColor: "#BBB",
              display: "flex",

              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                fontSize: "1.2rem",
                fontWeight: "500",
                color: "#3f51b5",
              }}
            >
              {partnerInfo.fullName[0]}
            </span>
          </div>
        )}
      </div>
      <div style={{ flexGrow: 1 }}>
        <h5 style={{ margin: 0 }}>{partnerInfo.fullName}</h5>
        <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
          Last seen: {partnerInfo.lastLoginTime}
        </p>
      </div>
      <button
        onClick={onClose}
        style={{
          background: "none",
          border: "none",
          fontSize: "1.5rem",
          cursor: "pointer",
          color: "black",
        }}
      >
        X
      </button>
    </div>
  );
};

export default ChatHeader;
