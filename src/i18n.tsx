import { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type Language = 'fr' | 'en'

const messages = {
  fr: {
    manageScores: 'Gérer mes partitions', addScore: 'Ajouter une partition', search: 'Rechercher',
    question: 'Quelle partition cherchez-vous ?', searchBy: 'Titre, compositeur ou instrument',
    searchPlaceholder: 'Rechercher une partition…', clear: 'Effacer', noScore: 'Aucune partition trouvée',
    noScoreHelp: 'Essayez un compositeur ou ajoutez-la à la bibliothèque.', add: 'Ajouter', try: 'Essayez :',
    emptyLibrary: 'Votre bibliothèque est vide.', addFirstScore: 'Ajouter une première partition', savedLocally: 'données enregistrées sur cet ordinateur',
    home: 'Accueil', myScores: 'Mes partitions', reorderHelp: 'Glissez les classeurs et les partitions pour les remettre dans l’ordre.',
    binders: 'Classeurs', addBinder: 'Ajouter un classeur', newBinder: 'Nouveau classeur', score: 'partition', scores: 'partitions',
    deleteBinder: 'Supprimer le classeur', unknownComposer: 'Compositeur non renseigné', page: 'page', edit: 'Modifier', delete: 'Supprimer',
    emptyBinder: 'Ce classeur est vide', emptyBinderHelp: 'Ajoutez sa première partition pour pouvoir la retrouver.',
    createFirstBinder: 'Créez votre premier classeur', createFirstBinderHelp: 'Donnez-lui le même nom ou la même couleur que le classeur physique.', createBinder: 'Créer un classeur',
    minimizeWindow: 'Réduire la fenêtre', minimize: 'Réduire', restoreWindow: 'Restaurer la fenêtre', maximizeWindow: 'Agrandir la fenêtre', restore: 'Restaurer', maximize: 'Agrandir', closeWindow: 'Fermer la fenêtre', close: 'Fermer',
    scoreFound: 'Partition trouvée', locatedIn: 'Elle se trouve dans', foundIt: 'J’ai trouvé',
    binderNameHelp: 'Utilisez le même nom que sur votre classeur physique.', binderName: 'Nom du classeur', binderExample: 'Ex. Classeur bleu', binderColor: 'Couleur du classeur', chooseColor: 'Choisir la couleur {color}', customColor: 'Choisir une couleur personnalisée', colorWheel: 'Roue chromatique', hexCode: 'HEX', cancel: 'Annuler',
    editScore: 'Modifier la partition', inBinder: 'Dans {binder}', title: 'Titre', required: 'obligatoire', titleExample: 'Ex. Clair de lune', author: 'Auteur', optional: 'optionnel', authorExample: 'Ex. Claude Debussy', save: 'Enregistrer',
    changeBinder: 'Changer de classeur', deleteScoreTitle: 'Supprimer cette partition ?', deleteScoreMessage: '« {title} » sera retirée de {binder}.', deleteScore: 'Supprimer la partition', deleteBinderTitle: 'Supprimer {binder} ?', deleteBinderMessage: 'Le classeur et ses {count} {scores} seront supprimés.', language: 'Langue',
    dropList: 'Déposer une liste de partitions', dropListHelp: 'PDF ou Word, une partition par ligne', importSuccess: '{count} {scores} ajoutée(s), {skipped} doublon(s) ignoré(s).', importFailed: 'Impossible de lire ce fichier. Utilisez un PDF ou un document Word valide.', importNoNewScores: 'Aucune nouvelle partition : toutes les lignes existent déjà.',
    attachment: 'Pièce jointe', chooseAttachment: 'Choisir un fichier', attachmentHelp: 'PDF ou Word, facultatif', attachmentFailed: 'Impossible de joindre ce fichier.', openAttachment: 'Ouvrir la pièce jointe', removeAttachment: 'Retirer la pièce jointe', open: 'Ouvrir',
    updateReady: 'Mise à jour prête', updateDownloading: 'Téléchargement de la mise à jour', restart: 'Redémarrer',
  },
  en: {
    manageScores: 'Manage my sheet music', addScore: 'Add sheet music', search: 'Search',
    question: 'Which score are you looking for?', searchBy: 'Title, composer or instrument',
    searchPlaceholder: 'Search for sheet music…', clear: 'Clear', noScore: 'No sheet music found',
    noScoreHelp: 'Try a composer or add it to your library.', add: 'Add', try: 'Try:',
    emptyLibrary: 'Your library is empty.', addFirstScore: 'Add your first score', savedLocally: 'data saved on this computer',
    home: 'Home', myScores: 'My sheet music', reorderHelp: 'Drag binders and scores to put them in the right order.',
    binders: 'Binders', addBinder: 'Add a binder', newBinder: 'New binder', score: 'score', scores: 'scores',
    deleteBinder: 'Delete binder', unknownComposer: 'Composer not provided', page: 'page', edit: 'Edit', delete: 'Delete',
    emptyBinder: 'This binder is empty', emptyBinderHelp: 'Add its first score so you can find it later.',
    createFirstBinder: 'Create your first binder', createFirstBinderHelp: 'Give it the same name or color as the physical binder.', createBinder: 'Create binder',
    minimizeWindow: 'Minimize window', minimize: 'Minimize', restoreWindow: 'Restore window', maximizeWindow: 'Maximize window', restore: 'Restore', maximize: 'Maximize', closeWindow: 'Close window', close: 'Close',
    scoreFound: 'Sheet music found', locatedIn: 'You will find it in', foundIt: 'Found it',
    binderNameHelp: 'Use the same name as the physical binder.', binderName: 'Binder name', binderExample: 'E.g. Blue binder', binderColor: 'Binder color', chooseColor: 'Choose color {color}', customColor: 'Choose a custom color', colorWheel: 'Color wheel', hexCode: 'HEX', cancel: 'Cancel',
    editScore: 'Edit sheet music', inBinder: 'In {binder}', title: 'Title', required: 'required', titleExample: 'E.g. Clair de lune', author: 'Author', optional: 'optional', authorExample: 'E.g. Claude Debussy', save: 'Save',
    changeBinder: 'Move to binder', deleteScoreTitle: 'Delete this score?', deleteScoreMessage: '“{title}” will be removed from {binder}.', deleteScore: 'Delete score', deleteBinderTitle: 'Delete {binder}?', deleteBinderMessage: 'The binder and its {count} {scores} will be deleted.', language: 'Language',
    dropList: 'Drop a sheet-music list', dropListHelp: 'PDF or Word, one score per line', importSuccess: '{count} {scores} added, {skipped} duplicate(s) skipped.', importFailed: 'This file could not be read. Use a valid PDF or Word document.', importNoNewScores: 'Nothing new was added: every line already exists.',
    attachment: 'Attachment', chooseAttachment: 'Choose a file', attachmentHelp: 'PDF or Word, optional', attachmentFailed: 'This file could not be attached.', openAttachment: 'Open attachment', removeAttachment: 'Remove attachment', open: 'Open',
    updateReady: 'Update ready', updateDownloading: 'Downloading update', restart: 'Restart',
  },
} as const

type MessageKey = keyof typeof messages.fr
type Translator = (key: MessageKey, values?: Record<string, string | number>) => string

function detectLanguage(): Language {
  const saved = localStorage.getItem('musiclass-language')
  if (saved === 'fr' || saved === 'en') return saved
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language]
  return locales.some((locale) => locale.replace('_', '-').toLowerCase() === 'fr-fr') ? 'fr' : 'en'
}

const LanguageContext = createContext<{ language: Language; setLanguage: (language: Language) => void; t: Translator } | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectLanguage)
  const setLanguage = (next: Language) => {
    localStorage.setItem('musiclass-language', next)
    setLanguageState(next)
  }
  const value = useMemo(() => ({
    language,
    setLanguage,
    t: ((key, values = {}) => Object.entries(values).reduce(
      (text, [name, replacement]) => text.replaceAll(`{${name}}`, String(replacement)),
      messages[language][key] as string,
    )) as Translator,
  }), [language])

  useEffect(() => {
    document.documentElement.lang = language
    document.title = language === 'fr' ? 'MusiClass | Vos partitions' : 'MusiClass | Your sheet music'
  }, [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage must be used inside LanguageProvider')
  return value
}

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage()
  return (
    <div className="language-switcher" role="group" aria-label={t('language')}>
      <button type="button" className={language === 'fr' ? 'active' : ''} aria-pressed={language === 'fr'} onClick={() => setLanguage('fr')}>FR</button>
      <button type="button" className={language === 'en' ? 'active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>EN</button>
    </div>
  )
}
