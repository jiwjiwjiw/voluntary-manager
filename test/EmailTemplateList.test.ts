import { describe, expect, it } from 'vitest'
import { EmailTemplateList } from '../src/EmailTemplateList'
import { FakeSheet, FakeSpreadsheet } from './fakeSpreadsheet'

const headers = ['Type', 'Condition', 'Texte']

describe('EmailTemplateList', () => {
  it('keeps the sheets that have exactly the three template headers', () => {
    const modele = new FakeSheet('modèle courriel', [headers, ['sujet', '', 'x']])
    const autre = new FakeSheet('modèle 2', [headers])
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut']
    ])
    const list = new EmailTemplateList(
      new FakeSpreadsheet([personnes, modele, autre]) as any
    ).list
    expect(list.map(s => s.getName())).toEqual(['modèle courriel', 'modèle 2'])
  })

  it('rejects a sheet with the right headers but extra columns', () => {
    const wide = new FakeSheet('large', [headers], { maxColumns: 4 })
    const list = new EmailTemplateList(new FakeSpreadsheet([wide]) as any).list
    expect(list).toEqual([])
  })

  it('is empty when no sheet matches', () => {
    const list = new EmailTemplateList(new FakeSpreadsheet([]) as any).list
    expect(list).toEqual([])
  })
})
