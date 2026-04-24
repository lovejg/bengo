import { Link } from 'react-router';
import { ArrowRight, Search, Bookmark, ChevronDown, User, Check, Bell, Calendar, Shield, Clock, Filter, Sparkles, MapPin, Gift, Edit } from 'lucide-react';
import { Button } from '../components/atoms/Button';
import { MainLayout } from '../components/templates/MainLayout';
import { motion } from 'motion/react';
import { useRef } from 'react';
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
                {/* Mock UI - 정책찾기 (PoliciesPage 기준) */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 h-[480px] flex flex-col">
                  {/* Browser chrome */}
                  <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 ml-2">bengo.com/policies</div>
                  </div>

                  {/* Sticky header: 실제 텍스트 그대로 노출 (블러/placeholder 제거) */}
                  <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2.5">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1">어떤 정책을 찾고 계신가요?</h3>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-[11px] text-gray-500">
                          총 <span className="font-semibold text-gray-800">24개</span>의 정책을 찾았어요 ✨
                        </p>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          모집중 18
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                          상시 4
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          별도 확인 2
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-[11px] text-gray-400">예: 월세, 취업, 주거, 교육…</span>
                      </div>
                      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1.5 text-[11px] text-gray-700 font-medium">
                        최신순
                        <ChevronDown className="h-3 w-3" />
                      </div>
                      <div className="bg-white border border-gray-200 rounded-lg p-1.5">
                        <Filter className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700">신청형</div>
                      <div className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-orange-200 bg-orange-50 text-orange-700">정보형</div>
                    </div>
                  </div>

                  {/* Results — 2열 그리드 */}
                  <div className="p-3 flex-1 overflow-hidden">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { status: 'recruiting', title: '청년 월세 지원', org: '서울시', category: '청년정책', region: '서울', period: '~ 05.31' },
                        { status: 'recruiting', title: '창업 초기자금 지원', org: '서울창업허브', category: '청년정책', region: '서울', period: '~ 06.15' },
                        { status: 'always', title: '청년 취업 멘토링', org: '고용센터', category: '청년정책', region: '서울', period: '상시모집' },
                        { status: 'always', title: '주거안정 정보제공', org: 'LH', category: null, region: '서울', period: '상시모집' },
                      ].map((c, i) => {
                        const isRecruiting = c.status === 'recruiting';
                        const border = isRecruiting ? 'border-emerald-500 bg-emerald-50/40' : 'border-blue-500 bg-blue-50/40';
                        const chip = isRecruiting ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700';
                        return (
                          <div key={i} className={`rounded-lg border-2 p-2 ${border}`}>
                            <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                              <div className={`text-[9px] font-semibold px-1 py-0.5 rounded ${chip}`}>
                                {isRecruiting ? '모집중' : '상시'}
                              </div>
                              <div className="text-[9px] px-1 py-0.5 rounded bg-white border border-gray-200 text-gray-600 truncate max-w-[72px]">{c.org}</div>
                            </div>
                            <div className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1.5 min-h-[28px]">{c.title}</div>
                            <div className="flex items-center gap-2 text-[9px] text-gray-500">
                              <div className="flex items-center gap-0.5"><MapPin className="h-2 w-2" /><span>{c.region}</span></div>
                              <div className="flex items-center gap-0.5"><Calendar className="h-2 w-2" /><span>{c.period}</span></div>
                            </div>
                          </div>
                        );
                      })}
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
                {/* Mock UI - 맞춤추천: 설명형 흐름 (프로필 → 매칭 → 추천 카드) */}
                <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 h-[480px] flex flex-col">
                  {/* Browser chrome */}
                  <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 ml-2">bengo.com/personalized</div>
                  </div>

                  {/* 그라데이션 배경 본체 */}
                  <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 flex-1 flex flex-col">
                    {/* 1) 상단 프로필/조건 카드 */}
                    <div className="bg-white rounded-xl border border-blue-100 shadow-sm p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-blue-100 rounded-lg">
                          <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                        </div>
                        <span className="text-[11px] font-semibold text-gray-800">내 프로필</span>
                        <div className="ml-auto flex items-center gap-1 text-[9px] font-semibold text-[var(--accent)] bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
                          <Sparkles className="h-2 w-2" />
                          완성도 80%
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                          <Calendar className="h-2.5 w-2.5" /><span>25세</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5">
                          <MapPin className="h-2.5 w-2.5" /><span>서울</span>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] font-medium bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">
                          <Gift className="h-2.5 w-2.5" /><span>청년정책</span>
                        </div>
                      </div>
                    </div>

                    {/* 2) 매칭 흐름 표시 */}
                    <div className="flex justify-center items-center gap-2 my-2.5">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--accent)]/40 to-[var(--accent)]/70"></div>
                      <div className="flex items-center gap-1 bg-white border border-blue-200 rounded-full px-2 py-0.5 shadow-sm">
                        <ArrowRight className="h-3 w-3 text-[var(--accent)] rotate-90" />
                        <span className="text-[10px] font-semibold text-[var(--accent)]">매칭</span>
                      </div>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--accent)]/40 to-[var(--accent)]/70"></div>
                    </div>

                    {/* 3) 추천 정책 카드 — 3개를 2열 그리드로 (1행 2개 + 2행 1개) */}
                    <div className="grid grid-cols-2 gap-2 flex-1 overflow-hidden content-start">
                      {[
                        { title: '청년 창업 지원금', org: '서울창업허브', desc: '서울 청년 대상 창업 초기자금 지원', period: '~ 06.30' },
                        { title: '청년 월세 지원', org: '서울시', desc: '무주택 청년 월세 일부 지원', period: '~ 05.31' },
                        { title: '청년 취업 멘토링', org: '고용센터', desc: '1:1 진로/취업 멘토링 프로그램', period: '~ 07.15' },
                      ].map((c, i) => (
                        <div key={i} className="rounded-xl border-2 border-emerald-500 bg-white p-2.5 relative shadow-sm">
                          <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow">
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </div>
                          <div className="flex items-center gap-1 mb-1.5 flex-wrap">
                            <div className="text-[9px] font-semibold px-1 py-0.5 rounded bg-emerald-100 text-emerald-700">모집중</div>
                            <div className="text-[9px] px-1 py-0.5 rounded bg-white border border-gray-200 text-gray-600 truncate max-w-[68px]">{c.org}</div>
                          </div>
                          <div className="text-[11px] font-semibold text-gray-800 line-clamp-2 leading-snug mb-1 min-h-[28px]">{c.title}</div>
                          <div className="text-[9px] text-gray-500 line-clamp-2 leading-snug mb-1.5 min-h-[24px]">{c.desc}</div>
                          <div className="flex items-center gap-2 text-[9px] text-gray-500 pt-1 border-t border-gray-100">
                            <div className="flex items-center gap-0.5"><MapPin className="h-2 w-2" /><span>서울</span></div>
                            <div className="flex items-center gap-0.5"><Calendar className="h-2 w-2" /><span>{c.period}</span></div>
                          </div>
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
                {/* Mock UI - MY 페이지 / 저장한 정책 (MyPage 히어로 최대한 반영) */}
                <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 h-[480px] flex flex-col">
                  {/* Browser chrome */}
                  <div className="bg-white px-4 py-3 border-b border-gray-200 flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <div className="w-3 h-3 rounded-full bg-green-400"></div>
                    </div>
                    <div className="bg-gray-100 rounded px-3 py-1 text-xs text-gray-500 ml-2">bengo.com/me</div>
                  </div>

                  {/* MY 페이지 히어로 (실제 MyPage.tsx 3열 구조 재현) */}
                  <div className="bg-gradient-to-b from-blue-50 to-white px-3 py-3">
                    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-xl shadow-sm p-2.5">
                      <div className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,1.35fr)_auto] gap-2 items-center">
                        {/* Col 1: 프로필 */}
                        <div className="flex items-start gap-2">
                          <div className="p-1.5 bg-blue-100 rounded-lg flex-shrink-0">
                            <User className="h-3.5 w-3.5 text-[var(--accent)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-[12px] font-semibold text-gray-900 leading-tight">홍길동님</div>
                            <div className="text-[8.5px] text-gray-500 mt-0.5 leading-snug line-clamp-2">
                              저장한 정책과 프로필 정보를 한곳에서 관리하세요.
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-600 mt-1">
                              <div className="flex items-center gap-0.5"><Sparkles className="h-2.5 w-2.5" /><span>25세</span></div>
                              <div className="flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" /><span>서울</span></div>
                            </div>
                          </div>
                        </div>

                        {/* Col 2: 통계 3박스 */}
                        <div className="grid grid-cols-3 gap-1">
                          <div className="bg-white/70 border border-white/80 rounded-lg px-1.5 py-1 shadow-sm">
                            <div className="text-[8px] font-medium text-gray-500 leading-tight">저장한 정책</div>
                            <div className="text-[14px] font-semibold text-gray-900 leading-tight mt-0.5">4</div>
                            <div className="text-[7.5px] text-gray-400 leading-tight mt-0.5">전체 저장</div>
                          </div>
                          <div className="bg-white/70 border border-white/80 rounded-lg px-1.5 py-1 shadow-sm">
                            <div className="text-[8px] font-medium text-gray-500 leading-tight">모집중</div>
                            <div className="text-[14px] font-semibold text-emerald-600 leading-tight mt-0.5">4</div>
                            <div className="text-[7.5px] text-gray-400 leading-tight mt-0.5">신청 가능</div>
                          </div>
                          <div className="bg-white/70 border border-white/80 rounded-lg px-1.5 py-1 shadow-sm">
                            <div className="text-[8px] font-medium text-gray-500 leading-tight">관심사</div>
                            <div className="mt-1">
                              <span className="inline-block text-[8px] font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded px-1 leading-tight">청년정책</span>
                            </div>
                          </div>
                        </div>

                        {/* Col 3: 링 + 프로필 수정 */}
                        <div className="bg-white/75 border border-white/80 rounded-lg p-1.5 shadow-sm flex flex-col justify-between min-w-[96px]">
                          <div className="flex items-center gap-1.5">
                            <div className="relative h-9 w-9 flex-shrink-0">
                              <svg className="h-9 w-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(59, 130, 246, 0.14)" strokeWidth="3" />
                                <circle
                                  cx="18"
                                  cy="18"
                                  r="14"
                                  fill="none"
                                  stroke="url(#mockMyPageRing)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeDasharray={2 * Math.PI * 14}
                                  strokeDashoffset={2 * Math.PI * 14 * 0.2}
                                />
                                <defs>
                                  <linearGradient id="mockMyPageRing" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#2563eb" />
                                    <stop offset="100%" stopColor="#7c3aed" />
                                  </linearGradient>
                                </defs>
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-gray-800">80%</span>
                              </div>
                            </div>
                            <div className="text-[9px] font-semibold text-gray-700 leading-tight">프로필<br />완성도</div>
                          </div>
                          <div className="mt-1.5 pt-1.5 border-t border-blue-100/80">
                            <div className="flex items-center justify-center gap-1 bg-white border border-gray-200 rounded text-[9px] text-gray-700 font-medium py-1 px-1.5">
                              <Edit className="h-2 w-2" />
                              <span>프로필 수정</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 상태 탭 (전체 / 예정 / 모집중 / 마감) */}
                  <div className="bg-white mx-3 mb-2 rounded-xl px-1.5 py-1.5 flex items-center gap-1 border border-gray-100">
                    <div className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-[var(--accent)] text-white">전체</div>
                    <div className="text-[10px] font-medium px-2.5 py-1 rounded-lg text-gray-600">예정</div>
                    <div className="text-[10px] font-medium px-2.5 py-1 rounded-lg text-gray-600">모집중</div>
                    <div className="text-[10px] font-medium px-2.5 py-1 rounded-lg text-gray-600">마감</div>
                  </div>

                  {/* 저장 카드 리스트 — 2열 그리드, D-7 이하는 빨간 테두리 + 우측 상단 D-N */}
                  <div className="px-3 pb-3 flex-1 overflow-hidden">
                    <div className="grid grid-cols-2 gap-1.5 content-start">
                      {[
                        { status: 'recruiting' as const, daysLeft: 3, deadline: '2026.04.25', title: '청년 월세 지원', org: '서울시' },
                        { status: 'recruiting' as const, daysLeft: 10, deadline: '2026.05.02', title: '청년 창업 지원금', org: '서울창업허브' },
                        { status: 'recruiting' as const, daysLeft: 25, deadline: '2026.05.18', title: '청년 취업 멘토링', org: '고용센터' },
                        { status: 'recruiting' as const, daysLeft: 18, deadline: '2026.05.10', title: '청년 전세보증금 대출', org: 'LH' },
                      ].map((item, i) => {
                        const urgent = item.daysLeft !== null && item.daysLeft <= 7;
                        const bgClass = item.status === 'recruiting' ? 'bg-emerald-50/40' : 'bg-blue-50/40';
                        const borderClass = urgent
                          ? 'border-red-500'
                          : item.status === 'recruiting'
                            ? 'border-emerald-500'
                            : 'border-blue-500';
                        const statusChipClass = item.status === 'recruiting'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700';
                        return (
                          <div key={i} className={`relative rounded-lg border-2 px-2 py-1.5 ${bgClass} ${borderClass}`}>
                            {urgent && (
                              <div className="absolute right-2 top-1.5 text-[10px] font-bold text-red-600">
                                D-{item.daysLeft}
                              </div>
                            )}
                            <div className="flex items-center gap-1 mb-1 flex-wrap">
                              <div className={`text-[9px] font-semibold px-1 py-0.5 rounded ${statusChipClass}`}>
                                {item.status === 'recruiting' ? '모집중' : '상시'}
                              </div>
                              <div className="text-[9px] px-1 py-0.5 rounded bg-white border border-gray-200 text-gray-600 truncate max-w-[64px]">{item.org}</div>
                            </div>
                            <div className={`text-[11px] font-semibold text-gray-800 leading-snug mb-1 line-clamp-2 min-h-[28px] ${urgent ? 'pr-8' : ''}`}>
                              {item.title}
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500">
                              <div className="flex items-center gap-0.5"><MapPin className="h-2 w-2" /><span>서울</span></div>
                              {item.deadline ? (
                                <div className="flex items-center gap-0.5 truncate"><Calendar className="h-2 w-2 flex-shrink-0" /><span className="truncate">{item.deadline}</span></div>
                              ) : (
                                <div className="flex items-center gap-0.5"><Calendar className="h-2 w-2" /><span>상시모집</span></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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