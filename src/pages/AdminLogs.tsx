import { useState, useEffect, useMemo } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db, addBlockedIp, getBlockedIps } from '../lib/firebase';

interface AccessLog {
  id: string;
  timestamp: any;
  url: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
  visitorId?: string;
  isNaverAd?: boolean;
  naverKeyword?: string;
  naverAdId?: string;
  hasNaPm?: boolean;
}

interface NaverFraudSuspect {
  ip: string;
  clickCount: number;
  firstSeen: Date;
  lastSeen: Date;
  keywords: string[];
  visitorIds: string[];
  riskLevel: 'HIGH' | 'MEDIUM';
  intervalMinutes: number;
}

// Helper to determine if a log originated from a Naver Ad
export const isNaverAdLog = (log: AccessLog): boolean => {
  if (log.isNaverAd) return true;
  const url = (log.url || '').toLowerCase();
  const ref = (log.referrer || '').toLowerCase();
  return (
    url.includes('napm=') ||
    url.includes('n_keyword=') ||
    url.includes('n_ad=') ||
    url.includes('n_query=') ||
    url.includes('n_media=') ||
    url.includes('utm_source=naver') ||
    ref.includes('ad.search.naver.com')
  );
};

// Helper to extract the searched keyword from Naver ad parameters
export const extractNaverKeyword = (log: AccessLog): string => {
  if (log.naverKeyword) return log.naverKeyword;
  try {
    const fullUrl = new URL(log.url, window.location.origin);
    const kw = fullUrl.searchParams.get('n_keyword') || fullUrl.searchParams.get('n_query');
    if (kw) return decodeURIComponent(kw);
  } catch {
    // regex fallback
    const match = log.url.match(/[?&](?:n_keyword|n_query)=([^&]+)/);
    if (match) {
      try {
        return decodeURIComponent(match[1]);
      } catch {
        return match[1];
      }
    }
  }
  return '';
};

export const AdminLogs = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousUserAgents, setSuspiciousUserAgents] = useState<Record<string, number>>({});
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showNaverGuide, setShowNaverGuide] = useState(false);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const blockIp = async (ip: string) => {
    if (!ip || ip === 'Unknown' || blockedList.includes(ip)) return;
    try {
      await addBlockedIp(ip);
      setBlockedList(prev => [...prev, ip]);
      showNotification(`IP [${ip}]이(가) 차단 목록에 등록되었습니다.`, 'success');
    } catch (e) {
      console.error("Error blocking IP:", e);
      showNotification(`IP 차단 중 오류가 발생했습니다.`, 'error');
    }
  };

  const fetchLogs = async (start?: string, end?: string) => {
    try {
      let q = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'));
      
      if (start && end) {
        const startDateObj = new Date(start);
        const endDateObj = new Date(end);
        q = query(q, where('timestamp', '>=', startDateObj), where('timestamp', '<=', endDateObj));
      } else {
        q = query(q, limit(500));
      }

      const [querySnapshot, blocked] = await Promise.all([
        getDocs(q),
        getBlockedIps().catch(() => [] as string[])
      ]);
      const logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccessLog[];
      setLogs(logsData);
      setBlockedList(blocked);

      // Frequency analysis for user agents
      const counts: Record<string, number> = {};
      logsData.forEach(log => {
        if (log.userAgent) {
          counts[log.userAgent] = (counts[log.userAgent] || 0) + 1;
        }
      });
      
      const suspicious = Object.fromEntries(
        Object.entries(counts).filter(([_, count]) => count > 5)
      );
      setSuspiciousUserAgents(suspicious);

    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(dateFilter === 'range' ? startDate : undefined, dateFilter === 'range' ? endDate : undefined);
  }, [dateFilter, startDate, endDate]);

  // Convert timestamp safely
  const getLogDate = (log: AccessLog): Date => {
    if (log.timestamp?.toDate) return log.timestamp.toDate();
    if (log.timestamp instanceof Date) return log.timestamp;
    return new Date(log.timestamp || 0);
  };

  // Naver Ad Fraud analysis by IP
  const { naverAdLogs, fraudSuspects, suspiciousIpSet } = useMemo(() => {
    const naverLogs = logs.filter(isNaverAdLog);
    const ipMap: Record<string, AccessLog[]> = {};

    naverLogs.forEach(log => {
      const ip = log.ip || 'Unknown';
      if (ip !== 'Unknown') {
        if (!ipMap[ip]) ipMap[ip] = [];
        ipMap[ip].push(log);
      }
    });

    const suspects: NaverFraudSuspect[] = [];
    const susIps = new Set<string>();

    Object.entries(ipMap).forEach(([ip, ipLogs]) => {
      if (ipLogs.length >= 2) {
        susIps.add(ip);
        // Sort ascending by time
        const sorted = [...ipLogs].sort((a, b) => getLogDate(a).getTime() - getLogDate(b).getTime());
        const first = getLogDate(sorted[0]);
        const last = getLogDate(sorted[sorted.length - 1]);
        const diffMinutes = Math.round((last.getTime() - first.getTime()) / (1000 * 60));

        const keywords = Array.from(new Set(ipLogs.map(extractNaverKeyword).filter(Boolean)));
        const visitorIds = Array.from(new Set(ipLogs.map(l => l.visitorId).filter(Boolean) as string[]));

        // High risk if >= 3 clicks or within short interval (< 10 min)
        const isHigh = ipLogs.length >= 3 || (ipLogs.length >= 2 && diffMinutes <= 10);

        suspects.push({
          ip,
          clickCount: ipLogs.length,
          firstSeen: first,
          lastSeen: last,
          keywords,
          visitorIds,
          riskLevel: isHigh ? 'HIGH' : 'MEDIUM',
          intervalMinutes: diffMinutes
        });
      }
    });

    // Sort suspects by click count desc
    suspects.sort((a, b) => b.clickCount - a.clickCount);

    return {
      naverAdLogs: naverLogs,
      fraudSuspects: suspects,
      suspiciousIpSet: susIps
    };
  }, [logs]);

  // Copy IP list formatted for Naver Ad system (line by line)
  const copyIpsForNaverAd = () => {
    if (fraudSuspects.length === 0) {
      showNotification('복사할 부정클릭 의심 IP가 없습니다.', 'info');
      return;
    }
    const ipText = fraudSuspects.map(s => s.ip).join('\n');
    navigator.clipboard.writeText(ipText).then(() => {
      showNotification(`의심 IP ${fraudSuspects.length}개가 클립보드에 복사되었습니다! 네이버 광고 [IP 노출제한]에 바로 붙여넣으세요.`, 'success');
    }).catch(() => {
      showNotification('클립보드 복사에 실패했습니다.', 'error');
    });
  };

  // Block all suspicious IPs at once
  const blockAllSuspiciousIps = async () => {
    const unblocked = fraudSuspects.filter(s => !blockedList.includes(s.ip));
    if (unblocked.length === 0) {
      showNotification('이미 모든 의심 IP가 차단되어 있습니다.', 'info');
      return;
    }
    try {
      for (const s of unblocked) {
        await addBlockedIp(s.ip);
      }
      setBlockedList(prev => [...prev, ...unblocked.map(s => s.ip)]);
      showNotification(`${unblocked.length}개 의심 IP를 웹사이트 차단 목록에 등록했습니다.`, 'success');
    } catch {
      showNotification('일부 IP 차단에 실패했습니다.', 'error');
    }
  };

  // Download Naver fraud appeal CSV
  const downloadNaverAppealReport = () => {
    const targetLogs = logs.filter(l => l.ip && suspiciousIpSet.has(l.ip) && isNaverAdLog(l));
    if (targetLogs.length === 0) {
      showNotification('추출할 네이버 광고 부정클릭 로그가 없습니다.', 'info');
      return;
    }

    const headers = ['접속일시 (Timestamp)', 'IP 주소', '유입 키워드', '전체 URL (쿼리 파라미터 포함)', 'Referrer (유입경로)', '기기식별자 (Visitor ID)', '브라우저 정보 (User-Agent)'];
    const rows = targetLogs.map(l => [
      `"${getLogDate(l).toLocaleString('ko-KR')}"`,
      `"${l.ip || ''}"`,
      `"${extractNaverKeyword(l)}"`,
      `"${l.url || ''}"`,
      `"${l.referrer || ''}"`,
      `"${l.visitorId || ''}"`,
      `"${(l.userAgent || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `naver_ad_fraud_appeal_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('네이버 고객센터 소명용 CSV 파일이 다운로드되었습니다.', 'success');
  };

  if (loading) return <div className="p-8 text-center text-gray-500 font-medium">로그 데이터를 불러오는 중입니다...</div>;

  const filteredLogs = logs.filter(log => {
    const timestamp = getLogDate(log);
    const now = new Date();
    
    // Date Filtering
    let matchesDate = true;
    if (dateFilter === '1h') matchesDate = (now.getTime() - timestamp.getTime()) < 3600000;
    else if (dateFilter === '24h') matchesDate = (now.getTime() - timestamp.getTime()) < 86400000;
    else if (dateFilter === '7d') matchesDate = (now.getTime() - timestamp.getTime()) < 604800000;
    else if (dateFilter === 'range' && startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      const time = timestamp.getTime();
      matchesDate = time >= start && time <= end;
    }
    
    // Type Filtering
    const isSuspiciousUA = Boolean(log.userAgent && suspiciousUserAgents[log.userAgent] > 5);
    const isNaver = isNaverAdLog(log);
    const isNaverSuspicious = Boolean(isNaver && log.ip && suspiciousIpSet.has(log.ip));

    let matchesType = true;
    if (typeFilter === 'normal') matchesType = !isSuspiciousUA && !isNaverSuspicious;
    else if (typeFilter === 'suspicious') matchesType = isSuspiciousUA || isNaverSuspicious;
    else if (typeFilter === 'naver-all') matchesType = isNaver;
    else if (typeFilter === 'naver-fraud') matchesType = isNaverSuspicious;

    return matchesDate && matchesType;
  });

  const downloadLogs = () => {
    const headers = ['Timestamp', 'URL', 'Keyword', 'Referrer', 'User Agent', 'IP', 'Visitor ID', 'Is Naver Ad'];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${getLogDate(log).toLocaleString('ko-KR')}"`,
        `"${log.url || ''}"`,
        `"${extractNaverKeyword(log)}"`,
        `"${log.referrer || ''}"`,
        `"${(log.userAgent || '').replace(/"/g, '""')}"`,
        `"${log.ip || ''}"`,
        `"${log.visitorId || ''}"`,
        `"${isNaverAdLog(log) ? 'YES' : 'NO'}"`
      ].join(','))
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access_logs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4 max-w-7xl">
      {/* Toast Notification */}
      {notification && (
        <div className={`mb-4 p-3 rounded-lg border text-sm flex items-center justify-between shadow-sm ${
          notification.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-300 text-red-800' :
          'bg-blue-50 border-blue-300 text-blue-800'
        }`}>
          <span className="font-medium">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="font-bold ml-2 text-lg leading-none">×</button>
        </div>
      )}

      {/* Naver Ads Click Fraud Monitoring Card */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-200 rounded-xl p-5 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs">N</span>
              <h2 className="text-xl font-bold text-gray-900">네이버 광고 유입 & 부정클릭 모니터링</h2>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              네이버 검색광고(파워링크/쇼핑검색/NaPm) 파라미터를 실시간 분석하여 동일 IP·기기의 중복 클릭 및 예산 소진형 부정클릭을 탐지합니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={copyIpsForNaverAd}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 transition-colors"
              title="네이버 검색광고 시스템 IP 노출제한 관리 화면에 바로 붙여넣을 수 있습니다."
            >
              📋 의심 IP 복사 (네이버 광고용)
            </button>
            <button
              onClick={downloadNaverAppealReport}
              className="bg-white hover:bg-gray-100 text-emerald-800 border border-emerald-300 text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 transition-colors"
              title="네이버 광고 고객센터 무효클릭 환불 신청 시 제출 가능한 CSV 보고서"
            >
              📄 네이버 소명용 CSV 다운로드
            </button>
            <button
              onClick={blockAllSuspiciousIps}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg shadow-sm flex items-center gap-1 transition-colors"
            >
              🛡️ 의심 IP 전체 사이트 차단
            </button>
            <button
              onClick={() => setShowNaverGuide(!showNaverGuide)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              {showNaverGuide ? '가이드 닫기' : 'ℹ️ 네이버 차단/환불 가이드'}
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
            <span className="text-xs text-gray-500 block">네이버 광고 총 클릭</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-emerald-700">{naverAdLogs.length}</span>
              <span className="text-xs text-gray-400">건</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
            <span className="text-xs text-gray-500 block">🚨 부정클릭 의심 클릭수</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold ${fraudSuspects.reduce((acc, s) => acc + s.clickCount, 0) > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {fraudSuspects.reduce((acc, s) => acc + s.clickCount, 0)}
              </span>
              <span className="text-xs text-gray-400">건 (중복 유입)</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
            <span className="text-xs text-gray-500 block">⚠️ 부정클릭 의심 IP</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className={`text-2xl font-bold ${fraudSuspects.length > 0 ? 'text-red-600' : 'text-gray-700'}`}>
                {fraudSuspects.length}
              </span>
              <span className="text-xs text-gray-400">개 IP</span>
            </div>
          </div>
          <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
            <span className="text-xs text-gray-500 block">🛡️ 현재 차단된 총 IP</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-bold text-gray-800">{blockedList.length}</span>
              <span className="text-xs text-gray-400">개 IP</span>
            </div>
          </div>
        </div>

        {/* Collapsible Naver Action Guide */}
        {showNaverGuide && (
          <div className="mt-4 p-4 bg-white/90 rounded-lg border border-emerald-200 text-xs text-gray-700 space-y-2">
            <h4 className="font-bold text-emerald-900 text-sm">💡 네이버 검색광고 부정클릭 실전 대응 3단계</h4>
            <div className="grid md:grid-cols-3 gap-3 pt-1">
              <div className="bg-emerald-50/50 p-3 rounded border border-emerald-100">
                <span className="font-bold text-emerald-800 block mb-1">1단계: 네이버 광고 노출 원천 차단</span>
                <p>상단의 <b>[의심 IP 복사]</b>를 누른 뒤, <code>네이버 검색광고(searchad.naver.com) &gt; 도구 &gt; IP 노출제한 관리</code> 메뉴에 붙여넣고 저장하세요. 해당 사용자는 네이버에서 검색해도 내 광고가 노출되지 않습니다. (최대 600개 가능)</p>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded border border-emerald-100">
                <span className="font-bold text-emerald-800 block mb-1">2단계: 웹사이트 접속 즉시 차단</span>
                <p>우리 사이트에 등록된 <b>[의심 IP 전체 사이트 차단]</b> 또는 개별 <b>[Block IP]</b>를 누르면, 해당 사용자가 광고나 직접 접속으로 들어올 때 즉시 접속 제한 안내창으로 튕겨냅니다.</p>
              </div>
              <div className="bg-emerald-50/50 p-3 rounded border border-emerald-100">
                <span className="font-bold text-emerald-800 block mb-1">3단계: 네이버 고객센터 환불 소명</span>
                <p>네이버는 자체 무효클릭을 자동 환불하지만 걸러지지 않은 악성 클릭은 <b>[네이버 소명용 CSV 다운로드]</b>를 받아 네이버 광고 고객센터 <code>1:1 문의 &gt; 무효클릭 환불/소명 요청</code>에 첨부하면 소명 후 비즈머니로 환불받을 수 있습니다.</p>
              </div>
            </div>
          </div>
        )}

        {/* Fraud Suspects Table */}
        {fraudSuspects.length > 0 && (
          <div className="mt-4 bg-white rounded-lg border border-red-200 overflow-hidden shadow-xs">
            <div className="p-3 bg-red-50/80 border-b border-red-100 flex items-center justify-between">
              <span className="font-bold text-red-800 text-xs flex items-center gap-1.5">
                🚨 부정클릭 의심 IP 목록 ({fraudSuspects.length}건 감지됨)
              </span>
              <span className="text-[11px] text-red-600">
                짧은 시간 내 동일 IP로 네이버 광고를 2회 이상 유입하여 광고비를 소진시키는 의심 패턴입니다.
              </span>
            </div>
            <div className="overflow-x-auto max-h-60 overflow-y-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="bg-gray-50 text-gray-600 border-b">
                  <tr>
                    <th className="py-2 px-3">IP 주소</th>
                    <th className="py-2 px-3">클릭 횟수</th>
                    <th className="py-2 px-3">위험 등급</th>
                    <th className="py-2 px-3">유입 키워드</th>
                    <th className="py-2 px-3">최초 ~ 최근 클릭</th>
                    <th className="py-2 px-3">시간 간격</th>
                    <th className="py-2 px-3">상태 / 조치</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {fraudSuspects.map(sus => {
                    const isBlocked = blockedList.includes(sus.ip);
                    return (
                      <tr key={sus.ip} className="hover:bg-red-50/40">
                        <td className="py-2 px-3 font-mono font-medium text-gray-900">{sus.ip}</td>
                        <td className="py-2 px-3 font-bold text-red-600">{sus.clickCount}회</td>
                        <td className="py-2 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            sus.riskLevel === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {sus.riskLevel === 'HIGH' ? '고위험 (High)' : '주의 (Medium)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-gray-700 max-w-[150px] truncate" title={sus.keywords.join(', ')}>
                          {sus.keywords.length > 0 ? sus.keywords.join(', ') : '(키워드 없음)'}
                        </td>
                        <td className="py-2 px-3 text-gray-500 whitespace-nowrap">
                          {sus.firstSeen.toLocaleTimeString('ko-KR')} ~ {sus.lastSeen.toLocaleTimeString('ko-KR')}
                        </td>
                        <td className="py-2 px-3 text-gray-600 font-medium">
                          {sus.intervalMinutes}분 이내
                        </td>
                        <td className="py-2 px-3">
                          {isBlocked ? (
                            <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px] font-medium border">
                              사이트 차단됨
                            </span>
                          ) : (
                            <button
                              onClick={() => blockIp(sus.ip)}
                              className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-[11px] font-medium transition-colors"
                            >
                              차단하기
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Main Filter & Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">전체 접속 로그 (Access Logs)</h1>
          <p className="text-xs text-gray-500">조회된 최근 {logs.length}개 로그 중 필터링 결과: {filteredLogs.length}건</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border p-2 rounded text-sm bg-white">
            <option value="all">전체 기간</option>
            <option value="1h">최근 1시간</option>
            <option value="24h">최근 24시간</option>
            <option value="7d">최근 7일</option>
            <option value="range">직접 기간 지정</option>
          </select>
          {dateFilter === 'range' && (
            <>
              <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded text-xs bg-white" />
              <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded text-xs bg-white" />
            </>
          )}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border p-2 rounded text-sm bg-white font-medium">
            <option value="all">전체 로그 보기</option>
            <option value="naver-all">🟢 네이버 광고 유입만 보기</option>
            <option value="naver-fraud">🚨 네이버 부정클릭 의심만 보기</option>
            <option value="suspicious">⚠️ 비정상 UA 봇 의심 보기</option>
            <option value="normal">일반 정상 유입만 보기</option>
          </select>
          <button
            onClick={downloadLogs}
            className="bg-gray-800 text-white px-3 py-2 rounded text-sm hover:bg-gray-900 transition-colors shadow-xs"
          >
            CSV 다운로드
          </button>
        </div>
      </div>
      
      {/* Simple Bar Chart */}
      <div className="bg-gray-50 p-4 mb-4 rounded-xl border border-gray-200">
        <h3 className="text-xs font-bold text-gray-700 mb-2">시간대별 트래픽 분포 (최근 24시간)</h3>
        <div className="flex items-end gap-1 h-28">
          {Array.from({ length: 24 }).map((_, i) => {
            const hour = new Date();
            hour.setHours(hour.getHours() - (23 - i));
            const count = logs.filter(l => {
              const t = getLogDate(l);
              return t.getHours() === hour.getHours() && t.getDate() === hour.getDate();
            }).length;
            const max = Math.max(...Array.from({ length: 24 }).map((_, j) => {
              const h = new Date();
              h.setHours(h.getHours() - (23 - j));
              return logs.filter(l => {
                const t = getLogDate(l);
                return t.getHours() === h.getHours() && t.getDate() === h.getDate();
              }).length;
            }), 1);
            return (
              <div
                key={i}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 transition-colors rounded-t"
                style={{ height: `${(count / max) * 100}%` }}
                title={`${count} logs at ${hour.getHours()}:00`}
              />
            );
          })}
        </div>
      </div>

      {Object.keys(suspiciousUserAgents).length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 mb-4 rounded-r-lg">
          <h2 className="font-bold text-sm">비정상 User-Agent 빈도 감지 (봇/크롤러 가능성)</h2>
          <p className="text-xs text-amber-700 mt-0.5">동일한 User-Agent로 비정상적인 반복 호출이 발생했습니다:</p>
          <ul className="list-disc list-inside mt-1 text-xs">
            {Object.entries(suspiciousUserAgents).map(([ua, count]) => (
              <li key={ua} className="truncate" title={ua}>{count}회 호출: {ua}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-xl shadow-xs">
        <table className="min-w-full text-left border-collapse">
          <thead className="bg-gray-100/80 text-gray-700 text-xs font-semibold border-b">
            <tr>
              <th className="py-3 px-4">일시 (Timestamp)</th>
              <th className="py-3 px-4">유입 구분 / 키워드</th>
              <th className="py-3 px-4">접속 URL</th>
              <th className="py-3 px-4">Referrer</th>
              <th className="py-3 px-4">IP 주소</th>
              <th className="py-3 px-4">기기식별자 (Visitor ID)</th>
              <th className="py-3 px-4">조치</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-gray-400">
                  선택한 조건에 일치하는 로그가 없습니다.
                </td>
              </tr>
            ) : (
              filteredLogs.map(log => {
                const isNaver = isNaverAdLog(log);
                const isNaverSuspicious = Boolean(isNaver && log.ip && suspiciousIpSet.has(log.ip));
                const kw = extractNaverKeyword(log);
                const isBlocked = log.ip && blockedList.includes(log.ip);

                return (
                  <tr key={log.id} className={`hover:bg-gray-50/80 transition-colors ${
                    isNaverSuspicious ? 'bg-red-50/50' : isNaver ? 'bg-emerald-50/30' : ''
                  }`}>
                    <td className="py-2.5 px-4 whitespace-nowrap text-gray-600 font-mono">
                      {getLogDate(log).toLocaleString('ko-KR')}
                    </td>
                    <td className="py-2.5 px-4">
                      {isNaver ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded w-fit">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            네이버 광고
                          </span>
                          {kw && (
                            <span className="text-[11px] text-gray-700 font-medium truncate max-w-[140px]" title={kw}>
                              키워드: <b className="text-emerald-700">{kw}</b>
                            </span>
                          )}
                          {isNaverSuspicious && (
                            <span className="text-[10px] text-red-600 font-bold">
                              🚨 반복 클릭 의심
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[11px]">일반 접속</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 max-w-xs truncate text-gray-700 font-mono text-[11px]" title={log.url}>
                      {log.url}
                    </td>
                    <td className="py-2.5 px-4 text-gray-500 max-w-[160px] truncate" title={log.referrer}>
                      {log.referrer || '-'}
                    </td>
                    <td className="py-2.5 px-4 font-mono font-medium text-gray-800">
                      {log.ip || 'Unknown'}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-gray-400 max-w-[100px] truncate" title={log.visitorId}>
                      {log.visitorId ? log.visitorId.slice(0, 8) + '...' : '-'}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      {log.ip && log.ip !== 'Unknown' && (
                        isBlocked ? (
                          <span className="inline-block bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded text-[11px] border border-gray-200">
                            차단됨
                          </span>
                        ) : (
                          <button
                            onClick={() => blockIp(log.ip!)}
                            className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-[11px] transition-colors font-medium shadow-xs"
                          >
                            Block IP
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLogs;
