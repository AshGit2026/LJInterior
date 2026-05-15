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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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

    let unsubscribe: (() => void) | undefined;

    try {
      unsubscribe = onSnapshot(q, (snapshot) => {
        const resData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReservations(resData);
        setLoading(false);
      }, (error) => {
        if (error.message?.includes('shutting down')) return;
        handleFirestoreError(error, OperationType.LIST, 'reservations');
        setLoading(false);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'reservations');
      setLoading(false);
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  const [cancellingId, setCancellingId] = React.useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = React.useState<string | null>(null);

  const handleCancel = async (id: string) => {
    console.log('Attempting to cancel reservation:', id);
    setCancellingId(id);
    try {
      await deleteDoc(doc(db, 'reservations', id));
      console.log('Cancellation successful');
      setShowCancelConfirm(null);
    } catch (error) {
      console.error('Cancel Error:', error);
      handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
    } finally {
      setCancellingId(null);
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
                        <TableCell className="font-mono text-xs text-[#8B7E74]">{res.id}</TableCell>
                        <TableCell>{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleDateString() : '-'}</TableCell>
                        <TableCell>{res.spaceType}</TableCell>
                        <TableCell>{res.area}{res.areaUnit || '평'}</TableCell>
                        <TableCell>
                          <Badge className={`rounded-none font-bold uppercase text-[10px] tracking-widest border-none ${statusColors[res.status as ReservationStatus]}`}>
                            {res.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-3">
                          <Dialog>
                            <DialogTrigger render={
                              <Button variant="outline" size="sm" className="rounded-none text-[10px] font-bold uppercase tracking-widest h-auto py-1 px-3">
                                상세 보기
                              </Button>
                            } nativeButton={true} />
                            <DialogContent className="rounded-none border-[#E5E1DA] max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-bold tracking-tight">예약 상세 정보</DialogTitle>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-6 py-4">
                                <div>
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-1">상태</h4>
                                  <Badge className={`rounded-none font-bold uppercase text-[10px] tracking-widest border-none ${statusColors[res.status as ReservationStatus]}`}>
                                    {res.status}
                                  </Badge>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-1">신청일</h4>
                                  <p className="text-sm">{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleString() : '-'}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-1">공간 유형</h4>
                                  <p className="text-sm font-bold">{res.spaceType}</p>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-1">면적</h4>
                                  <p className="text-sm">{res.area}{res.areaUnit || '평'}</p>
                                </div>
                                <div className="col-span-2">
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-1">선호 스타일</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {res.styles?.map((style: string) => (
                                      <Badge key={style} variant="outline" className="rounded-none border-[#E5E1DA] text-[#666666] font-normal">
                                        {style}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-1">희망 상담일</h4>
                                  <p className="text-sm">{res.preferredDate || '-'}</p>
                                </div>
                                <div className="col-span-2 border-t border-[#E5E1DA] pt-4">
                                  <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-2">추가 요청사항</h4>
                                  <p className="text-sm bg-[#FDFCFB] p-3 border border-[#E5E1DA] whitespace-pre-wrap">{res.additionalRequests || '없음'}</p>
                                </div>
                                {res.adminNotes && (
                                  <div className="col-span-2 border-t border-[#E5E1DA] pt-4">
                                    <h4 className="text-xs font-bold text-[#8B7E74] uppercase tracking-widest mb-2">관리자 답변</h4>
                                    <p className="text-sm bg-blue-50/50 p-3 border border-blue-100 whitespace-pre-wrap italic">{res.adminNotes}</p>
                                  </div>
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>

                          {res.status === 'Pending' && (
                            <Dialog open={showCancelConfirm === res.id} onOpenChange={(open) => !open && setShowCancelConfirm(null)}>
                              <DialogTrigger render={
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={cancellingId === res.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCancelConfirm(res.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-0 h-auto font-bold text-[10px] uppercase tracking-widest"
                                >
                                  {cancellingId === res.id ? '...' : '취소하기'}
                                </Button>
                              } nativeButton={true} />
                              <DialogContent className="rounded-none border-[#E5E1DA] max-w-sm">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold tracking-tight">예약 취소 확인</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                  <p className="text-sm text-[#666666]">정말로 이 예약을 취소하시겠습니까?<br/>취소된 정보는 복구할 수 없습니다.</p>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" className="rounded-none" onClick={() => setShowCancelConfirm(null)}>뒤로가기</Button>
                                  <Button 
                                    variant="destructive" 
                                    className="rounded-none font-bold"
                                    onClick={() => handleCancel(res.id)}
                                    disabled={cancellingId === res.id}
                                  >
                                    {cancellingId === res.id ? '처리 중...' : '예약 취소'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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
