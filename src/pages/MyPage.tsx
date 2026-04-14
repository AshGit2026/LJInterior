import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ReservationStatus } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

const statusColors: Record<ReservationStatus, string> = {
  'Pending': 'bg-gray-100 text-gray-800',
  'Consulting': 'bg-blue-100 text-blue-800',
  'Preparing': 'bg-yellow-100 text-yellow-800',
  'In Progress': 'bg-green-100 text-green-800',
  'Completed': 'bg-purple-100 text-purple-800',
};

export default function MyPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'reservations'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const resData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReservations(resData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reservations');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCancel = async (id: string) => {
    if (!confirm('예약을 취소하시겠습니까? 취소된 정보는 복구할 수 없습니다.')) return;
    try {
      await deleteDoc(doc(db, 'reservations', id));
      alert('예약이 취소되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
    }
  };

  const stats = {
    total: reservations.length,
    inProgress: reservations.filter(r => r.status === 'In Progress').length,
    completed: reservations.filter(r => r.status === 'Completed').length,
  };
  return (
    <div className="py-20 bg-[#FDFCFB]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-[#1A1A1A] mb-2">My Page</h1>
          <p className="text-[#666666]">내 예약 내역 및 시공 진행 상황을 확인하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">총 예약 건수</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.total}건</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">진행 중인 시공</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.inProgress}건</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">완료된 시공</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.completed}건</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-none border-[#E5E1DA] shadow-sm overflow-hidden">
          <CardHeader className="bg-[#FDFCFB] border-b border-[#E5E1DA]">
            <CardTitle className="text-lg font-bold">예약 현황</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-bold text-[#1A1A1A]">예약번호</TableHead>
                    <TableHead className="font-bold text-[#1A1A1A]">신청일</TableHead>
                    <TableHead className="font-bold text-[#1A1A1A]">공간 유형</TableHead>
                    <TableHead className="font-bold text-[#1A1A1A]">평수</TableHead>
                    <TableHead className="font-bold text-[#1A1A1A]">상태</TableHead>
                    <TableHead className="font-bold text-[#1A1A1A] text-right">관리</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-[#666666]">로딩 중...</TableCell>
                    </TableRow>
                  ) : reservations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-[#666666]">예약 내역이 없습니다.</TableCell>
                    </TableRow>
                  ) : (
                    reservations.map((res) => (
                      <TableRow key={res.id} className="cursor-pointer hover:bg-[#FDFCFB]">
                        <TableCell className="font-medium text-xs">{res.id.substring(0, 8)}...</TableCell>
                        <TableCell>{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{res.spaceType}</TableCell>
                        <TableCell>{res.area}{res.areaUnit || '평'}</TableCell>
                        <TableCell>
                          <Badge className={`rounded-none font-bold uppercase text-[10px] tracking-widest border-none ${statusColors[res.status as ReservationStatus]}`}>
                            {res.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {res.status === 'Pending' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleCancel(res.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0 h-auto font-bold text-[10px] uppercase tracking-widest"
                            >
                              취소하기
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
