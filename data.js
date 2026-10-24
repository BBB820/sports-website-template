// Everything the site shows comes from this file. Edit it to make the site yours.
// The teams, players, schedule and results below are SAMPLE data (the Hooperville Trial League teams).
window.SITE = {
  league: {
    name: "Cubao Ballers Club",
    short: "CBC",
    color: "#ff6f00",
    logo: "🏀",
    tagline: "Saturday night basketball in Cubao, Quezon City.",
    season: "Season 2026",
    city: "Quezon City",
    venue: "Cubao Covered Court",
    founded: 2024,
    email: "cubaoballerclub@example.com"
  },

  // Sign-ups for the next season. Set open: false to close them. Leave fee empty to hide it.
  signup: {
    open: true,
    season: "Season 2027",
    starts: "January 2027",
    deadline: "2026-12-13",
    fee: "",
    note: "Games every Saturday night at Cubao Covered Court."
  },

  // Every team: three-letter code, colour, logo emoji, and roster (captain first).
  // Players: number, name, position, height in cm. The first five listed are the starters.
  teams: {
    "Northside Tigers": { short: "NST", color: "#e67e22", logo: "🐯", roster: [
      { no: "3", name: "Marco Dela Cruz", pos: "PG", ht: 175 },
      { no: "11", name: "Jerome Santos", pos: "SG", ht: 180 },
      { no: "7", name: "Paolo Reyes", pos: "SF", ht: 185 },
      { no: "21", name: "Kevin Bautista", pos: "PF", ht: 191 },
      { no: "00", name: "Rafael Mendoza", pos: "C", ht: 196 },
      { no: "1", name: "Luis Garcia", pos: "PG", ht: 172 },
      { no: "14", name: "Miguel Torres", pos: "SG", ht: 178 },
      { no: "23", name: "Andre Ramos", pos: "SF", ht: 188 },
      { no: "32", name: "Carlo Villanueva", pos: "PF", ht: 193 },
      { no: "55", name: "Jun Aquino", pos: "C", ht: 199 }
    ] },
    "Eastwood Eagles": { short: "EWE", color: "#27ae60", logo: "🦅", roster: [
      { no: "3", name: "Enzo Navarro", pos: "PG", ht: 175 },
      { no: "11", name: "Noel Castillo", pos: "SG", ht: 180 },
      { no: "7", name: "Karl Fernandez", pos: "SF", ht: 185 },
      { no: "21", name: "Bryan Domingo", pos: "PF", ht: 191 },
      { no: "00", name: "Ian Salazar", pos: "C", ht: 196 },
      { no: "1", name: "Vince Pascual", pos: "PG", ht: 172 },
      { no: "14", name: "Mark Gonzales", pos: "SG", ht: 178 },
      { no: "23", name: "Rico Tolentino", pos: "SF", ht: 188 },
      { no: "32", name: "Dan Mercado", pos: "PF", ht: 193 },
      { no: "55", name: "Leo Francisco", pos: "C", ht: 199 }
    ] },
    "Riverside Sharks": { short: "RSS", color: "#3498db", logo: "🦈", roster: [
      { no: "3", name: "Josh Valdez", pos: "PG", ht: 175 },
      { no: "11", name: "Ken Soriano", pos: "SG", ht: 180 },
      { no: "7", name: "Gab Lim", pos: "SF", ht: 185 },
      { no: "21", name: "Tony Agustin", pos: "PF", ht: 191 },
      { no: "00", name: "Paul Rivera", pos: "C", ht: 196 },
      { no: "1", name: "Aldrin Cortez", pos: "PG", ht: 172 },
      { no: "14", name: "Nico Samonte", pos: "SG", ht: 178 },
      { no: "23", name: "Jay Manalo", pos: "SF", ht: 188 },
      { no: "32", name: "Ben Ocampo", pos: "PF", ht: 193 },
      { no: "55", name: "Ralph Sison", pos: "C", ht: 199 }
    ] },
    "Hilltop Kings": { short: "HTK", color: "#8e44ad", logo: "👑", roster: [
      { no: "3", name: "Chris Estrada", pos: "PG", ht: 175 },
      { no: "11", name: "Allan Magno", pos: "SG", ht: 180 },
      { no: "7", name: "Jed Robles", pos: "SF", ht: 185 },
      { no: "21", name: "Sam Yap", pos: "PF", ht: 191 },
      { no: "00", name: "Erwin Lacson", pos: "C", ht: 196 },
      { no: "1", name: "Lance Guevarra", pos: "PG", ht: 172 },
      { no: "14", name: "Troy Abad", pos: "SG", ht: 178 },
      { no: "23", name: "Ramon Padilla", pos: "SF", ht: 188 },
      { no: "32", name: "Dino Velasco", pos: "PF", ht: 193 },
      { no: "55", name: "Arvin Chua", pos: "C", ht: 199 }
    ] },
    "Bayside Bulls": { short: "BYB", color: "#e74c3c", logo: "🐂", roster: [
      { no: "3", name: "Gino Marquez", pos: "PG", ht: 175 },
      { no: "11", name: "Raffy Delgado", pos: "SG", ht: 180 },
      { no: "7", name: "Tomas Ilagan", pos: "SF", ht: 185 },
      { no: "21", name: "Oscar Benitez", pos: "PF", ht: 191 },
      { no: "00", name: "Nathan Uy", pos: "C", ht: 196 },
      { no: "1", name: "Felix Roque", pos: "PG", ht: 172 },
      { no: "14", name: "Cedric Ang", pos: "SG", ht: 178 },
      { no: "23", name: "Jomar Zamora", pos: "SF", ht: 188 },
      { no: "32", name: "Lito Cabrera", pos: "PF", ht: 193 },
      { no: "55", name: "Wendell Tan", pos: "C", ht: 199 }
    ] },
    "Westgate Wolves": { short: "WGW", color: "#1f3a5f", logo: "🐺", roster: [
      { no: "3", name: "Harold Quiambao", pos: "PG", ht: 175 },
      { no: "11", name: "Emil Serrano", pos: "SG", ht: 180 },
      { no: "7", name: "Dennis Co", pos: "SF", ht: 185 },
      { no: "21", name: "Renz Alcantara", pos: "PF", ht: 191 },
      { no: "00", name: "Patrick Lao", pos: "C", ht: 196 },
      { no: "1", name: "Santi Morales", pos: "PG", ht: 172 },
      { no: "14", name: "Elmer Bondoc", pos: "SG", ht: 178 },
      { no: "23", name: "Kiko Trinidad", pos: "SF", ht: 188 },
      { no: "32", name: "Jasper Sy", pos: "PF", ht: 193 },
      { no: "55", name: "Rommel Dantes", pos: "C", ht: 199 }
    ] }
  },

  // The whole schedule. Add score: [home, away] when a game is played. A game can also carry
  // box: { "Team name": [player lines] }; without one the site makes up sample numbers that add
  // up to the final score.
  schedule: [
    {date: "2026-09-05T17:00", home: "Riverside Sharks", away: "Westgate Wolves", score: [90, 94]},
    {date: "2026-09-05T19:00", home: "Northside Tigers", away: "Bayside Bulls", score: [85, 83]},
    {date: "2026-09-05T21:00", home: "Eastwood Eagles", away: "Hilltop Kings", score: [97, 95]},
    {date: "2026-09-12T17:00", home: "Bayside Bulls", away: "Riverside Sharks", score: [86, 106]},
    {date: "2026-09-12T19:00", home: "Hilltop Kings", away: "Westgate Wolves", score: [100, 86]},
    {date: "2026-09-12T21:00", home: "Eastwood Eagles", away: "Northside Tigers", score: [96, 90]},
    {date: "2026-09-19T17:00", home: "Riverside Sharks", away: "Hilltop Kings", score: [108, 88]},
    {date: "2026-09-19T19:00", home: "Bayside Bulls", away: "Eastwood Eagles", score: [87, 96]},
    {date: "2026-09-19T21:00", home: "Westgate Wolves", away: "Northside Tigers", score: [90, 78]},
    {date: "2026-09-26T17:00", home: "Eastwood Eagles", away: "Riverside Sharks", score: [96, 100]},
    {date: "2026-09-26T19:00", home: "Northside Tigers", away: "Hilltop Kings", score: [97, 101]},
    {date: "2026-09-26T21:00", home: "Westgate Wolves", away: "Bayside Bulls", score: [77, 90]},
    {date: "2026-10-03T17:00", home: "Riverside Sharks", away: "Northside Tigers", score: [110, 92]},
    {date: "2026-10-03T19:00", home: "Eastwood Eagles", away: "Westgate Wolves", score: [95, 87]},
    {date: "2026-10-03T21:00", home: "Hilltop Kings", away: "Bayside Bulls", score: [103, 99]},
    {date: "2026-10-10T17:00", home: "Westgate Wolves", away: "Riverside Sharks", score: [82, 98]},
    {date: "2026-10-10T19:00", home: "Bayside Bulls", away: "Northside Tigers", score: [86, 95]},
    {date: "2026-10-10T21:00", home: "Hilltop Kings", away: "Eastwood Eagles", score: [90, 84]},
    {date: "2026-10-17T17:00", home: "Riverside Sharks", away: "Bayside Bulls"},
    {date: "2026-10-17T19:00", home: "Westgate Wolves", away: "Hilltop Kings"},
    {date: "2026-10-17T21:00", home: "Northside Tigers", away: "Eastwood Eagles"},
    {date: "2026-10-24T17:00", home: "Hilltop Kings", away: "Riverside Sharks"},
    {date: "2026-10-24T19:00", home: "Eastwood Eagles", away: "Bayside Bulls"},
    {date: "2026-10-24T21:00", home: "Northside Tigers", away: "Westgate Wolves"},
    {date: "2026-10-31T17:00", home: "Riverside Sharks", away: "Eastwood Eagles"},
    {date: "2026-10-31T19:00", home: "Hilltop Kings", away: "Northside Tigers"},
    {date: "2026-10-31T21:00", home: "Bayside Bulls", away: "Westgate Wolves"},
    {date: "2026-11-07T17:00", home: "Northside Tigers", away: "Riverside Sharks"},
    {date: "2026-11-07T19:00", home: "Westgate Wolves", away: "Eastwood Eagles"},
    {date: "2026-11-07T21:00", home: "Bayside Bulls", away: "Hilltop Kings"}
  ],

  // League news. A recap can name its game by date and team (game: "YYYY-MM-DD", team: "...") to link to it.
  news: [
    { date: "2026-10-11", tag: "Week 6", title: "Riverside rolls to a fifth straight win",
      body: "The Sharks beat Westgate 98–82 and stay alone in first place with four weeks left.", game: "2026-10-10", team: "Riverside Sharks" },
    { date: "2026-10-11", tag: "Week 6", title: "Hilltop edges Eastwood in the late game",
      body: "The Kings win 90–84 to pull level with the Eagles for second.", game: "2026-10-10", team: "Hilltop Kings" },
    { date: "2026-10-06", tag: "League", title: "Playoff format confirmed",
      body: "The top four teams make the playoffs after Week 10. First and second get twice-to-beat in the semifinals." },
    { date: "2026-09-01", tag: "League", title: "Season 2026 tips off September 5",
      body: "Six teams, ten Saturdays, three games a night at Cubao Covered Court from 5pm." }
  ]
};
