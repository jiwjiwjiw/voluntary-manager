import { rowHasContent } from './sheets-tools/helpers'
import { timeOfDayInMinutes } from './updatePlanning'

/** The rows of the workbook, as displayed, with their sheet row numbers. */
export interface WorkbookData {
  personnes: Array<{
    row: number
    nom: string
    prenom: string
    libelle: string
    email: string
    statut: string
  }>
  plages: Array<{
    row: number
    date: string
    fonction: string
    debut: string
    fin: string
    nombre: string
    libelle: string
  }>
  engagements: Array<{ row: number; personne: string; plage: string }>
  contreparties: Array<{ row: number; personne: string; contrepartie: string }>
  fonctions: Array<{ row: number; nom: string; type: string }>
  dates: string[]
  feuillesManquantes: string[]
}

export const REQUIRED_SHEETS = [
  'personnes',
  'plages',
  'engagements',
  'contreparties',
  'fonctions',
  'dates',
  'planning'
]

/** Reads every sheet the checks need. Missing sheets are listed, not fatal. */
export function readWorkbook (
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): WorkbookData {
  const feuillesManquantes: string[] = []
  const rows = (name: string, a1: string): Array<[number, string[]]> => {
    const sheet = spreadsheet.getSheetByName(name)
    if (!sheet) {
      feuillesManquantes.push(name)
      return []
    }
    return sheet
      .getRange(a1)
      .getDisplayValues()
      .map((values, index): [number, string[]] => [
        index + 2,
        values.map(v => v.trim())
      ])
      .filter(([, values]) => rowHasContent(values))
  }
  const data: WorkbookData = {
    personnes: rows('personnes', 'A2:E').map(([row, v]) => ({
      row,
      nom: v[0],
      prenom: v[1],
      libelle: v[2],
      email: v[3],
      statut: v[4]
    })),
    plages: rows('plages', 'A2:F').map(([row, v]) => ({
      row,
      date: v[0],
      fonction: v[1],
      debut: v[2],
      fin: v[3],
      nombre: v[4],
      libelle: v[5]
    })),
    engagements: rows('engagements', 'A2:B').map(([row, v]) => ({
      row,
      personne: v[0],
      plage: v[1]
    })),
    contreparties: rows('contreparties', 'A2:C').map(([row, v]) => ({
      row,
      personne: v[0],
      contrepartie: v[1]
    })),
    fonctions: rows('fonctions', 'A2:B').map(([row, v]) => ({
      row,
      nom: v[0],
      type: v[1]
    })),
    dates: rows('dates', 'A2:A').map(([, v]) => v[0]),
    feuillesManquantes: []
  }
  if (!spreadsheet.getSheetByName('planning')) feuillesManquantes.push('planning')
  data.feuillesManquantes = feuillesManquantes
  return data
}

export interface Issue {
  /** `erreur`: will break the sending or the planning; `avertissement`: worth a look. */
  gravite: 'erreur' | 'avertissement'
  feuille: string
  ligne?: number
  message: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const TYPES_FONCTION = ['artiste', 'bénévole']
export const STATUTS_A_ENVOYER = ['à envoyer']

const lower = (s: string) => s.toLowerCase()

/** Everything that would break or distort the sending and the planning. */
export function checkWorkbook (data: WorkbookData): Issue[] {
  const issues: Issue[] = []
  const erreur = (feuille: string, ligne: number | undefined, message: string) =>
    issues.push({ gravite: 'erreur', feuille, ligne, message })
  const avertissement = (
    feuille: string,
    ligne: number | undefined,
    message: string
  ) => issues.push({ gravite: 'avertissement', feuille, ligne, message })

  for (const feuille of data.feuillesManquantes) {
    erreur(feuille, undefined, 'feuille manquante')
  }

  // --- personnes
  const libelles = new Map<string, number>()
  for (const p of data.personnes) {
    if (p.libelle !== '') libelles.set(p.libelle, (libelles.get(p.libelle) ?? 0) + 1)
  }
  const engagementsParPersonne = new Map<string, number>()
  for (const e of data.engagements) {
    engagementsParPersonne.set(
      e.personne,
      (engagementsParPersonne.get(e.personne) ?? 0) + 1
    )
  }
  for (const p of data.personnes) {
    const nomAffiche = [p.prenom, p.nom].filter(Boolean).join(' ') || '(sans nom)'
    const nomComplet = p.nom !== '' && p.prenom !== ''
    if (!nomComplet) {
      erreur('personnes', p.row, `${nomAffiche} : nom ou prénom manquant`)
    } else if ((libelles.get(p.libelle) ?? 0) > 1) {
      erreur('personnes', p.row, `${nomAffiche} : homonyme, les engagements ne peuvent pas être distingués`)
    }
    const aEnvoyer = STATUTS_A_ENVOYER.includes(lower(p.statut))
    if (p.email === '') {
      ;(aEnvoyer ? erreur : avertissement)('personnes', p.row, `${nomAffiche} : adresse email manquante`)
    } else if (!EMAIL_PATTERN.test(p.email)) {
      erreur('personnes', p.row, `${nomAffiche} : adresse email invalide « ${p.email} »`)
    }
    if (nomComplet && !engagementsParPersonne.has(p.libelle)) {
      avertissement('personnes', p.row, `${nomAffiche} : aucun engagement`)
    }
  }

  // --- fonctions
  const fonctions = new Set<string>()
  for (const f of data.fonctions) {
    if (f.nom === '') {
      erreur('fonctions', f.row, 'nom de fonction manquant')
      continue
    }
    fonctions.add(f.nom)
    if (!TYPES_FONCTION.includes(lower(f.type))) {
      erreur('fonctions', f.row, `${f.nom} : type « ${f.type} » inconnu (artiste ou bénévole)`)
    }
  }

  // --- plages
  const plages = new Map<string, (typeof data.plages)[number]>()
  const engagesParPlage = new Map<string, number>()
  for (const e of data.engagements) {
    engagesParPlage.set(e.plage, (engagesParPlage.get(e.plage) ?? 0) + 1)
  }
  for (const pl of data.plages) {
    const ref = pl.libelle || `ligne ${pl.row}`
    if (pl.libelle !== '') {
      if (plages.has(pl.libelle)) {
        erreur('plages', pl.row, `${ref} : plage en double`)
      }
      plages.set(pl.libelle, pl)
    }
    if (pl.date === '') {
      erreur('plages', pl.row, `${ref} : date manquante`)
    } else if (data.dates.length > 0 && !data.dates.includes(pl.date)) {
      avertissement('plages', pl.row, `${ref} : date absente de la feuille dates`)
    }
    if (pl.fonction === '') {
      erreur('plages', pl.row, `${ref} : fonction manquante`)
    } else if (!fonctions.has(pl.fonction)) {
      erreur('plages', pl.row, `${ref} : fonction « ${pl.fonction} » absente de la feuille fonctions`)
    }
    const nombre = Number(pl.nombre)
    if (pl.nombre === '' || !Number.isInteger(nombre) || nombre < 1) {
      erreur('plages', pl.row, `${ref} : nombre de personnes manquant ou invalide`)
    } else {
      const engages = engagesParPlage.get(pl.libelle) ?? 0
      if (engages > nombre) {
        avertissement('plages', pl.row, `${ref} : ${engages} personnes engagées pour ${nombre} places`)
      }
    }
    const debut = timeOfDayInMinutes(pl.debut)
    const fin = timeOfDayInMinutes(pl.fin)
    if ((pl.debut === '') !== (pl.fin === '')) {
      avertissement('plages', pl.row, `${ref} : heure de début ou de fin manquante`)
    } else if (pl.debut !== '' && Number.isFinite(debut) && Number.isFinite(fin) && fin <= debut) {
      avertissement('plages', pl.row, `${ref} : heure de fin avant l'heure de début`)
    }
  }

  // --- engagements
  const couples = new Set<string>()
  for (const e of data.engagements) {
    if (e.personne === '' || e.plage === '') {
      erreur('engagements', e.row, 'personne ou plage manquante')
      continue
    }
    if (!libelles.has(e.personne)) {
      erreur('engagements', e.row, `« ${e.personne} » ne correspond à aucune personne`)
    }
    if (!plages.has(e.plage)) {
      erreur('engagements', e.row, `« ${e.plage} » ne correspond à aucune plage`)
    }
    const couple = `${e.personne}\u0000${e.plage}`
    if (couples.has(couple)) {
      avertissement('engagements', e.row, `${e.personne} est engagé·e deux fois sur ${e.plage}`)
    }
    couples.add(couple)
  }

  // --- contreparties
  for (const c of data.contreparties) {
    if (c.personne === '') {
      erreur('contreparties', c.row, 'personne manquante')
    } else if (!libelles.has(c.personne)) {
      erreur('contreparties', c.row, `« ${c.personne} » ne correspond à aucune personne`)
    }
    if (c.contrepartie === '') {
      avertissement('contreparties', c.row, 'contrepartie vide')
    }
  }

  return issues
}

/** Menu entry: runs the checks and shows them in a dialog. */
export function verifierClasseur () {
  const issues = checkWorkbook(readWorkbook(SpreadsheetApp.getActive()))
  const htmlTemplate = HtmlService.createTemplateFromFile(
    'dist/checkReportTemplate'
  )
  htmlTemplate.erreurs = issues.filter(i => i.gravite === 'erreur')
  htmlTemplate.avertissements = issues.filter(i => i.gravite === 'avertissement')
  const html = htmlTemplate.evaluate().setWidth(600).setHeight(500)
  SpreadsheetApp.getUi().showModalDialog(html, 'Vérification du classeur')
}
