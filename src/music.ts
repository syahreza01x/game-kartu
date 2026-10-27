import { useEffect, useRef, useState } from 'react'

const progression = [
  [146.83, 220, 293.66], // D minor
  [116.54, 174.61, 233.08], // B flat major
  [130.81, 196, 261.63], // C major
  [110, 164.81, 220] // A minor
]

function playNote(context: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.08)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start(start)
  oscillator.stop(start + duration + 0.02)
}

export function useMusic() {
  const [musicOn, setMusicOn] = useState(false)
  const timer = useRef<number | null>(null)
  const nextTime = useRef(0)
  const beat = useRef(0)

  useEffect(() => {
    if (!musicOn) return
    const audio = new AudioContext()
    nextTime.current = audio.currentTime + 0.06
    beat.current = 0
    const schedule = () => {
      const secondsPerBeat = 60 / 78
      while (nextTime.current < audio.currentTime + 0.35) {
        const step = beat.current % 16
        const chord = progression[Math.floor(step / 4)]
        const time = nextTime.current
        if (step % 4 === 0) {
          playNote(audio, chord[0] / 2, time, secondsPerBeat * 3.7, 0.045)
          chord.forEach((pitch, i) => playNote(audio, pitch, time + i * 0.025, secondsPerBeat * 3, 0.015))
        }
        if (step % 2 === 0) playNote(audio, chord[step % 4 === 0 ? 1 : 2] * 2, time, secondsPerBeat * 1.5, 0.011)
        beat.current++
        nextTime.current += secondsPerBeat
      }
    }
    schedule()
    timer.current = window.setInterval(schedule, 180)
    return () => {
      if (timer.current !== null) window.clearInterval(timer.current)
      void audio.close()
    }
  }, [musicOn])

  return { musicOn, toggleMusic: () => setMusicOn(value => !value), stopMusic: () => setMusicOn(false) }
}
