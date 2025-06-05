import { useAuth } from 'react-oidc-context';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

function App() {
  const auth = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (auth.isAuthenticated && location.pathname === "/callback") {
      navigate("/chat", { replace: true });
    }
  }, [auth.isAuthenticated, location.pathname, navigate]);

  const handleLogin = async () => {
    try {
      await auth.signinRedirect();
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <div className="d-flex flex-column justify-content-center align-items-center vh-100">
      <h1 className="text-center">Welcome to Mir Chat</h1>
      <div className="my-4" />
      <button className="btn btn-primary btn-lg px-5 py-3" onClick={handleLogin}>Login</button>
    </div>
  );
}

export default App;
