import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CheckCircle2, Paintbrush, Building2, ShieldCheck, HardHat, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
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

    let unsubscribe: (() => void) | undefined;
    
    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecentPortfolio(data);
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'portfolio');
        setLoading(false);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'portfolio');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0194545232.firebasestorage.app/o/portfolio%2FqVo0Wn5PewIyJ6w3DX9V%2Fopt_1778577735605_after.webp?alt=media&token=7d50ea25-7691-4145-8d0e-75d04d3080c7"
            alt="Modern Lounge Interior"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-bold tracking-widest uppercase mb-6">
              <ShieldCheck className="w-4 h-4 text-[#D4C7B0]" />
              법인 실내건축공사업 면허 보유 업체
            </div>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-[1.1] mb-8">
              머릿속에 그리던 공간,<br />
              <span className="text-[#D4C7B0]">가장 완벽한 현실</span>이 되다.
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-10 font-light leading-relaxed">
              투명한 계약과 완벽한 책임 시공, (주)엘제이인테리어가 당신의 자산과 일상에 가치를 더합니다.
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
              공간의 가치를 완성하는 퀄리티
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            <motion.div
              whileHover={{ y: -10 }}
              className="flex flex-col items-center text-center space-y-6"
            >
              <div className="w-20 h-20 bg-[#FDFCFB] border border-[#E5E1DA] flex items-center justify-center rounded-full">
                <Building2 className="w-8 h-8 text-[#8B7E74]" />
              </div>
              <h3 className="text-xl font-bold">신축부터 리모델링까지</h3>
              <p className="text-[#666666] leading-relaxed">
                주거부터 상업 공간까지, 풍부한 시공 노하우를 바탕으로 건물의 수명을 연장하고 새로운 가치를 부여합니다.
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
                고객의 취향과 라이프스타일을 세밀하게 분석하여 기능성과 심미성이 공존하는 최적의 디자인을 제안합니다.
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

      {/* Trust & License Section */}
      <section className="py-24 bg-[#1A1A1A] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="space-y-12 text-center lg:text-left"
            >
              <div className="space-y-6">
                <h2 className="text-[#D4C7B0] font-bold text-sm uppercase tracking-widest">Trust & Responsibility</h2>
                <h3 className="text-3xl md:text-5xl font-bold leading-tight">
                  내 돈을 믿고 맡겨도 되는 회사인가?<br />
                  <span className="text-[#D4C7B0]">우리는 끝까지 책임집니다.</span>
                </h3>
                <p className="text-white/70 leading-relaxed text-lg italic max-w-2xl mx-auto lg:mx-0">
                  &quot;인테리어 사기, 공사 중단, 부실 시공... 불안하시죠?<br className="hidden md:block" />
                  (주)엘제이인테리어는 법인 실내건축공사업 면허 업체로서<br className="hidden md:block" />
                  고객님의 소중한 자금을 투명하게 관리하고, 약속한 결과를 반드시 증명합니다.&quot;
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white/5 p-8 border border-white/10 rounded-xl space-y-4">
                  <div className="w-12 h-12 bg-[#D4C7B0]/10 rounded-full flex items-center justify-center mx-auto lg:mx-0">
                    <FileText className="w-6 h-6 text-[#D4C7B0]" />
                  </div>
                  <h4 className="font-bold text-lg">법인 면허 정식 등록</h4>
                  <p className="text-sm text-white/50 leading-relaxed">자본금과 기술력을 갖춘 법인만이 취득할 수 있는 정식 면허를 보유하여 법적 책임을 다합니다.</p>
                </div>
                <div className="bg-white/5 p-8 border border-white/10 rounded-xl space-y-4">
                  <div className="w-12 h-12 bg-[#D4C7B0]/10 rounded-full flex items-center justify-center mx-auto lg:mx-0">
                    <ShieldCheck className="w-6 h-6 text-[#D4C7B0]" />
                  </div>
                  <h4 className="font-bold text-lg">하자 이행 보증</h4>
                  <p className="text-sm text-white/50 leading-relaxed">법적으로 보장된 하자 이행보증보험 가입으로 공사 후 사후 관리까지 철저히 약속합니다.</p>
                </div>
                <div className="bg-white/5 p-8 border border-white/10 rounded-xl space-y-4">
                  <div className="w-12 h-12 bg-[#D4C7B0]/10 rounded-full flex items-center justify-center mx-auto lg:mx-0">
                    <HardHat className="w-6 h-6 text-[#D4C7B0]" />
                  </div>
                  <h4 className="font-bold text-lg">전문화된 관리 시스템</h4>
                  <p className="text-sm text-white/50 leading-relaxed">단순 기술자가 아닌 프로젝트 매니지먼트 역량을 갖춘 전문가들이 체계적으로 시공합니다.</p>
                </div>
              </div>
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
                      src={item.afterImage || undefined}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                      loading="lazy"
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
