import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import ChatBox from './ChatBox';

export default function Layout() {
  return (
    <div className="min-h-screen bg-cream-100">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>
      <ChatBox />
    </div>
  );
}
