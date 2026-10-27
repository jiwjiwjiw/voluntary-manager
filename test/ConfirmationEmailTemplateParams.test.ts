import { describe, expect, it } from 'vitest'
import {
  ConfirmationEmailData,
  ConfirmationEmailTemplateParams
} from '../src/ConfirmationEmailTemplateParams'

const params = new ConfirmationEmailTemplateParams()

function data (overrides: Partial<ConfirmationEmailData> = {}): ConfirmationEmailData {
  return {
    personData: { nom: 'Dupont', prenom: 'Marie', email: 'marie@example.org' },
    listeEngagements: ['01.01.2021 | bar | 20:00-21:00'],
    listeContreparties: [],
    estArtiste: false,
    estBenevole: true,
    ...overrides
  }
}

describe('insertData', () => {
  it('replaces every marker, including repeated ones', () => {
    const html = '<p>%PRENOM% %NOM% (%EMAIL%) %PRENOM%</p>'
    expect(params.insertData(html, data())).toBe(
      '<p>Marie Dupont (marie@example.org) Marie</p>'
    )
  })

  it('renders the lists as <ul>', () => {
    const d = data({
      listeEngagements: ['e1', 'e2'],
      listeContreparties: ['c1']
    })
    expect(params.insertData('%LISTE_ENGAGEMENTS%%LISTE_CONTREPARTIES%', d)).toBe(
      '<ul><li>e1</li><li>e2</li></ul><ul><li>c1</li></ul>'
    )
  })

  it('renders an empty list as an empty <ul>', () => {
    expect(params.insertData('%LISTE_CONTREPARTIES%', data())).toBe('<ul></ul>')
  })
})

describe('evaluateCondition', () => {
  it('always includes a block without condition', () => {
    expect(params.evaluateCondition('', data())).toBe(true)
  })

  it('includes an unknown condition rather than silently dropping the block', () => {
    expect(params.evaluateCondition('condition inconnue', data())).toBe(true)
  })

  it.each([
    ['a au moins un code', { listeContreparties: ['c'] }, true],
    ['a au moins un code', { listeContreparties: [] }, false],
    ['est artiste', { estArtiste: true }, true],
    ['est artiste', { estArtiste: false }, false],
    ['est bénévole', { estBenevole: true }, true],
    ['est bénévole', { estBenevole: false }, false],
    [
      'est artiste et a au moins un code',
      { estArtiste: true, listeContreparties: ['c'] },
      true
    ],
    [
      'est artiste et a au moins un code',
      { estArtiste: true, listeContreparties: [] },
      false
    ],
    [
      'est bénévole et a au moins un code',
      { estBenevole: true, listeContreparties: ['c'] },
      true
    ],
    [
      'est bénévole et a au moins un code',
      { estBenevole: false, listeContreparties: ['c'] },
      false
    ]
  ] as Array<[string, Partial<ConfirmationEmailData>, boolean]>)(
    '%s with %o is %s',
    (condition, overrides, expected) => {
      expect(params.evaluateCondition(condition, data(overrides))).toBe(expected)
    }
  )

  it('lists exactly the conditions it can evaluate', () => {
    expect(params.conditions).toEqual([
      'a au moins un code',
      'est artiste',
      'est bénévole',
      'est artiste et a au moins un code',
      'est bénévole et a au moins un code'
    ])
  })
})
