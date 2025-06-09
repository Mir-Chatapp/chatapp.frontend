import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { useNavigate } from 'react-router-dom';

const CallbackPage: React.FC = () => {
    const auth = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (auth.isLoading) {
            console.log('Authentication is loading...');
            return;
        }

        if (auth.isAuthenticated) {
            console.log('User is authenticated, redirecting to /chat');
            navigate('/chat', { replace: true });
        } else {
            console.log('User is not authenticated, processing callback...');
            auth.signinRedirect().catch((error) => {
                console.error('Error during authentication callback:', error);
            });
        }
    }, [auth.isAuthenticated, auth.isLoading, navigate]);

    if (auth.isLoading) {
        return <div>Loading...</div>;
    }

    return null;
};

export default CallbackPage;
