import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SpaceType, StyleType } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, setDoc, doc, serverTimestamp } from 'firebase/firestore';

const generateReservationId = () => {
  const now = new Date();
  const dateStr = now.getFullYear().toString() + 
                  (now.getMonth() + 1).toString().padStart(2, '0') + 
                  now.getDate().toString().padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let randomStr = '';
  for (let i = 0; i < 3; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${dateStr}${randomStr}`;
};

const styles: StyleType[] = ['Modern', 'Minimal', 'Wood & Natural', 'Industrial', 'High-end', 'Other'];

export default function Reservation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formData, setFormData] = React.useState({
    spaceType: '' as SpaceType | '',
    selectedStyles: [] as StyleType[],
    area: '',
    areaUnit: '평' as '평' | '㎡',
    name: '',
    phone: '',
    preferredDate: '',
    additionalRequests: '',
    agreed: false
  });

  const handleStyleToggle = (style: StyleType) => {
    setFormData(prev => ({
      ...prev,
      selectedStyles: prev.selectedStyles.includes(style)
        ? prev.selectedStyles.filter(s => s !== style)
        : [...prev.selectedStyles, style]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert('상담 예약을 위해 로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    if (!formData.agreed) {
      alert('개인정보 수집 및 이용에 동의해주세요.');
      return;
    }
    if (!formData.spaceType || !formData.name || !formData.phone) {
      alert('필수 정보를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const reservationId = generateReservationId();
      const reservationData = {
        userId: user.uid,
        userName: formData.name,
        userEmail: user.email,
        userPhone: formData.phone,
        spaceType: formData.spaceType,
        styles: formData.selectedStyles,
        area: Number(formData.area),
        areaUnit: formData.areaUnit,
        preferredDate: formData.preferredDate,
        additionalRequests: formData.additionalRequests,
        status: 'Pending',
        adminNotes: '',
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'reservations', reservationId), reservationData);
      alert('상담 예약이 신청되었습니다. 담당자가 곧 연락드리겠습니다.');
      navigate('/mypage');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'reservations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-20 bg-[#FDFCFB]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] mb-6">Reservation</h1>
          <p className="text-[#666666]">
            "새로운 공간을 향한 첫걸음, 지금 바로 이야기해 주세요."
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#E5E1DA] p-8 md:p-12 shadow-sm"
        >
          <form onSubmit={handleSubmit} className="space-y-10">
            {/* Space Type */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">공간 유형</Label>
              <Select onValueChange={(val) => setFormData({ ...formData, spaceType: val as SpaceType })}>
                <SelectTrigger className="rounded-none border-[#E5E1DA] h-12">
                  <SelectValue placeholder="공간 유형을 선택해주세요" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">주거 공간 (Residential)</SelectItem>
                  <SelectItem value="Commercial">상업 공간 (Commercial)</SelectItem>
                  <SelectItem value="Office">사무 공간 (Office)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Styles */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">원하는 스타일 (다중 선택 가능)</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {styles.map((style) => (
                  <div key={style} className="flex items-center space-x-2">
                    <Checkbox 
                      id={style} 
                      checked={formData.selectedStyles.includes(style)}
                      onCheckedChange={() => handleStyleToggle(style)}
                    />
                    <label htmlFor={style} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      {style}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Area */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">시공 면적</Label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Input 
                    type="number" 
                    placeholder="면적을 입력해주세요" 
                    className="rounded-none border-[#E5E1DA] h-12"
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  />
                </div>
                <div className="w-32">
                  <Select 
                    value={formData.areaUnit} 
                    onValueChange={(val: '평' | '㎡') => setFormData({ ...formData, areaUnit: val })}
                  >
                    <SelectTrigger className="rounded-none border-[#E5E1DA] h-12">
                      <SelectValue placeholder="단위" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="평">평</SelectItem>
                      <SelectItem value="㎡">㎡</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">이름</Label>
                <Input 
                  placeholder="성함을 입력해주세요" 
                  className="rounded-none border-[#E5E1DA] h-12"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-4">
                <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">연락처</Label>
                <Input 
                  placeholder="010-0000-0000" 
                  className="rounded-none border-[#E5E1DA] h-12"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            {/* Preferred Date */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">시공 희망 일자</Label>
              <Input 
                type="date" 
                className="rounded-none border-[#E5E1DA] h-12"
                value={formData.preferredDate}
                onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
              />
            </div>

            {/* Additional Requests */}
            <div className="space-y-4">
              <Label className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">추가 요청 사항</Label>
              <Textarea 
                placeholder="상세한 요구사항을 적어주시면 더 정확한 상담이 가능합니다." 
                className="rounded-none border-[#E5E1DA] min-h-[150px]"
                value={formData.additionalRequests}
                onChange={(e) => setFormData({ ...formData, additionalRequests: e.target.value })}
              />
            </div>

            {/* Agreement */}
            <div className="flex items-start space-x-3 pt-4 border-t border-[#E5E1DA]">
              <Checkbox 
                id="agreed" 
                checked={formData.agreed}
                onCheckedChange={(val) => setFormData({ ...formData, agreed: val as boolean })}
              />
              <div className="grid gap-1.5 leading-none">
                <label htmlFor="agreed" className="text-sm font-medium">
                  개인정보 수집 및 이용에 동의합니다.
                </label>
                <p className="text-xs text-[#666666]">
                  입력하신 정보는 상담 예약 및 안내를 위해서만 사용됩니다.
                </p>
              </div>
            </div>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-[#1A1A1A] hover:bg-[#8B7E74] text-white py-8 text-lg font-bold rounded-none transition-all disabled:opacity-50"
            >
              {isSubmitting ? '신청 중...' : '상담 예약 신청하기'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
