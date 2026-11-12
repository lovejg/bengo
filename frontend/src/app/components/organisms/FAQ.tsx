import { motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function FAQ() {
  const [isExpanded, setIsExpanded] = useState<number>(-1);

  const faqs = [
    { 
      q: '정보는 어디서 가져오나요?',
      a: '온통청년, 복지로, 공공데이터포털(data.go.kr), 서울청년몽땅정보통의 공공 API와 공식 사이트에서 정책 정보를 수집해 제공합니다'
    },
    {
      q: '정보는 얼마나 최신인가요?',
      a: '공공 API에서 수집한 시점의 정보가 반영됩니다. 마감일 등 세부 내용은 바뀔 수 있으니 신청 전에 원문에서 꼭 확인해 주세요'
    },
    {
      q: '알림은 어떻게 받나요?',
      a: '저장한 정책의 마감이 7일 이내로 다가오면 상단 알림함(종 아이콘)에 표시됩니다'
    },
    { 
      q: '가입 없이도 사용할 수 있나요?',
      a: '네! 정책 검색과 둘러보기는 가입 없이 이용 가능합니다. 맞춤 추천과 저장 기능은 회원가입 후 사용하실 수 있습니다'
    }
  ];

  return (
    <section className="py-20 pb-28 bg-slate-50 px-4">
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-3">자주 묻는 질문</h2>
          <p className="text-[var(--muted-foreground)]">뱅고 사용에 대한 궁금증을 해결해드립니다</p>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, amount: 0.3 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
            >
              <button
                onClick={() => setIsExpanded(isExpanded === index ? -1 : index)}
                className="w-full bg-white rounded-xl p-5 text-left hover:shadow-md transition-all duration-200 border border-gray-200"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-base pr-4">{item.q}</h3>
                  <ChevronDown
                    className={`h-5 w-5 text-[var(--muted-foreground)] transition-transform duration-200 flex-shrink-0 ${
                      isExpanded === index ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {isExpanded === index && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sm text-[var(--muted-foreground)] mt-3 leading-relaxed"
                  >
                    {item.a}
                  </motion.p>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}