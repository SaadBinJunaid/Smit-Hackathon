import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Announcement } from '../types';
import { AnnouncementService } from '../services/announcementService';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { EmptyState } from '../components/common/EmptyState';

export const AnnouncementsPage: React.FC = () => {
  const { user, role } = useAuth();
  const canPost = role === 'admin' || role === 'hr';

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<'all' | 'hr' | 'employees'>('all');
  const [posting, setPosting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const list = await AnnouncementService.getAnnouncements();
      setAnnouncements(list);
    } catch (e) {
      console.warn('Error loading announcements:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !user || !role) return;

    setPosting(true);
    try {
      await AnnouncementService.postAnnouncement(
        title,
        body,
        audience,
        user.displayName || user.email,
        role,
        user.uid
      );
      setSuccess('Announcement published and broadcast to members.');
      setIsModalOpen(false);
      setTitle('');
      setBody('');
      await loadAnnouncements();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this announcement?')) return;
    if (!user || !role) return;
    try {
      await AnnouncementService.deleteAnnouncement(id, user.email, user.uid, role);
      await loadAnnouncements();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Company Announcements</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Official communications, policy updates, and executive announcements
          </p>
        </div>

        {canPost && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="No Active Announcements"
          description={
            canPost
              ? 'No announcements have been published yet. Click "Post Announcement" to broadcast news to all or selected groups.'
              : 'There are currently no company announcements to display.'
          }
          actionText={canPost ? 'Post First Announcement' : undefined}
          onAction={canPost ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => (
            <div key={ann.id} className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="indigo" size="sm">
                    {ann.audience.toUpperCase()}
                  </Badge>
                  {canPost && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded-md cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{ann.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {ann.body}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span>By {ann.postedBy} ({ann.authorRole.toUpperCase()})</span>
                <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Publish Announcement" maxWidth="md">
        <form onSubmit={handlePost} className="space-y-4 text-xs">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Company Offsite 2026 Announcement"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audience</label>
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value as any)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            >
              <option value="all">All Personnel</option>
              <option value="hr">HR Managers Only</option>
              <option value="employees">Employees Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Announcement Body *</label>
            <textarea
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Enter announcement text..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg bg-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={posting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs cursor-pointer"
            >
              {posting ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
