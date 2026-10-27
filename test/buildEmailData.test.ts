import { describe, expect, it } from 'vitest'
import { buildEmailData } from '../src/sendEmails'

const fonctions = [
  ['bar', 'bénévole'],
  ['caisse', 'bénévole'],
  ['musicien', 'artiste']
]

describe('buildEmailData', () => {
  it('gathers engagements and contreparties of each recipient', () => {
    const destinataires = [
      ['Dupont', 'Marie', 'Marie Dupont', 'marie@example.org', 'à envoyer']
    ]
    const engagements = [
      ['Marie Dupont', '01.01.2021 | bar | 20:00-21:00'],
      ['Jean Martin', '01.01.2021 | caisse | 19:00-20:00'],
      ['Marie Dupont', '02.01.2021 | musicien | 20:00-22:00']
    ]
    const contreparties = [
      ['Marie Dupont', 'entrée gratuite', 'premier weekend'],
      ['Marie Dupont', 'boisson', ''],
      ['Jean Martin', 'entrée gratuite', '']
    ]

    expect(
      buildEmailData(destinataires, engagements, contreparties, fonctions)
    ).toEqual([
      {
        personData: {
          nom: 'Dupont',
          prenom: 'Marie',
          email: 'marie@example.org'
        },
        listeEngagements: [
          '01.01.2021 | bar | 20:00-21:00',
          '02.01.2021 | musicien | 20:00-22:00'
        ],
        listeContreparties: ['entrée gratuite (premier weekend)', 'boisson'],
        estArtiste: true,
        estBenevole: true
      }
    ])
  })

  it('flags neither role for a person without engagement', () => {
    const destinataires = [['Martin', 'Jean', 'Jean Martin', 'j@example.org', 'à envoyer']]
    const [data] = buildEmailData(destinataires, [], [], fonctions)
    expect(data.listeEngagements).toEqual([])
    expect(data.listeContreparties).toEqual([])
    expect(data.estArtiste).toBe(false)
    expect(data.estBenevole).toBe(false)
  })

  it('returns one entry per recipient, in sheet order', () => {
    const destinataires = [
      ['B', 'b', 'b B', 'b@example.org', 'à envoyer'],
      ['A', 'a', 'a A', 'a@example.org', 'à envoyer']
    ]
    const data = buildEmailData(destinataires, [], [], fonctions)
    expect(data.map(d => d.personData.nom)).toEqual(['B', 'A'])
  })
})
