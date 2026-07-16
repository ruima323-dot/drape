import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import TodaysLook from './pages/TodaysLook';
import Styling from './pages/Styling';
import MyWardrobe from './pages/MyWardrobe';
import OutfitJourney from './pages/OutfitJourney';
import Profile from './pages/Profile';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import AuthCallback from './pages/AuthCallback';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/auth/confirm" element={<AuthCallback />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<TodaysLook />} />
            <Route path="/styling" element={<Styling />} />
            <Route path="/wardrobe" element={<MyWardrobe />} />
            <Route path="/journey" element={<OutfitJourney />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
