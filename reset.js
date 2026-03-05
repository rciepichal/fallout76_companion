function getResetBoundaries() {
  const now = new Date();

  const etFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    etFormat.formatToParts(now).map(p => [p.type, p.value])
  );
  const etNow = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
  );
  const etHour = etNow.getHours();
  const etDay = etNow.getDay();

  const dailyResetET = new Date(etNow);
  dailyResetET.setHours(12, 0, 0, 0);
  if (etHour < 12) {
    dailyResetET.setDate(dailyResetET.getDate() - 1);
  }

  const weeklyResetET = new Date(dailyResetET);
  const etDayOfWeek = weeklyResetET.getDay();
  let daysBack = (etDayOfWeek - 2 + 7) % 7;
  if (daysBack === 0 && etHour < 12) daysBack = 7;
  weeklyResetET.setDate(weeklyResetET.getDate() - daysBack);
  weeklyResetET.setHours(12, 0, 0, 0);

  const utcNow = now.getTime();
  const etOffset = utcNow - etNow.getTime();

  const dailyReset = new Date(dailyResetET.getTime() + etOffset).toISOString();
  const weeklyReset = new Date(weeklyResetET.getTime() + etOffset).toISOString();

  const nextDailyET = new Date(dailyResetET);
  nextDailyET.setDate(nextDailyET.getDate() + 1);

  const nextWeeklyET = new Date(weeklyResetET);
  nextWeeklyET.setDate(nextWeeklyET.getDate() + 7);

  const nextDaily = new Date(nextDailyET.getTime() + etOffset).toISOString();
  const nextWeekly = new Date(nextWeeklyET.getTime() + etOffset).toISOString();

  return { dailyReset, weeklyReset, nextDaily, nextWeekly };
}

module.exports = { getResetBoundaries };
