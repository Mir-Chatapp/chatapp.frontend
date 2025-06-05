import { useNavigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css'

function App() {
  const navigate = useNavigate();
  const handleLogin = () => {
    // Simulate login logic
    navigate('/chat');
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
