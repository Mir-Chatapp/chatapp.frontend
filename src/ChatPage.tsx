import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import 'bootstrap/dist/css/bootstrap.min.css'; // Import Bootstrap CSS

interface User {
    userName: string;
    userId: string;
}

interface Message {
    from: string;
    text: string;
}

const ChatPage: React.FC = () => {
    const auth = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [messages, setMessages] = useState<Record<string, Message[]>>({});
    const [input, setInput] = useState('');
    const [isConnected, setIsConnected] = useState(false); // Default to disconnected (red indicator)
    const [alert, setAlert] = useState<{ type: 'warning' | 'danger'; message: string } | null>(null);
    const [notifications, setNotifications] = useState<Record<string, boolean>>({}); // Track notifications for each user
    const wsRef = useRef<WebSocket | null>(null); // Use useRef for WebSocket instance

    useEffect(() => {
        let retryCount = 0;
        const maxRetries = 5; // Maximum number of retries

        const fetchUsers = async () => {
            try {
                let accessToken = auth.user?.access_token; // Get the access token
                const currentUserSub = auth.user?.profile.sub; // Get the current user's sub

                if (!accessToken) {
                    const storedToken = localStorage.getItem('accessToken'); // Retrieve token from localStorage
                    accessToken = storedToken ? storedToken : undefined; // Ensure compatibility with expected type
                }

                if (!accessToken) {
                    if (retryCount < maxRetries) {
                        console.warn(`Access token is missing. Retrying fetch in 2 seconds... (Attempt ${retryCount + 1}/${maxRetries})`);
                        retryCount++;
                        setTimeout(fetchUsers, 2000); // Retry after 2 seconds
                    } else {
                        console.error('Access token is still missing after maximum retries. Aborting fetch.');
                    }
                    return;
                }

                localStorage.setItem('accessToken', accessToken); // Store token in localStorage

                const response = await fetch('https://xd5491qso1.execute-api.us-west-2.amazonaws.com/dev/v1/users', {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                });

                if (!response.ok) {
                    console.error(`Failed to fetch users. HTTP status: ${response.status}`);
                    return;
                }

                const data = await response.json();

                if (data.statusCode === 200) {
                    const filteredUsers = data.body.users.filter((user: User) => user.userId !== currentUserSub);
                    setUsers(filteredUsers);
                } else {
                    console.error('Failed to fetch users:', data);
                }
            } catch (error) {
                console.error('Error fetching users:', error);
                if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
                    console.error('Network error or CORS issue detected. Please check your API endpoint and network connectivity.');
                }
            }
        };

        fetchUsers();

        const intervalId = setInterval(fetchUsers, 500000); // Fetch users every 500 seconds

        return () => clearInterval(intervalId); // Cleanup interval on component unmount
    }, [auth]);

    useEffect(() => {
        if (!auth.isAuthenticated) {
            const clientId = "18p14d5f31j81tmsi1mubnrjb2";
            const redirectUri = "http://localhost:5173/callback";
            const cognitoDomain = "https://us-west-2fxfeoegvx.auth.us-west-2.amazoncognito.com";

            window.location.href = `${cognitoDomain}/login?client_id=${clientId}&response_type=code&scope=openid&redirect_uri=${encodeURIComponent(redirectUri)}`;
        }
    }, [auth.isAuthenticated]);

    useEffect(() => {
        if (wsRef.current) {
            wsRef.current.onmessage = (event) => {
                console.log('Message received from WebSocket:', event.data);
                const message = JSON.parse(event.data);

                if (message.from_user && message.message) {
                    // Map from_user to userName using the users list
                    const sender = users.find((user) => user.userId === message.from_user);
                    const senderName = sender ? sender.userName : 'Unknown';

                    setMessages((prevMessages) => {
                        const userMessages = prevMessages[message.from_user] || [];
                        return {
                            ...prevMessages,
                            [message.from_user]: [...userMessages, { from: senderName, text: message.message }],
                        };
                    });

                    // Set notification for the user if they are not the currently selected user
                    if (message.from_user !== selectedUser?.userId) {
                        setNotifications((prevNotifications) => ({
                            ...prevNotifications,
                            [message.from_user]: true,
                        }));
                    }
                }
            };
        }
    }, [selectedUser]);

    const handleUserClick = (user: User) => {
        setSelectedUser(user);

        // Clear notification for the selected user
        setNotifications((prevNotifications) => {
            const updatedNotifications = { ...prevNotifications };
            delete updatedNotifications[user.userId];
            return updatedNotifications;
        });
    };

    const handleSend = () => {
        if (!selectedUser) {
            setAlert({ type: 'warning', message: 'No user selected. Please select a user to send a message.' });
            return;
        }

        if (!input.trim()) {
            setAlert({ type: 'warning', message: 'Message is empty. Please enter a message to send.' });
            return;
        }

        if (input.length > 500) {
            setAlert({ type: 'warning', message: 'Message exceeds the 500-character limit. Please shorten your message.' });
            return;
        }

        const payload = {
            customroute: "sendmessage",
            from: auth.user?.profile.sub || "unknown",
            to: selectedUser.userId,
            message: input,
        };

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(payload));
            console.log("Message sent:", payload);
            setAlert(null); // Clear any existing alerts

            // Update the messages state to include the new message
            setMessages((prevMessages) => {
                const userMessages = prevMessages[selectedUser.userId] || [];
                return {
                    ...prevMessages,
                    [selectedUser.userId]: [...userMessages, { from: "Me", text: input }],
                };
            });
        } else {
            setAlert({ type: 'danger', message: 'WebSocket connection is not active. Please try again later.' });
            return;
        }

        setInput('');
    };

    const signOutRedirect = async () => {
        const clientId = "18p14d5f31j81tmsi1mubnrjb2";
        const logoutUri = "http://localhost:5173";
        const cognitoDomain = "https://us-west-2fxfeoegvx.auth.us-west-2.amazoncognito.com";

        try {
            if (wsRef.current) {
                wsRef.current.close();
                console.log('All WebSocket connections closed during sign out.');
            }
            await auth.removeUser();
            setSelectedUser(null);
            window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
        } catch (error) {
            console.error("Error during sign out:", error);
        }
    };

    const connectWebSocket = () => {
        if (wsRef.current) {
            console.warn('Closing existing WebSocket connection before establishing a new one.');
            wsRef.current.close();
        }

        const accessToken = auth.user?.access_token;

        if (!accessToken) {
            console.error('Access token is missing. Cannot establish WebSocket connection.');
            return;
        }

        console.log('Using access token for WebSocket connection:', accessToken);

        const wsUrl = `wss://5vqx0cw010.execute-api.us-west-2.amazonaws.com/teststage01?token=${accessToken}`;
        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log('WebSocket connection established.');
            setIsConnected(true); // Update connection status
            setAlert(null); // Clear any existing alerts related to WebSocket
        };

        wsRef.current.onmessage = (event) => {
            console.log('Message received from WebSocket:', event.data);
        };

        wsRef.current.onclose = (event) => {
            console.error('WebSocket connection closed:', {
                wasClean: event.wasClean,
                code: event.code,
                reason: event.reason,
                event,
            });
            setIsConnected(false); // Update connection status
            setAlert({ type: 'danger', message: 'WebSocket connection lost. Attempting to reconnect...' });
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error occurred:', error);
        };
    };

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                console.log('WebSocket connection closed on component unmount.');
            }
        };
    }, [auth.user?.access_token]);

    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
                console.log('Tab is active. Attempting to re-establish WebSocket connection...');
                connectWebSocket();
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (auth.error) {
        return <div>Encountering error... {auth.error.message}</div>;
    }

    return (
        <div style={{ display: 'flex', height: '80vh', width: '80vw', background: 'rgba(255,255,255,0.7)', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            {alert && (
                <div className={`alert alert-${alert.type}`} role="alert" style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                    {alert.message}
                </div>
            )}
            {/* Users List */}
            <div style={{ width: '25%', borderRight: '1px solid #eee', padding: 24, overflowY: 'auto', background: '#e67e22', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h4 style={{ color: '#fff', letterSpacing: '2px', fontWeight: 700, fontSize: '1.5rem', textAlign: 'center', marginBottom: 32, textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    <span style={{ display: 'inline-block', transform: 'rotate(-8deg)', marginRight: 8 }}>👥</span>
                    Co-workers
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
                    {users.map((user) => (
                        <li key={user.userId} style={{ position: 'relative' }}>
                            <button
                                style={{
                                    width: '100%',
                                    padding: '12px 8px',
                                    margin: '8px 0',
                                    borderRadius: 8,
                                    border: user.userId === selectedUser?.userId ? '2px solid #6a82fb' : '1px solid #ccc',
                                    background: user.userId === selectedUser?.userId ? '#e3eafe' : '#fff',
                                    fontWeight: user.userId === selectedUser?.userId ? 700 : 400,
                                    cursor: 'pointer',
                                    color: '#111',
                                }}
                                onClick={() => handleUserClick(user)}
                            >
                                {user.userName}
                                {notifications[user.userId] && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '50%',
                                            right: '10px',
                                            transform: 'translateY(-50%)',
                                            background: 'red',
                                            color: 'white',
                                            borderRadius: '50%',
                                            width: '10px',
                                            height: '10px',
                                        }}
                                    ></span>
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
                <button className="btn px-4" style={{ width: '100%', fontWeight: 600, background: '#f5cba7', color: '#b30000', border: 'none' }} onClick={signOutRedirect}>Sign Out</button>
            </div>
            {/* Chat Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, background: '#2e4053', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, background: '#f8fafc', borderRadius: 8, padding: 16 }}>
                    {(messages[selectedUser?.userId || ''] || []).map((msg: Message, idx: number) => (
                        <div key={idx} style={{
                            textAlign: msg.from === 'Me' ? 'right' : 'left',
                            margin: '8px 0',
                        }}>
                            <span style={{
                                display: 'inline-block',
                                background: msg.from === 'Me' ? '#e3eafe' : '#e3eafe',
                                color: '#333',
                                borderRadius: 16,
                                padding: '8px 16px',
                                maxWidth: '60%',
                                wordBreak: 'break-word',
                            }}>
                                <b>{msg.from}:</b> {msg.text}
                            </span>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                        className="form-control"
                        style={{ flex: 1, borderRadius: 16 }}
                        type="text"
                        placeholder={`Message ${selectedUser?.userName || ''}`}
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
                    />
                    <button className="btn px-4" style={{ background: '#ff9800', border: 'none', color: '#fff' }} onClick={handleSend}>Send</button>
                    {isConnected ? (
                        <div style={{ width: 16, height: 16, backgroundColor: 'green', borderRadius: '50%' }} title="Connected"></div>
                    ) : (
                        <div style={{ width: 16, height: 16, backgroundColor: 'red', borderRadius: '50%' }} title="Disconnected"></div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
