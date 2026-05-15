import React from 'react';
import { motion } from 'motion/react';

export default function About() {
  return (
    <div className="flex flex-col">
      {/* Brand Intro */}
      <section className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-[#8B7E74]">About LJInterior</h2>
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-[#1A1A1A] leading-tight">
                공간에 삶의<br />가치를 담다.
              </h1>
              <p className="text-lg text-[#666666] leading-relaxed">
                LJInterior는 단순히 예쁜 공간을 만드는 것을 넘어, 그 공간에서 살아갈 사람들의 이야기와 가치를 담아내는 것을 목표로 합니다. 
                우리는 디자인이 삶의 질을 바꿀 수 있다고 믿으며, 매 프로젝트마다 진심을 다해 시공합니다.
              </p>
              <div className="grid grid-cols-2 gap-8 pt-8">
                <div>
                  <h4 className="text-3xl font-bold text-[#1A1A1A] mb-2">2023~</h4>
                  <p className="text-sm text-[#8B7E74] font-bold uppercase tracking-widest">Since</p>
                </div>
                <div>
                  <h4 className="text-3xl font-bold text-[#1A1A1A] mb-2">Holds</h4>
                  <p className="text-sm text-[#8B7E74] font-bold uppercase tracking-widest">Interior License</p>
                </div>
              </div>
              
              <div className="p-6 bg-[#FDFCFB] border-l-4 border-[#8B7E74]">
                <p className="text-[#1A1A1A] font-bold mb-2">법인 실내건축공사업 면허 보유 (제 화성23-나-21호)</p>
                <p className="text-sm text-[#666666] leading-relaxed">
                  (주)엘제이인테리어는 까다로운 자본금 기준과 전문 기술 인력 보유 조건을 충족한 정식 면허 업체입니다. 
                  단순한 인테리어 사무실이 아닌, 법적 책임과 사후 관리를 보장하는 건실한 법인 기업입니다.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-[4/5] bg-[#E5E1DA]"
            >
              <img
                src="https://firebasestorage.googleapis.com/v0/b/gen-lang-client-0194545232.firebasestorage.app/o/portfolio%2FcP1ugLGiramX80PZHFjo%2Fopt_1778577654953_gallery_1.webp?alt=media&token=d5184193-7c58-4834-8e5a-e43fba791e6a"
                alt="Studio"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* License Importance Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-[#1A1A1A] p-12 md:p-20 text-white overflow-hidden relative">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-[#D4C7B0] font-bold text-sm uppercase tracking-widest mb-6">Security & Professionalism</h2>
                <h3 className="text-2xl md:text-4xl font-bold leading-tight mb-8">
                  왜 법인 면허 업체여야 하는가?
                </h3>
                <p className="text-white/70 text-base leading-relaxed mb-10">
                  인테리어 공사는 큰 비용이 들어가는 인생의 중요한 이벤트입니다. 하지만 많은 분들이 '무면허 동네 업체'에 맡겼다가 
                  공사 중단, 하자 보수 거부, 심지어는 자금 횡령 등의 피해를 보고 계십니다.
                </p>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4C7B0] mt-2.5 flex-shrink-0" />
                    <p className="text-white/80 text-sm"><span className="text-[#D4C7B0] font-bold">자본금 및 기술인력 검증:</span> 국가에서 정한 기준을 통과한 업체만이 면허를 유지할 수 있습니다.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4C7B0] mt-2.5 flex-shrink-0" />
                    <p className="text-white/80 text-sm"><span className="text-[#D4C7B0] font-bold">법적 보호와 안전:</span> 전문건축물 시공 시 법적 보호를 받을 수 있으며, 1,500만원 이상의 공사는 실내건축면허 업체만이 합법적으로 가능합니다.</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#D4C7B0] mt-2.5 flex-shrink-0" />
                    <p className="text-white/80 text-sm"><span className="text-[#D4C7B0] font-bold">철저한 사후 관리:</span> 개인 사업자와 달리 법인으로서 끝까지 책임을 집니다. 하자이행보증보험 발행이 가능하여 고객님의 권리를 보호합니다.</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white/5 backdrop-blur-sm p-6 border border-white/10 rounded-xl">
                    <p className="text-2xl font-bold text-[#D4C7B0] mb-1">0%</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Default Rate</p>
                    <p className="mt-3 text-xs font-medium text-white/80">단 한 건의 낙오 없는 성실 시공</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-sm p-6 border border-white/10 rounded-xl">
                    <p className="text-2xl font-bold text-[#D4C7B0] mb-1">100%</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Responsibility</p>
                    <p className="mt-3 text-xs font-medium text-white/80">법적 책임을 다하는 기업 윤리</p>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="bg-[#D4C7B0] p-8 rounded-xl text-[#1A1A1A] h-full flex flex-col justify-between">
                    <div>
                      <p className="font-bold text-sm mb-6 text-[#1A1A1A]/60 uppercase tracking-tighter">Our Promise</p>
                      <p className="text-2xl font-bold leading-tight">
                        "고객님의 소중한 자산, 우리가 끝까지 지킵니다."
                      </p>
                    </div>
                    <div className="mt-8 pt-8 border-t border-[#1A1A1A]/10 italic text-xs">
                      - (주)엘제이인테리어 임직원 일동
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Background Accent */}
            <div className="absolute top-0 right-0 w-1/3 h-full bg-[#D4C7B0]/5 -skew-x-12 translate-x-1/2" />
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="py-32 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-[#8B7E74] mb-4">Philosophy</h2>
            <p className="text-4xl font-bold tracking-tight text-[#1A1A1A]">우리의 시공 철학</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                title: 'Convenience',
                desc: '거주자의 생활 패턴을 면밀히 분석하여 가장 편안하고 효율적인 공간을 만듭니다. 화려한 장식보다는 실용적인 편의성을 최우선으로 고려합니다.'
              },
              {
                title: 'Detail',
                desc: '보이지 않는 곳까지 세심하게 살핍니다. 작은 차이가 만드는 완벽한 완성도를 위해 타협하지 않고 시공합니다.'
              },
              {
                title: 'Sustainability',
                desc: '친환경 자재와 지속 가능한 시공 방식을 선택하여 사람과 환경이 공존할 수 있는 공간을 만듭니다.'
              }
            ].map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
                className="bg-white p-12 border border-[#E5E1DA] space-y-6"
              >
                <h3 className="text-2xl font-bold text-[#1A1A1A]">{item.title}</h3>
                <p className="text-[#666666] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
