"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Calendar, Users, Clock, CheckCircle, ArrowRight, Zap, Shield } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import LoginButton from "../components/auth/LoginButton"
import AppHeader from "../components/ui/app-header"

export default function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()

  const handleGetStartedClick = () => {
    if (user) {
      router.push('/create')
    } else {
      signInWithGoogle()
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <AppHeader>
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center space-x-2">
            <Calendar className="w-8 h-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">InterviewSync</span>
          </div>
          <nav className="hidden md:flex items-center space-x-4">
            {user ? (
              <>
                <Link href="/events" className="text-gray-600 hover:text-gray-900 font-medium">
                  Dashboard
                </Link>
                <Link
                  href="/create"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Event
                </Link>
              </>
            ) : (
              <LoginButton />
            )}
          </nav>
        </div>
      </AppHeader>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-gray-900 mb-6">Streamline Your Interview Scheduling</h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Effortlessly coordinate interviews with our intuitive platform. Collect availability from candidates and
              automatically find the perfect time slots.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleGetStartedClick}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:shadow-lg flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Loading...
                  </>
                ) : (
                  <>
                    Get Started Today
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
              <Link
                href="/events"
                className="border border-gray-300 hover:border-gray-400 text-gray-700 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                View Dashboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perfect for Both Sides</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Our platform serves both interviewers and candidates with tailored experiences
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* For Interviewers */}
            <div className="bg-blue-50 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <Users className="w-8 h-8 text-blue-600 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">For Interviewers</h3>
              </div>
              <p className="text-gray-600 mb-6">Create events in seconds, manage candidate availability with ease.</p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Set up interview events with custom time slots</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Invite multiple candidates via email or link</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Automatically find optimal time slots</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Track responses and manage schedules</span>
                </li>
              </ul>
            </div>

            {/* For Interviewees */}
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <Clock className="w-8 h-8 text-gray-700 mr-3" />
                <h3 className="text-2xl font-bold text-gray-900">For Interviewees</h3>
              </div>
              <p className="text-gray-600 mb-6">Respond to invitations effortlessly, choose times that work for you.</p>
              <ul className="space-y-4">
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Simple calendar interface to select availability</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Choose multiple time slots that work for you</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">Get notified when interviews are scheduled</span>
                </li>
                <li className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-700">No account required to respond</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose InterviewSync?</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Lightning Fast</h3>
              <p className="text-gray-600">
                Set up interview events in minutes, not hours. Our streamlined process gets you scheduling immediately.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Your data is protected with enterprise-grade security. Focus on finding the right candidates.
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Friendly</h3>
              <p className="text-gray-600">
                Collaborate with your team seamlessly. Share events, track progress, and coordinate effortlessly.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Interview Process?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of companies already using InterviewSync to streamline their hiring.
          </p>
          <button
            onClick={handleGetStartedClick}
            disabled={loading}
            className="bg-white hover:bg-gray-100 disabled:bg-gray-200 text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors inline-flex items-center"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
                Loading...
              </>
            ) : (
              <>
                Start Creating Events
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Calendar className="w-6 h-6 text-blue-400" />
              <span className="text-xl font-bold">InterviewSync</span>
            </div>
            <div className="flex space-x-6">
              <Link href="/events" className="text-gray-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/create" className="text-gray-400 hover:text-white transition-colors">
                Create Event
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 InterviewSync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
