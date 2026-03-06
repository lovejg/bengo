import { Link } from 'react-router';
import { ArrowRight, Search, Bookmark, Zap, ChevronDown, SlidersHorizontal, User, Check, Bell, Calendar, Sparkles, Shield, Clock } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { MainLayout } from '../components/templates/MainLayout';
import { motion } from 'motion/react';
import { useRef } from 'react';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';
import { Summary } from '../components/organisms/Summary';
import { FAQ } from '../components/organisms/FAQ';

export function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <MainLayout>
      <div ref={containerRef}>
        {/* Hero Section */}
        <section className="min-h-[90vh] flex items-center justify-center bg-gradient-to-b from-slate-50 to-white relative overflow-hidden px-4 pt-20 pb-16">
          {/* CSS Grid Pattern Background */}
          <div className="absolute inset-0 opacity-[0.4]" style={{
            backgroundImage: `
              linear-gradient(to right, rgb(226, 232, 240) 1px, transparent 1px),
              linear-gradient(to bottom, rgb(226, 232, 240) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}></div>
          
          <div className="container mx-auto max-w-5xl text-center relative z-10">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex justify-center mb-6"
            >
              {/* Header 로고와 동일 + 애니메이션 */}
              <motion.div 
                className="relative"
                animate={{ 
                  y: [0, -8, 0]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <motion.div 
                  className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl sm:rounded-[1.25rem] shadow-lg"
                  animate={{
                    boxShadow: [
                      '0 10px 15px -3px rgba(59, 130, 246, 0.3)',
                      '0 20px 25px -5px rgba(59, 130, 246, 0.4)',
                      '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                    ]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <ArrowRight className="h-10 w-10 sm:h-12 sm:w-12 text-white -rotate-45" strokeWidth={2.5} aria-hidden="true" />
                </motion.div>
                <motion.div 
                  className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 w-4 h-4 sm:w-5 sm:h-5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full"
                  animate={{
                    opacity: [1, 0.8, 1]
                  }}
                  transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                ></motion.div>
              </motion.div>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
            >
              나에게 딱 맞는 정책,<br />
              <motion.span 
                className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                animate={{
                  backgroundImage: [
                    'linear-gradient(90deg, rgb(37, 99, 235), rgb(147, 51, 234))',
                    'linear-gradient(90deg, rgb(147, 51, 234), rgb(37, 99, 235))',
                    'linear-gradient(90deg, rgb(37, 99, 235), rgb(147, 51, 234))'
                  ]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                뱅고
              </motion.span>에서 찾으세요
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-lg sm:text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              복잡한 정책 정보를 한눈에,<br className="sm:hidden" /> 내 조건에 맞는 정책을 빠르게 추천받으세요
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center items-center"
            >
              <Link to="/personalized">
                <Button size="lg" className="w-full sm:w-auto min-w-[180px] group">
                  맞춤 정책 추천받기
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-200" />
                </Button>
              </Link>
              <Link to="/policies">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[180px]">
                  정책 둘러보기
                </Button>
              </Link>
            </motion.div>
            
            {/* 신뢰/근거 추가 */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="mt-8 flex flex-wrap justify-center gap-4 sm:gap-6 text-sm text-[var(--muted-foreground)]"
            >
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <span>서울시 청년정책 200개+ 수록</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                <span>매일 업데이트</span>
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-blue-600" />
                <span>마감 임박 알림</span>
              </div>
            </motion.div>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="mt-4 text-xs text-[var(--muted-foreground)]"
            >
              가입 없이 둘러보기 가능 · 30초면 내 정책 찾기
            </motion.p>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <ChevronDown className="h-6 w-6 text-[var(--muted-foreground)] animate-bounce" />
          </motion.div>
        </section>

        {/* Feature 1: 검색 */}
        <section className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Search className="h-5 w-5 text-blue-600" />
                  </div>
                  <span className="text-sm font-semibold text-blue-600">빠른 검색</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                  원하는 정책을<br />빠르게 찾아보세요
                </h2>
                <p className="text-[var(--muted-foreground)] text-lg mb-6 leading-relaxed">
                  키워드 검색과 다양한 필터로<br className="sm:hidden" /> 수백 개의 정책 중에서<br className="hidden sm:block lg:hidden" /> 필요한 정보만 골라볼 수 있습니다
                </p>
                <ul className="space-y-3">
                  {[
                    '키워드로 빠른 검색',
                    '나이·지역·소득 등 맞춤 필터',
                    '마감임박 정책 우선 표시'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-blue-600" strokeWidth={3} />
                      </div>
                      <span className="text-[var(--foreground)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                {/* Mock UI - 정책 검색 - 높이 통일 */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 h-[480px] flex flex-col">
                  <div className="bg-white p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="bg-white rounded px-3 py-1 text-xs text-gray-500">bengo.com/policies</div>
                    </div>
                    {/* Search Bar */}
                    <div className="bg-gray-100 rounded-lg p-3 flex items-center gap-2 border-2 border-blue-300">
                      <Search className="h-4 w-4 text-blue-600" />
                      <div className="h-4 bg-gray-300 rounded w-24"></div>
                    </div>
                  </div>
                  <div className="p-4 flex-1 overflow-hidden">
                    {/* Filters */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                      <div className="bg-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-full flex items-center gap-1">
                        <SlidersHorizontal className="h-3 w-3" />
                        <span>20대</span>
                      </div>
                      <div className="bg-blue-100 text-blue-600 text-xs px-3 py-1.5 rounded-full">서울</div>
                      <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1.5 rounded-full">+ 필터 추가</div>
                    </div>
                    {/* Policy Cards */}
                    <div className="space-y-3">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-2">
                            <div className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded">신청가능</div>
                            <Bookmark className="h-4 w-4 text-gray-400" />
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-full mb-3"></div>
                          <div className="flex gap-2">
                            <div className="bg-gray-100 text-xs px-2 py-1 rounded">취업</div>
                            <div className="bg-gray-100 text-xs px-2 py-1 rounded">청년</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature 2: 자격 확인 */}
        <section className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="order-2 lg:order-1 relative"
              >
                {/* Mock UI - 맞춤 추천 - 높이 통일 */}
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 h-[480px] flex flex-col">
                  <div className="bg-white p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="bg-white rounded px-3 py-1 text-xs text-gray-500">bengo.com/personalized</div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 flex-1 overflow-hidden flex flex-col justify-center">
                    {/* 내 정보 카드 */}
                    <div className="bg-white rounded-xl p-4 mb-3 shadow-sm border-2 border-green-300">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <User className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="text-xs font-semibold text-green-600">내 정보</div>
                      </div>
                      <div className="flex gap-2">
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">25세</div>
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">서울</div>
                        <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded">취업준비</div>
                      </div>
                    </div>
                    {/* 연결 표시 */}
                    <div className="flex justify-center my-2">
                      <div className="flex flex-col items-center gap-1">
                        <ArrowRight className="h-5 w-5 text-green-600 rotate-90" />
                        <div className="text-xs font-semibold text-green-600">매칭</div>
                      </div>
                    </div>
                    {/* 맞춤 정책 카드들 */}
                    <div className="space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative">
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                          <div className="flex items-start gap-2 mb-2">
                            <div className="bg-green-100 text-green-600 text-xs px-2 py-1 rounded">신청가능</div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                          <div className="h-3 bg-gray-100 rounded w-full"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="order-1 lg:order-2"
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                  <span className="text-sm font-semibold text-purple-600">맞춤 추천</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                  내 조건에 맞는<br />정책만 골라서
                </h2>
                <p className="text-[var(--muted-foreground)] text-lg mb-6 leading-relaxed">
                  간단한 정보 입력으로<br className="sm:hidden" /> 신청 가능한 정책만 추천받고,<br className="hidden sm:block lg:hidden" /> 불필요한 검색 시간을 줄이세요
                </p>
                <ul className="space-y-3">
                  {[
                    '나이·거주지·소득 등 자동 필터링',
                    '신청 가능 여부 즉시 확인',
                    '우선순위 높은 정책부터 추천'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-purple-600" strokeWidth={3} />
                      </div>
                      <span className="text-[var(--foreground)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Feature 3: 저장 & 알림 */}
        <section className="min-h-screen flex items-center justify-center bg-white relative overflow-hidden py-20">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Bookmark className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-semibold text-amber-600">저장 & 알림</span>
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
                  놓치지 말아야 할<br />정책을 저장하세요
                </h2>
                <p className="text-[var(--muted-foreground)] text-lg mb-6 leading-relaxed">
                  관심 있는 정책을 저장하고,<br className="sm:hidden" /> 마감일이 다가오면<br className="hidden sm:block lg:hidden" /> 알림을 받아 신청 기회를 놓치지 마세요
                </p>
                <ul className="space-y-3">
                  {[
                    '원클릭 북마크로 간편 저장',
                    '마감일 D-7, D-1 자동 알림',
                    'MY 페이지에서 한눈에 관리'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-amber-600" strokeWidth={3} />
                      </div>
                      <span className="text-[var(--foreground)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.6 }}
                className="relative"
              >
                {/* Mock UI - MY 페이지 - 높이 통일 */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 h-[480px] flex flex-col">
                  <div className="bg-white p-4 border-b border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                      </div>
                      <div className="bg-white rounded px-3 py-1 text-xs text-gray-500">bengo.com/me</div>
                    </div>
                    <div className="text-sm font-semibold">저장한 정책</div>
                  </div>
                  <div className="p-4 space-y-3 flex-1 overflow-hidden">
                    {[
                      { deadline: 'D-3', urgent: true },
                      { deadline: 'D-10', urgent: false },
                      { deadline: 'D-15', urgent: false }
                    ].map((item, i) => (
                      <div key={i} className={`bg-white rounded-xl border p-4 ${item.urgent ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className={`text-xs px-2 py-1 rounded font-semibold ${item.urgent ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}`}>
                            {item.deadline}
                          </div>
                          <div className="flex items-center gap-2">
                            {item.urgent && <Bell className="h-4 w-4 text-red-600" />}
                            <Bookmark className="h-4 w-4 text-amber-600 fill-amber-600" />
                          </div>
                        </div>
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Calendar className="h-3 w-3" />
                          <span>마감: 2026.03.{10 + i}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* 뱅고 3줄 요약 */}
        <Summary />

        {/* FAQ */}
        <FAQ />

        {/* CTA Section */}
        <section className="pt-24 py-20 bg-gradient-to-br from-blue-100 via-purple-100 to-blue-100 relative overflow-hidden px-4">
          <div className="absolute inset-0 opacity-50">
            <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-gradient-to-br from-blue-300 to-blue-200 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 left-1/3 w-[500px] h-[500px] bg-gradient-to-br from-purple-300 to-purple-200 rounded-full blur-3xl"></div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.6 }}
            className="container mx-auto max-w-3xl text-center relative z-10"
          >
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 leading-tight">
              지금 바로 시작하세요
            </h2>
            <p className="text-[var(--muted-foreground)] text-base sm:text-lg mb-8">
              회원가입하고 나에게 딱 맞는<br className="sm:hidden" /> 정책을 추천받아보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto min-w-[180px]">
                  무료로 시작하기
                </Button>
              </Link>
              <Link to="/policies">
                <Button size="lg" variant="secondary" className="w-full sm:w-auto min-w-[180px]">
                  정책 먼저 둘러보기
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </MainLayout>
  );
}

export default HomePage;