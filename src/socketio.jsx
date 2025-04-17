import React from "react";
import "./useful.css";
import socket from "./utils/socket";
const RecieveData = () => {
  let [chats, setChats] = React.useState([]);
  React.useEffect(() => {
    getData();
  });
  const getData = () => {
    socket.on("connect", () => {
      console.log(socket.connected); // true
    });

    socket.on("receive", (msg, callback) => {
      console.log(msg);

      //   console.log(`Lgdata --->> ${msg.msg}`);
      //   chats = [...chats, msg.msg];
      setChats([...chats, msg]);
      //   console.log(`Lgdata --->> ${msg.msg}`);

      socket.emit("messageDelivered", msg._id);
    });
  };

  const data = chats.map((i, index) => {
    return (
      <div key={index} className="chat">
        <p>sender: {i.sender.fullName}</p>
        <p>reciver: {i.to}</p>
        <div>{i.msg}</div>
      </div>
    );
  });
  console.log(chats);
  return (
    <div className="main">
      <div>
        {" "}
        <p className="h1 text-primary">Messages Will come here</p>
      </div>
      <div className="p-5 data">{data}</div>
    </div>
  );
};

export default RecieveData;
