import { useState, type DragEvent } from 'react'
import type { StudentProfile } from '../types'

interface ResumeEntry {
  id: string
  title: string
  organization: string
  location: string
  dates: string
  details: string
}

interface EducationEntry {
  id: string
  school: string
  degree: string
  location: string
  graduation: string
  details: string
}

type ResumeTemplate = 'classic' | 'modern' | 'minimal'
type BuiltInSection = 'summary' | 'education' | 'experience' | 'projects' | 'skills'
type SectionId = BuiltInSection | `custom:${string}`

interface CustomSection {
  id: string
  title: string
  details: string
}

interface ResumeData {
  template: ResumeTemplate
  name: string
  email: string
  phone: string
  location: string
  linkedIn: string
  summary: string
  skills: string
  education: EducationEntry[]
  experience: ResumeEntry[]
  projects: ResumeEntry[]
  hiddenSections: BuiltInSection[]
  customSections: CustomSection[]
  sectionOrder: SectionId[]
  sectionPages: Record<string, number>
  preferredPageCount: number
}

interface ResumeBuilderProps {
  profile: StudentProfile
  resumeHighlights: string
}

const STORAGE_KEY = 'soe-resume-builder'
const defaultSectionOrder: BuiltInSection[] = [
  'summary',
  'education',
  'experience',
  'projects',
  'skills'
]
const sectionLabels: Record<BuiltInSection, string> = {
  summary: 'Professional summary',
  education: 'Education',
  experience: 'Experience',
  projects: 'Projects',
  skills: 'Skills'
}

const createEntry = (): ResumeEntry => ({
  id: crypto.randomUUID(),
  title: '',
  organization: '',
  location: '',
  dates: '',
  details: ''
})

const createEducationEntry = (
  values: Partial<Omit<EducationEntry, 'id'>> = {}
): EducationEntry => ({
  id: crypto.randomUUID(),
  school: '',
  degree: '',
  location: '',
  graduation: '',
  details: '',
  ...values
})

const createInitialResume = (
  profile: StudentProfile,
  resumeHighlights: string
): ResumeData => ({
  template: 'classic',
  name: profile.name,
  email: '',
  phone: '',
  location: profile.locationPreference,
  linkedIn: '',
  summary: profile.shortTermGoal,
  skills: [...new Set([...profile.skills, ...resumeHighlights.split(/[\n,]/)])]
    .map((skill) => skill.trim())
    .filter(Boolean)
    .join(', '),
  education: [
    createEducationEntry({
      school: profile.school,
      degree: profile.major,
      location: profile.locationPreference
    })
  ],
  experience: [createEntry()],
  projects: [createEntry()],
  hiddenSections: [],
  customSections: [],
  sectionOrder: defaultSectionOrder,
  sectionPages: {},
  preferredPageCount: 1
})

const loadResume = (profile: StudentProfile, resumeHighlights: string): ResumeData => {
  const initial = createInitialResume(profile, resumeHighlights)
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return initial
    const parsed = JSON.parse(stored) as Partial<ResumeData> & {
      graduation?: string
      educationDetails?: string
    }
    const template: ResumeTemplate =
      parsed.template === 'modern' || parsed.template === 'minimal'
        ? parsed.template
        : 'classic'
    const customSections = Array.isArray(parsed.customSections) ? parsed.customSections : []
    const availableSections: SectionId[] = [
      ...defaultSectionOrder,
      ...customSections.map((section) => `custom:${section.id}` as const)
    ]
    const storedOrder = Array.isArray(parsed.sectionOrder) ? parsed.sectionOrder : []
    const sectionOrder = [
      ...storedOrder.filter((section): section is SectionId =>
        availableSections.includes(section as SectionId)
      ),
      ...availableSections.filter((section) => !storedOrder.includes(section))
    ]
    return {
      ...initial,
      ...parsed,
      template,
      education: Array.isArray(parsed.education)
        ? parsed.education
        : [
            createEducationEntry({
              school: profile.school,
              degree: profile.major,
              location: profile.locationPreference,
              graduation: parsed.graduation ?? '',
              details: parsed.educationDetails ?? ''
            })
          ],
      experience: Array.isArray(parsed.experience)
        ? parsed.experience.map((entry) => ({ ...entry, location: entry.location ?? '' }))
        : initial.experience,
      projects: Array.isArray(parsed.projects)
        ? parsed.projects.map((entry) => ({ ...entry, location: entry.location ?? '' }))
        : initial.projects,
      hiddenSections: Array.isArray(parsed.hiddenSections) ? parsed.hiddenSections : [],
      customSections,
      sectionOrder,
      sectionPages:
        parsed.sectionPages && typeof parsed.sectionPages === 'object'
          ? parsed.sectionPages
          : {},
      preferredPageCount:
        typeof parsed.preferredPageCount === 'number'
          ? Math.max(1, parsed.preferredPageCount)
          : 1
    }
  } catch {
    return initial
  }
}

const detailLines = (details: string) =>
  details
    .split('\n')
    .map((line) => line.replace(/^[\s•*-]+/, '').trim())
    .filter(Boolean)

function ResumeEntryEditor({
  entry,
  label,
  onChange,
  onRemove
}: {
  entry: ResumeEntry
  label: string
  onChange: (entry: ResumeEntry) => void
  onRemove: () => void
}) {
  return (
    <div className="resume-entry-editor">
      <div className="resume-entry-heading">
        <strong>{label}</strong>
        <button type="button" className="resume-remove-button" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="resume-field-row">
        <label>
          Company or organization
          <input
            value={entry.organization}
            onChange={(event) => onChange({ ...entry, organization: event.target.value })}
            placeholder="Company or organization"
          />
        </label>
        <label>
          Location
          <input
            value={entry.location}
            onChange={(event) => onChange({ ...entry, location: event.target.value })}
            placeholder="City, State or Remote"
          />
        </label>
      </div>
      <div className="resume-field-row">
        <label>
          Role or title
          <input
            value={entry.title}
            onChange={(event) => onChange({ ...entry, title: event.target.value })}
            placeholder="Software Engineering Intern"
          />
        </label>
        <label>
          Dates
          <input
            value={entry.dates}
            onChange={(event) => onChange({ ...entry, dates: event.target.value })}
            placeholder="May 2025 - August 2025"
          />
        </label>
      </div>
      <label>
        Accomplishments (one per line)
        <textarea
          value={entry.details}
          onChange={(event) => onChange({ ...entry, details: event.target.value })}
          placeholder="Built a feature that improved..."
          rows={3}
        />
      </label>
    </div>
  )
}

function ResumeSection({
  title,
  entries,
  order
}: {
  title: string
  entries: ResumeEntry[]
  order: number
}) {
  const completedEntries = entries.filter(
    (entry) =>
      entry.title || entry.organization || entry.location || entry.dates || entry.details
  )
  if (completedEntries.length === 0) return null

  return (
    <section className="resume-preview-section" style={{ order }}>
      <h2>{title}</h2>
      {completedEntries.map((entry) => (
        <div className="resume-preview-entry" key={entry.id}>
          <div className="resume-preview-entry-heading">
            <strong>{entry.organization || entry.title}</strong>
            <span>{entry.location}</span>
          </div>
          <div className="resume-preview-entry-subheading">
            <span>{entry.title}</span>
            <span>{entry.dates}</span>
          </div>
          {detailLines(entry.details).length > 0 && (
            <ul>
              {detailLines(entry.details).map((line, index) => (
                <li key={`${entry.id}-${index}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </section>
  )
}

export default function ResumeBuilder({ profile, resumeHighlights }: ResumeBuilderProps) {
  const [resume, setResume] = useState<ResumeData>(() =>
    loadResume(profile, resumeHighlights)
  )
  const [saveMessage, setSaveMessage] = useState('')
  const [newSectionTitle, setNewSectionTitle] = useState('')
  const [draggedSection, setDraggedSection] = useState<SectionId | null>(null)
  const [dragOverSection, setDragOverSection] = useState<SectionId | null>(null)

  const sectionIsVisible = (section: BuiltInSection) =>
    !resume.hiddenSections.includes(section)

  const removeSection = (section: BuiltInSection) => {
    setResume((current) => ({
      ...current,
      hiddenSections: [...new Set([...current.hiddenSections, section])]
    }))
  }

  const restoreSection = (section: BuiltInSection) => {
    setResume((current) => ({
      ...current,
      hiddenSections: current.hiddenSections.filter((item) => item !== section),
      sectionOrder: current.sectionOrder.includes(section)
        ? current.sectionOrder
        : [...current.sectionOrder, section],
      sectionPages: {
        ...current.sectionPages,
        [section]: current.sectionPages[section] ?? current.preferredPageCount
      }
    }))
  }

  const addCustomSection = () => {
    const title = newSectionTitle.trim()
    if (!title) return
    const id = crypto.randomUUID()
    setResume((current) => ({
      ...current,
      customSections: [
        ...current.customSections,
        { id, title, details: '' }
      ],
      sectionOrder: [...current.sectionOrder, `custom:${id}`],
      sectionPages: {
        ...current.sectionPages,
        [`custom:${id}`]: current.preferredPageCount
      }
    }))
    setNewSectionTitle('')
  }

  const updateCustomSection = (id: string, details: string) => {
    setResume((current) => ({
      ...current,
      customSections: current.customSections.map((section) =>
        section.id === id ? { ...section, details } : section
      )
    }))
  }

  const removeCustomSection = (id: string) => {
    setResume((current) => ({
      ...current,
      customSections: current.customSections.filter((section) => section.id !== id),
      sectionOrder: current.sectionOrder.filter((section) => section !== `custom:${id}`),
      sectionPages: Object.fromEntries(
        Object.entries(current.sectionPages).filter(([section]) => section !== `custom:${id}`)
      )
    }))
  }

  const moveSection = (targetSection: SectionId) => {
    if (!draggedSection || draggedSection === targetSection) return
    setResume((current) => {
      const nextOrder = current.sectionOrder.filter((section) => section !== draggedSection)
      const targetIndex = nextOrder.indexOf(targetSection)
      nextOrder.splice(targetIndex, 0, draggedSection)
      return { ...current, sectionOrder: nextOrder }
    })
  }

  const dragProps = (section: SectionId) => ({
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      setDraggedSection(section)
      setDragOverSection(null)
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', section)
      event.dataTransfer.setDragImage(event.currentTarget, 24, 24)
    },
    onDragEnd: () => {
      setDraggedSection(null)
      setDragOverSection(null)
    }
  })

  const dropProps = (section: SectionId) => ({
    onDragEnter: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      if (section !== draggedSection) {
        setDragOverSection(section)
        moveSection(section)
      }
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      moveSection(section)
      setDraggedSection(null)
      setDragOverSection(null)
    }
  })

  const sectionOrder = (section: SectionId) => resume.sectionOrder.indexOf(section)
  const sectionPage = (section: SectionId) =>
    Math.min(
      resume.preferredPageCount,
      Math.max(1, resume.sectionPages[section] ?? 1)
    )
  const sectionClassName = (section: SectionId) =>
    [
      'resume-draggable-section',
      draggedSection === section ? 'resume-section-dragging' : '',
      dragOverSection === section && draggedSection !== section
        ? 'resume-section-drop-target'
        : ''
    ]
      .filter(Boolean)
      .join(' ')

  const updateEntry = (
    section: 'experience' | 'projects',
    id: string,
    nextEntry: ResumeEntry
  ) => {
    setResume((current) => ({
      ...current,
      [section]: current[section].map((entry) => (entry.id === id ? nextEntry : entry))
    }))
  }

  const removeEntry = (section: 'experience' | 'projects', id: string) => {
    setResume((current) => ({
      ...current,
      [section]: current[section].filter((entry) => entry.id !== id)
    }))
  }

  const addEntry = (section: 'experience' | 'projects') => {
    setResume((current) => ({
      ...current,
      [section]: [...current[section], createEntry()]
    }))
  }

  const updateEducation = (id: string, nextEntry: EducationEntry) => {
    setResume((current) => ({
      ...current,
      education: current.education.map((entry) => (entry.id === id ? nextEntry : entry))
    }))
  }

  const removeEducation = (id: string) => {
    setResume((current) => ({
      ...current,
      education: current.education.filter((entry) => entry.id !== id)
    }))
  }

  const addEducation = () => {
    setResume((current) => ({
      ...current,
      education: [...current.education, createEducationEntry()]
    }))
  }

  const saveResume = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resume))
      setSaveMessage('Resume saved on this device')
    } catch {
      setSaveMessage('Unable to save the resume')
    }
    window.setTimeout(() => setSaveMessage(''), 3000)
  }

  const resetFromProfile = () => {
    const nextResume = createInitialResume(profile, resumeHighlights)
    setResume(nextResume)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextResume))
      setSaveMessage('Resume reset using your profile')
    } catch {
      setSaveMessage('Resume reset, but could not be saved')
    }
    window.setTimeout(() => setSaveMessage(''), 3000)
  }

  const downloadPdf = async () => {
    const { jsPDF } = await import('jspdf')
    const pdf = new jsPDF({ unit: 'pt', format: 'letter' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 45
    const contentWidth = pageWidth - margin * 2
    const bottomMargin = 45
    const isModern = resume.template === 'modern'
    const isMinimal = resume.template === 'minimal'
    let y = margin

    const ensureSpace = (height: number) => {
      if (y + height <= pageHeight - bottomMargin) return
      pdf.addPage()
      y = margin
    }

    const addWrappedText = (
      text: string,
      options: { fontSize?: number; bold?: boolean; indent?: number; gapAfter?: number } = {}
    ) => {
      if (!text.trim()) return
      const fontSize = options.fontSize ?? 10
      const indent = options.indent ?? 0
      const lineHeight = fontSize * 1.35
      pdf.setTextColor(35, 35, 35)
      pdf.setFont('helvetica', options.bold ? 'bold' : 'normal')
      pdf.setFontSize(fontSize)
      const lines = pdf.splitTextToSize(text, contentWidth - indent) as string[]
      ensureSpace(lines.length * lineHeight)
      pdf.text(lines, margin + indent, y)
      y += lines.length * lineHeight + (options.gapAfter ?? 3)
    }

    const addSectionTitle = (title: string) => {
      ensureSpace(42)
      y += isMinimal ? 16 : 18
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(isMinimal ? 10 : 11)
      pdf.setTextColor(isModern ? 20 : 35, isModern ? 91 : 35, isModern ? 132 : 35)
      pdf.text(title.toUpperCase(), margin, y)
      if (isMinimal) {
        y += 15
      } else {
        y += 5
        pdf.setDrawColor(isModern ? 20 : 100, isModern ? 91 : 100, isModern ? 132 : 100)
        pdf.setLineWidth(isModern ? 1.4 : 0.6)
        pdf.line(margin, y, pageWidth - margin, y)
        y += 17
      }
    }

    const addEntries = (title: string, entries: ResumeEntry[]) => {
      const completedEntries = entries.filter(
        (entry) =>
          entry.title || entry.organization || entry.location || entry.dates || entry.details
      )
      if (completedEntries.length === 0) return

      addSectionTitle(title)
      completedEntries.forEach((entry) => {
        ensureSpace(48)
        const leftWidth = contentWidth * 0.62
        const rightWidth = contentWidth * 0.32
        pdf.setTextColor(35, 35, 35)
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        const organizationLines = pdf.splitTextToSize(
          entry.organization || entry.title,
          leftWidth
        ) as string[]
        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        const locationLines = pdf.splitTextToSize(entry.location, rightWidth) as string[]
        pdf.setFont('helvetica', 'bold')
        pdf.setFontSize(10)
        pdf.text(organizationLines, margin, y)
        if (locationLines.length > 0) {
          pdf.setFont('helvetica', 'normal')
          pdf.setFontSize(9)
          pdf.text(locationLines, pageWidth - margin, y, { align: 'right' })
        }
        y += Math.max(organizationLines.length * 13.5, locationLines.length * 12, 13.5)

        pdf.setFont('helvetica', 'normal')
        pdf.setFontSize(9)
        const titleLines = pdf.splitTextToSize(entry.title, leftWidth) as string[]
        const dateLines = pdf.splitTextToSize(entry.dates, rightWidth) as string[]
        if (titleLines.length > 0) pdf.text(titleLines, margin, y)
        if (dateLines.length > 0) {
          pdf.text(dateLines, pageWidth - margin, y, { align: 'right' })
        }
        y += Math.max(titleLines.length * 12, dateLines.length * 12, 12) + 2

        detailLines(entry.details).forEach((line) => {
          addWrappedText(`- ${line}`, { indent: 8, gapAfter: 1 })
        })
        y += 4
      })
    }

    const contact = [resume.email, resume.phone, resume.location, resume.linkedIn]
      .filter(Boolean)
      .join(' | ')
    const contactText = contact || 'Add your contact information'

    if (isModern) {
      pdf.setFillColor(20, 91, 132)
      pdf.rect(0, 0, pageWidth, 92, 'F')
      pdf.setTextColor(255, 255, 255)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(23)
      pdf.text(resume.name || 'Your Name', pageWidth / 2, 38, { align: 'center' })
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      pdf.text(pdf.splitTextToSize(contactText, contentWidth), pageWidth / 2, 61, {
        align: 'center'
      })
      y = 102
    } else {
      pdf.setTextColor(20, 20, 20)
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(isMinimal ? 24 : 22)
      pdf.text(resume.name || 'Your Name', isMinimal ? margin : pageWidth / 2, y, {
        align: isMinimal ? 'left' : 'center'
      })
      y += 18
      pdf.setFont('helvetica', 'normal')
      pdf.setFontSize(9)
      const contactLines = pdf.splitTextToSize(contactText, contentWidth) as string[]
      pdf.text(contactLines, isMinimal ? margin : pageWidth / 2, y, {
        align: isMinimal ? 'left' : 'center'
      })
      y += contactLines.length * 12 + 6
      if (!isMinimal) {
        pdf.setDrawColor(40)
        pdf.setLineWidth(1.2)
        pdf.line(margin, y, pageWidth - margin, y)
      }
    }

    let activeSourcePage = 1
    resume.sectionOrder.forEach((sectionId) => {
      const targetPage = Math.min(
        resume.preferredPageCount,
        Math.max(1, resume.sectionPages[sectionId] ?? activeSourcePage)
      )
      if (targetPage > activeSourcePage) {
        while (pdf.getNumberOfPages() < targetPage) pdf.addPage()
        pdf.setPage(targetPage)
        y = margin
        activeSourcePage = targetPage
      }

      if (sectionId === 'summary' && sectionIsVisible('summary') && resume.summary) {
        addSectionTitle('Summary')
        addWrappedText(resume.summary)
      } else if (sectionId === 'education' && sectionIsVisible('education')) {
        const completedEducation = resume.education.filter(
          (entry) =>
            entry.school ||
            entry.degree ||
            entry.location ||
            entry.graduation ||
            entry.details
        )
        if (completedEducation.length > 0) {
          addSectionTitle('Education')
          completedEducation.forEach((entry) => {
            addWrappedText(
              [entry.school, entry.location].filter(Boolean).join(' | '),
              { bold: true, gapAfter: 1 }
            )
            addWrappedText(
              [entry.degree, entry.graduation].filter(Boolean).join(' | '),
              { gapAfter: 1 }
            )
            detailLines(entry.details).forEach((line) =>
              addWrappedText(`- ${line}`, { indent: 8, gapAfter: 1 })
            )
            y += 4
          })
        }
      } else if (sectionId === 'experience' && sectionIsVisible('experience')) {
        addEntries('Experience', resume.experience)
      } else if (sectionId === 'projects' && sectionIsVisible('projects')) {
        addEntries('Projects', resume.projects)
      } else if (sectionId === 'skills' && sectionIsVisible('skills') && resume.skills) {
        addSectionTitle('Skills')
        addWrappedText(resume.skills)
      } else if (sectionId.startsWith('custom:')) {
        const section = resume.customSections.find(
          (item) => `custom:${item.id}` === sectionId
        )
        if (!section) return
        const lines = detailLines(section.details)
        if (lines.length === 0) return
        addSectionTitle(section.title)
        lines.forEach((line) => addWrappedText(`- ${line}`, { indent: 8, gapAfter: 1 }))
      }
    })

    const fileName =
      (resume.name || 'resume').trim().replace(/[^a-z0-9]+/gi, '-') || 'resume'
    pdf.save(`${fileName}-resume.pdf`)
    setSaveMessage('PDF downloaded')
    window.setTimeout(() => setSaveMessage(''), 3000)
  }

  return (
    <div className="tab-content resume-builder">
      <div className="resume-builder-header">
        <div>
          <h2>Resume Builder</h2>
          <p>Create a polished resume from your profile, then print or save it as a PDF.</p>
        </div>
        <div className="resume-actions">
          <button type="button" className="btn-clear" onClick={resetFromProfile}>
            Start from profile
          </button>
          <button type="button" className="btn-clear" onClick={saveResume}>
            Save draft
          </button>
          <button type="button" className="btn-learn-more" onClick={downloadPdf}>
            Download PDF
          </button>
        </div>
      </div>
      {saveMessage && <p className="resume-save-message" role="status">{saveMessage}</p>}

      <div className="resume-template-picker" aria-label="Resume style">
        <span>Choose a style</span>
        <div className="resume-template-options">
          {(['classic', 'modern', 'minimal'] as ResumeTemplate[]).map((template) => (
            <button
              type="button"
              key={template}
              className={`resume-template-option ${resume.template === template ? 'active' : ''}`}
              aria-pressed={resume.template === template}
              onClick={() => setResume({ ...resume, template })}
            >
              <span className={`resume-template-thumbnail ${template}`} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              {template}
            </button>
          ))}
        </div>
      </div>

      <div className="resume-section-manager">
        <div>
          <strong>Add a section</strong>
          <p>Use any title, such as Achievements, Certifications, or Volunteer Work.</p>
        </div>
        <div className="resume-section-add">
          <input
            value={newSectionTitle}
            onChange={(event) => setNewSectionTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustomSection()
              }
            }}
            placeholder="Section title"
            aria-label="New section title"
          />
          <button type="button" className="btn-clear" onClick={addCustomSection}>
            Add section
          </button>
        </div>
        {resume.hiddenSections.length > 0 && (
          <div className="resume-hidden-sections">
            <span>Removed:</span>
            {resume.hiddenSections.map((section) => (
              <button type="button" key={section} onClick={() => restoreSection(section)}>
                + Restore {sectionLabels[section]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="resume-builder-layout">
        <form className="resume-editor" onSubmit={(event) => event.preventDefault()}>
          <fieldset className="resume-contact-section">
            <legend>Contact information</legend>
            <label className="resume-name-field">
              Full name
              <input
                value={resume.name}
                onChange={(event) => setResume({ ...resume, name: event.target.value })}
                placeholder="Your full name"
              />
            </label>
            <div className="resume-field-row">
              <label>
                Email
                <input
                  type="email"
                  value={resume.email}
                  onChange={(event) => setResume({ ...resume, email: event.target.value })}
                  placeholder="student@example.com"
                />
              </label>
              <label>
                Phone
                <input
                  type="tel"
                  value={resume.phone}
                  onChange={(event) => setResume({ ...resume, phone: event.target.value })}
                  placeholder="(555) 123-4567"
                />
              </label>
            </div>
            <div className="resume-field-row">
              <label>
                Location
                <input
                  value={resume.location}
                  onChange={(event) => setResume({ ...resume, location: event.target.value })}
                  placeholder="City, State"
                />
              </label>
              <label>
                LinkedIn or portfolio
                <input
                  value={resume.linkedIn}
                  onChange={(event) => setResume({ ...resume, linkedIn: event.target.value })}
                  placeholder="linkedin.com/in/your-name"
                />
              </label>
            </div>
          </fieldset>

          {sectionIsVisible('summary') && <fieldset
            className={sectionClassName('summary')}
            style={{ order: sectionOrder('summary') }}
            {...dragProps('summary')}
            {...dropProps('summary')}
          >
            <legend className="resume-section-legend">
              <span className="resume-drag-handle">⋮⋮</span>
              <span>Professional summary</span>
              <button type="button" onClick={() => removeSection('summary')}>Remove section</button>
            </legend>
            <label>
              Summary
              <textarea
                value={resume.summary}
                onChange={(event) => setResume({ ...resume, summary: event.target.value })}
                placeholder="Write 2-3 sentences about your strengths and goals."
                rows={4}
              />
            </label>
          </fieldset>}

          {sectionIsVisible('education') && <fieldset
            className={sectionClassName('education')}
            style={{ order: sectionOrder('education') }}
            {...dragProps('education')}
            {...dropProps('education')}
          >
            <legend className="resume-section-legend">
              <span className="resume-drag-handle">⋮⋮</span>
              <span>Education</span>
              <button type="button" onClick={() => removeSection('education')}>Remove section</button>
            </legend>
            {resume.education.map((entry, index) => (
              <div className="resume-entry-editor" key={entry.id}>
                <div className="resume-entry-heading">
                  <strong>Education {index + 1}</strong>
                  <button
                    type="button"
                    className="resume-remove-button"
                    onClick={() => removeEducation(entry.id)}
                  >
                    Remove
                  </button>
                </div>
                <div className="resume-field-row">
                  <label>
                    School name
                    <input
                      value={entry.school}
                      onChange={(event) =>
                        updateEducation(entry.id, { ...entry, school: event.target.value })
                      }
                      placeholder="University or school"
                    />
                  </label>
                  <label>
                    Location
                    <input
                      value={entry.location}
                      onChange={(event) =>
                        updateEducation(entry.id, { ...entry, location: event.target.value })
                      }
                      placeholder="City, State"
                    />
                  </label>
                </div>
                <div className="resume-field-row">
                  <label>
                    Degree or major
                    <input
                      value={entry.degree}
                      onChange={(event) =>
                        updateEducation(entry.id, { ...entry, degree: event.target.value })
                      }
                      placeholder="B.S. in Computer Science"
                    />
                  </label>
                  <label>
                    Graduation
                    <input
                      value={entry.graduation}
                      onChange={(event) =>
                        updateEducation(entry.id, { ...entry, graduation: event.target.value })
                      }
                      placeholder="Expected May 2027"
                    />
                  </label>
                </div>
                <label>
                  Details (one per line)
                  <textarea
                    value={entry.details}
                    onChange={(event) =>
                      updateEducation(entry.id, { ...entry, details: event.target.value })
                    }
                    placeholder="GPA, honors, relevant coursework"
                    rows={3}
                  />
                </label>
              </div>
            ))}
            <button type="button" className="resume-add-button" onClick={addEducation}>
              + Add education
            </button>
          </fieldset>}

          {sectionIsVisible('experience') && <fieldset
            className={sectionClassName('experience')}
            style={{ order: sectionOrder('experience') }}
            {...dragProps('experience')}
            {...dropProps('experience')}
          >
            <legend className="resume-section-legend">
              <span className="resume-drag-handle">⋮⋮</span>
              <span>Experience</span>
              <button type="button" onClick={() => removeSection('experience')}>Remove section</button>
            </legend>
            {resume.experience.map((entry, index) => (
              <ResumeEntryEditor
                key={entry.id}
                entry={entry}
                label={`Experience ${index + 1}`}
                onChange={(nextEntry) => updateEntry('experience', entry.id, nextEntry)}
                onRemove={() => removeEntry('experience', entry.id)}
              />
            ))}
            <button type="button" className="resume-add-button" onClick={() => addEntry('experience')}>
              + Add experience
            </button>
          </fieldset>}

          {sectionIsVisible('projects') && <fieldset
            className={sectionClassName('projects')}
            style={{ order: sectionOrder('projects') }}
            {...dragProps('projects')}
            {...dropProps('projects')}
          >
            <legend className="resume-section-legend">
              <span className="resume-drag-handle">⋮⋮</span>
              <span>Projects</span>
              <button type="button" onClick={() => removeSection('projects')}>Remove section</button>
            </legend>
            {resume.projects.map((entry, index) => (
              <ResumeEntryEditor
                key={entry.id}
                entry={entry}
                label={`Project ${index + 1}`}
                onChange={(nextEntry) => updateEntry('projects', entry.id, nextEntry)}
                onRemove={() => removeEntry('projects', entry.id)}
              />
            ))}
            <button type="button" className="resume-add-button" onClick={() => addEntry('projects')}>
              + Add project
            </button>
          </fieldset>}

          {sectionIsVisible('skills') && <fieldset
            className={sectionClassName('skills')}
            style={{ order: sectionOrder('skills') }}
            {...dragProps('skills')}
            {...dropProps('skills')}
          >
            <legend className="resume-section-legend">
              <span className="resume-drag-handle">⋮⋮</span>
              <span>Skills</span>
              <button type="button" onClick={() => removeSection('skills')}>Remove section</button>
            </legend>
            <label>
              Skills (comma-separated)
              <textarea
                value={resume.skills}
                onChange={(event) => setResume({ ...resume, skills: event.target.value })}
                rows={3}
              />
            </label>
          </fieldset>}

          {resume.customSections.map((section) => (
            <fieldset
              key={section.id}
              className={sectionClassName(`custom:${section.id}`)}
              style={{ order: sectionOrder(`custom:${section.id}`) }}
              {...dragProps(`custom:${section.id}`)}
              {...dropProps(`custom:${section.id}`)}
            >
              <legend className="resume-section-legend">
                <span className="resume-drag-handle">⋮⋮</span>
                <span>{section.title}</span>
                <button type="button" onClick={() => removeCustomSection(section.id)}>
                  Delete section
                </button>
              </legend>
              <label>
                Items (one per line)
                <textarea
                  value={section.details}
                  onChange={(event) => updateCustomSection(section.id, event.target.value)}
                  placeholder={`Add ${section.title.toLowerCase()} items, one per line`}
                  rows={4}
                />
              </label>
            </fieldset>
          ))}
        </form>

        <div className="resume-preview-wrap">
          <span className="resume-preview-label">Live preview</span>
          <div className={`resume-pages-grid ${resume.preferredPageCount > 1 ? 'multipage' : ''}`}>
          {Array.from({ length: resume.preferredPageCount }, (_, pageIndex) => {
            const page = pageIndex + 1
            return <article
              className={`resume-preview resume-template-${resume.template}`}
              aria-label={`${resume.template} resume preview, page ${page}`}
              key={page}
            >
            {page === 1 && <header>
                <h1>{resume.name || 'Your Name'}</h1>
                <p>
                  {[resume.email, resume.phone, resume.location, resume.linkedIn]
                    .filter(Boolean)
                    .join('  |  ') || 'Add your contact information'}
                </p>
              </header>}

            {sectionPage('summary') === page && sectionIsVisible('summary') && resume.summary && (
              <section className="resume-preview-section" style={{ order: sectionOrder('summary') }}>
                <h2>Summary</h2>
                <p>{resume.summary}</p>
              </section>
            )}

            {sectionPage('education') === page && sectionIsVisible('education') && <section className="resume-preview-section" style={{ order: sectionOrder('education') }}>
              <h2>Education</h2>
              {resume.education.map((entry) => (
                <div className="resume-preview-entry" key={entry.id}>
                  <div className="resume-preview-entry-heading">
                    <strong>{entry.school || 'Your School'}</strong>
                    <span>{entry.location}</span>
                  </div>
                  <div className="resume-preview-entry-subheading">
                    <span>{entry.degree}</span>
                    <span>{entry.graduation}</span>
                  </div>
                  {detailLines(entry.details).length > 0 && (
                    <ul>
                      {detailLines(entry.details).map((line, index) => (
                        <li key={`${entry.id}-${index}`}>{line}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>}

            {sectionPage('experience') === page && sectionIsVisible('experience') && <ResumeSection title="Experience" entries={resume.experience} order={sectionOrder('experience')} />}
            {sectionPage('projects') === page && sectionIsVisible('projects') && <ResumeSection title="Projects" entries={resume.projects} order={sectionOrder('projects')} />}

            {sectionPage('skills') === page && sectionIsVisible('skills') && resume.skills && (
              <section className="resume-preview-section" style={{ order: sectionOrder('skills') }}>
                <h2>Skills</h2>
                <p>{resume.skills}</p>
              </section>
            )}

            {resume.customSections.map((section) => {
              const lines = detailLines(section.details)
              if (lines.length === 0 || sectionPage(`custom:${section.id}`) !== page) return null
              return (
                <section
                  className="resume-preview-section"
                  key={section.id}
                  style={{ order: sectionOrder(`custom:${section.id}`) }}
                >
                  <h2>{section.title}</h2>
                  <ul>
                    {lines.map((line, index) => <li key={`${section.id}-${index}`}>{line}</li>)}
                  </ul>
                </section>
              )
            })}
            </article>
          })}
          </div>
        </div>
      </div>
    </div>
  )
}
