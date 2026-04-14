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
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="relative aspect-[4/5] bg-[#E5E1DA]"
            >
              <img
                src="https://images.unsplash.com/photo-1595428774223-ef52624120d2?q=80&w=1000&auto=format&fit=crop"
                alt="Studio"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.div>
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
                title: 'Authenticity',
                desc: '가장 본질적인 것에 집중합니다. 화려함보다는 공간의 목적과 사용자의 편의를 최우선으로 생각합니다.'
              },
              {
                title: 'Innovation',
                desc: '최신 3D 렌더링 기술과 스마트 홈 솔루션을 결합하여 미래지향적인 공간을 제안합니다.'
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
