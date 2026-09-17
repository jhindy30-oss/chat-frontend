import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';

export default function Home() {
  return (
    <div className="h-screen bg-teal-50 flex flex-col items-center justify-center text-teal-900 space-y-6">
      <div className="bg-teal-100 p-4 rounded-full text-teal-600">
        <HeartHandshake size={48} />
      </div>
      <h1 className="text-4xl font-bold text-gray-800">Hopeline System</h1>
      <p className="text-gray-500 max-w-md text-center">Select your destination to continue to the application.</p>
      
      <div className="flex gap-4 mt-8">
        <Link 
          href="/connect/helpdesk" 
          className="px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 shadow-md transition-all"
        >
          Guest Intake
        </Link>
        <Link 
          href="/dashboard" 
          className="px-6 py-3 bg-white text-teal-600 font-medium border border-teal-200 rounded-xl hover:bg-teal-50 shadow-sm transition-all"
        >
          Host Dashboard
        </Link>
      </div>
    </div>
  );
}
