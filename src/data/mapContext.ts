import { JOURNEYS } from './mapData'

export function getJourneyForPassage(book: string, chapter: number): string | null {
  for (const j of JOURNEYS) {
    for (const p of j.passages) {
      if (p.book === book && chapter >= p.chapterStart && chapter <= p.chapterEnd) {
        return j.id
      }
    }
  }
  return null
}
