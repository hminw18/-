"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { Calendar, Users, Clock, CheckCircle, ArrowRight, Zap, Shield, Target, Star, TrendingUp, Mail, ChevronLeft, ChevronRight } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import LoginButton from "../components/auth/LoginButton"
import AppHeader from "../components/ui/app-header"
import UserProfile from "../components/auth/UserProfile"

export default function LandingPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const router = useRouter()
  const [visibleSections, setVisibleSections] = useState<Set<number>>(new Set())
  const [activeFeature, setActiveFeature] = useState<number>(0)
  const [currentHowToStep, setCurrentHowToStep] = useState<number>(0)

  const handleGetStartedClick = () => {
    if (user) {
      router.push('/create')
    } else {
      signInWithGoogle()
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionIndex = parseInt(entry.target.getAttribute('data-section') || '0')
          if (entry.isIntersecting) {
            setVisibleSections(prev => new Set(prev).add(sectionIndex))
          }
        })
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      }
    )

    const sections = document.querySelectorAll('[data-section]')
    sections.forEach(section => observer.observe(section))

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      const featureScreenshots = document.querySelectorAll('[data-feature]')

      featureScreenshots.forEach((screenshot, index) => {
        const element = screenshot as HTMLElement
        const rect = element.getBoundingClientRect()

        // 각 스크린샷이 화면의 상단 30%에서 하단 70% 사이에 있으면 활성화
        if (rect.top < window.innerHeight * 0.7 && rect.bottom > window.innerHeight * 0.3) {
          setActiveFeature(index)
        }
      })

    }

    // 스크롤 이벤트 리스너 추가
    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // 초기 실행
    setTimeout(handleScroll, 1000)
    
    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
        <AppHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-2">
              <img src="/hanseeicon.png" alt="한시에 아이콘" className="h-6 w-6" />
              <img src="/hanseetextlogo.svg" alt="한시에" className="h-6" />
            </div>
            <nav className="hidden md:flex items-center space-x-4">
              {user ? (
                <>
                  <Link href="/events" className="text-gray-600 hover:text-gray-900 font-medium">
                    대시보드
                  </Link>
                  <Link
                    href="/create"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    면접 생성
                  </Link>
                </>
              ) : (
                <button
                  onClick={signInWithGoogle}
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      로딩 중...
                    </>
                  ) : (
                    '로그인'
                  )}
                </button>
              )}
            </nav>
          </div>
        </AppHeader>
      </div>

      {/* Hero Section */}
      <section
        className="pt-32 pb-20 bg-gradient-to-br from-blue-50 to-white min-h-screen flex items-center"
        data-section="0"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center transition-all duration-1000 ${
            visibleSections.has(0) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}>
            <h1 className="text-5xl sm:text-6xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              면접 일정 조율을<br />
              <span className="text-blue-600">간편하게</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              지원자 등록부터 면접 확정까지, 복잡한 면접 일정 조율을 몇 분만에.
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleGetStartedClick}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-200 hover:shadow-lg hover:scale-105 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    로딩 중...
                  </>
                ) : (
                  <>
                    지금 시작하기
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Interview Management Section */}
      <section
        className="bg-white"
        data-section="1"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Layout */}
          <div className="hidden lg:flex">
            {/* Left Sticky Content */}
            <div className="w-1/2 pr-12">
              <div className="sticky top-32 py-20">
                <div className={`transition-all duration-1000 ${
                  visibleSections.has(1) 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-10'
                }`}>
                  <h2 className="text-4xl font-bold text-gray-900 mb-6">간편한 면접 관리</h2>
                  <p className="text-xl text-gray-600 mb-8">
                    1분만에 면접 이벤트를 생성하고, 일정 조율부터 리마인드까지 한번에
                  </p>
                  <ul className="space-y-6">
                    <li className="flex items-start transition-colors duration-300">
                      <CheckCircle className={`w-6 h-6 mr-3 mt-0.5 flex-shrink-0 transition-colors duration-300 ${
                        activeFeature === 0 ? 'text-blue-600' : 'text-green-600'
                      }`} />
                      <span className={`text-lg transition-colors duration-300 ${
                        activeFeature === 0 ? 'text-blue-600 font-semibold' : 'text-gray-700'
                      }`}>그룹 면접 등 까다로운 면접 일정 조율</span>
                    </li>
                    <li className="flex items-start transition-colors duration-300">
                      <CheckCircle className={`w-6 h-6 mr-3 mt-0.5 flex-shrink-0 transition-colors duration-300 ${
                        activeFeature === 1 ? 'text-blue-600' : 'text-green-600'
                      }`} />
                      <span className={`text-lg transition-colors duration-300 ${
                        activeFeature === 1 ? 'text-blue-600 font-semibold' : 'text-gray-700'
                      }`}>메일, 카카오톡, SMS로 지원자 자동 초대</span>
                    </li>
                    <li className="flex items-start transition-colors duration-300">
                      <CheckCircle className={`w-6 h-6 mr-3 mt-0.5 flex-shrink-0 transition-colors duration-300 ${
                        activeFeature === 2 ? 'text-blue-600' : 'text-green-600'
                      }`} />
                      <span className={`text-lg transition-colors duration-300 ${
                        activeFeature === 2 ? 'text-blue-600 font-semibold' : 'text-gray-700'
                      }`}>자동 리마인드</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right Scrolling Screenshots */}
            <div className="w-1/2 pl-12">
              <div className="space-y-8">
                <div
                  className="h-screen flex items-center justify-center"
                  data-feature="0"
                >
                  <img src="/landing1.png" alt="그룹 면접 조율" className="w-full h-[600px] object-contain" />
                </div>
                <div
                  className="h-screen flex items-center justify-center"
                  data-feature="1"
                >
                  <img src="/landing2.png" alt="메일 발송" className="w-full h-[600px] object-contain" />
                </div>
                <div
                  className="h-screen flex items-center justify-center"
                  data-feature="2"
                >
                  <img src="/landing3.png" alt="자동 리마인드" className="w-full h-[600px] object-contain" />
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Layout */}
          <div className="lg:hidden py-20">
            <div className={`transition-all duration-1000 ${
              visibleSections.has(1) 
                ? 'opacity-100 translate-y-0' 
                : 'opacity-0 translate-y-10'
            }`}>
              <h2 className="text-4xl font-bold text-gray-900 mb-6 text-center">간편한 면접 관리</h2>
              <p className="text-xl text-gray-600 mb-8 text-center">
                1분만에 면접 이벤트를 생성하고, 일정 조율부터 리마인드까지 한번에
              </p>

              <div className="space-y-8">
                <div className="text-center">
                  <img src="/landing1.png" alt="그룹 면접 조율" className="w-full h-80 object-contain mb-4" />
                  <div className="flex items-start justify-center">
                    <CheckCircle className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-lg text-blue-600 font-semibold">그룹 면접 등 까다로운 조율도 완벽하게</span>
                  </div>
                </div>

                <div className="text-center">
                  <img src="/landing2.png" alt="메일 발송" className="w-full h-80 object-contain mb-4" />
                  <div className="flex items-start justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-lg text-green-600 font-semibold">메일, SMS 발송으로 다수 지원자 초대</span>
                  </div>
                </div>

                <div className="text-center">
                  <img src="/landing3.png" alt="자동 리마인드" className="w-full h-80 object-contain mb-4" />
                  <div className="flex items-start justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-600 mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-lg text-purple-600 font-semibold">자동 리마인드</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* How It Works Section */}
      <section
        className="py-20 bg-white min-h-screen flex items-center"
        data-section="2"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`text-center mb-16 transition-all duration-1000 ${
            visibleSections.has(2) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}>
            <div className="flex items-center justify-center gap-3 mb-4">
              <img src="/hanseeicon.png" alt="한시에 아이콘" className="h-10 w-10 -translate-y-1" />
              <div className="flex items-center gap-3.5">
                <img src="/hanseetextlogo.svg" alt="한시에" className="h-10 -translate-y-1" />
                <h2 className="text-4xl font-bold text-gray-900">시작하기</h2>
              </div>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className={`hidden md:grid md:grid-cols-3 gap-12 transition-all duration-1000 delay-300 ${
            visibleSections.has(2) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}>
            <div className="text-center">
              <div className="mb-6">
                <img src="/howto1.png" alt="이벤트 생성" className="w-full h-80 object-contain mx-auto mb-4" />
              </div>
              <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">이벤트 생성</h3>
              <p className="text-gray-600">
                면접관의 가능한 시간을 설정하고 지원자 정보를 등록합니다.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-6">
                <img src="/howto2.png" alt="공유 및 지원자 응답" className="w-full h-80 object-contain mx-auto mb-4" />
              </div>
              <div className="bg-green-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">공유 및 지원자 응답</h3>
              <p className="text-gray-600">
                생성된 링크는 지원자들에게 자동으로 공유되고, 각자 편한 시간에 응답할 수 있습니다.
              </p>
            </div>

            <div className="text-center">
              <div className="mb-6">
                <img src="/howto3.png" alt="자동 배정 및 일정 확정" className="w-full h-80 object-contain mx-auto mb-4" />
              </div>
              <div className="bg-purple-600 text-white w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">자동 배정 및 일정 확정</h3>
              <p className="text-gray-600">
                최적의 면접 시간을 자동으로 배정하고 지원자에게 알림을 보냅니다.
              </p>
            </div>
          </div>

          {/* Mobile Interactive Slider */}
          <div className={`md:hidden transition-all duration-1000 delay-300 ${
            visibleSections.has(2) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}>
            <div className="relative">
              {/* Main Content */}
              <div className="text-center px-4">
                <div className="mb-6">
                  <img
                    src={`/howto${currentHowToStep + 1}.png`}
                    alt={[
                      '이벤트 생성',
                      '공유 및 지원자 응답',
                      '자동 배정 및 일정 확정'
                    ][currentHowToStep]}
                    className="w-full h-80 object-contain mx-auto mb-4"
                  />
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white ${
                  currentHowToStep === 0 ? 'bg-blue-600' : 
                  currentHowToStep === 1 ? 'bg-green-600' : 'bg-purple-600'
                }`}>
                  {currentHowToStep + 1}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  {[
                    '이벤트 생성',
                    '공유 및 지원자 응답',
                    '자동 배정 및 일정 확정'
                  ][currentHowToStep]}
                </h3>
                <p className="text-gray-600">
                  {[
                    '면접관의 가능한 시간을 설정하고 지원자 정보를 등록합니다.',
                    '생성된 링크는 지원자들에게 자동으로 공유되고, 각자 편한 시간에 응답할 수 있습니다.',
                    '최적의 면접 시간을 자동으로 배정하고 지원자에게 알림을 보냅니다.'
                  ][currentHowToStep]}
                </p>
              </div>

              {/* Navigation Buttons */}
              <button
                onClick={() => setCurrentHowToStep(prev => prev > 0 ? prev - 1 : 2)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => setCurrentHowToStep(prev => prev < 2 ? prev + 1 : 0)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Dots Indicator */}
            <div className="flex justify-center mt-6 space-x-2">
              {[0, 1, 2].map((step) => (
                <button
                  key={step}
                  onClick={() => setCurrentHowToStep(step)}
                  className={`w-3 h-3 rounded-full transition-all ${
                    step === currentHowToStep 
                      ? 'bg-blue-600 scale-125' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      {/*<section */}
      {/*  className="py-20 bg-blue-600 min-h-screen flex items-center"*/}
      {/*  data-section="4"*/}
      {/*>*/}
      {/*  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">*/}
      {/*    <div className={`text-center mb-16 transition-all duration-1000 ${*/}
      {/*      visibleSections.has(4) */}
      {/*        ? 'opacity-100 translate-y-0' */}
      {/*        : 'opacity-0 translate-y-10'*/}
      {/*    }`}>*/}
      {/*      <h2 className="text-4xl font-bold text-white mb-4">숫자로 보는 한시에</h2>*/}
      {/*      <p className="text-xl text-blue-100 max-w-2xl mx-auto">*/}
      {/*        더 많은 기업들이 선택하는 이유*/}
      {/*      </p>*/}
      {/*    </div>*/}

      {/*    <div className={`grid md:grid-cols-3 gap-12 transition-all duration-1000 delay-300 ${*/}
      {/*      visibleSections.has(4) */}
      {/*        ? 'opacity-100 translate-y-0' */}
      {/*        : 'opacity-0 translate-y-10'*/}
      {/*    }`}>*/}
      {/*      <div className="text-center">*/}
      {/*        <div className="mb-4">*/}
      {/*          <TrendingUp className="w-16 h-16 text-blue-200 mx-auto" />*/}
      {/*        </div>*/}
      {/*        <div className="text-4xl font-bold text-white mb-2">95%</div>*/}
      {/*        <div className="text-blue-100">일정 조율 성공률</div>*/}
      {/*      </div>*/}

      {/*      <div className="text-center">*/}
      {/*        <div className="mb-4">*/}
      {/*          <Clock className="w-16 h-16 text-blue-200 mx-auto" />*/}
      {/*        </div>*/}
      {/*        <div className="text-4xl font-bold text-white mb-2">80%</div>*/}
      {/*        <div className="text-blue-100">시간 절약 효과</div>*/}
      {/*      </div>*/}

      {/*      <div className="text-center">*/}
      {/*        <div className="mb-4">*/}
      {/*          <Star className="w-16 h-16 text-blue-200 mx-auto" />*/}
      {/*        </div>*/}
      {/*        <div className="text-4xl font-bold text-white mb-2">4.9</div>*/}
      {/*        <div className="text-blue-100">사용자 만족도</div>*/}
      {/*      </div>*/}
      {/*    </div>*/}
      {/*  </div>*/}
      {/*</section>*/}

      {/* CTA Section */}
      <section
        className="py-20 bg-gradient-to-br from-blue-600 to-blue-800 min-h-screen flex items-center"
        data-section="3"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className={`transition-all duration-1000 ${
            visibleSections.has(3) 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-5xl font-bold text-white mb-6">
              면접 프로세스를
              <br />
              <span className="text-yellow-300">혁신</span>할 준비가 되셨나요?
            </h2>
            <button
              onClick={handleGetStartedClick}
              disabled={loading}
              className="bg-white hover:bg-gray-100 disabled:bg-gray-200 text-blue-600 px-12 py-4 rounded-xl font-bold text-xl transition-all duration-300 hover:scale-105 hover:shadow-2xl inline-flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
                  로딩 중...
                </>
              ) : (
                <>
                  지금 시작하기
                  <ArrowRight className="w-6 h-6 ml-3" />
                </>
              )}
            </button>
            <p className="text-blue-200 mt-4 text-sm">무료로 시작하세요</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-500">
              <p>&copy; 2025 한시에. All rights reserved.</p>
            </div>
            <div className="flex items-center space-x-4 text-gray-400">
              <Link href="/terms" className="hover:text-white">
                이용약관
              </Link>
              <Link href="/privacy" className="hover:text-white">
                개인정보처리방침
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
