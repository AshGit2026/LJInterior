import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Paintbrush, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function Home() {
  const [recentPortfolio, setRecentPortfolio] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(
      collection(db, 'portfolio'),
      orderBy('createdAt', 'desc'),
      limit(2)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentPortfolio(data);
      setLoading(false);
    }, (error) => {
      console.error('Home portfolio fetch error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop"
            alt="Hero Interior"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40" />
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-white">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-3xl"
          >
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
              머릿속에 그리던 공간,<br />
              <span className="text-[#D4C7B0]">가장 완벽한 현실</span>이 되다.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 font-light leading-relaxed">
              설계부터 시공까지, LJInterior가 당신의 일상에 가치를 더합니다.
            </p>
            <Link to="/reservation">
              <Button size="lg" className="bg-[#8B7E74] hover:bg-[#7A6D63] text-white px-8 py-7 text-lg rounded-none transition-all hover:gap-4">
                내 공간에 딱 맞는 맞춤 상담 시작하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-[#8B7E74] mb-4">Why Choose Us</h2>
            <p className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A]">
              오차 없는 프리뷰, 실제와 같은 3D 렌더링
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <motion.div
              whileHover={{ y: -10 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-20 h-20 bg-[#FDFCFB] border border-[#E5E1DA] flex items-center justify-center rounded-full">
                <Monitor className="w-8 h-8 text-[#8B7E74]" />
              </div>
              <h3 className="text-xl font-bold">정교한 3D 시안</h3>
              <p className="text-[#666666] leading-relaxed">
                빛의 흐름과 마감재의 질감까지 구현한 정교한 3D 시안을 시공 전에 제공합니다.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-20 h-20 bg-[#FDFCFB] border border-[#E5E1DA] flex items-center justify-center rounded-full">
                <Paintbrush className="w-8 h-8 text-[#8B7E74]" />
              </div>
              <h3 className="text-xl font-bold">맞춤형 디자인</h3>
              <p className="text-[#666666] leading-relaxed">
                고객의 라이프스타일과 취향을 분석하여 세상에 단 하나뿐인 공간을 설계합니다.
              </p>
            </motion.div>

            <motion.div
              whileHover={{ y: -10 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-20 h-20 bg-[#FDFCFB] border border-[#E5E1DA] flex items-center justify-center rounded-full">
                <CheckCircle2 className="w-8 h-8 text-[#8B7E74]" />
              </div>
              <h3 className="text-xl font-bold">완벽한 시공 관리</h3>
              <p className="text-[#666666] leading-relaxed">
                전문 시공팀의 철저한 공정 관리로 약속된 기한 내에 최상의 퀄리티를 보장합니다.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Portfolio Highlight Section */}
      <section className="py-32 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-end mb-16">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-[#8B7E74] mb-4">Portfolio</h2>
              <p className="text-4xl font-bold tracking-tight text-[#1A1A1A]">최근 시공 사례</p>
            </div>
            <Link to="/portfolio">
              <Button variant="link" className="text-[#8B7E74] font-bold p-0 flex items-center gap-2">
                전체 보기 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {loading ? (
              <div className="col-span-full text-center py-20 text-[#666666]">로딩 중...</div>
            ) : recentPortfolio.length === 0 ? (
              <div className="col-span-full text-center py-20 text-[#666666] border border-dashed border-[#E5E1DA]">
                등록된 포트폴리오가 없습니다.
              </div>
            ) : (
              recentPortfolio.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.2 }}
                  className="group relative h-[600px] overflow-hidden cursor-pointer"
                >
                  <Link to="/portfolio">
                    <img
                      src={item.afterImage}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />
                    <div className="absolute bottom-10 left-10 text-white">
                      <span className="text-xs font-bold uppercase tracking-widest bg-[#8B7E74] px-3 py-1 mb-4 inline-block">
                        {item.category}
                      </span>
                      <h3 className="text-3xl font-bold">{item.title}</h3>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-[#1A1A1A] text-white text-center">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
            새로운 공간을 향한 첫걸음,<br />지금 바로 이야기해 주세요.
          </h2>
          <Link to="/reservation">
            <Button size="lg" className="bg-white text-[#1A1A1A] hover:bg-[#D4C7B0] px-10 py-8 text-xl rounded-none font-bold">
              상담 예약 신청하기
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
