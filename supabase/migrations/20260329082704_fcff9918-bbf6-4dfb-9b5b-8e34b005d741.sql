
-- Create rooms table
CREATE TABLE public.rooms (
  id TEXT PRIMARY KEY,
  passcode TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can view rooms" ON public.rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can delete expired rooms" ON public.rooms FOR DELETE USING (expires_at < now());

-- Create files table
CREATE TABLE public.room_files (
  id TEXT PRIMARY KEY DEFAULT substr(md5(random()::text), 1, 8),
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  type TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  self_destruct BOOLEAN NOT NULL DEFAULT false,
  downloads INTEGER NOT NULL DEFAULT 0,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.room_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view room files" ON public.room_files FOR SELECT USING (true);
CREATE POLICY "Anyone can upload files" ON public.room_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update file downloads" ON public.room_files FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete files" ON public.room_files FOR DELETE USING (true);

-- Create clipboard items table
CREATE TABLE public.clipboard_items (
  id TEXT PRIMARY KEY DEFAULT substr(md5(random()::text), 1, 8),
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.clipboard_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view clipboard items" ON public.clipboard_items FOR SELECT USING (true);
CREATE POLICY "Anyone can add clipboard items" ON public.clipboard_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete clipboard items" ON public.clipboard_items FOR DELETE USING (true);

-- Create chat messages table
CREATE TABLE public.chat_messages (
  id TEXT PRIMARY KEY DEFAULT substr(md5(random()::text), 1, 8),
  room_id TEXT NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  sender TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can send chat messages" ON public.chat_messages FOR INSERT WITH CHECK (true);

-- Enable realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_files;
ALTER PUBLICATION supabase_realtime ADD TABLE public.clipboard_items;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Create storage bucket for file uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('room-files', 'room-files', true);

CREATE POLICY "Anyone can upload room files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'room-files');
CREATE POLICY "Anyone can view room files storage" ON storage.objects FOR SELECT USING (bucket_id = 'room-files');
CREATE POLICY "Anyone can delete room files storage" ON storage.objects FOR DELETE USING (bucket_id = 'room-files');
