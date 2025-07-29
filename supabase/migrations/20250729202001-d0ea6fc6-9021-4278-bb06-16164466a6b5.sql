-- Create rooms table
CREATE TABLE public.rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  host_name TEXT NOT NULL,
  max_players INTEGER NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create players table
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_host BOOLEAN NOT NULL DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security (permissive since no auth)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for rooms
CREATE POLICY "Anyone can view rooms" 
ON public.rooms 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create rooms" 
ON public.rooms 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update rooms" 
ON public.rooms 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete rooms" 
ON public.rooms 
FOR DELETE 
USING (true);

-- Create permissive policies for players
CREATE POLICY "Anyone can view players" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create players" 
ON public.players 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update players" 
ON public.players 
FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete players" 
ON public.players 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rooms timestamps
CREATE TRIGGER update_rooms_updated_at
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for both tables
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.players REPLICA IDENTITY FULL;