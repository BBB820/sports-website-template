// Edit this file to make the site yours: club details, roster, schedule, news.
// Everything here is placeholder content.
window.SITE = {
  team: {
    name: "Riverside FC",
    short: "RFC",
    league: "Metro Premier League",
    tagline: "Community club since 1998. Every match, every weekend.",
    founded: 1998,
    ground: "Riverside Park, Pitch 1",
    colors: "Navy & gold",
    coach: "Sam Okafor",
    email: "hello@riverside-fc.example"
  },

  // Your own fixtures. date = ISO string; score only for played matches.
  schedule: [
    { date: "2026-09-20T15:00", home: "Riverside FC", away: "Harbor United", score: [2, 1] },
    { date: "2026-09-27T15:00", home: "Northgate", away: "Riverside FC", score: [0, 0] },
    { date: "2026-10-04T15:00", home: "Riverside FC", away: "Oakwood Rovers", score: [3, 2] },
    { date: "2026-10-11T15:00", home: "Eastfield Athletic", away: "Riverside FC", score: [1, 2] },
    { date: "2026-10-18T15:00", home: "Riverside FC", away: "Kingsbridge" },
    { date: "2026-10-25T13:00", home: "Lakeview Town", away: "Riverside FC" },
    { date: "2026-11-01T15:00", home: "Riverside FC", away: "Millbrook" }
  ],

  table: [
    { team: "Riverside FC", p: 4, w: 3, d: 1, l: 0, gf: 7, ga: 4 },
    { team: "Kingsbridge", p: 4, w: 3, d: 0, l: 1, gf: 9, ga: 5 },
    { team: "Harbor United", p: 4, w: 2, d: 1, l: 1, gf: 6, ga: 4 },
    { team: "Northgate", p: 4, w: 1, d: 2, l: 1, gf: 4, ga: 4 },
    { team: "Oakwood Rovers", p: 4, w: 1, d: 1, l: 2, gf: 6, ga: 7 },
    { team: "Eastfield Athletic", p: 4, w: 0, d: 1, l: 3, gf: 3, ga: 8 }
  ],

  roster: [
    { no: 1, name: "Leo Marsh", pos: "GK" },
    { no: 2, name: "Dani Costa", pos: "DF" },
    { no: 4, name: "Aiden Park", pos: "DF" },
    { no: 5, name: "Theo Grant", pos: "DF" },
    { no: 3, name: "Kofi Mensah", pos: "DF" },
    { no: 6, name: "Rui Almeida", pos: "MF" },
    { no: 8, name: "Jonah Reyes", pos: "MF" },
    { no: 10, name: "Max Becker", pos: "MF" },
    { no: 14, name: "Ollie Hart", pos: "MF" },
    { no: 7, name: "Sol Duarte", pos: "FW" },
    { no: 9, name: "Ben Ito", pos: "FW" },
    { no: 11, name: "Felix Wren", pos: "FW" }
  ],

  news: [
    { date: "2026-10-12", title: "Late winner seals third straight away point", tag: "Match report",
      body: "Ben Ito's 88th-minute strike at Eastfield keeps Riverside unbeaten and top of the table." },
    { date: "2026-10-08", title: "Youth academy trials open for U12 and U14", tag: "Club",
      body: "Sessions run Tuesday evenings through November. Bring boots and water." },
    { date: "2026-10-05", title: "Five-goal thriller against Oakwood", tag: "Match report",
      body: "Max Becker scored twice as Riverside came from behind to win 3–2 at home." },
    { date: "2026-09-30", title: "New floodlights approved for Riverside Park", tag: "Facilities",
      body: "Installation starts in January, opening the door to evening kick-offs next season." },
    { date: "2026-09-22", title: "Season ticket sales pass last year's total", tag: "Fans",
      body: "Thank you to everyone who renewed. Family bundles remain available at the clubhouse." }
  ],

  history: [
    { year: 1998, text: "Founded by a group of parents at Riverside Park." },
    { year: 2006, text: "First promotion to the Metro League." },
    { year: 2014, text: "Clubhouse built by volunteers." },
    { year: 2021, text: "Metro Cup winners." },
    { year: 2024, text: "Promoted to the Metro Premier League." }
  ],

  // Live data (optional). Uses TheSportsDB's free public test key "3".
  // Find league ids at https://www.thesportsdb.com — falls back to the data above if offline.
  liveLeagues: [
    { id: "local", name: "Metro Premier League (club data)" },
    { id: "4328", name: "English Premier League", season: "2026-2027" },
    { id: "4387", name: "NBA", season: "2026-2027" },
    { id: "4391", name: "NFL", season: "2026" },
    { id: "4335", name: "La Liga", season: "2026-2027" }
  ]
};
