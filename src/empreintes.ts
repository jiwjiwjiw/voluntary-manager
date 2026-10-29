/**
 * Fingerprints of what each person was told in their last confirmation
 * mail. They let the script notice when the engagements or contreparties
 * of a person change after the mail went out, and flag the person
 * « à renvoyer ».
 *
 * The fingerprints are kept in the document properties (invisible to the
 * users, shared by everybody who opens the workbook), keyed by the person's
 * label (personnes!C).
 */

export interface Confirmable {
  listeEngagements: string[]
  listeContreparties: string[]
}

/** FNV-1a, 32 bits, as hex: short, stable, with no Apps Script dependency. */
function hash (text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(16).padStart(8, '0')
}

/** Same engagements and contreparties, in any order, give the same value. */
export function empreinte (d: Confirmable): string {
  const parts = [
    ...[...d.listeEngagements].sort().map(x => `E:${x}`),
    ...[...d.listeContreparties].sort().map(x => `C:${x}`)
  ]
  return hash(parts.join('\n'))
}

const PROPERTY_KEY = 'empreintes'

export class EmpreintesStore {
  private values: Record<string, string>
  private dirty = false

  constructor (
    private properties: GoogleAppsScript.Properties.Properties = PropertiesService.getDocumentProperties()
  ) {
    const raw = this.properties.getProperty(PROPERTY_KEY)
    let parsed: unknown
    try {
      parsed = raw ? JSON.parse(raw) : {}
    } catch {
      parsed = {}
    }
    this.values =
      parsed && typeof parsed === 'object' ? (parsed as Record<string, string>) : {}
  }

  get (libelle: string): string | undefined {
    return this.values[libelle]
  }

  set (libelle: string, value: string) {
    if (this.values[libelle] === value) return
    this.values[libelle] = value
    this.dirty = true
  }

  /** Follows a renamed person, so that the fingerprint is not lost. */
  rename (renames: ReadonlyMap<string, string>) {
    for (const [oldLabel, newLabel] of renames) {
      if (oldLabel in this.values) {
        this.values[newLabel] = this.values[oldLabel]
        delete this.values[oldLabel]
        this.dirty = true
      }
    }
  }

  /** Writes the property once, only when something changed. */
  save () {
    if (!this.dirty) return
    this.properties.setProperty(PROPERTY_KEY, JSON.stringify(this.values))
    this.dirty = false
  }
}
