import React, { useState } from 'react';
import { useAuth } from 'react-oidc-context';

interface User {
    id: number;
    name: string;
}

interface Message {
    from: string;
    text: string;
}

const usersMock: User[] = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
    { id: 4, name: 'David' },
];

// Use string keys for messages to avoid TS index error
const initialMessages: Record<string, Message[]> = {
    '1': [{ from: 'Alice', text: 'Hi there!' }],
    '2': [{ from: 'Bob', text: 'Hello!' }],
    '3': [],
    '4': [],
};

const ChatPage: React.FC = () => {
    const auth = useAuth();
    const [selectedUser, setSelectedUser] = useState<User | null>(usersMock[0]);
    const [messages, setMessages] = useState<Record<string, Message[]>>(initialMessages);
    const [input, setInput] = useState('');

    const handleUserClick = (user: User) => {
        setSelectedUser(user);
    };

    const handleSend = () => {
        if (!input.trim()) return;
        setMessages((prev) => ({
            ...prev,
            [selectedUser?.id || '']: [
                ...(prev[selectedUser?.id || ''] || []),
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
            await auth.removeUser(); // Remove the user using the auth method
            setSelectedUser(null); // Clear the selected user state
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
                    Friend List
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, flex: 1 }}>
                    {usersMock.map((user) => (
                        <li key={user.id}>
                            <button
                                style={{
                                    width: '100%',
                                    padding: '12px 8px',
                                    margin: '8px 0',
                                    borderRadius: 8,
                                    border: user.id === selectedUser?.id ? '2px solid #6a82fb' : '1px solid #ccc',
                                    background: user.id === selectedUser?.id ? '#e3eafe' : '#fff',
                                    fontWeight: user.id === selectedUser?.id ? 700 : 400,
                                    cursor: 'pointer',
                                    color: '#111',
                                }}
                                onClick={() => handleUserClick(user)}
                            >
                                {user.name}
                            </button>
                        </li>
                    ))}
                </ul>
                <button className="btn px-4" style={{ width: '100%', fontWeight: 600, background: '#f5cba7', color: '#b30000', border: 'none' }} onClick={signOutRedirect}>Sign Out</button>
            </div>
            {/* Chat Section */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, background: '#2e4053', borderTopRightRadius: 16, borderBottomRightRadius: 16 }}>
                <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, background: '#f8fafc', borderRadius: 8, padding: 16 }}>
                    {(messages[selectedUser?.id?.toString() || ''] || []).map((msg: Message, idx: number) => (
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
                        placeholder={`Message ${selectedUser?.name || ''}`}
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
