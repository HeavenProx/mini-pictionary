import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

export async function GET(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }
  // Récupère les parties où l'utilisateur a participé (présent dans playersJson)
  const games = await prisma.gameHistory.findMany({
    orderBy: { playedAt: "desc" },
  });
  // Filtrer côté JS pour ne garder que les parties où l'utilisateur apparaît
  let filtered = games.filter(g => {
    try {
      const players = JSON.parse(g.playersJson);
      return players.some(p => p.id === session.user.id);
    } catch {
      return false;
    }
  });
  // Dédupliquer : ne garder qu'une entrée par roomId + playedAt (la plus récente)
  const seen = new Set();
  filtered = filtered.filter(g => {
    const key = g.roomId + '|' + new Date(g.playedAt).getTime();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return new Response(JSON.stringify(filtered), { status: 200 });
}

export async function POST(req) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401 });
  }
  const body = await req.json();
  // body: { roomId, winnerId, players: [{id, name, points}] }
  if (!body.roomId || !body.players || !Array.isArray(body.players) || body.players.length === 0) {
    return new Response(JSON.stringify({ error: "INVALID_BODY_OR_NO_PLAYERS" }), { status: 400 });
  }
  // Empêche les doublons : refuse si une partie a déjà été enregistrée pour ce roomId dans les 5 dernières secondes
  const now = new Date();
  const fiveSecondsAgo = new Date(now.getTime() - 5000);
  const recent = await prisma.gameHistory.findFirst({
    where: {
      roomId: body.roomId,
      playedAt: { gte: fiveSecondsAgo },
    },
    orderBy: { playedAt: 'desc' },
  });
  if (recent) {
    return new Response(JSON.stringify({ error: "DUPLICATE_GAME_RECENT" }), { status: 409 });
  }
  const game = await prisma.gameHistory.create({
    data: {
      roomId: body.roomId,
      winnerId: body.winnerId || null,
      playersJson: JSON.stringify(body.players),
    },
  });
  return new Response(JSON.stringify(game), { status: 201 });
}
