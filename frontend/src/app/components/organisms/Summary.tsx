import { motion } from 'motion/react';
import { Zap, User, Bookmark } from 'lucide-react';

export function Summary() {
  return (
    <section className="py-20 pb-24 bg-gradient-to-b from-white to-slate-50 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">뱅고, 이렇게 사용하세요</h2>
          <p className="text-[var(--muted-foreground)]">세 가지 핵심 기능으로 정책 찾기가 쉬워집니다</p>
        </motion.div>
        
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Zap, title: '빠른 검색', desc: '키워드와 필터로 원하는 정책을 즉시 검색합니다' },
            { icon: User, title: '맞춤 추천', desc: '내 정보 입력으로 신청 가능한 정책만 추천합니다' },
            { icon: Bookmark, title: '저장 & 알림', desc: '관심 정책 저장하고 마감일 알림을 받습니다' }
          ].map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                <item.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}