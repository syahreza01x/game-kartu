import test from 'node:test'
import assert from 'node:assert/strict'
import { applyAction, botAction, eligible, newGame } from './game.ts'

function controlledGame() {
  const game = newGame('hard')
  game.players[0].role = 'liberal'
  game.players[1].role = 'fascist'
  game.players[2].role = 'leader'
  game.players[3].role = 'liberal'
  game.players[4].role = 'liberal'
  game.president = 0
  return game
}
function elect(game, nominee = 1) {
  let state = applyAction(game, { type: 'nominate', target: nominee })
  for (let i = 0; i < 5; i++) state = applyAction(state, { type: 'vote', player: i, yes: true })
  return state
}

test('peran dan dek awal tepat untuk lima pemain', () => {
  const game = newGame('medium')
  assert.deepEqual(game.players.map(p => p.role).sort(), ['fascist','leader','liberal','liberal','liberal'])
  assert.equal(game.deck.filter(p => p === 'liberal').length, 6)
  assert.equal(game.deck.filter(p => p === 'fascist').length, 11)
})

test('tiga pemerintahan gagal mengesahkan kartu tanpa kekuasaan', () => {
  let game = controlledGame()
  game.deck = ['fascist', ...game.deck]
  game.fascist = 2
  for (let round = 0; round < 3; round++) {
    game = applyAction(game, { type: 'nominate', target: eligible(game)[0] })
    for (let i = 0; i < 5; i++) game = applyAction(game, { type: 'vote', player: i, yes: false })
  }
  assert.equal(game.fascist, 3)
  assert.equal(game.failed, 0)
  assert.equal(game.phase, 'nomination')
  assert.equal(game.chancellorLast, null)
})

test('ketua membuang satu dan wakil memilih satu; kekuasaan intip tidak mengubah dek', () => {
  let game = controlledGame()
  game.fascist = 2
  game.deck = ['fascist','liberal','fascist','liberal','fascist','liberal',...game.deck]
  game = elect(game)
  assert.equal(game.phase, 'presidentDiscard')
  assert.deepEqual(game.hand, ['fascist','liberal','fascist'])
  game = applyAction(game, { type: 'discard', index: 1 })
  game = applyAction(game, { type: 'enact', index: 0 })
  assert.equal(game.phase, 'peek')
  assert.deepEqual(game.peeked, game.deck.slice(0,3))
  const deck = [...game.deck]
  game = applyAction(game, { type: 'acknowledgePeek' })
  assert.deepEqual(game.deck, deck)
  assert.equal(game.phase, 'nomination')
})

test('pemimpin terpilih setelah tiga kendali memenangkan permainan', () => {
  let game = controlledGame()
  game.fascist = 3
  game = elect(game, 2)
  assert.equal(game.winner, 'fascist')
  assert.equal(game.phase, 'finished')
  assert.equal(game.hand.length, 0)
})

test('keluarkan pemimpin memenangkan kubu reformis', () => {
  let game = controlledGame()
  game.fascist = 4
  game.phase = 'execute'
  game = applyAction(game, { type:'execute', target: 2 })
  assert.equal(game.winner, 'liberal')
  assert.equal(game.players[2].alive, false)
})

test('veto disetujui dihitung kegagalan pemerintahan', () => {
  let game = controlledGame()
  game.fascist = 5
  game.deck = ['fascist','fascist','fascist',...game.deck]
  game = elect(game)
  game = applyAction(game, { type: 'discard', index: 0 })
  game = applyAction(game, { type: 'proposeVeto' })
  game = applyAction(game, { type: 'answerVeto', agree: true })
  assert.equal(game.failed, 1)
  assert.equal(game.hand.length, 0)
  assert.equal(game.phase, 'nomination')
})

test('bot menyelesaikan permainan dari setiap tingkat kesulitan', () => {
  for (const difficulty of ['easy','medium','hard']) {
    for (let run = 0; run < 30; run++) {
      let game = newGame(difficulty)
      let steps = 0
      while (!game.winner && steps++ < 600) {
        let action = botAction(game)
        if (!action) {
          if (game.phase === 'nomination') action = { type:'nominate', target: eligible(game)[0] }
          else if (game.phase === 'vote') action = { type:'vote', player:0, yes: true }
          else if (game.phase === 'presidentDiscard') action = { type:'discard', index:0 }
          else if (game.phase === 'chancellorChoose') action = { type:'enact', index:0 }
          else if (game.phase === 'vetoResponse') action = { type:'answerVeto', agree:false }
          else if (game.phase === 'peek') action = { type:'acknowledgePeek' }
          else if (game.phase === 'execute') action = { type:'execute', target: game.players.findIndex((p,i) => i !== 0 && p.alive) }
          else throw new Error(`Fase tidak dikenal: ${game.phase}`)
        }
        const next = applyAction(game, action)
        assert.notEqual(next, game, `Aksi macet pada fase ${game.phase}`)
        game = next
      }
      assert.ok(game.winner, `Permainan tidak berakhir: ${difficulty} / ${run}`)
    }
  }
})
