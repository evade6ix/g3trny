const pointsFor = (wins, draws) => wins * 3 + draws;

export function computeStandings(event) {
  const stats = new Map();
  event.participants.forEach((p) => {
    stats.set(String(p._id), {
      participantId: p._id,
      displayName: p.displayName,
      opponents: [],
      wins: 0,
      losses: 0,
      draws: 0
    });
  });

  for (const round of event.rounds) {
    for (const match of round.matches) {
      if (!match.result?.reported) continue;
      const a = stats.get(String(match.playerA));
      const b = stats.get(String(match.playerB));
      if (!a || !b) continue;
      a.opponents.push(String(b.participantId));
      b.opponents.push(String(a.participantId));

      if (match.result.isDraw) {
        a.draws += 1;
        b.draws += 1;
      } else if (String(match.result.winner) === String(a.participantId)) {
        a.wins += 1;
        b.losses += 1;
      } else {
        b.wins += 1;
        a.losses += 1;
      }
    }
  }

  const withPoints = [...stats.values()].map((s) => ({ ...s, points: pointsFor(s.wins, s.draws) }));
  const pointsMap = new Map(withPoints.map((s) => [String(s.participantId), s.points]));

  const standings = withPoints.map((s) => {
    const buchholz = s.opponents.reduce((acc, oid) => acc + (pointsMap.get(oid) ?? 0), 0);
    const oppWinRates = s.opponents.map((oid) => {
      const opp = withPoints.find((o) => String(o.participantId) === oid);
      if (!opp) return 0;
      const games = opp.wins + opp.losses + opp.draws;
      return games ? (opp.wins + opp.draws * 0.5) / games : 0;
    });

    const opponentWinPct = oppWinRates.length
      ? oppWinRates.reduce((a, b) => a + b, 0) / oppWinRates.length
      : 0;

    return {
      participantId: s.participantId,
      displayName: s.displayName,
      points: s.points,
      wins: s.wins,
      losses: s.losses,
      draws: s.draws,
      buchholz,
      opponentWinPct
    };
  });

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.buchholz !== a.buchholz) return b.buchholz - a.buchholz;
    return b.opponentWinPct - a.opponentWinPct;
  });

  return standings;
}

export function generateSwissPairings(event) {
  const standings = computeStandings(event);
  const droppedSet = new Set(event.participants.filter((p) => p.dropped).map((p) => String(p._id)));
  const active = standings.filter((s) => !droppedSet.has(String(s.participantId)));

  const existingMatches = new Set();
  event.rounds.forEach((round) => {
    round.matches.forEach((m) => {
      const key = [String(m.playerA), String(m.playerB)].sort().join('-');
      existingMatches.add(key);
    });
  });

  const matches = [];
  const queue = [...active];
  let table = 1;

  while (queue.length > 1) {
    const a = queue.shift();
    let opponentIndex = queue.findIndex((b) => !existingMatches.has([String(a.participantId), String(b.participantId)].sort().join('-')));
    if (opponentIndex === -1) opponentIndex = 0;
    const b = queue.splice(opponentIndex, 1)[0];
    matches.push({ table: table++, playerA: a.participantId, playerB: b.participantId, result: { reported: false, isDraw: false } });
  }

  if (queue.length === 1) {
    const bye = queue[0];
    matches.push({
      table: table++,
      playerA: bye.participantId,
      playerB: bye.participantId,
      result: { winner: bye.participantId, reported: true, isDraw: false }
    });
  }

  return matches;
}
