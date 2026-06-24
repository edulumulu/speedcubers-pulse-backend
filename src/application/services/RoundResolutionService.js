function serializeParticipant(result) {
  return result.user ? { id: result.user.id, username: result.user.username } : { id: result.user_id };
}

function serializeResult(result) {
  return {
    id: result.id,
    user: serializeParticipant(result),
    timeMs: result.time_ms,
    penalty: result.penalty,
    finalTimeMs: result.final_time_ms,
  };
}

function resultSortValue(result) {
  return result.final_time_ms === null || result.final_time_ms === undefined
    ? Number.POSITIVE_INFINITY
    : result.final_time_ms;
}

export function resolveRoundResults(results) {
  if (results.length < 2) {
    return {
      status: 'pending',
      results: results.map(serializeResult),
    };
  }

  const [first, second] = results;
  const firstValue = resultSortValue(first);
  const secondValue = resultSortValue(second);

  if (firstValue === Number.POSITIVE_INFINITY && secondValue === Number.POSITIVE_INFINITY) {
    return {
      status: 'draw',
      reason: 'both_dnf',
      results: results.map(serializeResult),
    };
  }

  if (firstValue === secondValue) {
    return {
      status: 'draw',
      reason: 'equal_time',
      results: results.map(serializeResult),
    };
  }

  const winner = firstValue < secondValue ? first : second;
  const loser = winner === first ? second : first;

  return {
    status: 'completed',
    winner: serializeParticipant(winner),
    loser: serializeParticipant(loser),
    winnerResult: serializeResult(winner),
    loserResult: serializeResult(loser),
    winningTimeMs: winner.final_time_ms,
    losingTimeMs: loser.final_time_ms,
    loserIsDnf: loser.penalty === 'dnf',
    results: results.map(serializeResult),
  };
}

export function finalTimeMsToSeconds(timeMs) {
  if (timeMs === null || timeMs === undefined) return null;
  return timeMs / 1000;
}
