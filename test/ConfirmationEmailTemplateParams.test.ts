import { describe, expect, it } from 'vitest'
import {
  ConfirmationEmailData,
  ConfirmationEmailTemplateParams
} from '../src/ConfirmationEmailTemplateParams'

const params = new ConfirmationEmailTemplateParams()

function data (overrides: Partial<ConfirmationEmailData> = {}): ConfirmationEmailData {
  return {
    personData: { nom: 'Dupont', prenom: 'Marie', email: 'marie@example.org' },
    libelle: 'Marie Dupont',
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

  it('escapes the inserted values', () => {
    const d = data({
      personData: { nom: 'O<Neil', prenom: 'A&B', email: 'a@b.c' },
      listeContreparties: ['boisson (<2)']
    })
    expect(params.insertData('%PRENOM% %NOM% %LISTE_CONTREPARTIES%', d)).toBe(
      'A&amp;B O&lt;Neil <ul><li>boisson (&lt;2)</li></ul>'
    )
  })

  it('inserts the texte perso escaped, with its line breaks, or nothing', () => {
    const d = data({ textePerso: 'Merci <3\nà bientôt' })
    expect(params.insertData('<p>%PERSO%</p>', d)).toBe('<p>Merci &lt;3<br>à bientôt</p>')
    expect(params.insertData('<p>%PERSO%</p>', data())).toBe('<p></p>')
  })

  it('inserts $ sequences of a value literally', () => {
    const d = data({ personData: { nom: 'a$&b', prenom: "c$'d", email: '' } })
    expect(params.insertData('[%NOM%][%PRENOM%]', d)).toBe("[a$&amp;b][c$&#39;d]")
  })
})

describe('insertSubjectData', () => {
  it('replaces the person markers without escaping', () => {
    const d = data({ personData: { nom: 'A&B', prenom: 'Marie', email: 'm@x.y' } })
    expect(params.insertSubjectData('%PRENOM% %NOM% <%EMAIL%> %NOM%', d)).toBe(
      'Marie A&B <m@x.y> A&B'
    )
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
      'est bénévole et a au moins un code',
      'a un texte perso'
    ])
  })

  it('includes « a un texte perso » blocks only for a non-empty texte perso', () => {
    expect(params.evaluateCondition('a un texte perso', data())).toBe(false)
    expect(params.evaluateCondition('a un texte perso', data({ textePerso: '' }))).toBe(false)
    expect(params.evaluateCondition('a un texte perso', data({ textePerso: 'merci' }))).toBe(true)
  })
})
