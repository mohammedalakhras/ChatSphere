import io from "socket.io-client";

const socket = io(`${process.env.REACT_APP_SERVER_HOST}`, {
  auth: {
    token: window.localStorage.getItem("token"),
  },
});


export default socket;
