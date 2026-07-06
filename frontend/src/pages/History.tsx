import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Search, Filter, Calendar, XCircle, ArrowUpDown, Eye, Trash2, Clock, CheckCircle } from 'lucide-react';

export const History: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>(null);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);

  // Filters & State
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState('');
  const [priority, setPriority] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showDetailDialog, setShowDetailDialog] = useState(false);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', {
        params: { search, channel, priority, status, sort, page, limit: 8 },
      });
      setNotifications(res.data.notifications || []);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [search, channel, priority, status, sort, page]);

  const viewDetails = async (id: string) => {
    try {
      const res = await api.get(`/notifications/${id}`);
      setSelectedNotif(res.data);
      setShowDetailDialog(true);
    } catch (err) {
      console.error('Failed to load details:', err);
    }
  };

  const handleCancel = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this scheduled notification?')) return;
    try {
      await api.post(`/notifications/${id}/cancel`);
      alert('Notification cancelled successfully.');
      fetchHistory();
      if (selectedNotif?.id === id) {
        setShowDetailDialog(false);
      }
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification History</h1>
        <p className="text-slate-400 text-sm">Search, filter, and track delivery logs</p>
      </div>

      {/* Filters toolbar */}
      <div className="glass rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 items-center">
        {/* Search */}
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search logs..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Channel Filter */}
        <select
          value={channel}
          onChange={(e) => {
            setChannel(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Channels</option>
          <option value="EMAIL">Email</option>
          <option value="SMS">SMS</option>
          <option value="PUSH">Push</option>
        </select>

        {/* Priority Filter */}
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Priorities</option>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PROCESSING">Processing</option>
          <option value="DELIVERED">Delivered</option>
          <option value="FAILED">Failed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Sort */}
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
          className="bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-300 focus:outline-none"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* History Table */}
      <div className="glass rounded-xl overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-500 text-sm flex justify-center items-center gap-2">
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-indigo-500 border-t-transparent"></span>
            Loading notification logs...
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16 text-slate-500 text-sm">
            No notifications matching the selected filters were found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900/60 border-b border-slate-850 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {notifications.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-slate-200">{item.title}</td>
                    <td className="py-3.5 px-4 text-slate-400">{item.user?.name || 'System User'}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-900 border border-slate-800 text-indigo-400 uppercase font-semibold">
                        {item.channel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          item.priority === 'HIGH' ? 'text-amber-500' : 'text-slate-400'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full ${
                          item.status === 'DELIVERED'
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/20'
                            : item.status === 'FAILED'
                            ? 'bg-rose-950/40 text-rose-400 border border-rose-500/20'
                            : item.status === 'CANCELLED'
                            ? 'bg-slate-900 text-slate-500 border border-slate-800'
                            : 'bg-amber-950/40 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-center flex items-center justify-center gap-2">
                      <button
                        onClick={() => viewDetails(item.id)}
                        className="p-1 bg-slate-900 border border-slate-800 rounded hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {item.status === 'PENDING' && item.scheduledFor && (
                        <button
                          onClick={() => handleCancel(item.id)}
                          className="p-1 bg-slate-900 border border-slate-800 rounded hover:bg-rose-950/40 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                          title="Cancel Scheduled"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {pagination && pagination.totalPages > 1 && (
          <div className="bg-slate-900/40 border-t border-slate-850 px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage(pagination.page - 1)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-xs rounded hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(pagination.page + 1)}
                className="px-2.5 py-1 bg-slate-950 border border-slate-800 text-xs rounded hover:bg-slate-900 disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Dialog */}
      {showDetailDialog && selectedNotif && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass rounded-xl max-w-xl w-full p-6 space-y-6 relative max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-bold text-slate-200">Delivery Detail Audit</h3>
                <p className="text-slate-400 text-[11px] mt-0.5">ID: {selectedNotif.id}</p>
              </div>
              <button
                onClick={() => setShowDetailDialog(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-semibold bg-transparent border-0 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            {/* General info */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-900/60 p-4 rounded-xl border border-slate-800/60">
              <div>
                <span className="text-slate-500 uppercase font-bold text-[9px]">Channel / Priority</span>
                <p className="mt-1 font-semibold text-slate-200">{selectedNotif.channel} | {selectedNotif.priority}</p>
              </div>
              <div>
                <span className="text-slate-500 uppercase font-bold text-[9px]">Current Status</span>
                <p className="mt-1 font-semibold text-indigo-400">{selectedNotif.status}</p>
              </div>
              {selectedNotif.scheduledFor && (
                <div className="col-span-2">
                  <span className="text-slate-500 uppercase font-bold text-[9px]">Scheduled Delivery</span>
                  <p className="mt-1 font-semibold text-amber-400">
                    {new Date(selectedNotif.scheduledFor).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            {/* Rendered content preview */}
            <div className="space-y-1 text-xs">
              <span className="text-slate-500 uppercase font-bold text-[9px]">Rendered Message Content</span>
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-900 font-mono text-[11px] text-slate-300 break-words whitespace-pre-wrap">
                {selectedNotif.channel === 'EMAIL' ? (
                  <iframe
                    title="Rendered Email Frame"
                    srcDoc={selectedNotif.message}
                    className="w-full h-40 bg-white rounded border-0"
                  />
                ) : (
                  selectedNotif.message
                )}
              </div>
            </div>

            {/* Delivery Tracking timeline steps */}
            <div className="space-y-3">
              <span className="text-slate-500 uppercase font-bold text-[9px]">Delivery Stages Tracking</span>
              <div className="space-y-2 relative border-l border-indigo-900/80 ml-2.5 pl-4">
                {selectedNotif.statuses.map((st: any, idx: number) => (
                  <div key={st.id} className="relative text-xs">
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-indigo-500 ring-4 ring-indigo-950"></span>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-300 uppercase text-[10px]">{st.status}</span>
                      <span className="text-[10px] text-slate-500">{new Date(st.timestamp).toLocaleTimeString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Error logs */}
            {selectedNotif.logs && selectedNotif.logs.length > 0 && (
              <div className="space-y-2">
                <span className="text-slate-500 uppercase font-bold text-[9px]">System Audit Error logs</span>
                <div className="divide-y divide-slate-800/80">
                  {selectedNotif.logs.map((log: any) => (
                    <div key={log.id} className="py-2 text-[10px] space-y-1">
                      <div className="flex justify-between font-bold text-slate-400">
                        <span>STAGE: {log.status}</span>
                        <span>{log.durationMs}ms</span>
                      </div>
                      {log.error && <p className="text-rose-400 break-words font-mono">Error: {log.error}</p>}
                      {log.details && <p className="text-slate-500">Details: {log.details}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
