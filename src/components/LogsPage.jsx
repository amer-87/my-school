import React, { useState, useEffect } from 'react';
import { getLogs } from '../services/databaseApi';

function LogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getLogs();
      setLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter(log =>
    log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.action_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionColor = (type) => {
    switch (type) {
      case 'INSERT': return '#10b981';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      case 'LOGIN': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  return (
    <div className="logs-page">
      <div className="module-toolbar">
        <div className="title-section">
          <h1>سجل العمليات (Activity Log)</h1>
          <p>تتبع كافة التحركات والتعديلات التي تمت على النظام مع تحديد المستخدم والوقت.</p>
        </div>
        <div className="module-actions">
          <input
            type="search"
            placeholder="بحث في السجلات..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button className="btn btn-secondary" onClick={loadLogs}>تحديث</button>
        </div>
      </div>

      <div className="table-card" style={{ background: 'white', color: '#1e293b' }}>
        <div className="table-wrapper">
          {loading ? (
            <div className="empty-state">جاري تحميل السجلات...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="empty-state">لا توجد سجلات مطابقة للبحث.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>التاريخ والوقت</th>
                  <th>المستخدم</th>
                  <th>القسم</th>
                  <th style={{ textAlign: 'center' }}>النوع</th>
                  <th>العملية</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>{log.created_at}</td>
                    <td style={{ fontWeight: '600' }}>{log.user_name}</td>
                    <td>{log.module_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        background: getActionColor(log.action_type) + '15',
                        color: getActionColor(log.action_type),
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        border: `1px solid ${getActionColor(log.action_type)}30`
                      }}>
                        {log.action_type}
                      </span>
                    </td>
                    <td style={{ fontSize: '14px' }}>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default LogsPage;
