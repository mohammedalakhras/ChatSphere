import axios from "axios";

const getChats = (setChats) => {
  const token = window.localStorage.getItem('token');
  return fetch(token, `${process.env.REACT_APP_SERVER_HOST}/api/chats/MyChats`,setChats);
}

async function fetch(token, url,setChats) {
  try {
    const config = {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    };
    const response = await axios.get(url, config).then(e=>setChats(e.data)).catch(e=>setChats([e+'error']));
    return response;
  } catch (error) {
    console.error('Error fetching chats:', error);
    throw error; // Or handle the error as needed
  }
}

export default getChats;