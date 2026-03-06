function getResetBoundaries() {
  const now = new Date();

  const wzFormat = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    wzFormat.formatToParts(now).map(p => [p.type, p.value])
  );
  const wzNow = new Date(
    `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`
  );
  const wzHour = wzNow.getHours();

  const dailyResetWZ = new Date(wzNow);
  dailyResetWZ.setHours(18, 0, 0, 0);
  if (wzHour < 18) {
    dailyResetWZ.setDate(dailyResetWZ.getDate() - 1);
  }

  const weeklyResetWZ = new Date(dailyResetWZ);
  const wzDayOfWeek = weeklyResetWZ.getDay();
  let daysBack = (wzDayOfWeek - 2 + 7) % 7;
  if (daysBack === 0 && wzHour < 18) daysBack = 7;
  weeklyResetWZ.setDate(weeklyResetWZ.getDate() - daysBack);
  weeklyResetWZ.setHours(18, 0, 0, 0);

  const utcNow = now.getTime();
  const wzOffset = utcNow - wzNow.getTime();

  const dailyReset = new Date(dailyResetWZ.getTime() + wzOffset).toISOString();
  const weeklyReset = new Date(weeklyResetWZ.getTime() + wzOffset).toISOString();

  const nextDailyWZ = new Date(dailyResetWZ);
  nextDailyWZ.setDate(nextDailyWZ.getDate() + 1);

  const nextWeeklyWZ = new Date(weeklyResetWZ);
  nextWeeklyWZ.setDate(nextWeeklyWZ.getDate() + 7);

  const nextDaily = new Date(nextDailyWZ.getTime() + wzOffset).toISOString();
  const nextWeekly = new Date(nextWeeklyWZ.getTime() + wzOffset).toISOString();

  return { dailyReset, weeklyReset, nextDaily, nextWeekly };
}

module.exports = { getResetBoundaries };
