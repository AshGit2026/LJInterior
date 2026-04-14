import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReservationStatus } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { db, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const statusOptions: ReservationStatus[] = ['Pending', 'Consulting', 'Preparing', 'In Progress', 'Completed'];

export default function Admin() {
  const { isAdmin } = useAuth();
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
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
  }, [isAdmin]);

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('예약을 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'reservations', id));
      alert('삭제되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
    }
  };

  const handleNoteUpdate = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { adminNotes: notes });
      alert('메모가 저장되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-40 text-center">
        <h1 className="text-2xl font-bold">접근 권한이 없습니다.</h1>
        <p className="text-[#666666] mt-2">관리자 계정으로 로그인해주세요.</p>
      </div>
    );
  }

  const stats = {
    new: reservations.filter(r => r.status === 'Pending').length,
    consulting: reservations.filter(r => r.status === 'Consulting').length,
    inProgress: reservations.filter(r => r.status === 'In Progress').length,
    completedMonth: reservations.filter(r => {
      if (!r.createdAt?.toDate) return false;
      const date = r.createdAt.toDate();
      const now = new Date();
      return r.status === 'Completed' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <div className="py-20 bg-[#FDFCFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-[#1A1A1A] mb-2">Admin Dashboard</h1>
          <p className="text-[#666666]">고객 예약 현황 및 시공 상태를 관리하세요.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">신규 예약</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.new}건</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">상담 진행 중</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.consulting}건</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">진행 중인 공사</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.inProgress}건</p>
            </CardContent>
          </Card>
          <Card className="rounded-none border-[#E5E1DA] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">이번 달 완료</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.completedMonth}건</p>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-none border-[#E5E1DA] shadow-sm overflow-hidden">
          <CardHeader className="bg-[#FDFCFB] border-b border-[#E5E1DA]">
            <CardTitle className="text-lg font-bold">예약 리스트</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-[#1A1A1A]">접수일</TableHead>
                      <TableHead className="font-bold text-[#1A1A1A]">고객명</TableHead>
                      <TableHead className="font-bold text-[#1A1A1A]">공간 유형</TableHead>
                      <TableHead className="font-bold text-[#1A1A1A]">평수</TableHead>
                      <TableHead className="font-bold text-[#1A1A1A]">연락처</TableHead>
                      <TableHead className="font-bold text-[#1A1A1A]">처리 상태</TableHead>
                      <TableHead className="font-bold text-[#1A1A1A] text-right">관리</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">로딩 중...</TableCell>
                      </TableRow>
                    ) : reservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">예약 내역이 없습니다.</TableCell>
                      </TableRow>
                    ) : (
                      reservations.map((res) => (
                        <TableRow key={res.id} className="hover:bg-[#FDFCFB]">
                          <TableCell>{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="font-bold">{res.userName}</TableCell>
                          <TableCell>{res.spaceType}</TableCell>
                          <TableCell>{res.area}{res.areaUnit || '평'}</TableCell>
                          <TableCell>{res.userPhone}</TableCell>
                          <TableCell>
                            <Select 
                              defaultValue={res.status} 
                              onValueChange={(val) => handleStatusChange(res.id, val as ReservationStatus)}
                            >
                              <SelectTrigger className="w-[140px] h-9 rounded-none border-[#E5E1DA] text-xs font-bold uppercase tracking-wider">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {statusOptions.map(opt => (
                                  <SelectItem key={opt} value={opt} className="text-xs font-bold uppercase tracking-wider">
                                    {opt}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-right flex justify-end gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="rounded-none text-xs font-bold uppercase tracking-widest">
                                  View
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="rounded-none border-[#E5E1DA] max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle className="text-2xl font-bold tracking-tight">예약 상세 정보</DialogTitle>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-6 py-6 border-y border-[#E5E1DA] my-6">
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">고객명</p>
                                    <p className="text-lg font-bold">{res.userName}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">연락처</p>
                                    <p className="text-lg font-bold">{res.userPhone}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">공간 유형</p>
                                    <p className="text-lg font-bold">{res.spaceType}</p>
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">시공 면적</p>
                                    <p className="text-lg font-bold">{res.area}{res.areaUnit || '평'}</p>
                                  </div>
                                </div>
                                <div className="space-y-4">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">고객 요청 사항</p>
                                  <p className="text-[#4A4A4A] bg-[#FDFCFB] p-4 border border-[#E5E1DA] leading-relaxed">
                                    {res.additionalRequests || '없음'}
                                  </p>
                                </div>
                                <div className="space-y-4 mt-6">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">관리자 노트</p>
                                  <AdminNoteForm 
                                    initialNote={res.adminNotes} 
                                    onSave={(note) => handleNoteUpdate(res.id, note)} 
                                  />
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDelete(res.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-none text-xs font-bold uppercase tracking-widest"
                            >
                              Delete
                            </Button>
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

function AdminNoteForm({ initialNote, onSave }: { initialNote: string, onSave: (note: string) => void }) {
  const [note, setNote] = React.useState(initialNote);
  return (
    <div className="space-y-4">
      <Textarea 
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="관리자용 메모를 남겨주세요." 
        className="rounded-none border-[#E5E1DA] min-h-[100px]"
      />
      <div className="flex justify-end">
        <Button 
          onClick={() => onSave(note)}
          className="bg-[#1A1A1A] hover:bg-[#8B7E74] text-white px-8 rounded-none font-bold uppercase tracking-widest"
        >
          저장하기
        </Button>
      </div>
    </div>
  );
}
