import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SpaceType } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { db, storage, handleFirestoreError, OperationType } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Camera, Loader2, X, Plus } from 'lucide-react';

const initialPortfolioData = [
  {
    id: '1',
    title: '한남동 더 힐 펜트하우스',
    category: 'Residential' as SpaceType,
    description: '모던하고 럭셔리한 분위기를 강조한 주거 공간 시공 사례입니다.',
    beforeImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1000&auto=format&fit=crop',
    tags: ['Modern', 'High-end', 'Minimal']
  },
  {
    id: '2',
    title: '성수동 IT 밸리 오피스',
    category: 'Office' as SpaceType,
    description: '창의적인 업무를 위한 개방형 오피스 디자인입니다.',
    beforeImage: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?q=80&w=1000&auto=format&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop',
    tags: ['Industrial', 'Modern', 'Open Space']
  },
  {
    id: '3',
    title: '청담동 부티크 쇼룸',
    category: 'Commercial' as SpaceType,
    description: '브랜드 아이덴티티를 극대화한 상업 공간 인테리어입니다.',
    beforeImage: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000&auto=format&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1000&auto=format&fit=crop',
    tags: ['High-end', 'Minimal', 'Lighting']
  },
  {
    id: '4',
    title: '성북동 단독주택 리모델링',
    category: 'Residential' as SpaceType,
    description: '우드와 내추럴 톤을 활용한 따뜻한 감성의 주거 공간입니다.',
    beforeImage: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000&auto=format&fit=crop',
    afterImage: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=2000&auto=format&fit=crop',
    tags: ['Wood & Natural', 'Minimal', 'Cozy']
  }
];

export default function Portfolio() {
  const { isAdmin } = useAuth();
  const [portfolioData, setPortfolioData] = React.useState<any[]>([]);
  const [filter, setFilter] = React.useState<SpaceType | 'All'>('All');
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const q = query(collection(db, 'portfolio'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPortfolioData(data);
      setLoading(false);
    }, (error) => {
      console.error('Portfolio fetch error:', error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredData = filter === 'All' 
    ? portfolioData 
    : portfolioData.filter(item => item.category === filter);

  const handleSave = async (item: any) => {
    try {
      const { id, ...data } = item;
      
      // Clean up undefined values which Firestore doesn't like
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined)
      );

      if (id) {
        await updateDoc(doc(db, 'portfolio', id), cleanData);
      } else {
        await addDoc(collection(db, 'portfolio'), { 
          ...cleanData, 
          createdAt: serverTimestamp() 
        });
      }
      alert('저장되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'portfolio');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'portfolio', id));
      alert('삭제되었습니다.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `portfolio/${id}`);
    }
  };

  return (
    <div className="py-20 bg-[#FDFCFB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1A1A1A] mb-6">Portfolio</h1>
          <p className="text-[#666666] max-w-2xl mx-auto">
            LJInterior만의 감각으로 탄생한 다양한 공간들을 확인해보세요.
            단순한 인테리어를 넘어 삶의 가치를 담아냅니다.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-16">
          {['All', 'Residential', 'Commercial', 'Office', 'Other'].map((cat) => (
            <Button
              key={cat}
              variant={filter === cat ? 'default' : 'outline'}
              onClick={() => setFilter(cat as any)}
              className={`rounded-none px-8 py-6 text-sm font-bold tracking-widest uppercase transition-all ${
                filter === cat 
                  ? 'bg-[#8B7E74] text-white' 
                  : 'border-[#E5E1DA] text-[#4A4A4A] hover:border-[#8B7E74] hover:text-[#8B7E74]'
              }`}
            >
              {cat}
            </Button>
          ))}
          {isAdmin && (
            <PortfolioDialog onSave={handleSave}>
              <Button className="rounded-none px-8 py-6 bg-[#1A1A1A] text-white font-bold uppercase tracking-widest">
                Add New
              </Button>
            </PortfolioDialog>
          )}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="col-span-full text-center py-20 text-[#666666]">로딩 중...</div>
            ) : filteredData.length === 0 ? (
              <div className="col-span-full text-center py-20 text-[#666666]">등록된 포트폴리오가 없습니다.</div>
            ) : (
              filteredData.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="group flex flex-col space-y-6 relative cursor-pointer"
                  onMouseEnter={() => setHoveredId(item.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {isAdmin && (
                    <div className="absolute top-4 left-4 z-30 flex gap-2">
                      <PortfolioDialog item={item} onSave={handleSave}>
                        <Button size="sm" className="bg-white/80 backdrop-blur text-black hover:bg-white rounded-none h-8 text-[10px] font-bold uppercase">Edit</Button>
                      </PortfolioDialog>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        className="rounded-none h-8 text-[10px] font-bold uppercase"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                  <PortfolioDetail item={item}>
                    <div className="space-y-6">
                      <div className="relative aspect-[4/3] overflow-hidden bg-[#E5E1DA]">
                        {/* Before/After Overlay */}
                        <img
                          src={item.afterImage}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                        
                        {/* Before Image on Hover */}
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: hoveredId === item.id ? 1 : 0 }}
                          className="absolute inset-0 z-10"
                        >
                          <img
                            src={item.beforeImage}
                            alt="Before"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-4 left-4 bg-black/60 text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                            Before
                          </div>
                        </motion.div>

                        <div className="absolute top-4 right-4 z-20 bg-[#8B7E74] text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1">
                          {item.category}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {item.tags?.map(tag => (
                            <span key={tag} className="text-[10px] font-bold text-[#8B7E74] uppercase tracking-wider">#{tag}</span>
                          ))}
                        </div>
                        <h3 className="text-2xl font-bold text-[#1A1A1A]">{item.title}</h3>
                        <p className="text-[#666666] leading-relaxed line-clamp-2">{item.description}</p>
                      </div>
                    </div>
                  </PortfolioDetail>
                </motion.div>
            )))
          }
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function PortfolioDialog({ item, onSave, children }: { item?: any, onSave: (item: any) => void, children: React.ReactNode }) {
  const [formData, setFormData] = React.useState({
    title: item?.title || '',
    category: item?.category || 'Residential',
    description: item?.description || '',
    beforeImage: item?.beforeImage || '',
    afterImage: item?.afterImage || '',
    images: item?.images || [] as string[],
    tags: item?.tags || [] as string[],
    id: item?.id
  });
  const [tagInput, setTagInput] = React.useState(item?.tags?.join(', ') || '');
  const [uploadingBefore, setUploadingBefore] = React.useState(false);
  const [uploadingAfter, setUploadingAfter] = React.useState(false);
  const [uploadingGallery, setUploadingGallery] = React.useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'before' | 'after' | 'gallery') => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log(`Starting upload for ${type}:`, file.name);

    if (type === 'before') setUploadingBefore(true);
    else if (type === 'after') setUploadingAfter(true);
    else setUploadingGallery(true);

    try {
      const storageRef = ref(storage, `portfolio/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      console.log('Upload successful:', uploadResult.metadata.fullPath);
      
      const url = await getDownloadURL(storageRef);
      console.log('Download URL obtained:', url);
      
      if (type === 'gallery') {
        setFormData(prev => ({
          ...prev,
          images: [...(prev.images || []), url]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          [type === 'before' ? 'beforeImage' : 'afterImage']: url
        }));
      }
    } catch (error: any) {
      console.error('Upload error details:', error);
      let message = '이미지 업로드에 실패했습니다.';
      if (error.code === 'storage/unauthorized') {
        message += '\nFirebase Storage 보안 규칙에 의해 거부되었습니다. 콘솔에서 규칙을 확인해주세요.';
      } else if (error.code === 'storage/canceled') {
        message += '\n업로드가 취소되었습니다.';
      }
      alert(message);
    } finally {
      if (type === 'before') setUploadingBefore(false);
      else if (type === 'after') setUploadingAfter(false);
      else setUploadingGallery(false);
    }
  };

  const removeGalleryImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    const tags = tagInput.split(',').map(t => t.trim()).filter(t => t !== '');
    onSave({ ...formData, tags });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="rounded-none border-[#E5E1DA] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold tracking-tight">포트폴리오 {item ? '수정' : '추가'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-6 border-y border-[#E5E1DA] my-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">제목</label>
            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="rounded-none border-[#E5E1DA]" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">카테고리</label>
              <Select value={formData.category} onValueChange={val => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="rounded-none border-[#E5E1DA]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                  <SelectItem value="Office">Office</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">태그 (쉼표로 구분)</label>
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} className="rounded-none border-[#E5E1DA]" placeholder="Modern, Minimal" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">설명</label>
            <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="rounded-none border-[#E5E1DA]" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Before Image */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">Before 이미지</label>
              <div className="relative aspect-video bg-[#FDFCFB] border border-dashed border-[#E5E1DA] flex items-center justify-center overflow-hidden group">
                {formData.beforeImage ? (
                  <>
                    <img src={formData.beforeImage} alt="Before" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-2 bg-white text-black rounded-full">
                        <Camera className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-[#8B7E74] hover:text-[#1A1A1A] transition-colors">
                    {uploadingBefore ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload Before</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'before')} />
                  </label>
                )}
              </div>
              <Input 
                placeholder="또는 이미지 URL 입력" 
                value={formData.beforeImage} 
                onChange={e => setFormData({ ...formData, beforeImage: e.target.value })} 
                className="rounded-none border-[#E5E1DA] text-xs" 
              />
            </div>

            {/* After Image */}
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">After 이미지</label>
              <div className="relative aspect-video bg-[#FDFCFB] border border-dashed border-[#E5E1DA] flex items-center justify-center overflow-hidden group">
                {formData.afterImage ? (
                  <>
                    <img src={formData.afterImage} alt="After" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-2 bg-white text-black rounded-full">
                        <Camera className="w-5 h-5" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} />
                      </label>
                    </div>
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 text-[#8B7E74] hover:text-[#1A1A1A] transition-colors">
                    {uploadingAfter ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest">Upload After</span>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'after')} />
                  </label>
                )}
              </div>
              <Input 
                placeholder="또는 이미지 URL 입력" 
                value={formData.afterImage} 
                onChange={e => setFormData({ ...formData, afterImage: e.target.value })} 
                className="rounded-none border-[#E5E1DA] text-xs" 
              />
            </div>
          </div>

          {/* Gallery Images */}
          <div className="space-y-4">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74]">상세 갤러리 이미지</label>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
              {formData.images?.map((url: string, index: number) => (
                <div key={index} className="relative aspect-square bg-[#FDFCFB] border border-[#E5E1DA] group overflow-hidden">
                  <img src={url} alt={`Gallery ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  <button 
                    onClick={() => removeGalleryImage(index)}
                    className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="cursor-pointer aspect-square bg-[#FDFCFB] border border-dashed border-[#E5E1DA] flex flex-col items-center justify-center text-[#8B7E74] hover:text-[#1A1A1A] transition-colors">
                {uploadingGallery ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                <span className="text-[8px] font-bold uppercase tracking-widest mt-1">Add Image</span>
                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'gallery')} />
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={uploadingBefore || uploadingAfter || uploadingGallery}
            className="bg-[#1A1A1A] hover:bg-[#8B7E74] text-white px-8 rounded-none font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {uploadingBefore || uploadingAfter || uploadingGallery ? '업로드 중...' : '저장하기'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PortfolioDetail({ item, children }: { item: any, children: React.ReactNode }) {
  const [activeImage, setActiveImage] = React.useState(item.afterImage);
  
  // Sync activeImage when item changes or dialog opens
  React.useEffect(() => {
    if (item.afterImage) {
      setActiveImage(item.afterImage);
    } else if (item.images && item.images.length > 0) {
      setActiveImage(item.images[0]);
    }
  }, [item.id, item.afterImage, item.images]);

  // Combine all images into a single gallery array
  const gallery = React.useMemo(() => {
    const images = [];
    if (item.afterImage) images.push(item.afterImage);
    if (item.beforeImage) images.push(item.beforeImage);
    if (item.images && Array.isArray(item.images)) {
      images.push(...item.images);
    }
    return images.filter(url => !!url);
  }, [item.afterImage, item.beforeImage, item.images]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="rounded-none border-[#E5E1DA] max-w-[95vw] w-full md:max-w-7xl max-h-[95vh] overflow-y-auto p-0">
        <div className="flex flex-col lg:flex-row h-full min-h-[80vh]">
          {/* Image Section - Larger space */}
          <div className="w-full lg:w-[70%] bg-[#121212] flex items-center justify-center relative min-h-[500px]">
            {activeImage ? (
              <img 
                src={activeImage} 
                alt={item.title} 
                className="w-full h-full object-contain transition-all duration-500"
                referrerPolicy="no-referrer"
                key={activeImage}
              />
            ) : (
              <div className="text-[#4A4A4A] text-[10px] font-bold uppercase tracking-widest">No Image Available</div>
            )}
            
            {/* Before Label if active image is beforeImage */}
            {activeImage === item.beforeImage && (
              <div className="absolute top-8 left-8 bg-black/80 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-2 backdrop-blur-sm">
                Before View
              </div>
            )}
          </div>

          {/* Info Section - More compact side */}
          <div className="w-full lg:w-[30%] p-8 md:p-12 bg-white flex flex-col border-l border-[#E5E1DA]">
            <div className="mb-12">
              <span className="text-[10px] font-bold text-[#8B7E74] uppercase tracking-[0.2em]">{item.category}</span>
              <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mt-4 mb-6 leading-tight">{item.title}</h2>
              <div className="h-px w-12 bg-[#8B7E74] mb-8" />
              <p className="text-[#666666] leading-relaxed whitespace-pre-wrap text-sm">{item.description || ''}</p>
            </div>

            <div className="mt-auto pt-12">
              {gallery.length > 0 && (
                <>
                  <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B7E74] block mb-6">Project Gallery</label>
                  <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-3">
                    {gallery.map((url, index) => (
                      <button 
                        key={index} 
                        onClick={() => setActiveImage(url)}
                        className={`aspect-square border-2 transition-all overflow-hidden bg-[#FDFCFB] relative group ${activeImage === url ? 'border-[#8B7E74]' : 'border-transparent opacity-40 hover:opacity-100'}`}
                      >
                        <img src={url} alt={`Thumb ${index}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        {url === item.beforeImage && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[8px] text-white font-bold uppercase">Before</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <div className="flex flex-wrap gap-2 mt-12">
                {item.tags?.map((tag: string) => (
                  <span key={tag} className="text-[10px] font-bold text-[#8B7E74] bg-[#FDFCFB] border border-[#E5E1DA] px-3 py-1 uppercase tracking-wider">#{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
