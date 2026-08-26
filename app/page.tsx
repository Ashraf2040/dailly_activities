'use client';

import { useSession } from 'next-auth/react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@iconify/react';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const role = (session?.user as any)?.role;
    if (role === 'COORDINATOR') router.replace('/coordin');
    if (role === 'TEACHER') router.replace('/teacher');
    if (role === 'ADMIN') router.replace('/admin');
  }, [status, session, router]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-white px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-[#83c5be]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[#e29578]/8 blur-3xl" />

      <div className="relative mx-auto max-w-5xl text-center">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#83c5be]/40 bg-[#83c5be]/10 px-4 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#006d77] opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#006d77]" />
          </span>
          <span className="text-xs font-medium tracking-wide text-[#064e4f]">
            Trusted by 500+ schools
          </span>
        </div>

        <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight text-[#064e4f] sm:text-5xl lg:text-6xl">
          Welcome to the{' '}
          <span className="bg-gradient-to-r from-[#006d77] via-[#83c5be] to-[#e29578] bg-clip-text text-transparent">
            School Management System
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-gray-500 sm:text-lg">
          Streamline lesson planning and classroom management for teachers and administrators — all in one place.
        </p>

        <div className="mx-auto mt-10 flex max-w-xl flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/login"
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-[#006d77] px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#006d77]/25 transition-all hover:-translate-y-0.5 hover:bg-[#005a62] hover:shadow-xl hover:shadow-[#006d77]/30 focus:outline-none focus:ring-2 focus:ring-[#006d77] focus:ring-offset-2"
          >
            Log In
            <Icon
              icon="lucide:arrow-right"
              width={15}
              height={15}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>

          <Link
            href="/learn-more"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-7 py-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#83c5be] focus:ring-offset-2"
          >
            <Icon icon="lucide:info" width={15} height={15} className="text-[#006d77]" />
            Learn More
          </Link>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gray-200 hover:shadow-xl">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#83c5be]/15 transition-transform group-hover:scale-110">
              <Icon icon="lucide:file-text" width={22} height={22} className="text-[#006d77]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#064e4f]">Lesson Planning</h3>
            <p className="text-sm leading-relaxed text-gray-500">Easily create and submit lesson plans with a user-friendly interface.</p>
          </div>

          <div className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gray-200 hover:shadow-xl">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#006d77]/10 transition-transform group-hover:scale-110">
              <Icon icon="lucide:shield-check" width={22} height={22} className="text-[#006d77]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#064e4f]">Admin Tools</h3>
            <p className="text-sm leading-relaxed text-gray-500">Manage teachers, classes, and subjects with powerful admin features.</p>
          </div>

          <div className="group rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-gray-200 hover:shadow-xl">
            <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#e29578]/15 transition-transform group-hover:scale-110">
              <Icon icon="lucide:zap" width={22} height={22} className="text-[#e29578]" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[#064e4f]">Real-Time Updates</h3>
            <p className="text-sm leading-relaxed text-gray-500">Stay updated with instant data syncing and notifications.</p>
          </div>
        </div>

        {/* Decorative bottom accent */}
        <div className="mx-auto mt-14 h-1 w-40 rounded-full bg-gradient-to-r from-[#006d77] via-[#83c5be] to-[#e29578] opacity-60" />
      </div>
    </div>
  );
}