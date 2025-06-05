import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'
import ChatPage from './ChatPage'
import { AuthProvider } from 'react-oidc-context'

const cognitoAuthConfig = {
  authority: 'https://cognito-idp.us-west-2.amazonaws.com/us-west-2_fxfeOegvx',
  client_id: '18p14d5f31j81tmsi1mubnrjb2',
  redirect_uri: 'http://localhost:5173/callback',
  response_type: 'code',
  scope: 'email openid phone',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/callback" element={<App />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
