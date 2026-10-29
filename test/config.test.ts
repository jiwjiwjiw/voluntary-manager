import { afterEach, describe, expect, it, vi } from 'vitest'
import { parseConfig, readConfig } from '../src/config'
import { sendEmails } from '../src/sendEmails'
import {
  FakeSheet,
  FakeSpreadsheet,
  installHtmlService,
  installLockService,
  installMailApp,
  installPropertiesService,
  installSpreadsheetApp
} from './fakeSpreadsheet'

afterEach(() => vi.unstubAllGlobals())

describe('parseConfig', () => {
  it('reads the known keys, ignoring case, spaces and unknown rows', () => {
    expect(
      parseConfig([
        ["Nom de l'expéditeur ", 'Edelweiss Loisirs'],
        ['adresse de réponse', ' contact@example.org'],
        ['Copie cachée', 'archive@example.org'],
        ['couleur préférée', 'bleu'],
        ['', '']
      ])
    ).toEqual({
      name: 'Edelweiss Loisirs',
      replyTo: 'contact@example.org',
      bcc: 'archive@example.org'
    })
  })

  it('leaves out empty values', () => {
    expect(parseConfig([["nom de l'expéditeur", '']])).toEqual({})
  })
})

describe('readConfig', () => {
  it('is empty without a config sheet', () => {
    expect(readConfig(new FakeSpreadsheet([]) as any)).toEqual({})
  })

  it('reads the config sheet below its header', () => {
    const config = new FakeSheet('config', [
      ['clé', 'valeur'],
      ["nom de l'expéditeur", 'Edelweiss']
    ])
    expect(readConfig(new FakeSpreadsheet([config]) as any)).toEqual({ name: 'Edelweiss' })
  })
})

describe('sendEmails with a config sheet', () => {
  it('passes the sender name, reply-to and bcc to MailApp', () => {
    const headers = ['Type', 'Condition', 'Texte']
    const sheets = [
      new FakeSheet('personnes', [
        ['nom', 'prénom', 'prénom nom', 'email', 'statut'],
        ['Dupont', 'Marie', 'Marie Dupont', 'marie@example.org', 'à envoyer']
      ]),
      new FakeSheet('engagements', [['personne', 'plage'], ['Marie Dupont', 'p']]),
      new FakeSheet('contreparties', [['personne', 'contrepartie', 'remarque']]),
      new FakeSheet('fonctions', [['nom', 'type']]),
      new FakeSheet('plages', [['date', 'fonction', 'début', 'fin', 'nombre', 'libellé']]),
      new FakeSheet('modèle courriel', [headers, ['sujet', '', 'S']]),
      new FakeSheet('config', [
        ['clé', 'valeur'],
        ["nom de l'expéditeur", 'Edelweiss'],
        ['adresse de réponse', 'contact@example.org']
      ])
    ]
    installSpreadsheetApp(sheets)
    const { sent } = installMailApp()
    installHtmlService()
    installLockService()
    installPropertiesService()

    sendEmails('modèle courriel')

    expect(sent[0]).toMatchObject({
      to: 'marie@example.org',
      name: 'Edelweiss',
      replyTo: 'contact@example.org'
    })
    expect(sent[0]).not.toHaveProperty('bcc')
  })
})
