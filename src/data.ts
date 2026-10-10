import type { Library } from './types'

export const starterLibrary: Library = {
  binders: [
    {
      id: 'binder-blue',
      name: 'Classeur Bleu',
      color: '#4C9BFF',
      scores: [
        { id: 'score-1', title: 'Clair de lune', composer: 'Claude Debussy', instrument: 'Piano', page: 12, notes: 'Suite bergamasque' },
        { id: 'score-2', title: 'Gymnopédie n°1', composer: 'Erik Satie', instrument: 'Piano', page: 18, notes: '' },
        { id: 'score-3', title: 'La Campanella', composer: 'Franz Liszt', instrument: 'Piano', page: 25, notes: '' },
      ],
    },
    {
      id: 'binder-green',
      name: 'Classeur Vert',
      color: '#4FD1A1',
      scores: [
        { id: 'score-4', title: 'Le Cygne', composer: 'Camille Saint-Saëns', instrument: 'Violoncelle', page: 4, notes: 'Carnaval des animaux' },
        { id: 'score-5', title: 'Méditation de Thaïs', composer: 'Jules Massenet', instrument: 'Violon', page: 9, notes: '' },
      ],
    },
    {
      id: 'binder-coral',
      name: 'Classeur Rouge',
      color: '#FF7D7D',
      scores: [
        { id: 'score-6', title: 'Prélude en do majeur', composer: 'Jean-Sébastien Bach', instrument: 'Piano', page: 2, notes: 'Clavier bien tempéré' },
      ],
    },
  ],
}
