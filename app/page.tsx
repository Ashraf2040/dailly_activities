
'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';

export default function Home() {
  useEffect(() => {
    console.log('Home page loaded'); // Debug log
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 p-4 sm:p-6 lg:p-8 flex items-center justify-center">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-6 animate-fade-in">
          Welcome to the School Management System
        </h1>
        <p className="text-lg sm:text-xl text-gray-600 mb-8 animate-fade-in delay-100">
          Streamline lesson planning and classroom management for teachers and administrators.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12 animate-slide-in">
          <Link
            href="/login"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-all duration-300 ease-in-out shadow-md hover:shadow-lg"
          >
            Log In
          </Link>
          <Link
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 ease-in-out"
          >
            Learn More
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-in delay-200">
            <Image
              src="/file.svg"
              alt="Lesson Planning"
              width={40}
              height={40}
              className="mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Lesson Planning</h3>
            <p className="text-gray-600">Easily create and submit lesson plans with a user-friendly interface.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-in delay-300">
            <Image
              src="/window.svg"
              alt="Admin Tools"
              width={40}
              height={40}
              className="mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Admin Tools</h3>
            <p className="text-gray-600">Manage teachers, classes, and subjects with powerful admin features.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-md animate-slide-in delay-400">
            <Image
              src="/globe.svg"
              alt="Real-Time Updates"
              width={40}
              height={40}
              className="mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Real-Time Updates</h3>
            <p className="text-gray-600">Stay updated with instant data syncing and notifications.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
