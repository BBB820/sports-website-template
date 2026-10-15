// Everything the site shows comes from this file. Edit it to make the site yours.
// The league, opponents, schedule and results below are SAMPLE data.
window.SITE = {
  team: {
    name: "Cubao Baller Club",
    short: "CBC",
    color: "#ff6f00",
    logo: "🏀",
    tagline: "Hoops out of Cubao, Quezon City.",
    home: "Cubao Covered Court",
    founded: 2024,
    coach: "Coach Ramon",
    email: "cubaoballerclub@example.com"
  },

  league: { name: "QC Saturday League", season: "Season 2026", city: "Quezon City" },

  // Other teams: colour for their badge, emoji for their logo.
  teams: {
    "Northside Tigers": { color: "#e67e22", logo: "🐯" },
    "Eastwood Eagles": { color: "#27ae60", logo: "🦅" },
    "Hilltop Kings": { color: "#8e44ad", logo: "👑" },
    "Bayside Bulls": { color: "#e74c3c", logo: "🐂" },
    "Westgate Wolves": { color: "#1f3a5f", logo: "🐺" }
  },

  // Cubao's roster. Put the captain first. Height in cm.
  roster: [
    { no: "3", name: "Bernard Lopez", pos: "PG", ht: 175, captain: true },
    { no: "11", name: "Marco Dela Cruz", pos: "SG", ht: 180 },
    { no: "7", name: "Enzo Navarro", pos: "SF", ht: 185 },
    { no: "21", name: "Josh Valdez", pos: "PF", ht: 191 },
    { no: "00", name: "Chris Estrada", pos: "C", ht: 196 },
    { no: "1", name: "Jolo Manansala", pos: "PG", ht: 172 },
    { no: "14", name: "Migs Sarmiento", pos: "SG", ht: 178 },
    { no: "23", name: "Gino Marquez", pos: "SF", ht: 188 },
    { no: "32", name: "Harold Quiambao", pos: "PF", ht: 193 },
    { no: "55", name: "Paeng Villareal", pos: "C", ht: 199 }
  ],

  // The whole league's schedule. Add score: [home, away] when a game is played.
  // Cubao games can also carry a box score; without one the site makes up sample numbers
  // that add up to the final score.
  schedule: [
    {date: "2026-09-05T17:00", home: "Cubao Baller Club", away: "Westgate Wolves", score: [90, 94]},
    {date: "2026-09-05T19:00", home: "Northside Tigers", away: "Bayside Bulls", score: [85, 83]},
    {date: "2026-09-05T21:00", home: "Eastwood Eagles", away: "Hilltop Kings", score: [97, 95]},
    {date: "2026-09-12T17:00", home: "Bayside Bulls", away: "Cubao Baller Club", score: [86, 106]},
    {date: "2026-09-12T19:00", home: "Hilltop Kings", away: "Westgate Wolves", score: [100, 86]},
    {date: "2026-09-12T21:00", home: "Eastwood Eagles", away: "Northside Tigers", score: [96, 90]},
    {date: "2026-09-19T17:00", home: "Cubao Baller Club", away: "Hilltop Kings", score: [108, 88]},
    {date: "2026-09-19T19:00", home: "Bayside Bulls", away: "Eastwood Eagles", score: [87, 96]},
    {date: "2026-09-19T21:00", home: "Westgate Wolves", away: "Northside Tigers", score: [90, 78]},
    {date: "2026-09-26T17:00", home: "Eastwood Eagles", away: "Cubao Baller Club", score: [96, 100]},
    {date: "2026-09-26T19:00", home: "Northside Tigers", away: "Hilltop Kings", score: [97, 101]},
    {date: "2026-09-26T21:00", home: "Westgate Wolves", away: "Bayside Bulls", score: [77, 90]},
    {date: "2026-10-03T17:00", home: "Cubao Baller Club", away: "Northside Tigers", score: [110, 92]},
    {date: "2026-10-03T19:00", home: "Eastwood Eagles", away: "Westgate Wolves", score: [95, 87]},
    {date: "2026-10-03T21:00", home: "Hilltop Kings", away: "Bayside Bulls", score: [103, 99]},
    {date: "2026-10-10T17:00", home: "Westgate Wolves", away: "Cubao Baller Club", score: [82, 98]},
    {date: "2026-10-10T19:00", home: "Bayside Bulls", away: "Northside Tigers", score: [86, 95]},
    {date: "2026-10-10T21:00", home: "Hilltop Kings", away: "Eastwood Eagles", score: [90, 84]},
    {date: "2026-10-17T17:00", home: "Cubao Baller Club", away: "Bayside Bulls"},
    {date: "2026-10-17T19:00", home: "Westgate Wolves", away: "Hilltop Kings"},
    {date: "2026-10-17T21:00", home: "Northside Tigers", away: "Eastwood Eagles"},
    {date: "2026-10-24T17:00", home: "Hilltop Kings", away: "Cubao Baller Club"},
    {date: "2026-10-24T19:00", home: "Eastwood Eagles", away: "Bayside Bulls"},
    {date: "2026-10-24T21:00", home: "Northside Tigers", away: "Westgate Wolves"},
    {date: "2026-10-31T17:00", home: "Cubao Baller Club", away: "Eastwood Eagles"},
    {date: "2026-10-31T19:00", home: "Hilltop Kings", away: "Northside Tigers"},
    {date: "2026-10-31T21:00", home: "Bayside Bulls", away: "Westgate Wolves"},
    {date: "2026-11-07T17:00", home: "Northside Tigers", away: "Cubao Baller Club"},
    {date: "2026-11-07T19:00", home: "Westgate Wolves", away: "Eastwood Eagles"},
    {date: "2026-11-07T21:00", home: "Bayside Bulls", away: "Hilltop Kings"}
  ],

  news: [
    { date: "2026-10-11", tag: "Game recap", title: "Cubao pulls away late to stay on top",
      body: "A 14–2 run in the fourth quarter put the game away and kept the club in first place." },
    { date: "2026-10-06", tag: "Club", title: "Open run every Wednesday night",
      body: "Tryouts for the second team happen at Wednesday open runs at Cubao Covered Court, 8pm." },
    { date: "2026-09-28", tag: "Game recap", title: "Bounce-back win after the opening-night loss",
      body: "The club has now won five straight since dropping the season opener to Westgate." },
    { date: "2026-09-01", tag: "Club", title: "New season, new jerseys",
      body: "Orange home and black away kits arrive before tip-off on September 5." }
  ]
};
