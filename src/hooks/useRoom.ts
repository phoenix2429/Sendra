import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getRoom } from '@/lib/roomStore';
import type { RoomRow, FileRow, ClipboardRow, ChatRow } from '@/lib/roomStore';

export function useRoom(roomId: string | undefined) {
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [files, setFiles] = useState<FileRow[]>([]);
  const [clipboard, setClipboard] = useState<ClipboardRow[]>([]);
  const [chat, setChat] = useState<ChatRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return null;
    const r = await getRoom(roomId);
    setRoom(r);
    return r;
  }, [roomId]);

  const fetchFiles = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('room_files')
      .select()
      .eq('room_id', roomId)
      .order('uploaded_at', { ascending: false });
    setFiles(data || []);
  }, [roomId]);

  const fetchClipboard = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('clipboard_items')
      .select()
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    setClipboard(data || []);
  }, [roomId]);

  const fetchChat = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from('chat_messages')
      .select()
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });
    setChat(data || []);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const init = async () => {
      setLoading(true);
      await fetchRoom();
      await Promise.all([fetchFiles(), fetchClipboard(), fetchChat()]);
      setLoading(false);
    };
    init();

    // Real-time subscriptions
    const channel = supabase
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_files', filter: `room_id=eq.${roomId}` },
        () => fetchFiles()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'clipboard_items', filter: `room_id=eq.${roomId}` },
        () => fetchClipboard()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${roomId}` },
        () => fetchChat()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoom, fetchFiles, fetchClipboard, fetchChat]);

  return { room, files, clipboard, chat, loading, refetchRoom: fetchRoom };
}
