import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, limit } from 'firebase/firestore';
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

  const blockIp = async (ip: string) => {
    if (!ip) return;
    try {
      await addBlockedIp(ip);
      alert(`IP ${ip} blocked.`);
    } catch (e) {
      console.error("Error blocking IP:", e);
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const q = query(collection(db, 'access_logs'), orderBy('timestamp', 'desc'), limit(100));
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
    fetchLogs();
  }, []);

  if (loading) return <div className="p-4">Loading logs...</div>;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Access Logs (Last 100)</h1>
      
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
            {logs.map(log => {
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
