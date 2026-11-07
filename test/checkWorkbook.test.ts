import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  checkWorkbook,
  readWorkbook,
  verifierClasseur,
  WorkbookData
} from '../src/checkWorkbook'
import {
  FakeSheet,
  FakeSpreadsheet,
  installHtmlService,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

const personne = (
  row: number,
  nom: string,
  prenom: string,
  email: string,
  statut = 'à envoyer'
) => ({
  row,
  nom,
  prenom,
  // like composeFullName: no label unless both parts are there
  libelle: nom && prenom ? `${prenom} ${nom}` : '',
  email,
  statut
})

const plage = (
  row: number,
  date: string,
  fonction: string,
  debut: string,
  fin: string,
  nombre: string
) => ({
  row,
  date,
  fonction,
  debut,
  fin,
  nombre,
  libelle: [date, fonction, debut && fin ? `${debut}-${fin}` : '']
    .filter(Boolean)
    .join(' | ')
})

function sane (): WorkbookData {
  return {
    personnes: [personne(2, 'Dupont', 'Marie', 'marie@example.org')],
    plages: [plage(2, '01.01.2021', 'bar', '20:00', '21:00', '2')],
    engagements: [{ row: 2, personne: 'Marie Dupont', plage: '01.01.2021 | bar | 20:00-21:00' }],
    contreparties: [{ row: 2, personne: 'Marie Dupont', contrepartie: 'boisson' }],
    fonctions: [{ row: 2, nom: 'bar', type: 'bénévole' }],
    dates: ['01.01.2021'],
    feuillesManquantes: []
  }
}

const messages = (data: WorkbookData, gravite?: 'erreur' | 'avertissement') =>
  checkWorkbook(data)
    .filter(i => !gravite || i.gravite === gravite)
    .map(i => `${i.feuille}:${i.ligne ?? '-'} ${i.message}`)

describe('checkWorkbook', () => {
  it('finds nothing wrong with a consistent workbook', () => {
    expect(checkWorkbook(sane())).toEqual([])
  })

  it('reports missing sheets as errors', () => {
    const data = sane()
    data.feuillesManquantes = ['dates']
    expect(messages(data)).toEqual(['dates:- feuille manquante'])
  })

  it('checks the people: names, homonyms, emails, engagements', () => {
    const data = sane()
    data.personnes.push(
      personne(3, 'Martin', '', 'x@example.org'),
      personne(4, 'Roux', 'Ana', 'ana@example.org'),
      personne(5, 'Roux', 'Ana', 'ana2@example.org', 'envoyé'),
      personne(6, 'Petit', 'Léa', ''),
      personne(7, 'Blanc', 'Luc', '', 'envoyé'),
      personne(8, 'Noir', 'Eva', 'pas une adresse')
    )
    expect(messages(data, 'erreur')).toEqual([
      'personnes:3 Martin : nom ou prénom manquant',
      'personnes:4 Ana Roux : homonyme, les engagements ne peuvent pas être distingués',
      'personnes:5 Ana Roux : homonyme, les engagements ne peuvent pas être distingués',
      'personnes:6 Léa Petit : adresse email manquante',
      'personnes:8 Eva Noir : adresse email invalide « pas une adresse »'
    ])
    expect(messages(data, 'avertissement')).toEqual([
      'personnes:4 Ana Roux : aucun engagement',
      'personnes:5 Ana Roux : aucun engagement',
      'personnes:6 Léa Petit : aucun engagement',
      'personnes:7 Luc Blanc : adresse email manquante',
      'personnes:7 Luc Blanc : aucun engagement',
      'personnes:8 Eva Noir : aucun engagement'
    ])
  })

  it('checks the functions and their use in plages', () => {
    const data = sane()
    data.fonctions.push(
      { row: 3, nom: 'caisse', type: 'autre' },
      { row: 4, nom: '', type: 'bénévole' },
      { row: 5, nom: 'costumes', type: '' }
    )
    data.plages.push(plage(3, '01.01.2021', 'accueil', '', '', '1'))
    expect(messages(data, 'erreur')).toEqual([
      'fonctions:3 caisse : type « autre » inconnu (artiste ou bénévole)',
      'fonctions:4 nom de fonction manquant',
      'plages:3 01.01.2021 | accueil : fonction « accueil » absente de la feuille fonctions'
    ])
  })

  it('checks the plages: duplicates, dates, counts, times, over-booking', () => {
    const data = sane()
    data.plages.push(
      plage(3, '01.01.2021', 'bar', '20:00', '21:00', '2'),
      plage(4, '05.01.2021', 'bar', '21:00', '20:00', '0'),
      plage(5, '', 'bar', '20:00', '', 'deux')
    )
    data.engagements.push(
      { row: 3, personne: 'Marie Dupont', plage: '01.01.2021 | bar | 20:00-21:00' },
      { row: 4, personne: 'Marie Dupont', plage: '01.01.2021 | bar | 20:00-21:00' }
    )
    expect(messages(data, 'erreur')).toEqual([
      'plages:3 01.01.2021 | bar | 20:00-21:00 : plage en double',
      'plages:4 05.01.2021 | bar | 21:00-20:00 : nombre de personnes invalide « 0 »',
      'plages:5 bar : nombre de personnes invalide « deux »'
    ])
    expect(messages(data, 'avertissement')).toEqual([
      'plages:2 01.01.2021 | bar | 20:00-21:00 : 3 personnes engagées pour 2 places',
      'plages:3 01.01.2021 | bar | 20:00-21:00 : 3 personnes engagées pour 2 places',
      'plages:4 05.01.2021 | bar | 21:00-20:00 : date absente de la feuille dates',
      "plages:4 05.01.2021 | bar | 21:00-20:00 : heure de fin avant l'heure de début",
      'plages:5 bar : heure de début ou de fin manquante',
      'engagements:3 Marie Dupont est engagé·e deux fois sur 01.01.2021 | bar | 20:00-21:00',
      'engagements:4 Marie Dupont est engagé·e deux fois sur 01.01.2021 | bar | 20:00-21:00'
    ])
  })

  it('checks that engagements and contreparties refer to existing rows', () => {
    const data = sane()
    data.engagements.push(
      { row: 3, personne: 'Jean Martin', plage: '02.01.2021 | caisse' },
      { row: 4, personne: '', plage: '01.01.2021 | bar | 20:00-21:00' }
    )
    data.contreparties.push(
      { row: 3, personne: 'Jean Martin', contrepartie: 'x' },
      { row: 4, personne: 'Marie Dupont', contrepartie: '' },
      { row: 5, personne: '', contrepartie: 'y' }
    )
    expect(messages(data, 'erreur')).toEqual([
      'engagements:3 « Jean Martin » ne correspond à aucune personne',
      'engagements:3 « 02.01.2021 | caisse » ne correspond à aucune plage ni fonction sans plage',
      'engagements:4 personne ou plage manquante',
      'contreparties:3 « Jean Martin » ne correspond à aucune personne'
    ])
    expect(messages(data, 'avertissement')).toEqual([
      'contreparties:4 contrepartie vide'
    ])
  })

  it('accepts functions without type, plages for a whole function, codes not handed out', () => {
    const data = sane()
    data.fonctions.push({ row: 3, nom: 'costumes', type: '' })
    data.plages.push(plage(3, '', 'costumes', '', '', ''))
    data.engagements.push({ row: 3, personne: 'Marie Dupont', plage: 'costumes' })
    data.contreparties.push({ row: 3, personne: '', contrepartie: 'CODE-1234' })
    expect(checkWorkbook(data)).toEqual([])
  })

  it('accepts an engagement on a function without plage, not on one with plages', () => {
    const data = sane()
    data.fonctions.push({ row: 3, nom: 'technique', type: '' })
    data.engagements.push(
      { row: 3, personne: 'Marie Dupont', plage: 'technique' },
      { row: 4, personne: 'Marie Dupont', plage: 'bar' }
    )
    expect(messages(data)).toEqual([
      'engagements:4 « bar » ne correspond à aucune plage ni fonction sans plage'
    ])
  })

  it('does not require the dates sheet to be filled', () => {
    const data = sane()
    data.dates = []
    expect(checkWorkbook(data)).toEqual([])
  })
})

describe('readWorkbook', () => {
  it('reads trimmed display values with their row numbers and lists missing sheets', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      [' Dupont', 'Marie', 'Marie Dupont', 'marie@example.org ', 'à envoyer'],
      ['', '', '', '', ''],
      ['Martin', 'Jean', 'Jean Martin', 'jean@example.org', 'envoyé']
    ])
    const plages = new FakeSheet('plages', [
      ['date', 'fonction', 'début', 'fin', 'nombre', 'libellé'],
      [new Date(2021, 0, 1), 'bar', new Date(1899, 11, 30, 20, 0), new Date(1899, 11, 30, 21, 0), 2, 'l']
    ])
    const data = readWorkbook(new FakeSpreadsheet([personnes, plages]) as any)

    expect(data.personnes).toEqual([
      { row: 2, nom: 'Dupont', prenom: 'Marie', libelle: 'Marie Dupont', email: 'marie@example.org', statut: 'à envoyer' },
      { row: 4, nom: 'Martin', prenom: 'Jean', libelle: 'Jean Martin', email: 'jean@example.org', statut: 'envoyé' }
    ])
    expect(data.plages).toEqual([
      { row: 2, date: '01.01.2021', fonction: 'bar', debut: '20:00', fin: '21:00', nombre: '2', libelle: 'l' }
    ])
    expect(data.feuillesManquantes).toEqual([
      'engagements',
      'contreparties',
      'fonctions',
      'dates',
      'planning'
    ])
  })
})

describe('verifierClasseur', () => {
  it('shows the issues split by severity in a dialog', () => {
    const personnes = new FakeSheet('personnes', [
      ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
      ['Dupont', 'Marie', 'Marie Dupont', '', 'à envoyer']
    ])
    const { ui } = installSpreadsheetApp([personnes])
    const { templates } = installHtmlService()

    verifierClasseur()

    expect(templates[0].file).toBe('dist/checkReportTemplate')
    expect(templates[0].template.erreurs.map((i: any) => i.feuille)).toEqual([
      'plages',
      'engagements',
      'contreparties',
      'fonctions',
      'dates',
      'planning',
      'personnes'
    ])
    expect(templates[0].template.avertissements).toHaveLength(1)
    expect(ui.showModalDialog).toHaveBeenCalledTimes(1)
  })
})
