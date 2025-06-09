import React, { useState, useEffect } from 'react';
import { useAuth } from 'react-oidc-context';

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

    const handleUserClick = (user: User) => {
        setSelectedUser(user);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages((prev) => ({
            ...prev,
            [selectedUser?.userId || '']: [
                ...(prev[selectedUser?.userId || ''] || []),
                { from: 'Me', text: input },
            ],
        }));
        setInput('');
    };

    const signOutRedirect = async () => {
        const clientId = "18p14d5f31j81tmsi1mubnrjb2";
        const logoutUri = "http://localhost:5173";
        const cognitoDomain = "https://us-west-2fxfeoegvx.auth.us-west-2.amazoncognito.com";

        try {
            await auth.removeUser();
            setSelectedUser(null);
            window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
        } catch (error) {
            console.error("Error during sign out:", error);
        }
    };

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    if (auth.error) {
        return <div>Encountering error... {auth.error.message}</div>;
    }

    return (
        <div style={{ display: 'flex', height: '80vh', width: '80vw', background: 'rgba(255,255,255,0.7)', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
            {/* Users List */}
            <div style={{ width: '25%', borderRight: '1px solid #eee', padding: 24, overflowY: 'auto', background: '#e67e22', borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h4 style={{ color: '#fff', letterSpacing: '2px', fontWeight: 700, fontSize: '1.5rem', textAlign: 'center', marginBottom: 32, textShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                    <span style={{ display: 'inline-block', transform: 'rotate(-8deg)', marginRight: 8 }}>👥</span>
                    Co-workers
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
                    {users.map((user) => (
                        <li key={user.userId}>
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
                <div style={{ display: 'flex', gap: 8 }}>
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
                </div>
            </div>
        </div>
    );
};

export default ChatPage;
