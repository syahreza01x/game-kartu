export type Party = 'liberal' | 'fascist'
export type Policy = { id: number; party: Party }
export const policyTitles = [
  'Hak Berserikat', 'Pers Merdeka', 'Pendidikan Terbuka', 'Suara Warga', 'Sidang Terbuka', 'Perlindungan Sipil',
  'Sensor Pers', 'Jam Malam', 'Daftar Warga', 'Pengawasan Kota', 'Larangan Berkumpul', 'Kantor Propaganda',
  'Surat Wajib', 'Kuasa Darurat', 'Pengadilan Khusus', 'Sumpah Setia', 'Kekuasaan Tunggal'
] as const
export type Role = Party | 'leader'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Phase = 'nomination' | 'vote' | 'presidentDiscard' | 'chancellorChoose' | 'vetoResponse' | 'peek' | 'execute' | 'finished'
export type Player = { name: string; role: Role; alive: boolean }
export type Log = { text: string; kind?: 'important' | 'danger' }
export type Game = {
  players: Player[]; phase: Phase; president: number; candidate: number | null
  votes: (boolean | null)[]; deck: Policy[]; discard: Policy[]; hand: Policy[]
  liberal: number; fascist: number; failed: number; presidentLast: number | null; chancellorLast: number | null
  winner: Party | null; reason: string; logs: Log[]; difficulty: Difficulty; round: number
  peeked: Policy[]; vetoProposed: boolean; announcement: string
}

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}
const names = ['Kamu', 'Mira', 'Raka', 'Nadia', 'Bima']
const label = (g: Game, i: number) => g.players[i].name
const note = (g: Game, text: string, kind?: Log['kind']) => { g.logs = [...g.logs.slice(-19), { text, kind }]; g.announcement = text }
const living = (g: Game, i: number) => g.players[i]?.alive === true
export const nextAlive = (g: Game, i: number): number => {
  let next = i
  do { next = (next + 1) % g.players.length } while (!living(g, next))
  return next
}
export const eligible = (g: Game): number[] => g.players.flatMap((p, i) => p.alive && i !== g.president && i !== g.chancellorLast ? [i] : [])
export function newGame(difficulty: Difficulty): Game {
  const roles = shuffle<Role>(['liberal', 'liberal', 'liberal', 'fascist', 'leader'])
  const g: Game = {
    players: roles.map((role, i) => ({ name: names[i], role, alive: true })),
    phase: 'nomination', president: Math.floor(Math.random() * 5), candidate: null,
    votes: Array(5).fill(null), deck: shuffle<Policy>(policyTitles.map((_, id) => ({ id, party: id < 6 ? 'liberal' : 'fascist' }))),
    discard: [], hand: [], liberal: 0, fascist: 0, failed: 0, presidentLast: null, chancellorLast: null,
    winner: null, reason: '', logs: [], difficulty, round: 1, peeked: [], vetoProposed: false, announcement: ''
  }
  note(g, `Sidang dibuka. ${label(g, g.president)} menjadi ketua sidang pertama.`)
  return g
}
function prepareDeck(g: Game) {
  if (g.deck.length < 3) {
    g.deck = shuffle([...g.deck, ...g.discard]); g.discard = []
    note(g, 'Arsip kebijakan diacak ulang.')
  }
}
function finish(g: Game, winner: Party, reason: string) {
  g.winner = winner; g.reason = reason; g.phase = 'finished'; note(g, reason, 'important')
}
function advance(g: Game) {
  g.president = nextAlive(g, g.president); g.candidate = null
  g.votes = Array(5).fill(null); g.hand = []; g.peeked = []; g.vetoProposed = false
  g.round++; g.phase = 'nomination'
  note(g, `Sidang ${g.round}. ${label(g, g.president)} memegang palu.`)
}
function enact(g: Game, policy: Policy, chaos = false) {
  if (policy.party === 'liberal') g.liberal++
  else g.fascist++
  note(g, `Kebijakan ${policyTitles[policy.id]} (${policy.party === 'liberal' ? 'Reformasi' : 'Kendali'}) disahkan${chaos ? ' oleh pemungutan otomatis' : ''}.`, policy.party === 'fascist' ? 'danger' : 'important')
  if (g.liberal >= 5) { finish(g, 'liberal', 'Lima reformasi disahkan. Reformis menang.'); return }
  if (g.fascist >= 6) { finish(g, 'fascist', 'Enam kebijakan kendali disahkan. Otoritarian menang.'); return }
  if (!chaos && policy.party === 'fascist' && g.fascist === 3) {
    prepareDeck(g); g.peeked = g.deck.slice(0, 3); g.phase = 'peek'
    note(g, `${label(g, g.president)} berhak mengintip tiga kebijakan berikutnya.`)
    return
  }
  if (!chaos && policy.party === 'fascist' && (g.fascist === 4 || g.fascist === 5)) { g.phase = 'execute'; return }
  advance(g)
}
function failedElection(g: Game) {
  g.failed++
  if (g.failed === 3) {
    g.failed = 0; g.presidentLast = null; g.chancellorLast = null
    prepareDeck(g)
    const policy = g.deck.shift()!
    note(g, 'Tiga pemerintahan gagal. Kebijakan teratas berlaku tanpa kekuasaan presiden.', 'danger')
    enact(g, policy, true)
  } else advance(g)
}
export type Action =
  | { type: 'nominate'; target: number }
  | { type: 'vote'; player: number; yes: boolean }
  | { type: 'discard'; index: number }
  | { type: 'enact'; index: number }
  | { type: 'proposeVeto' }
  | { type: 'answerVeto'; agree: boolean }
  | { type: 'acknowledgePeek' }
  | { type: 'execute'; target: number }

export function applyAction(current: Game, action: Action): Game {
  const g: Game = structuredClone(current)
  if (g.phase === 'finished') return current
  switch (action.type) {
    case 'nominate':
      if (g.phase !== 'nomination' || !eligible(g).includes(action.target)) return current
      g.candidate = action.target; g.votes = g.players.map(p => p.alive ? null : false); g.phase = 'vote'
      note(g, `${label(g, g.president)} mencalonkan ${label(g, action.target)} sebagai wakil.`)
      break
    case 'vote':
      if (g.phase !== 'vote' || !living(g, action.player) || g.votes[action.player] !== null) return current
      g.votes[action.player] = action.yes
      if (g.players.every((p, i) => !p.alive || g.votes[i] !== null)) {
        const yes = g.votes.filter(Boolean).length
        note(g, `Pemungutan suara: ${yes} setuju, ${g.players.filter(p => p.alive).length - yes} menolak. ${g.players.flatMap((p, i) => p.alive ? [`${p.name}: ${g.votes[i] ? 'setuju' : 'tolak'}`] : []).join(' · ')}.`, yes > g.players.filter(p => p.alive).length / 2 ? 'important' : 'danger')
        if (yes <= g.players.filter(p => p.alive).length / 2) failedElection(g)
        else {
          g.failed = 0; g.presidentLast = g.president; g.chancellorLast = g.candidate
          if (g.fascist >= 3 && g.players[g.candidate!].role === 'leader') {
            finish(g, 'fascist', `${label(g, g.candidate!)} terpilih sebagai wakil setelah tiga kebijakan kendali. Otoritarian menang.`)
          } else {
            prepareDeck(g); g.hand = g.deck.splice(0, 3); g.phase = 'presidentDiscard'
            note(g, `${label(g, g.president)} menerima tiga berkas kebijakan.`)
          }
        }
      }
      break
    case 'discard':
      if (g.phase !== 'presidentDiscard' || action.index < 0 || action.index >= 3) return current
      g.discard.push(g.hand.splice(action.index, 1)[0]); g.phase = 'chancellorChoose'
      note(g, `${label(g, g.president)} meneruskan dua berkas tertutup kepada ${label(g, g.candidate!)}.`)
      break
    case 'enact':
      if (g.phase !== 'chancellorChoose' || action.index < 0 || action.index >= 2) return current
      const policy = g.hand.splice(action.index, 1)[0]
      g.discard.push(g.hand.pop()!); enact(g, policy)
      break
    case 'proposeVeto':
      if (g.phase !== 'chancellorChoose' || g.fascist < 5) return current
      g.vetoProposed = true; g.phase = 'vetoResponse'
      note(g, `${label(g, g.candidate!)} meminta hak veto.`)
      break
    case 'answerVeto':
      if (g.phase !== 'vetoResponse') return current
      if (action.agree) {
        g.discard.push(...g.hand); g.hand = []; note(g, 'Ketua sidang menyetujui veto. Pemilihan ini dihitung gagal.', 'danger'); failedElection(g)
      } else { g.phase = 'chancellorChoose'; note(g, 'Ketua sidang menolak veto. Wakil harus mengesahkan satu berkas.') }
      break
    case 'acknowledgePeek':
      if (g.phase !== 'peek') return current
      note(g, `${label(g, g.president)} selesai mengintip arsip. Urutan dek tidak berubah.`)
      advance(g)
      break
    case 'execute':
      if (g.phase !== 'execute' || !living(g, action.target) || action.target === g.president) return current
      g.players[action.target].alive = false
      note(g, `${label(g, action.target)} dikeluarkan dari sidang.`, 'danger')
      if (g.players[action.target].role === 'leader') finish(g, 'liberal', 'Pemimpin otoritarian dikeluarkan. Reformis menang.')
      else advance(g)
      break
  }
  return g
}

const random = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)]
const isTeam = (g: Game, i: number) => g.players[i].role !== 'liberal'
const knowsAlly = (g: Game, actor: number, other: number) => isTeam(g, actor) && isTeam(g, other)
const skill = (g: Game) => g.difficulty === 'hard' ? .9 : g.difficulty === 'medium' ? .65 : .28
export function botAction(g: Game): Action | null {
  const actor = g.phase === 'nomination' || g.phase === 'presidentDiscard' || g.phase === 'vetoResponse' || g.phase === 'peek' || g.phase === 'execute' ? g.president : g.phase === 'chancellorChoose' ? g.candidate! : -1
  if (actor === 0) return null
  if (g.phase === 'nomination') {
    const options = eligible(g)
    const ally = options.find(i => knowsAlly(g, actor, i))
    const dangerousLeader = isTeam(g, actor) && g.fascist >= 3 ? options.find(i => g.players[i].role === 'leader') : undefined
    return { type: 'nominate', target: dangerousLeader !== undefined && Math.random() < skill(g) ? dangerousLeader : ally !== undefined && Math.random() < skill(g) ? ally : random(options) }
  }
  if (g.phase === 'vote') {
    const voter = g.votes.findIndex((v, i) => i > 0 && g.players[i].alive && v === null)
    if (voter < 0) return null
    const ally = knowsAlly(g, voter, g.candidate!) || knowsAlly(g, voter, g.president)
    const leaderWin = isTeam(g, voter) && g.fascist >= 3 && g.players[g.candidate!].role === 'leader'
    const approve = leaderWin || (ally && Math.random() < skill(g)) || (g.failed === 2 && Math.random() < .85) || Math.random() < .58
    return { type: 'vote', player: voter, yes: approve }
  }
  if (g.phase === 'presidentDiscard') {
    const preferred: Party = isTeam(g, actor) ? 'liberal' : 'fascist'
    const idx = g.hand.findIndex(p => p.party === preferred)
    return { type: 'discard', index: idx >= 0 && Math.random() < skill(g) ? idx : Math.floor(Math.random() * 3) }
  }
  if (g.phase === 'chancellorChoose') {
    if (g.fascist >= 5 && !g.vetoProposed && g.hand.every(p => p.party !== (isTeam(g, actor) ? 'fascist' : 'liberal')) && Math.random() < skill(g)) return { type: 'proposeVeto' }
    const preferred: Party = isTeam(g, actor) ? 'fascist' : 'liberal'
    const idx = g.hand.findIndex(p => p.party === preferred)
    return { type: 'enact', index: idx >= 0 && Math.random() < skill(g) ? idx : Math.floor(Math.random() * 2) }
  }
  if (g.phase === 'vetoResponse') return { type: 'answerVeto', agree: Math.random() < (isTeam(g, actor) ? .45 : .65) }
  if (g.phase === 'peek') return { type: 'acknowledgePeek' }
  if (g.phase === 'execute') {
    const options = g.players.flatMap((p, i) => p.alive && i !== actor ? [i] : [])
    const suspected = isTeam(g, actor) ? options.filter(i => !knowsAlly(g, actor, i)) : options
    const target = suspected.length && Math.random() < skill(g) ? random(suspected) : random(options)
    return { type: 'execute', target }
  }
  return null
}
export function publicRole(role: Role): string { return role === 'liberal' ? 'Reformis' : role === 'fascist' ? 'Otoritarian' : 'Pemimpin Otoritarian' }
export function policyName(policy: Party): string { return policy === 'liberal' ? 'REFORMASI' : 'KENDALI' }
