import React from 'react';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ReservationStatus } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button, buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { db, handleFirestoreError, OperationType, storage } from '@/lib/firebase';
import { collection, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, getDocs, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { convertUrlToWebP } from '@/lib/imageUtils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusOptions: ReservationStatus[] = ['Pending', 'Consulting', 'Preparing', 'In Progress', 'Completed'];

export default function Admin() {
  const { isAdmin } = useAuth();
  const [reservations, setReservations] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterStatus, setFilterStatus] = React.useState<ReservationStatus | 'All'>('All');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');

  React.useEffect(() => {
    if (!isAdmin) return;

    const q = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
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
  }, [isAdmin]);

  const handleStatusChange = async (id: string, newStatus: ReservationStatus) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { 
        status: newStatus,
        statusHistory: arrayUnion({
          status: newStatus,
          updatedAt: new Date() // Use client date for simplicity in UI if needed, or serverTimestamp but then we'd need to fetch again
        })
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reservations/${id}`);
    }
  };

  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  const handleDelete = async (id: string) => {
    console.log('Attempting to delete reservation:', id);
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'reservations', id));
      console.log('Deletion successful');
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Delete Error:', error);
      handleFirestoreError(error, OperationType.DELETE, `reservations/${id}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleNoteUpdate = async (id: string, notes: string) => {
    try {
      await updateDoc(doc(db, 'reservations', id), { adminNotes: notes });
      window.alert('메모가 저장되었습니다.');
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
    preparing: reservations.filter(r => r.status === 'Preparing').length,
    inProgress: reservations.filter(r => r.status === 'In Progress').length,
    completedMonth: reservations.filter(r => {
      if (!r.createdAt?.toDate) return false;
      const date = r.createdAt.toDate();
      const now = new Date();
      return r.status === 'Completed' && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length,
  };

  const filteredReservations = reservations.filter(res => {
    const statusMatch = filterStatus === 'All' || res.status === filterStatus;
    
    let dateMatch = true;
    if (res.createdAt?.toDate) {
      const resDate = res.createdAt.toDate();
      resDate.setHours(0, 0, 0, 0);

      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (resDate < fromDate) dateMatch = false;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (resDate > toDate) dateMatch = false;
      }
    } else {
      // If no createdAt, filter it out if date range is set
      if (dateFrom || dateTo) dateMatch = false;
    }

    return statusMatch && dateMatch;
  });

  return (
    <div className="py-20 bg-[#FDFCFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col md:flex-row md:items-start md:justify-between gap-6 bg-white p-6 border border-[#E5E1DA]">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-[#1A1A1A] mb-2">Admin Dashboard</h1>
            <p className="text-[#666666]">고객 예약 현황 및 시공 상태를 관리하세요.</p>
          </div>
          <ImageOptimizationTool />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-white p-6 border border-[#E5E1DA]">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B7E74]">처리 상태 필터</label>
            <Select value={filterStatus} onValueChange={(val) => setFilterStatus(val as any)}>
              <SelectTrigger className="rounded-none border-[#E5E1DA] h-10">
                <SelectValue placeholder="모든 상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">전체 보기</SelectItem>
                {statusOptions.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B7E74]">조회 시작일</label>
            <input 
              type="date" 
              value={dateFrom} 
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full h-10 border border-[#E5E1DA] px-3 text-sm focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[#8B7E74]">조회 종료일</label>
            <input 
              type="date" 
              value={dateTo} 
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full h-10 border border-[#E5E1DA] px-3 text-sm focus:outline-none focus:border-[#1A1A1A]"
            />
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              className="w-full h-10 rounded-none border-[#E5E1DA] text-[10px] font-bold uppercase tracking-widest"
              onClick={() => {
                setFilterStatus('All');
                setDateFrom('');
                setDateTo('');
              }}
            >
              필터 초기화
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6 lg:gap-8 mb-12">
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
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-[#8B7E74]">공사 준비 중</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{stats.preparing}건</p>
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
                      <TableHead className="font-bold text-[#1A1A1A]">예약번호</TableHead>
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
                        <TableCell colSpan={8} className="text-center py-10">로딩 중...</TableCell>
                      </TableRow>
                    ) : filteredReservations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-10">검색 결과가 없습니다.</TableCell>
                      </TableRow>
                    ) : (
                      filteredReservations.map((res) => (
                        <TableRow key={res.id} className="hover:bg-[#FDFCFB]">
                          <TableCell>{res.createdAt?.toDate ? res.createdAt.toDate().toLocaleDateString() : '-'}</TableCell>
                          <TableCell className="font-mono text-xs text-[#8B7E74]">{res.id}</TableCell>
                          <TableCell className="font-bold">{res.userName}</TableCell>
                          <TableCell>{res.spaceType}</TableCell>
                          <TableCell>{res.area}{res.areaUnit || '평'}</TableCell>
                          <TableCell>{res.userPhone}</TableCell>
                          <TableCell>
                            <Select 
                              value={res.status} 
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
                              <DialogTrigger render={
                                <Button variant="outline" size="sm" className="rounded-none text-xs font-bold uppercase tracking-widest">
                                  View
                                </Button>
                              } nativeButton={true} />
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
                                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">상태 변경 이력</p>
                                  <div className="bg-[#FDFCFB] border border-[#E5E1DA] p-4 space-y-3 max-h-[150px] overflow-y-auto">
                                    {res.statusHistory && res.statusHistory.length > 0 ? (
                                      res.statusHistory.map((history: any, idx: number) => (
                                        <div key={idx} className="flex justify-between items-center text-xs pb-2 border-b border-[#E5E1DA] last:border-0 last:pb-0">
                                          <Badge variant="outline" className="rounded-none font-bold text-[10px] px-2 py-0 h-5">
                                            {history.status}
                                          </Badge>
                                          <span className="text-[#8B7E74]">
                                            {history.updatedAt?.toDate ? history.updatedAt.toDate().toLocaleString() : new Date(history.updatedAt).toLocaleString()}
                                          </span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-xs text-[#8B7E74] text-center py-2">이력이 없습니다.</p>
                                    )}
                                  </div>
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

                            <Dialog open={showDeleteConfirm === res.id} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                              <DialogTrigger render={
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  disabled={deletingId === res.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDeleteConfirm(res.id);
                                  }}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-none text-xs font-bold uppercase tracking-widest"
                                >
                                  {deletingId === res.id ? '...' : 'Delete'}
                                </Button>
                              } nativeButton={true} />
                              <DialogContent className="rounded-none border-[#E5E1DA] max-w-sm">
                                <DialogHeader>
                                  <DialogTitle className="text-xl font-bold tracking-tight">예약 데이터 삭제</DialogTitle>
                                </DialogHeader>
                                <div className="py-4">
                                  <p className="text-sm text-[#666666]">정말로 이 예약 내역을 삭제하시겠습니까?<br/>삭제된 데이터는 복구할 수 없습니다.</p>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button variant="outline" className="rounded-none" onClick={() => setShowDeleteConfirm(null)}>취소</Button>
                                  <Button 
                                    variant="destructive" 
                                    className="rounded-none font-bold"
                                    onClick={() => handleDelete(res.id)}
                                    disabled={deletingId === res.id}
                                  >
                                    {deletingId === res.id ? '삭제 중...' : '데이터 삭제'}
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
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

function ImageOptimizationTool() {
  const [isOptimizing, setIsOptimizing] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const [status, setStatus] = React.useState<string>('');
  const [stats, setStats] = React.useState({ total: 0, optimized: 0, failed: 0 });

  const optimizeImages = async (e: React.MouseEvent) => {
    console.log('Optimize button clicked. Starting process...');
    e.preventDefault();
    e.stopPropagation();

    const confirmed = window.confirm(
      '모든 포트폴리오 이미지를 최적화하시겠습니까?\n' +
      '이 작업은 다량의 이미지를 WebP로 변환하고 서버에 업로드하므로 시간이 걸릴 수 있으며 트래픽이 발생합니다.'
    );
    
    if (!confirmed) return;

    setIsOptimizing(true);
    setProgress(0);
    setStats({ total: 0, optimized: 0, failed: 0 });
    setStatus('포트폴리오 데이터를 불러오는 중...');

    try {
      console.log('Fetching portfolio collection...');
      const snapshot = await getDocs(collection(db, 'portfolio'));
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const totalItems = items.length;
      console.log(`Found ${totalItems} items in portfolio.`);
      
      if (totalItems === 0) {
        setStatus('최적화할 항목이 없습니다.');
        setTimeout(() => setIsOptimizing(false), 2000);
        return;
      }

      let optimizedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < items.length; i++) {
        const item: any = items[i];
        const updates: any = {};
        let needsUpdate = false;

        setStatus(`${item.title} 처리 중...`);
        console.log(`Processing item ${i + 1}: ${item.title}`);

        const processImageUrl = async (url: string, prefix: string) => {
          if (!url) return null;
          
          // Case 1: Unsplash - Just update parameters (Zero cost, No CORS issue)
          if (url.includes('unsplash.com')) {
            console.log(`Optimizing Unsplash URL: ${url}`);
            const baseUrl = url.split('?')[0];
            const params = new URLSearchParams(url.split('?')[1]);
            params.set('auto', 'format');
            params.set('fm', 'webp');
            params.set('q', '80');
            if (!params.has('w')) params.set('w', '1600');
            optimizedCount++;
            return `${baseUrl}?${params.toString()}`;
          }

          // Case 2: Already WebP
          if (url.toLowerCase().includes('.webp')) {
            console.log(`Skipping: Already WebP (${url})`);
            return null;
          }

          // Case 3: Need conversion (Storage) - Use Proxy to bypass CORS
          try {
            console.log(`Converting to WebP via proxy: ${url}`);
            const blob = await convertUrlToWebP(url, 1600, 0.82);
            const fileName = `opt_${Date.now()}_${prefix}.webp`;
            const storageRef = ref(storage, `portfolio/${item.id}/${fileName}`);
            
            await uploadBytes(storageRef, blob, { 
              contentType: 'image/webp',
              cacheControl: 'public,max-age=31536000'
            });
            const newUrl = await getDownloadURL(storageRef);
            optimizedCount++;
            return newUrl;
          } catch (e) {
            console.error(`Optimization failed for ${url}:`, e);
            failedCount++;
            return null;
          }
        };

        // Process afterImage
        if (item.afterImage) {
          const newAfter = await processImageUrl(item.afterImage, 'after');
          if (newAfter) {
            updates.afterImage = newAfter;
            needsUpdate = true;
          }
        }

        // Process beforeImage
        if (item.beforeImage) {
          const newBefore = await processImageUrl(item.beforeImage, 'before');
          if (newBefore) {
            updates.beforeImage = newBefore;
            needsUpdate = true;
          }
        }

        // Process images array
        if (Array.isArray(item.images)) {
          const newImages = [...item.images];
          let imagesChanged = false;
          for (let j = 0; j < newImages.length; j++) {
            const newUrl = await processImageUrl(newImages[j], `gallery_${j}`);
            if (newUrl) {
              newImages[j] = newUrl;
              imagesChanged = true;
              needsUpdate = true;
            }
          }
          if (imagesChanged) updates.images = newImages;
        }

        if (needsUpdate) {
          console.log(`Updating document ${item.id} with optimized URLs`);
          await updateDoc(doc(db, 'portfolio', item.id), updates);
        }

        setProgress(Math.round(((i + 1) / totalItems) * 100));
        setStats({ total: totalItems, optimized: optimizedCount, failed: failedCount });
      }

      setStatus('모든 작업이 완료되었습니다.');
      setStats(prev => ({ ...prev, optimized: optimizedCount, failed: failedCount }));
      
      setTimeout(() => {
        setIsOptimizing(false);
        setStatus('');
      }, 5000);
    } catch (error) {
      console.error('Optimization error:', error);
      setStatus('오류가 발생했습니다.');
      setTimeout(() => setIsOptimizing(false), 3000);
    }
  };

  return (
    <div className="flex flex-col items-end gap-3 min-w-[280px]">
      {isOptimizing ? (
        <div className="w-full space-y-3 bg-[#FDFCFB] p-4 border border-[#E5E1DA] shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A]">이미지 최적화 진행 중</span>
            <span className="text-xs font-mono font-bold text-[#8B7E74]">{progress}%</span>
          </div>
          <Progress value={progress} className="h-1.5 rounded-none" />
          <div className="flex flex-col gap-1">
            <p className="text-[10px] text-[#666666] truncate max-w-full">
              {status}
            </p>
            <div className="flex gap-3 text-[9px] font-bold uppercase tracking-tighter text-[#8B7E74]">
              <span>성공: {stats.optimized}</span>
              <span>실패: {stats.failed}</span>
              <span>전체: {stats.total}</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-end gap-2">
          <Tooltip>
            <TooltipTrigger render={
              <Button 
                onClick={optimizeImages} 
                variant="outline" 
                size="sm"
                className="h-10 px-6 rounded-none border-[#E5E1DA] text-[10px] font-bold uppercase tracking-[0.2em] transition-all hover:bg-[#1A1A1A] hover:text-white group flex items-center gap-3 shadow-sm bg-white"
              />
            } nativeButton={true}>
              <RefreshCcw className="w-3.5 h-3.5 group-hover:animate-spin" />
              Optimize Images
            </TooltipTrigger>
            <TooltipContent className="rounded-none text-[10px] border-[#E5E1DA] bg-white text-[#1A1A1A]">
              기존 이미지들을 WebP 형식으로 일괄 변환하여 성능을 최적화합니다.
            </TooltipContent>
          </Tooltip>
          <p className="text-[9px] text-[#8B7E74] font-medium italic">포트폴리오 이미지를 최신 파일로 갱신</p>
        </div>
      )}
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
