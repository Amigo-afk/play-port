import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, LogOut, Play, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Player {
  id: string;
  name: string;
  isHost: boolean;
}

interface Room {
  id: string;
  code: string;
  host: string;
  players: Player[];
  maxPlayers: number;
}

export default function GameLobby() {
  const [currentView, setCurrentView] = useState<'landing' | 'room'>('landing');
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const { toast } = useToast();

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const hostRoom = () => {
    if (!playerName.trim()) {
      toast({
        title: "Player name required",
        description: "Please enter your name to host a room.",
        variant: "destructive"
      });
      return;
    }

    const newRoomCode = generateRoomCode();
    const player: Player = {
      id: '1',
      name: playerName,
      isHost: true
    };

    const room: Room = {
      id: newRoomCode,
      code: newRoomCode,
      host: playerName,
      players: [player],
      maxPlayers: 5
    };

    setCurrentRoom(room);
    setCurrentPlayer(player);
    setCurrentView('room');

    toast({
      title: "Room created!",
      description: `Room code: ${newRoomCode}`,
    });
  };

  const joinRoom = () => {
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

    // Simulate joining room (in real app, this would be an API call)
    const player: Player = {
      id: Date.now().toString(),
      name: playerName,
      isHost: false
    };

    const room: Room = {
      id: roomCode,
      code: roomCode,
      host: "Host Player", // This would come from server
      players: [
        { id: '1', name: "Host Player", isHost: true },
        player
      ],
      maxPlayers: 5
    };

    setCurrentRoom(room);
    setCurrentPlayer(player);
    setCurrentView('room');

    toast({
      title: "Joined room!",
      description: `Joined room: ${roomCode}`,
    });
  };

  const leaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setCurrentView('landing');
    setRoomCode('');

    toast({
      title: "Left room",
      description: "You have left the room.",
    });
  };

  const cancelRoom = () => {
    if (currentPlayer?.isHost) {
      setCurrentRoom(null);
      setCurrentPlayer(null);
      setCurrentView('landing');
      setRoomCode('');

      toast({
        title: "Room cancelled",
        description: "The room has been cancelled.",
      });
    }
  };

  const startGame = () => {
    if (!currentRoom || !currentPlayer?.isHost) return;

    if (currentRoom.players.length < 2) {
      toast({
        title: "Not enough players",
        description: "At least 2 players are required to start the game.",
        variant: "destructive"
      });
      return;
    }

    // Navigate to game (white page for now)
    window.location.href = '/game';
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
              />
            </div>

            <div className="space-y-4">
              <Button 
                onClick={hostRoom}
                className="w-full bg-gradient-primary hover:shadow-neon transition-all duration-300"
                size="lg"
              >
                <Crown className="w-4 h-4 mr-2" />
                Host Room
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
                />
                <Button 
                  onClick={joinRoom}
                  variant="secondary"
                  className="w-full"
                  size="lg"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Join Room
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
                  {currentRoom?.players.length}/{currentRoom?.maxPlayers} players
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
                {currentRoom?.players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background border border-gaming-border"
                  >
                    <span className="font-medium text-foreground">{player.name}</span>
                    {player.isHost && (
                      <Badge variant="secondary" className="bg-neon-purple text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {currentPlayer?.isHost && (
              <div className="space-y-3 pt-4 border-t border-gaming-border">
                <Button
                  onClick={startGame}
                  className="w-full bg-gradient-primary hover:shadow-neon transition-all duration-300"
                  size="lg"
                  disabled={!currentRoom || currentRoom.players.length < 2}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Start Game
                  {currentRoom && currentRoom.players.length < 2 && (
                    <span className="ml-2 text-xs opacity-75">
                      (Need {2 - currentRoom.players.length} more)
                    </span>
                  )}
                </Button>

                <Button
                  onClick={cancelRoom}
                  variant="destructive"
                  className="w-full"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel Room
                </Button>
              </div>
            )}

            {!currentPlayer?.isHost && (
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