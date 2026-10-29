import { describe, expect, it } from 'vitest'
import { EmailTemplateList } from '../src/EmailTemplateList'
import { FakeSheet, FakeSpreadsheet } from './fakeSpreadsheet'

const headers = ['Type', 'Condition', 'Texte']
const listOf = (...sheets: FakeSheet[]) =>
  new EmailTemplateList(new FakeSpreadsheet(sheets) as any).list.map(s =>
    s.getName()
  )

describe('EmailTemplateList', () => {
  it('keeps the sheets that have the three template headers', () => {
    const modele = new FakeSheet('modèle courriel', [headers, ['sujet', '', 'x']])
    const autre = new FakeSheet('modèle 2', [headers])
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut']
    ])
    expect(listOf(personnes, modele, autre)).toEqual(['modèle courriel', 'modèle 2'])
  })

  it('accepts a sheet with spare columns, as created from scratch', () => {
    const wide = new FakeSheet('large', [headers], { maxColumns: 26 })
    expect(listOf(wide)).toEqual(['large'])
  })

  it('ignores case and spaces in the headers', () => {
    const sheet = new FakeSheet('m', [[' type', 'CONDITION', 'Texte ']])
    expect(listOf(sheet)).toEqual(['m'])
  })

  it('rejects a sheet whose third header is not "Texte"', () => {
    const sheet = new FakeSheet('presque', [['Type', 'Condition', 'Autre']])
    expect(listOf(sheet)).toEqual([])
  })

  it('rejects a sheet with fewer than three columns', () => {
    const narrow = new FakeSheet('étroite', [['Type', 'Condition']])
    expect(listOf(narrow)).toEqual([])
  })

  it('is empty when no sheet matches', () => {
    expect(listOf()).toEqual([])
  })
})
