import { afterEach, describe, expect, it, vi } from 'vitest'
import { empreinte, EmpreintesStore } from '../src/empreintes'
import { rowsARenvoyer, updateStatuts } from '../src/updateStatuts'
import { updatePersonnes } from '../src/updatePersonnes'
import {
  FakeSheet,
  installPropertiesService,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('empreinte', () => {
  it('ignores the order of the lists and distinguishes their contents', () => {
    const a = empreinte({ listeEngagements: ['e1', 'e2'], listeContreparties: ['c'] })
    const b = empreinte({ listeEngagements: ['e2', 'e1'], listeContreparties: ['c'] })
    const c = empreinte({ listeEngagements: ['e1'], listeContreparties: ['c'] })
    const d = empreinte({ listeEngagements: ['e1', 'e2'], listeContreparties: [] })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
    expect(a).not.toBe(d)
    expect(a).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('EmpreintesStore', () => {
  it('reads, writes once on save, follows renames', () => {
    const { values } = installPropertiesService({ empreintes: '{"a":"1"}' })
    const store = new EmpreintesStore()
    expect(store.get('a')).toBe('1')
    store.set('b', '2')
    store.rename(new Map([['a', 'A'], ['zz', 'ZZ']]))
    store.save()
    expect(JSON.parse(values.empreintes)).toEqual({ A: '1', b: '2' })
  })

  it('does not write when nothing changed and survives a broken property', () => {
    const { values, properties } = installPropertiesService({ empreintes: 'not json' })
    const spy = vi.spyOn(properties, 'setProperty')
    const store = new EmpreintesStore()
    expect(store.get('a')).toBeUndefined()
    store.save()
    expect(spy).not.toHaveBeenCalled()
    expect(values.empreintes).toBe('not json')
  })
})

describe('rowsARenvoyer', () => {
  const person = (row: number, statut: string, engagements: string[]) => ({
    row,
    statut,
    libelle: `p${row}`,
    personData: { nom: 'n', prenom: 'p', email: 'e' },
    listeEngagements: engagements,
    listeContreparties: [],
    estArtiste: false,
    estBenevole: false
  })

  it('flags sent people whose fingerprint changed, and only them', () => {
    const unchanged = person(2, 'envoyé', ['e'])
    const changed = person(3, 'réception confirmée', ['e', 'f'])
    const neverSent = person(4, 'envoyé', ['x'])
    const toSend = person(5, 'à envoyer', ['y'])
    const store = new Map([
      ['p2', empreinte(unchanged)],
      ['p3', empreinte({ listeEngagements: ['e'], listeContreparties: [] })],
      ['p5', 'old']
    ])
    expect(rowsARenvoyer([unchanged, changed, neverSent, toSend], store)).toEqual([3])
  })

  it('flags a sent person given a texte perso they did not receive', () => {
    const base = person(2, 'envoyé', ['e'])
    const avec = (texte: string, row = 2) => ({ ...person(row, 'envoyé', ['e']), textePerso: texte })
    const sansTexte = new Map([['p2', empreinte(base)]])
    const avecTexte = new Map([['p2', empreinte(avec('merci'))]])

    expect(rowsARenvoyer([avec('merci')], sansTexte)).toEqual([2])
    expect(rowsARenvoyer([avec('merci')], avecTexte)).toEqual([])
    expect(rowsARenvoyer([avec('merci beaucoup')], avecTexte)).toEqual([2])
    // erasing the text calls for no new mail
    expect(rowsARenvoyer([base], avecTexte)).toEqual([])
    // sent before fingerprints existed: a text is new to them
    expect(rowsARenvoyer([avec('merci', 3)], new Map())).toEqual([3])
    // never sent: « à envoyer » already covers it
    expect(rowsARenvoyer([{ ...avec('merci'), statut: 'à envoyer' }], sansTexte)).toEqual([])
  })

  it('keeps the fingerprints recorded before the texte perso existed', () => {
    const d = { listeEngagements: ['e'], listeContreparties: ['c'] }
    expect(empreinte({ ...d, textePerso: '' })).toBe(empreinte(d))
    expect(empreinte({ ...d, textePerso: ' ' })).toBe(empreinte(d))
    expect(empreinte({ ...d, textePerso: 'x' })).toMatch(/^[0-9a-f]{8}:[0-9a-f]{8}$/)
  })
})

describe('updateStatuts', () => {
  it('sets « à renvoyer » on the sheet for out-of-date confirmations', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', 'Marie', 'Marie Dupont', 'm@example.org', 'envoyé'],
      ['Martin', 'Jean', 'Jean Martin', 'j@example.org', 'envoyé']
    ])
    const engagements = new FakeSheet('engagements', [
      ['personne', 'plage'],
      ['Marie Dupont', 'p1'],
      ['Marie Dupont', 'p2'],
      ['Jean Martin', 'p1']
    ])
    installSpreadsheetApp([personnes, engagements])
    const sent = (e: string[]) => empreinte({ listeEngagements: e, listeContreparties: [] })
    installPropertiesService({
      empreintes: JSON.stringify({
        'Marie Dupont': sent(['p1']),
        'Jean Martin': sent(['p1'])
      })
    })

    updateStatuts()

    expect(personnes.column(5)).toEqual(['à renvoyer', 'envoyé'])
  })
})

describe('fingerprint of a renamed person', () => {
  it('moves with the person', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', 'Maria', 'Marie Dupont', 'm@example.org', 'envoyé']
    ])
    installSpreadsheetApp([personnes])
    const { values } = installPropertiesService({
      empreintes: JSON.stringify({ 'Marie Dupont': 'abc' })
    })

    updatePersonnes()

    expect(JSON.parse(values.empreintes)).toEqual({ 'Maria Dupont': 'abc' })
  })
})
