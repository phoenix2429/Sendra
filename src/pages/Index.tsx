import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRoom, joinRoom, getRecentRooms, clearRecentRooms } from '@/lib/roomStore';
import { RefreshCw, LogIn, Lock, Clock, X, Github, Linkedin } from 'lucide-react';
import { toast } from 'sonner';

const Index = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'create' | 'join'>('create');
  const [passcode, setPasscode] = useState('');
  const [expiration, setExpiration] = useState(60);
  const [joinId, setJoinId] = useState('');
  const [joinPasscode, setJoinPasscode] = useState('');
  const [error, setError] = useState('');
  const [recentRooms, setRecentRooms] = useState(getRecentRooms());
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    try {
      const room = await createRoom(passcode || undefined, expiration);
      navigate(`/room/${room.id}`);
    } catch (e) {
      toast.error('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    setError('');
    if (!joinId.trim()) {
      setError('Please enter a Room ID');
      return;
    }
    setLoading(true);
    try {
      const result = await joinRoom(joinId.trim().toUpperCase(), joinPasscode || undefined);
      if (result === null) {
        setError('Room not found or expired');
      } else if (result === 'wrong_passcode') {
        setError('Incorrect passcode');
      } else {
        navigate(`/room/${result.id}`);
      }
    } catch (e) {
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const handleClearRecent = () => {
    clearRecentRooms();
    setRecentRooms([]);
  };

  return (
    <div className="min-h-screen viora-gradient-bg flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md mx-auto flex flex-col items-center">
        <h1 className="text-6xl sm:text-7xl font-black tracking-tight text-foreground mb-2">
          Sendra.
        </h1>
        <p className="text-muted-foreground text-lg mb-10">
          Send files. No login. No trace.
        </p>

        <div className="flex w-full max-w-sm bg-secondary rounded-xl p-1 mb-6">
          <button
            onClick={() => setTab('create')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'create'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Create Room
          </button>
          <button
            onClick={() => setTab('join')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === 'join'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LogIn className="w-4 h-4" />
            Join Room
          </button>
        </div>

        <div className="viora-card-elevated w-full max-w-sm p-6">
          {tab === 'create' ? (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-1">New Room</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Create a secure, temporary space to share your files.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    Passcode
                  </label>
                  <input
                    type="password"
                    placeholder="Set a secure passcode"
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-sm font-medium text-foreground mb-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Expiration
                  </label>
                  <select
                    value={expiration}
                    onChange={(e) => setExpiration(Number(e.target.value))}
                    className="px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                  >
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={60}>60 min</option>
                    <option value={120}>2 hours</option>
                  </select>
                </div>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-foreground text-card font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Room'}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-foreground mb-1">Join Room</h2>
              <p className="text-sm text-muted-foreground mb-5">
                Enter a room ID to access shared files.
              </p>
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="E.g. A1B2C3"
                    value={joinId}
                    onChange={(e) => setJoinId(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all font-mono tracking-widest"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    placeholder="Passcode (if required)"
                    value={joinPasscode}
                    onChange={(e) => setJoinPasscode(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary transition-all"
                  />
                </div>
                {error && <p className="text-destructive text-sm">{error}</p>}
                <button
                  onClick={handleJoin}
                  disabled={loading}
                  className="w-full py-2.5 rounded-xl bg-foreground text-card font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Joining...' : 'Access Files'}
                </button>
              </div>
              {recentRooms.length > 0 && (
                <div className="mt-6 pt-5 border-t border-border">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-foreground">Recent Rooms</span>
                    <button
                      onClick={handleClearRecent}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {recentRooms.map((id) => (
                      <button
                        key={id}
                        onClick={() => setJoinId(id)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm font-mono tracking-wider text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4 text-muted-foreground">
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              <Github className="w-5 h-5" />
            </a>
            <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
          <p className="text-xs text-muted-foreground">
            © 2026 Sendra. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
