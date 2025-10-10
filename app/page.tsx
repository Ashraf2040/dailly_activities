'use client';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function Home() {
  useEffect(() => {
    console.log('Home page loaded');
  }, []);
const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = (session?.user as any)?.role;
    if (role === 'COORDINATOR') router.replace('/coordin');
    if (role === 'TEACHER') router.replace('/teacher');
    if (role === 'ADMIN') router.replace('/admin');
    // Optionally handle ADMIN/TEACHER similarly
  }, [status, session, router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-[#f1fbf9] to-[#eaf7f5] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl text-center">
        <h1 className="mb-4 inline-block text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl bg-gradient-to-r from-[#006d77] via-[#83c5be] to-[#e29578] bg-clip-text">
          Welcome to the School Management System
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-base text-gray-700 sm:text-lg">
          Streamline lesson planning and classroom management for teachers and administrators.
        </p>

        <div className="mx-auto mb-14 flex max-w-xl flex-col justify-center gap-4 sm:flex-row">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg bg-[#006d77] px-6 py-3 text-white shadow-sm ring-1 ring-[#006d77]/20 transition hover:-translate-y-0.5 hover:bg-[#006d77]/90 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2"
          >
            Log In
          </Link>

          <Link
            href="/learn-more"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2"
          >
            Learn More
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#83c5be]/30">
              <Image src="/file.svg" alt="Lesson Planning" width={28} height={28} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[#064e4f]">Lesson Planning</h3>
            <p className="text-gray-600">Easily create and submit lesson plans with a user-friendly interface.</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#006d77]/20">
              <Image src="/window.svg" alt="Admin Tools" width={28} height={28} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[#064e4f]">Admin Tools</h3>
            <p className="text-gray-600">Manage teachers, classes, and subjects with powerful admin features.</p>
          </div>

          <div className="rounded-xl bg-white p-6 shadow-lg ring-1 ring-gray-100 transition hover:-translate-y-1 hover:shadow-xl">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#e29578]/20">
              <Image src="/globe.svg" alt="Real-Time Updates" width={28} height={28} />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-[#064e4f]">Real-Time Updates</h3>
            <p className="text-gray-600">Stay updated with instant data syncing and notifications.</p>
          </div>
        </div>

        {/* Decorative bottom accent */}
        <div className="mx-auto mt-12 h-1 w-40 rounded-full bg-gradient-to-r from-[#006d77] via-[#83c5be] to-[#e29578]" />
      </div>
    </div>
  );
}
