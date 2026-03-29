import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

export type RoomRow = Tables<'rooms'>;
export type FileRow = Tables<'room_files'>;
export type ClipboardRow = Tables<'clipboard_items'>;
export type ChatRow = Tables<'chat_messages'>;

const RECENT_KEY = 'viora_recent_rooms';

function generateId(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getSenderId(): string {
  let id = sessionStorage.getItem('viora_sender_id');
  if (!id) {
    id = 'User-' + generateId(4);
    sessionStorage.setItem('viora_sender_id', id);
  }
  return id;
}

export function getRecentRooms(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
}

function addRecentRoom(roomId: string) {
  const recent = getRecentRooms().filter(id => id !== roomId);
  recent.unshift(roomId);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 10)));
}

export function clearRecentRooms() {
  localStorage.removeItem(RECENT_KEY);
}

export async function createRoom(passcode?: string, expirationMinutes = 60): Promise<RoomRow> {
  const id = generateId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + expirationMinutes * 60 * 1000);

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      id,
      passcode: passcode || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  addRecentRoom(id);
  return data;
}

export async function getRoom(roomId: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select()
    .eq('id', roomId)
    .single();

  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data;
}

export async function joinRoom(roomId: string, passcode?: string): Promise<RoomRow | null | 'wrong_passcode'> {
  const room = await getRoom(roomId);
  if (!room) return null;
  if (room.passcode && room.passcode !== passcode) return 'wrong_passcode';
  addRecentRoom(roomId);
  return room;
}

export async function uploadFile(
  roomId: string,
  file: File,
  selfDestruct: boolean
): Promise<FileRow | null> {
  const filePath = `${roomId}/${generateId(8)}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('room-files')
    .upload(filePath, file);

  if (uploadError) {
    console.error('Upload error:', uploadError);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('room-files')
    .getPublicUrl(filePath);

  const { data, error } = await supabase
    .from('room_files')
    .insert({
      room_id: roomId,
      name: file.name,
      size: file.size,
      type: file.type,
      url: urlData.publicUrl,
      self_destruct: selfDestruct,
    })
    .select()
    .single();

  if (error) {
    console.error('DB insert error:', error);
    return null;
  }
  return data;
}

export async function trackDownload(roomId: string, fileId: string): Promise<void> {
  const { data: file } = await supabase
    .from('room_files')
    .select()
    .eq('id', fileId)
    .single();

  if (!file) return;

  const newDownloads = file.downloads + 1;

  if (file.self_destruct && newDownloads >= 1) {
    await supabase.from('room_files').delete().eq('id', fileId);
    // Also delete from storage
    const path = file.url.split('/room-files/')[1];
    if (path) {
      await supabase.storage.from('room-files').remove([decodeURIComponent(path)]);
    }
  } else {
    await supabase
      .from('room_files')
      .update({ downloads: newDownloads })
      .eq('id', fileId);
  }
}

export async function addClipboardItem(roomId: string, text: string): Promise<ClipboardRow | null> {
  const { data, error } = await supabase
    .from('clipboard_items')
    .insert({ room_id: roomId, text })
    .select()
    .single();

  if (error) return null;
  return data;
}

export async function removeClipboardItem(itemId: string): Promise<void> {
  await supabase.from('clipboard_items').delete().eq('id', itemId);
}

export async function addChatMessage(roomId: string, text: string): Promise<ChatRow | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({
      room_id: roomId,
      text,
      sender: getSenderId(),
    })
    .select()
    .single();

  if (error) return null;
  return data;
}
