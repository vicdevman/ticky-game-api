export const getSessionXP = (p1, p2) => {
  const SETTINGS = {
    WIN_BASE: 15,
    LOSE_BASE: 5,
    GAP_WEIGHT: 2,
    MAX_BONUS: 10,
  };

  const s1 = Number(p1.score) || 0;
  const s2 = Number(p2.score) || 0;

  const isDraw = s1 === s2;

  if (isDraw) {
    return [
      {
        userId: p1.id,
        xp_gained: SETTINGS.LOSE_BASE + s1,
        is_winner: false,
        isDraw: true,
      },
      {
        userId: p2.id,
        xp_gained: SETTINGS.LOSE_BASE + s2,
        is_winner: false,
        isDraw: true,
      },
    ];
  }

  const p1Won = s1 > s2;
  const gap = Math.abs(s1 - s2);
  const bonus = Math.min(gap * SETTINGS.GAP_WEIGHT, SETTINGS.MAX_BONUS);

  return [
    {
      userId: p1.id,
      xp_gained: p1Won ? SETTINGS.WIN_BASE + bonus : SETTINGS.LOSE_BASE + s1,
      is_winner: p1Won,
      isDraw: false,
    },
    {
      userId: p2.id,
      xp_gained: !p1Won ? SETTINGS.WIN_BASE + bonus : SETTINGS.LOSE_BASE + s2,
      is_winner: !p1Won,
      isDraw: false,
    },
  ];
};