import React, { useEffect } from "react";
import socket from "../utils/socket";
import styles from "./css/ChatHeader.module.css";

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
    <div className={styles.chatHeader}>
      <div className={styles.avatar}>
        {partnerInfo.photo ? (
          <img
            className={styles.avatarImg}
            src={partnerInfo.photo}
            alt={partnerInfo.fullName}
          />
        ) : (
          <div className={styles.avatarPlaceholder}>
            <span className={styles.avatarPlaceholderText}>
              {partnerInfo.fullName[0]}
            </span>
          </div>
        )}
      </div>
      <div className={styles.info}>
        <h5 className={styles.name}>{partnerInfo.fullName}</h5>
        <p className={styles.lastSeen}>
          Last seen: {partnerInfo.lastLoginTime}
        </p>
      </div>
      <button onClick={onClose} className={styles.closeButton}>
        &times;
      </button>
    </div>
  );
};

export default ChatHeader;