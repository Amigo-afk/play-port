import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, LogOut, Play, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Player {
  id: string;
  name: string;
  is_host: boolean;
  room_id: string;
}

interface Room {
  id: string;
  code: string;
  host_name: string;
  max_players: number;
  created_at: string;
}

export default function GameLobby() {
  const [currentView, setCurrentView] = useState<'landing' | 'room'>('landing');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  useEffect(() => {
    if (!currentRoom) return;

    // Subscribe to real-time player updates
    const channel = supabase
      .channel('room-players')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${currentRoom.id}`
        },
        () => {
          fetchPlayers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${currentRoom.id}`
        },
        () => {
          // Room was deleted, go back to landing
          setCurrentRoom(null);
          setCurrentPlayer(null);
          setPlayers([]);
          setCurrentView('landing');
          setRoomCode('');
          toast({
            title: "Room closed",
            description: "The host has closed the room.",
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRoom, toast]);

  const fetchPlayers = async () => {
    if (!currentRoom) return;

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', currentRoom.id)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching players:', error);
    } else {
      setPlayers(data || []);
    }
  };

  const hostRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Player name required",
        description: "Please enter your name to host a room.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    const newRoomCode = generateRoomCode();

    try {
      // Create room
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .insert({
          code: newRoomCode,
          host_name: playerName,
          max_players: 5
        })
        .select()
        .single();

      if (roomError) throw roomError;

      // Add host as player
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: roomData.id,
          name: playerName,
          is_host: true
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setCurrentRoom(roomData);
      setCurrentPlayer(playerData);
      setCurrentView('room');

      toast({
        title: "Room created!",
        description: `Room code: ${newRoomCode}`,
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!playerName.trim()) {
      toast({
        title: "Player name required",
        description: "Please enter your name to join a room.",
        variant: "destructive"
      });
      return;
    }

    if (!roomCode.trim()) {
      toast({
        title: "Room code required",
        description: "Please enter a room code to join.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Find room by code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('code', roomCode.toUpperCase())
        .single();

      if (roomError || !roomData) {
        toast({
          title: "Room not found",
          description: "Please check the room code and try again.",
          variant: "destructive"
        });
        return;
      }

      // Check if room is full
      const { data: existingPlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id);

      if (playersError) throw playersError;

      if (existingPlayers && existingPlayers.length >= roomData.max_players) {
        toast({
          title: "Room full",
          description: "This room is already full.",
          variant: "destructive"
        });
        return;
      }

      // Add player to room
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: roomData.id,
          name: playerName,
          is_host: false
        })
        .select()
        .single();

      if (playerError) throw playerError;

      setCurrentRoom(roomData);
      setCurrentPlayer(playerData);
      setCurrentView('room');

      toast({
        title: "Joined room!",
        description: `Joined room: ${roomCode.toUpperCase()}`,
      });
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error",
        description: "Failed to join room. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = async () => {
    if (!currentPlayer || !currentRoom) return;

    try {
      // Remove player from room
      await supabase
        .from('players')
        .delete()
        .eq('id', currentPlayer.id);

      // If this was the host, delete the entire room
      if (currentPlayer.is_host) {
        await supabase
          .from('rooms')
          .delete()
          .eq('id', currentRoom.id);
      }

      setCurrentRoom(null);
      setCurrentPlayer(null);
      setPlayers([]);
      setCurrentView('landing');
      setRoomCode('');

      toast({
        title: "Left room",
        description: "You have left the room.",
      });
    } catch (error) {
      console.error('Error leaving room:', error);
      toast({
        title: "Error",
        description: "Failed to leave room.",
        variant: "destructive"
      });
    }
  };

  const startGame = async () => {
    if (!currentRoom || !currentPlayer?.is_host) return;

    if (players.length < 2) {
      toast({
        title: "Not enough players",
        description: "At least 2 players are required to start the game.",
        variant: "destructive"
      });
      return;
    }

    // Navigate to game page
    navigate('/game');
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-neon bg-clip-text text-transparent animate-pulse-neon">
              Game Lobby
            </h1>
            <p className="text-muted-foreground">
              Enter your name and create or join a game room
            </p>
          </div>

          <Card className="p-6 space-y-6 bg-gaming-surface border-gaming-border shadow-card">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Player Name</label>
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-background border-gaming-border focus:ring-neon-purple"
                disabled={loading}
              />
            </div>

            <div className="space-y-4">
              <Button 
                onClick={hostRoom}
                className="w-full bg-gradient-primary hover:shadow-neon transition-all duration-300"
                size="lg"
                disabled={loading}
              >
                <Crown className="w-4 h-4 mr-2" />
                {loading ? "Creating..." : "Host Room"}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gaming-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-gaming-surface px-2 text-muted-foreground">or</span>
                </div>
              </div>

              <div className="space-y-2">
                <Input
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-background border-gaming-border focus:ring-neon-blue"
                  disabled={loading}
                />
                <Button 
                  onClick={joinRoom}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                  disabled={loading}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {loading ? "Joining..." : "Join Room"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Card className="p-6 bg-gaming-surface border-gaming-border shadow-card">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Room {currentRoom?.code}</h2>
                <p className="text-sm text-muted-foreground">
                  {players.length}/{currentRoom?.max_players} players
                </p>
              </div>
              <Button
                onClick={leaveRoom}
                variant="destructive"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-foreground flex items-center">
                <Users className="w-4 h-4 mr-2" />
                Players
              </h3>
              
              <div className="space-y-2">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-gaming-border"
                  >
                    <span className="font-medium text-foreground">{player.name}</span>
                    {player.is_host && (
                      <Badge variant="secondary" className="bg-neon-purple text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {currentPlayer?.is_host && (
              <div className="space-y-3 pt-4 border-t border-gaming-border">
                <Button
                  onClick={startGame}
                  className="w-full bg-gradient-primary hover:shadow-neon transition-all duration-300"
                  size="lg"
                  disabled={!currentRoom || players.length < 2}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                  {currentRoom && players.length < 2 && (
                    <span className="ml-2 text-xs opacity-75">
                      (Need {2 - players.length} more)
                    </span>
                  )}
                </Button>

                <Button
                  onClick={leaveRoom}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Room
                </Button>
              </div>
            )}

            {!currentPlayer?.is_host && (
              <div className="pt-4 border-t border-gaming-border">
                <p className="text-center text-sm text-muted-foreground">
                  Waiting for host to start the game...
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}