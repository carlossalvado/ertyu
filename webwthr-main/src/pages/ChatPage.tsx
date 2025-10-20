import { useState } from 'react';
import ChatList from '../components/Chat/ChatList';
import ChatInterface from '../components/Chat/ChatInterface';

export default function ChatPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);

  return (
    <div className="h-screen flex">
      <ChatList onSelectChat={setSelectedPhone} selectedPhone={selectedPhone} />
      <ChatInterface selectedPhone={selectedPhone} />
    </div>
  );
}
