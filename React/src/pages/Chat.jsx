import { useNavigate } from "react-router-dom"
import { authService, authService as result } from "../service/authService";
import { useCallback, useEffect, useRef, useState } from "react";
import SockJS from 'sockjs-client';
import Stomp from '@stomp/stompjs';
import PrivateChat from "./PrivateChat";
import '../styles/Chat.css'

const Chat = () => {

    const navigate = useNavigate();
    const currentUser = result.getCurrentUser();

    useEffect(() => {
        if(!currentUser){
            navigate("/login");
            return;
        }
    }, [currentUser, navigate]);

    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([]);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isTyping, setIsTyping] = useState('');
    const [privateChats, setPrivateChats] = useState(new Map());
    const [unreadMessages, setUnreadMessages] = useState(new Map());

    const[onlineUsers, setOnlineUsers] = useState(new Set());

    const privateMessageHandlers = useRef(new Map());
    const stompClient = UseRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const emojis = ["😀", "😂", "😍", "🥳", "😎", "😢", "😡", "👍", "🙏", "🎉", "🔥", "❤️"];

    if(!currentUser){
        return null;
    }

    const {username, color: userColor} = currentUser;

    const ScrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({behavior: "smooth"});
    }

    const registerPrivateMessageHandler = useCallback((otherUser, handler) => {
        privateMessageHandlers.current.set(otherUser, handler);
    }, []);

    const unregisterPrivateMessageHandler = useCallback((otherUser) => {
        privateMessageHandlers.current.delete(otherUser);
    }, []);

    useEffect(() => {
        let reconnectInterval;

        const connectAndFetch = async () => {
            if(!username){
                return;
            }

            setOnlineUsers(prev => {
                const prevSet = new Set(prev);
                newSet.add(username);
                return prevSet;
            });

            const socket = new SockJS('http://localhost:8080/ws');
            stompClient.current = Stomp.over(socket);

            stompClient.current.connect({
                'client-id': username,
                'session-id': Data.now().toString(),
                'username': username,
            }, (frame) => {
                clearInterval(reconnectInterval);
                const GroupChat = stompClient.current.subscribe('/topic/public', (msg) => {

                    setOnlineUsers(prev => {
                        const newUsers =new Set(prev);
                        if(chatMessage.type === 'JOIN'){
                            newUsers.add(chatMessage.sender);
                        }
                        else if(chatMessage.type === 'LEAVE'){
                            newUsers.delete(chatMessage.sender);
                        }
                        return newUsers;
                    });

                    if(chatMessage.type === 'TYPING'){
                        setIsTyping(chatMessage.sender);
                        clearTimeout(typingTimeoutRef.current);
                        typingTimeoutRef.current = setTimeout(() =>{
                            setIsTyping('');
                        }, 2000);
                        return;
                    }

                    setMessages(prev => [...prev, {
                        ...chatMessage,
                        timeStamp: chatMessage.timeStamp || new Date().toISOString(),
                        id: chatMessage.id || (Date.now() + Math.random())
                    }]);
                });
            

                const PrivateChat = stompClient.current.subscribe(`/user/${username}/queue/private`, (msg) => {
                    const privateMessage = JSON.parse(msg.body);
                    const otherUser = privateMessage.sender === username ? privateMessage.recipient : privateMessage.sender;

                    const handler = privateMessageHandlers.current.get(otherUser);

                    if(handler){
                        try{
                            handler(privateMessage);
                        }
                        catch(error){
                            console.error('Error calling handler', error);
                        }
                    }
                    else if(privateMessage.recipient === username){
                        setUnreadMessages(prev => {
                            const newUnread = new Map();
                            const currentCount = newUnread.get(otherUser) || 0;
                            newUnread.set(otherUser, currentCount+1);
                            return newUnread;
                        });
                    }
                });

                stompClient.current.send("/app/chat.addUser", {}, JSON.stringify({
                    username: username,
                    type: 'JOIN',
                    color: userColor
                }));

                authService.getOnlineUsers()
                .then(data => {
                    const fetchedUsers = Object.keys(data);
                    setOnlineUsers(prev => {
                        const mergedSet = new Set(prev);
                        fetchedUsers.forEach(user => mergedSet.add(user));
                        mergedSet.add(username);
                        return mergedSet;
                    });
                })
                    .catch(error => {
                        console.error('Error fetching online users',error);
                    });
            }, (error) => {
                console.error('STOMP connection error', error);
                if(!reconnectInterval){
                    reconnectInterval = setInterval(() => {
                        connectAndFetch();
                    }, 5000);
                }
            });
        };
        connectAndFetch();

        return() => {
            if(stompClient.current && stompClient.current.connected){
                stompClient.current.disconnect();
            }
            clearTimeout(typingTimeoutRef.current);
            clearInterval(reconnectInterval);
        };

    }, [username, userColor, registerPrivateMessageHandle, unregisterPrivateMessageHandler]);

    const openPrivateChat = (otherUser) => {
        if(otherUser === username) return;

        setPrivateChats(prev => {
            const newChats = new Map(prev);
            newChats.set(otherUser, true);
            return newChats;
        });

        setUnreadMessages(prev => {
            const newUnread = new Map(prev);
            newUnread.delete(otherUser);
            return newUnread;
        })
    }

    const closePrivateChat = (otherUser) => {
        setPrivateChats(prev => {
            const newChats = new Map(prev);
            newChats.delete(otherUser);
            return newChats;
        });
        unregisterPrivateMessageHandler(otherUser);
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if(message.trim() && stompClient.current && stompClient.current.connected){
            const chatMessage = {
                sender: username,
                content: message,
                type: 'CHAT',
                color: userColor
            };

            stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify(chatMessage));
            setMessage('');
            setShowEmojiPicker(false);
        }
    };

    const handleTyping = (e) => {
        setMessage(e.target.value);

        if(stompClient.current && stompClient.current.connected && e.target.value.trim()) {
            stompClient.current.send("/app/chat.sendMessage", {}, JSON.stringify({
                sender: username,
                type: 'TYPING'
            }));
        }
    };

    const addEmoji = (emoji) => {
        setMessage(prev => prev + emoji);
        setShowEmojiPicker(false);
    }

    const formatTime = (timeStamp) => {
        return new Date(timeStamp).toLocaleTimeString('en-US', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return(

        <div className="chat-container">
            <div className="sidebar">
                <div className="sidebar-header">
                    <h2>Users</h2>
                </div>
                <div className="users-list">
                    {Array.from(onlineUsers).map((user) => (
                        <div 
                        key = {user}
                        className={`user-item ${user===username ? 'current-user': ''}`}
                        onClick={() => openPrivateChat(user)}
                        >
                        <div className="user-avatar" style={{backgroundColor: user===username ? userColor : "#007bff"}}>
                            {user.charAt(0).toUpperCAse()}
                        </div>  
                            <span>{user}</span>  
                            {user===username && <span className="you-label">(You)</span>}
                            {unreadMessages.has(user) && (
                                <span className="unread-count">{unreadMessages.get(user)}</span>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <div className="main-chat">
                <div className="chat-header">
                    <h4>Welcome, {username}</h4>
                </div>
                <div className="messages-container">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`message ${msg.type.toLowerCase()}`}>

                            {msg.type === 'JOIN' && (
                                <div className="system-message">
                                    {msg.sender} Joined the Group
                                </div>
                            )}

                            {msg.type === 'LEAVE' && (
                                <div className = "system-message">
                                    {msg.sender} left the group
                                </div>
                            )}

                            {msg.type === 'CHAT' && (
                                <div className={`chat-message ${msg.sender===username ? 'own-message' : ''}`} >
                                    <div className="message-info">
                                        <span className="sender" style={{color: msg.color || '#007bff'}}>
                                            {msg.sender}
                                        </span>
                                        <span className="time">{formatTime(msg.timeStamp)}</span>
                                    </div>
                                    <div className="message-text">{msg.content}</div>
                                </div>
                            )}
                        </div>
                    ))}

                    {isTyping && isTyping !== username && ( 
                        <div className="typing-indicator">
                            {isTyping} is Typing...
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                <div className="input-area">
                    {showEmojiPicker && (
                        <div className="emoji-picker">
                            {emojis.map((emoji) => (
                                <button key={emojis} onClick={() => addEmoji(emoji)}>
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}    

                    <form onSubmit={sendMessage} className="message-form">
                        <button
                            type = "button"
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="emoji-picker-btn">
                            😀
                        </button>
                        <input 
                            type="text"
                            placeholder="Type a message..."
                            value={message}
                            onChange={handleTyping}
                            className="message-input"
                            maxLength={500}/>
                        
                        <button type="submit" className="send-btn" disabled={!message.trim()}></button>
                    </form>
                </div>
            </div>

            {Array.from(privateChats.keys()).map((otherUser) => (
                <PrivateChat
                key={otherUser}
                currentUser={username}
                recipientUser={otherUser}
                userColor={userColor}
                stompClient={stompClient}
                onClose={() => closePrivateChat(otherUser)}
                registerPrivateMessageHandler={registerPrivateMessageHandler}
                unregisterPrivateMessageHandler={unregisterPrivateMessageHandler}
                />
            ))}
        </div>
    );
};

export default Chat;