import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit, where } from 'firebase/firestore';
import { db, addBlockedIp } from '../lib/firebase';

interface AccessLog {
  id: string;
  timestamp: any;
  url: string;
  referrer?: string;
  userAgent?: string;
  ip?: string;
}

export const AdminLogs = () => {
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspiciousUserAgents, setSuspiciousUserAgents] = useState<Record<string, number>>({});
  const [dateFilter, setDateFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const blockIp = async (ip: string) => {
    if (!ip) return;
    try {
      await addBlockedIp(ip);
      alert(`IP ${ip} blocked.`);
    } catch (e) {
      console.error("Error blocking IP:", e);
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

      const querySnapshot = await getDocs(q);
      const logsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AccessLog[];
      setLogs(logsData);

      // Simple frequency analysis
      const counts: Record<string, number> = {};
      logsData.forEach(log => {
        if (log.userAgent) {
          counts[log.userAgent] = (counts[log.userAgent] || 0) + 1;
        }
      });
      
      // Define suspicious as > 5 hits in last 100
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

  if (loading) return <div className="p-4">Loading logs...</div>;

  const filteredLogs = logs.filter(log => {
    let timestamp: Date;
    if (log.timestamp?.toDate) {
      timestamp = log.timestamp.toDate();
    } else if (log.timestamp instanceof Date) {
      timestamp = log.timestamp;
    } else {
      timestamp = new Date(log.timestamp);
    }
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
    const isSuspicious = log.userAgent && suspiciousUserAgents[log.userAgent] > 5;
    let matchesType = true;
    if (typeFilter === 'normal') matchesType = !isSuspicious;
    else if (typeFilter === 'suspicious') matchesType = isSuspicious;

    return matchesDate && matchesType;
  });

  const downloadLogs = () => {
    const headers = ['Timestamp', 'URL', 'Referrer', 'User Agent', 'IP'];
    const csvRows = [
      headers.join(','),
      ...filteredLogs.map(log => [
        `"${log.timestamp?.toDate().toLocaleString()}"`,
        `"${log.url || ''}"`,
        `"${log.referrer || ''}"`,
        `"${log.userAgent || ''}"`,
        `"${log.ip || ''}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `access_logs_${new Date().toISOString()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">Access Logs (Last 500)</h1>
        <div className="flex gap-2">
          <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="border p-2 rounded">
            <option value="all">All Time</option>
            <option value="1h">Last 1 Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="range">Specific Range</option>
          </select>
          {dateFilter === 'range' && (
            <>
                <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="border p-2 rounded" />
                <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="border p-2 rounded" />
            </>
          )}
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="border p-2 rounded">
            <option value="all">All Logs</option>
            <option value="normal">Normal</option>
            <option value="suspicious">Suspicious</option>
          </select>
          <button
            onClick={downloadLogs}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Download CSV
          </button>
        </div>
      </div>
      
      {/* Simple Bar Chart */}
      <div className="bg-gray-50 p-4 mb-4 rounded border">
        <h3 className="font-bold mb-2">Logs per hour (last 24h)</h3>
        <div className="flex items-end gap-1 h-32">
            {Array.from({length: 24}).map((_, i) => {
                const hour = new Date();
                hour.setHours(hour.getHours() - (23 - i));
                const count = logs.filter(l => {
                    const t = l.timestamp?.toDate() || new Date(l.timestamp);
                    return t.getHours() === hour.getHours() && t.getDate() === hour.getDate();
                }).length;
                const max = Math.max(...Array.from({length: 24}).map((_, j) => {
                    const h = new Date();
                    h.setHours(h.getHours() - (23 - j));
                    return logs.filter(l => {
                        const t = l.timestamp?.toDate() || new Date(l.timestamp);
                        return t.getHours() === h.getHours() && t.getDate() === h.getDate();
                    }).length;
                }), 1);
                return (
                    <div key={i} className="flex-1 bg-blue-400" style={{height: `${(count / max) * 100}%`}} title={`${count} logs at ${hour.getHours()}:00`} />
                )
            })}
        </div>
      </div>

      {Object.keys(suspiciousUserAgents).length > 0 && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <h2 className="font-bold">Suspicious Activity Detected</h2>
          <p>The following User Agents have shown high frequency activity:</p>
          <ul className="list-disc list-inside">
            {Object.entries(suspiciousUserAgents).map(([ua, count]) => (
              <li key={ua} className="text-sm truncate" title={ua}>{count} hits: {ua}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="py-2 px-4 border-b text-left">Timestamp</th>
              <th className="py-2 px-4 border-b text-left">URL</th>
              <th className="py-2 px-4 border-b text-left">Referrer</th>
              <th className="py-2 px-4 border-b text-left">User Agent</th>
              <th className="py-2 px-4 border-b text-left">IP</th>
              <th className="py-2 px-4 border-b text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map(log => {
              const isSuspicious = log.userAgent && suspiciousUserAgents[log.userAgent] > 5;
              return (
                <tr key={log.id} className={`border-b hover:bg-gray-50 ${isSuspicious ? 'bg-red-50' : ''}`}>
                  <td className="py-2 px-4 whitespace-nowrap">
                    {log.timestamp?.toDate().toLocaleString()}
                  </td>
                  <td className="py-2 px-4">{log.url}</td>
                  <td className="py-2 px-4 text-sm truncate max-w-xs" title={log.referrer}>{log.referrer || 'None'}</td>
                  <td className={`py-2 px-4 text-xs truncate max-w-xs ${isSuspicious ? 'font-bold text-red-600' : ''}`} title={log.userAgent}>{log.userAgent}</td>
                  <td className="py-2 px-4 text-sm">{log.ip || 'Unknown'}</td>
                  <td className="py-2 px-4">
                    {log.ip && (
                      <button onClick={() => blockIp(log.ip!)} className="bg-red-500 text-white px-2 py-1 rounded text-xs">Block IP</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLogs;
