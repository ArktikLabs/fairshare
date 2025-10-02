"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-lg text-gray-700">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Header */}
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-300 ${
          isScrolled
            ? "bg-white/95 backdrop-blur-sm shadow-lg"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-display text-gray-900 tracking-tight">
                Fair<span className="text-green-600">Share</span>
              </h1>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                className="text-gray-600 hover:text-green-600 transition-colors font-medium"
              >
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-green-600 transition-colors font-medium"
              >
                How it Works
              </a>
              <a
                href="#pricing"
                className="text-gray-600 hover:text-green-600 transition-colors font-medium"
              >
                Pricing
              </a>
              {session ? (
                <Link
                  href="/dashboard"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/signin"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 bg-gradient-to-br from-blue-50 via-white to-green-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h1 className="text-5xl lg:text-7xl font-display text-gray-900 mb-6 leading-none tracking-tight">
                Split expenses,
                <br />
                <span className="text-green-600 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                  share fairly
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-gray-600 mb-8 leading-relaxed font-body max-w-2xl">
                The simplest way to track shared expenses with friends, family,
                and groups. No more awkward conversations about money — just
                transparent, fair splitting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {session ? (
                  <Link
                    href="/dashboard"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-display tracking-tight"
                  >
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link
                    href="/auth/register"
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-display tracking-tight"
                  >
                    Get Started Free
                  </Link>
                )}
                <Link
                  href="#how-it-works"
                  className="border-2 border-green-600 text-green-600 hover:bg-green-600 hover:text-white font-semibold py-4 px-8 rounded-xl transition-all duration-300 font-display tracking-tight"
                >
                  See How It Works
                </Link>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-8 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">💰</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight">
                    Group Trip to Bali
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Hotel</span>
                      <span className="font-semibold">$240</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Dinner</span>
                      <span className="font-semibold">$120</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Transport</span>
                      <span className="font-semibold">$80</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between items-center font-bold">
                      <span>You owe:</span>
                      <span className="text-green-600">$146.67</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display text-gray-900 mb-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-body">
              Three simple steps to start sharing expenses fairly with your
              friends
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <span className="text-3xl">📱</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-display tracking-tight">
                Add Expenses
              </h3>
              <p className="text-gray-600 leading-relaxed font-body">
                Quickly add any shared expense with a photo, amount, and select
                who was involved. Snap a receipt or enter manually.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-green-200 transition-colors">
                <span className="text-3xl">👥</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-display tracking-tight">
                Share with Friends
              </h3>
              <p className="text-gray-600 leading-relaxed font-body">
                Invite friends to your group and automatically split expenses.
                Everyone sees exactly what they owe and to whom.
              </p>
            </div>
            <div className="text-center group">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                <span className="text-3xl">⚖️</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3 font-display tracking-tight">
                Settle Up Easily
              </h3>
              <p className="text-gray-600 leading-relaxed font-body">
                Our smart algorithm minimizes the number of transactions needed.
                Pay back friends with integrated payment options.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display text-gray-900 mb-4 tracking-tight">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto font-body">
              Powerful features designed to make expense sharing effortless and
              transparent
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">📊</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight">
                Group Expense Tracking
              </h3>
              <p className="text-gray-600 text-sm font-body">
                Create unlimited groups and track all shared expenses in one
                place.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">💱</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight">
                Multiple Currencies
              </h3>
              <p className="text-gray-600 text-sm font-body">
                Support for 100+ currencies with real-time exchange rates.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">🔄</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight">
                Debt Simplification
              </h3>
              <p className="text-gray-600 text-sm font-body">
                Smart algorithm reduces the number of payments needed between
                friends.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mb-4">
                <span className="text-xl">📈</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 font-display tracking-tight">
                Clear Reports
              </h3>
              <p className="text-gray-600 text-sm font-body">
                Detailed spending reports and insights for better financial
                planning.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl lg:text-5xl font-display text-gray-900 mb-6 tracking-tight">
                Why Choose FairShare?
              </h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 font-display tracking-tight">
                      Always Fair & Transparent
                    </h3>
                    <p className="text-gray-600 font-body">
                      Everyone sees exactly how expenses are split with complete
                      transparency.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 font-display tracking-tight">
                      Save Time & Effort
                    </h3>
                    <p className="text-gray-600 font-body">
                      No more manual calculations or keeping track of IOUs on
                      paper.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-white text-xs">✓</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1 font-display tracking-tight">
                      Strengthen Relationships
                    </h3>
                    <p className="text-gray-600 font-body">
                      Avoid money conflicts and keep friendships healthy with
                      clear tracking.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 font-display tracking-tight">
                    Monthly Summary
                  </h3>
                  <p className="text-gray-600 font-body">
                    Your spending this month
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Food & Dining</span>
                    <span className="font-semibold">$456</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Travel</span>
                    <span className="font-semibold">$1,240</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Entertainment</span>
                    <span className="font-semibold">$180</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total Shared:</span>
                      <span className="text-green-600">$1,876</span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-2">
                      <span>You saved:</span>
                      <span className="font-semibold">
                        $234 in calculations
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display text-gray-900 mb-4 tracking-tight">
              Loved by Users Worldwide
            </h2>
            <p className="text-xl text-gray-600 font-body">
              Join thousands of happy users who simplified their shared expenses
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-4">
                &ldquo;FairShare saved our friendship! No more awkward
                conversations about who owes what after group trips.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">S</span>
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Sarah Johnson</p>
                  <p className="text-gray-600 text-sm">Travel Enthusiast</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-4">
                &ldquo;Perfect for roommate expenses! The debt simplification
                feature is genius - fewer transactions needed.&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">M</span>
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Mike Chen</p>
                  <p className="text-gray-600 text-sm">College Student</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center mb-4">
                <div className="flex text-yellow-400">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-4">
                &ldquo;Our family uses it for everything from groceries to
                vacation planning. So much easier than spreadsheets!&rdquo;
              </p>
              <div className="flex items-center">
                <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">E</span>
                </div>
                <div className="ml-3">
                  <p className="font-semibold text-gray-900">Emily Rodriguez</p>
                  <p className="text-gray-600 text-sm">Family Organizer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-display text-gray-900 mb-4 tracking-tight">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 font-body">
              Start for free, upgrade when you need more
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-green-200">
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display tracking-tight">
                  Free Plan
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2 font-display">
                  $0
                  <span className="text-lg font-normal text-gray-600">
                    /month
                  </span>
                </div>
                <p className="text-gray-600 font-body">
                  Perfect for personal use and small groups
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-gray-700">Up to 3 groups</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-gray-700">Unlimited expenses</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-gray-700">
                    Basic debt simplification
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-3">✓</span>
                  <span className="text-gray-700">Mobile app access</span>
                </li>
              </ul>
              {session ? (
                <Link
                  href="/dashboard"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold py-3 rounded-lg transition-colors"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <Link
                  href="/auth/register"
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center font-semibold py-3 rounded-lg transition-colors"
                >
                  Start Free
                </Link>
              )}
            </div>

            {/* Pro Plan */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-blue-200 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                  Most Popular
                </span>
              </div>
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <span className="text-2xl">🚀</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2 font-display tracking-tight">
                  Pro Plan
                </h3>
                <div className="text-4xl font-bold text-gray-900 mb-2 font-display">
                  $4.99
                  <span className="text-lg font-normal text-gray-600">
                    /month
                  </span>
                </div>
                <p className="text-gray-600 font-body">
                  For power users and larger groups
                </p>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">Unlimited groups</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">Advanced reporting</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">
                    Multiple currency support
                  </span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-center">
                  <span className="text-blue-500 mr-3">✓</span>
                  <span className="text-gray-700">Export data</span>
                </li>
              </ul>
              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors">
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <h3 className="text-2xl font-bold mb-4 font-display tracking-tight">
                Fair<span className="text-green-400">Share</span>
              </h3>
              <p className="text-gray-400 mb-6 font-body">
                Making expense sharing fair, simple, and transparent for
                everyone.
              </p>
              <div className="flex space-x-4">
                <a
                  href="#"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  <span className="sr-only">Twitter</span>
                  <span className="text-xl">🐦</span>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  <span className="sr-only">Facebook</span>
                  <span className="text-xl">📘</span>
                </a>
                <a
                  href="#"
                  className="text-gray-400 hover:text-green-400 transition-colors"
                >
                  <span className="sr-only">Instagram</span>
                  <span className="text-xl">📷</span>
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-4 font-display tracking-tight">
                Product
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="#features"
                    className="hover:text-green-400 transition-colors"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="hover:text-green-400 transition-colors"
                  >
                    Pricing
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Mobile App
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    API
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 font-display tracking-tight">
                Company
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Blog
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 font-display tracking-tight">
                Support
              </h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Help Center
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#"
                    className="hover:text-green-400 transition-colors"
                  >
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>
              &copy; 2025 FairShare. All rights reserved. Made with ❤️ for fair
              expense sharing.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
