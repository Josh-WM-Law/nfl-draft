export type NflTeam = {
  id: string
  city: string
  nickname: string
  fullName: string
  conference: 'AFC' | 'NFC'
  division: 'East' | 'North' | 'South' | 'West'
  primaryColor: string
}

// Full 32-team roster. Primary color chosen to be visually distinct enough
// that adjacent tiles read as different teams.
export const NFL_TEAMS: NflTeam[] = [
  { id: 'BUF', city: 'Buffalo', nickname: 'Bills', fullName: 'Buffalo Bills', conference: 'AFC', division: 'East', primaryColor: '#00338D' },
  { id: 'MIA', city: 'Miami', nickname: 'Dolphins', fullName: 'Miami Dolphins', conference: 'AFC', division: 'East', primaryColor: '#008E97' },
  { id: 'NE', city: 'New England', nickname: 'Patriots', fullName: 'New England Patriots', conference: 'AFC', division: 'East', primaryColor: '#002244' },
  { id: 'NYJ', city: 'New York', nickname: 'Jets', fullName: 'New York Jets', conference: 'AFC', division: 'East', primaryColor: '#125740' },

  { id: 'BAL', city: 'Baltimore', nickname: 'Ravens', fullName: 'Baltimore Ravens', conference: 'AFC', division: 'North', primaryColor: '#241773' },
  { id: 'CIN', city: 'Cincinnati', nickname: 'Bengals', fullName: 'Cincinnati Bengals', conference: 'AFC', division: 'North', primaryColor: '#FB4F14' },
  { id: 'CLE', city: 'Cleveland', nickname: 'Browns', fullName: 'Cleveland Browns', conference: 'AFC', division: 'North', primaryColor: '#FF3C00' },
  { id: 'PIT', city: 'Pittsburgh', nickname: 'Steelers', fullName: 'Pittsburgh Steelers', conference: 'AFC', division: 'North', primaryColor: '#FFB612' },

  { id: 'HOU', city: 'Houston', nickname: 'Texans', fullName: 'Houston Texans', conference: 'AFC', division: 'South', primaryColor: '#03202F' },
  { id: 'IND', city: 'Indianapolis', nickname: 'Colts', fullName: 'Indianapolis Colts', conference: 'AFC', division: 'South', primaryColor: '#002C5F' },
  { id: 'JAX', city: 'Jacksonville', nickname: 'Jaguars', fullName: 'Jacksonville Jaguars', conference: 'AFC', division: 'South', primaryColor: '#006778' },
  { id: 'TEN', city: 'Tennessee', nickname: 'Titans', fullName: 'Tennessee Titans', conference: 'AFC', division: 'South', primaryColor: '#0C2340' },

  { id: 'DEN', city: 'Denver', nickname: 'Broncos', fullName: 'Denver Broncos', conference: 'AFC', division: 'West', primaryColor: '#FB4F14' },
  { id: 'KC', city: 'Kansas City', nickname: 'Chiefs', fullName: 'Kansas City Chiefs', conference: 'AFC', division: 'West', primaryColor: '#E31837' },
  { id: 'LV', city: 'Las Vegas', nickname: 'Raiders', fullName: 'Las Vegas Raiders', conference: 'AFC', division: 'West', primaryColor: '#000000' },
  { id: 'LAC', city: 'Los Angeles', nickname: 'Chargers', fullName: 'Los Angeles Chargers', conference: 'AFC', division: 'West', primaryColor: '#0080C6' },

  { id: 'DAL', city: 'Dallas', nickname: 'Cowboys', fullName: 'Dallas Cowboys', conference: 'NFC', division: 'East', primaryColor: '#041E42' },
  { id: 'NYG', city: 'New York', nickname: 'Giants', fullName: 'New York Giants', conference: 'NFC', division: 'East', primaryColor: '#0B2265' },
  { id: 'PHI', city: 'Philadelphia', nickname: 'Eagles', fullName: 'Philadelphia Eagles', conference: 'NFC', division: 'East', primaryColor: '#004C54' },
  { id: 'WAS', city: 'Washington', nickname: 'Commanders', fullName: 'Washington Commanders', conference: 'NFC', division: 'East', primaryColor: '#5A1414' },

  { id: 'CHI', city: 'Chicago', nickname: 'Bears', fullName: 'Chicago Bears', conference: 'NFC', division: 'North', primaryColor: '#0B162A' },
  { id: 'DET', city: 'Detroit', nickname: 'Lions', fullName: 'Detroit Lions', conference: 'NFC', division: 'North', primaryColor: '#0076B6' },
  { id: 'GB', city: 'Green Bay', nickname: 'Packers', fullName: 'Green Bay Packers', conference: 'NFC', division: 'North', primaryColor: '#203731' },
  { id: 'MIN', city: 'Minnesota', nickname: 'Vikings', fullName: 'Minnesota Vikings', conference: 'NFC', division: 'North', primaryColor: '#4F2683' },

  { id: 'ATL', city: 'Atlanta', nickname: 'Falcons', fullName: 'Atlanta Falcons', conference: 'NFC', division: 'South', primaryColor: '#A71930' },
  { id: 'CAR', city: 'Carolina', nickname: 'Panthers', fullName: 'Carolina Panthers', conference: 'NFC', division: 'South', primaryColor: '#0085CA' },
  { id: 'NO', city: 'New Orleans', nickname: 'Saints', fullName: 'New Orleans Saints', conference: 'NFC', division: 'South', primaryColor: '#9F8958' },
  { id: 'TB', city: 'Tampa Bay', nickname: 'Buccaneers', fullName: 'Tampa Bay Buccaneers', conference: 'NFC', division: 'South', primaryColor: '#D50A0A' },

  { id: 'ARI', city: 'Arizona', nickname: 'Cardinals', fullName: 'Arizona Cardinals', conference: 'NFC', division: 'West', primaryColor: '#97233F' },
  { id: 'LAR', city: 'Los Angeles', nickname: 'Rams', fullName: 'Los Angeles Rams', conference: 'NFC', division: 'West', primaryColor: '#003594' },
  { id: 'SF', city: 'San Francisco', nickname: '49ers', fullName: 'San Francisco 49ers', conference: 'NFC', division: 'West', primaryColor: '#AA0000' },
  { id: 'SEA', city: 'Seattle', nickname: 'Seahawks', fullName: 'Seattle Seahawks', conference: 'NFC', division: 'West', primaryColor: '#002244' },
]

export const NFL_TEAM_BY_ID = new Map(NFL_TEAMS.map((t) => [t.id, t]))
