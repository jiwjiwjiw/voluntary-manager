/** The send statuses of `personnes!E`. */
export const STATUT_A_ENVOYER = 'à envoyer'
export const STATUT_ENVOYE = 'envoyé'
export const STATUT_RECEPTION_CONFIRMEE = 'réception confirmée'
/** Set by the script when the engagements of a person changed after a send. */
export const STATUT_A_RENVOYER = 'à renvoyer'

/** Dropdown of `personnes!E`. */
export const STATUTS_ENVOI = [
  STATUT_A_ENVOYER,
  STATUT_ENVOYE,
  STATUT_RECEPTION_CONFIRMEE,
  STATUT_A_RENVOYER
]

/** The statuses « Envoyer les emails » sends to. */
export const STATUTS_A_ENVOYER = [STATUT_A_ENVOYER, STATUT_A_RENVOYER]

/** The statuses a later change of engagements invalidates. */
export const STATUTS_ENVOYES = [STATUT_ENVOYE, STATUT_RECEPTION_CONFIRMEE]

const normalise = (statut: unknown) => String(statut).trim().toLowerCase()

/** Case- and space-insensitive: the dropdown accepts « À envoyer ». */
export const estAEnvoyer = (statut: unknown) =>
  STATUTS_A_ENVOYER.includes(normalise(statut))

export const estEnvoye = (statut: unknown) =>
  STATUTS_ENVOYES.includes(normalise(statut))
