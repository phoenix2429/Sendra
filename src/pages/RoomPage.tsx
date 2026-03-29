import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { uploadFile, trackDownload, addClipboardItem, removeClipboardItem, addChatMessage, getSenderId } from '@/lib/roomStore';
import type { FileRow } from '@/lib/roomStore';
import { useRoom } from '@/hooks/useRoom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Copy, QrCode, Upload, FileIcon, Download, Trash2, Send,
  Clipboard, MessageSquare, FolderOpen, Clock, Link2
} from 'lucide-react';
import { toast } from 'sonner';

const RoomPage = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, files, clipboard, chat, loading } = useRoom(roomId);
  const [tab, setTab] = useState<'files' | 'clipboard' | 'chat'>('files');
  const [timeLeft, setTimeLeft] = useState('');
  const [selfDestruct, setSelfDestruct] = useState(false);
  const [clipText, setClipText] = useState('');
  const [chatText, setChatText] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const senderId = getSenderId();

  useEffect(() => {
    if (!loading && !room) {
      toast.error('Room expired or not found');
      navigate('/');
    }
  }, [loading, room, navigate]);

  useEffect(() => {
    if (!room) return;
    const tick = () => {
      const diff = new Date(room.expires_at).getTime() - Date.now();
      if (diff <= 0) {
        navigate('/');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [room, navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.length]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    Array.from(e.dataTransfer.files).forEach(handleFileUpload);
  };

  const handleFileUpload = async (file: File) => {
    if (!roomId) return;
    setUploading(true);
    try {
      await uploadFile(roomId, file, selfDestruct);
      toast.success(`${file.name} uploaded`);
    } catch {
      toast.error(`Failed to upload ${file.name}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileRow) => {
    if (!roomId) return;
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    a.target = '_blank';
    a.click();
    await trackDownload(roomId, file.id);
  };

  const handleAddClip = async () => {
    if (!roomId || !clipText.trim()) return;
    await addClipboardItem(roomId, clipText.trim());
    setClipText('');
  };

  const handleRemoveClip = async (id: string) => {
    await removeClipboardItem(id);
  };

  const handleSendChat = async () => {
    if (!roomId || !chatText.trim()) return;
    await addChatMessage(roomId, chatText.trim());
    setChatText('');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Room link copied!');
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (loading || !room) return null;

  const roomUrl = window.location.href;

  const tabs = [
    { key: 'files' as const, label: 'Files', icon: FolderOpen, count: files.length },
    { key: 'clipboard' as const, label: 'Shared Clipboard', icon: Clipboard, count: clipboard.length },
    { key: 'chat' as const, label: 'Team Chat', icon: MessageSquare, count: chat.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-foreground flex items-center justify-center">
              <span className="text-card text-sm font-bold">V</span>
            </div>
            <div>
              <h1 className="text-base font-semibold text-foreground">Room {room.id}</h1>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-success font-medium">LIVE SESSION</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground text-sm bg-secondary px-3 py-1.5 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs">{timeLeft}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="max-w-3xl mx-auto px-4 py-3 flex gap-2">
        <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors">
          <Link2 className="w-3.5 h-3.5" />
          Copy Room Link
        </button>
        <button onClick={() => setShowQR(!showQR)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm text-foreground hover:bg-secondary transition-colors">
          <QrCode className="w-3.5 h-3.5" />
          Scan QR
        </button>
      </div>

      {showQR && (
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="viora-card p-6 flex flex-col items-center justify-center gap-4">
            <QRCodeSVG value={roomUrl} size={180} />
            <p className="text-sm text-muted-foreground">Scan to join this room</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="max-w-3xl mx-auto px-4">
        <div className="flex bg-secondary rounded-xl p-1 mb-4">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
              {t.count > 0 && (
                <span className="text-xs bg-foreground text-card px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Files Tab */}
        {tab === 'files' && (
          <div className="space-y-4 pb-8">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-2xl p-10 text-center cursor-pointer hover:border-primary/40 hover:bg-primary/[0.02] transition-all"
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-foreground font-medium mb-1">
                {uploading ? 'Uploading...' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-muted-foreground">or click to select files to securely share</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) Array.from(e.target.files).forEach(handleFileUpload);
                }}
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
              <input
                type="checkbox"
                checked={selfDestruct}
                onChange={(e) => setSelfDestruct(e.target.checked)}
                className="rounded border-border"
              />
              Auto-Self-Destruct (Delete after 1 download)
            </label>

            {files.length === 0 ? (
              <div className="viora-card p-8 text-center">
                <FileIcon className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No files uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {files.map(file => (
                  <div key={file.id} className="viora-card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileIcon className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDownload(file)}
                      className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Clipboard Tab */}
        {tab === 'clipboard' && (
          <div className="space-y-4 pb-8">
            <div className="flex gap-2">
              <input
                type="text"
                value={clipText}
                onChange={(e) => setClipText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddClip()}
                placeholder="Paste a link or type a note..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              />
              <button
                onClick={handleAddClip}
                className="px-4 py-2.5 rounded-xl bg-foreground text-card text-sm font-medium hover:opacity-90 transition-opacity"
              >
                + Add
              </button>
            </div>

            {clipboard.length === 0 ? (
              <div className="viora-card p-8 text-center">
                <Clipboard className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No items shared yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {clipboard.map(item => (
                  <div key={item.id} className="viora-card p-3 flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground break-all min-w-0 flex-1">{item.text}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { navigator.clipboard.writeText(item.text); toast.success('Copied!'); }}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleRemoveClip(item.id)}
                        className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat Tab */}
        {tab === 'chat' && (
          <div className="flex flex-col pb-8">
            <div className="viora-card p-4 min-h-[300px] max-h-[400px] overflow-y-auto flex flex-col">
              {chat.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">Start a conversation...</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {chat.map(msg => {
                    const isMe = msg.sender === senderId;
                    return (
                      <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] text-muted-foreground mb-0.5">{msg.sender}</span>
                        <div className={`px-3 py-2 rounded-2xl max-w-[80%] text-sm ${
                          isMe
                            ? 'bg-foreground text-card rounded-br-md'
                            : 'bg-secondary text-foreground rounded-bl-md'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Type a message..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-border bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
              />
              <button
                onClick={handleSendChat}
                className="p-2.5 rounded-xl bg-foreground text-card hover:opacity-90 transition-opacity"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomPage;
