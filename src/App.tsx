import { useState, useEffect } from 'react'
import './App.css'
import { emptyStudentProfile } from './data/opportunities'
import type { CareerField, OpportunityType, StudentProfile, Opportunity } from './types'
import { calculateMatch, getMatchColor } from './utils/matching'
import { useAIGuidance } from './hooks/useAIGuidance'
import ResumeBuilder from './components/ResumeBuilder'
import { useOpportunities } from './hooks/useOpportunities'
import { diversifyOpportunities } from './utils/diversifyOpportunities'

type TabType = 'opportunities' | 'saved' | 'deadlines' | 'resume' | 'profile'

const opportunityTypeEmojis: Record<OpportunityType, string> = {
  job: '📣',
  internship: '💼',
  scholarship: '🎓',
  research: '🔬',
  campus_job: '🏫',
  hackathon: '💻',
  competition: '🏆',
  fellowship: '⭐',
  career_event: '🤝'
}

const opportunityTypeColors: Record<OpportunityType, string> = {
  job: '#0f766e',
  internship: '#0066cc',
  scholarship: '#7cb342',
  research: '#c2185b',
  campus_job: '#f57c00',
  hackathon: '#512da8',
  competition: '#d32f2f',
  fellowship: '#388e3c',
  career_event: '#1976d2'
}

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('opportunities')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [careerFieldFilter, setCareerFieldFilter] = useState<'all' | CareerField>('all')
  const { opportunities, availableCountries } = useOpportunities({
    country: countryFilter === 'all' ? undefined : countryFilter,
    careerField: careerFieldFilter === 'all' ? undefined : careerFieldFilter
  })
  const SAVED_KEY = 'soe-saved-opportunity-ids'
  const STATUS_KEY = 'soe-application-statuses'
  const APPLY_KEY = 'soe-apply-clicked-ids'

  const [savedIds, setSavedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(SAVED_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
          return new Set(parsed)
        }
      }
    } catch (e) {
      // ignore invalid localStorage
    }
    return new Set()
  })

  const [applyClickedIds, setApplyClickedIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(APPLY_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
          return new Set(parsed)
        }
      }
    } catch (e) {
      // ignore
    }
    return new Set()
  })

  type ApplicationStatus = 'Saved' | 'Applying' | 'Applied' | 'Interview' | 'Done'

  const [appStatuses, setAppStatuses] = useState<Record<string, ApplicationStatus>>(() => {
    try {
      const raw = localStorage.getItem(STATUS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && typeof parsed === 'object') return parsed as Record<string, ApplicationStatus>
      }
    } catch (e) {
      // ignore
    }
    return {}
  })

  const persistStatuses = (next: Record<string, ApplicationStatus>) => {
    try {
      localStorage.setItem(STATUS_KEY, JSON.stringify(next))
    } catch {}
  }

  const setStatus = (opportunityId: string, status: ApplicationStatus) => {
    setAppStatuses((prev) => {
      const next = { ...prev, [opportunityId]: status }
      persistStatuses(next)
      return next
    })
  }

  const toggleSave = (opportunityId: string) => {
    setSavedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(opportunityId)) {
        newSet.delete(opportunityId)
      } else {
        newSet.add(opportunityId)
        // ensure a status exists when saving
        setAppStatuses((prevStatuses) => {
          if (prevStatuses[opportunityId]) return prevStatuses
          const next = { ...prevStatuses } as Record<string, ApplicationStatus>
          next[opportunityId] = 'Saved'
          persistStatuses(next)
          return next
        })
      }
      try {
        localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(newSet)))
      } catch (e) {
        // ignore storage write errors
      }
      return newSet
    })
  }

  const persistApplyClicked = (next: Set<string>) => {
    try {
      localStorage.setItem(APPLY_KEY, JSON.stringify(Array.from(next)))
    } catch {}
  }

  const handleApplyClick = (opportunityId: string) => {
    setApplyClickedIds((prev) => {
      const next = new Set(prev)
      if (!next.has(opportunityId)) next.add(opportunityId)
      persistApplyClicked(next)

      // if saved and still 'Saved', move to 'Applying'
      if (savedIds.has(opportunityId) && (appStatuses[opportunityId] ?? 'Saved') === 'Saved') {
        setStatus(opportunityId, 'Applying')
      }

      return next
    })
  }

  const isSaved = (opportunityId: string) => savedIds.has(opportunityId)

  const savedOpportunities = opportunities.filter((opp) => isSaved(opp.id))

  // profile state used for matching
  // Open shared links after the opportunity feed has loaded.


  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)

  // open modal if ?opp=ID is present on load
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const oppId = params.get('opp')
      if (oppId) {
        const found = opportunities.find((o) => o.id === oppId)
        if (found) setSelectedOpportunity(found)
      }
    } catch {
      // ignore
    }
  }, [opportunities])

  // close on Escape
  useEffect(() => {
    if (!selectedOpportunity) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetails()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedOpportunity])


  const openDetails = (opp: Opportunity) => {
    // push query param for deep-linking
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('opp', opp.id)
      window.history.pushState(null, '', url.toString())
    } catch {
      // ignore
    }
    setSelectedOpportunity(opp)
  }

  const closeDetails = () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.delete('opp')
      window.history.pushState(null, '', url.pathname + url.search + url.hash)
    } catch {
      // ignore
      window.history.pushState(null, '', window.location.pathname + window.location.hash)
    }
    setSelectedOpportunity(null)
  }

  const renderOpportunityCard = (opp: Opportunity) => {
    const match = calculateMatch(opp, profile, parsedResumeHighlights)
    const matchColor = getMatchColor(match.matchScore)

    return (
      <div key={opp.id} className={`opportunity-card ${isSaved(opp.id) ? 'saved' : ''}`}>
        <div className="card-header">
          <div>
            <h3 className="opp-title">{opp.title}</h3>
            <p className="opp-source">{opp.source}</p>
            {opp.attribution && (
              <a
                className="opp-attribution"
                href={opp.attribution.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {opp.attribution.label}
              </a>
            )}
          </div>
          <div className="card-header-right">
            <span
              className="opp-type-badge"
              style={{ backgroundColor: opportunityTypeColors[opp.type] }}
              title={opp.type}
            >
              {opportunityTypeEmojis[opp.type]} {opp.type.replace('_', ' ')}
            </span>
            <span
              className="badge match-badge"
              style={{ backgroundColor: matchColor }}
              title={`${match.matchScore}% match`}
            >
              {match.matchScore}%
            </span>
            {isSaved(opp.id) && (
              <span className={`badge status-badge ${(appStatuses[opp.id] ?? 'Saved').toLowerCase()}`}>{appStatuses[opp.id] ?? 'Saved'}</span>
            )}
          </div>
        </div>

        <p className="opp-description">{opp.description}</p>

        {match.matchReasons.length > 0 && (
          <div className="match-reasons">
            <span className="reasons-label">Why it matches:</span>
            <ul className="reasons-list">
              {match.matchReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="opp-meta">
          <div className="meta-item">
            <span className="meta-label">📍 Location:</span>
            <span>{opp.location}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">📅 Deadline:</span>
            <span>{opp.deadline || 'Not listed'}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">🕒 Posted:</span>
            <span>{new Date(opp.postedDate).toLocaleDateString()}</span>
          </div>
          {opp.compensation && (
            <div className="meta-item">
              <span className="meta-label">💵 Compensation:</span>
              <span>{opp.compensation}</span>
            </div>
          )}
        </div>

        {opp.requiredSkills.length > 0 && (
          <div className="opp-skills">
            <span className="skills-label">Skills:</span>
            <div className="skill-tags">
              {opp.requiredSkills.slice(0, 3).map((skill) => (
                <span key={skill} className="skill-tag">
                  {skill}
                </span>
              ))}
              {opp.requiredSkills.length > 3 && (
                <span className="skill-tag">+{opp.requiredSkills.length - 3}</span>
              )}
            </div>
          </div>
        )}

        <p className="opp-step">
          <strong>Next Step:</strong> {opp.applicationStep}
        </p>

        <div className="card-footer">
          {opp.applicationUrl ? (
            <a className="btn-apply" href={opp.applicationUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleApplyClick(opp.id)}>Apply Now</a>
          ) : (
            <div className="apply-coming">Application link coming soon</div>
          )}

          {applyClickedIds.has(opp.id) && <span className="apply-tracked">Apply link opened</span>}

          <button
            className={`btn-save ${isSaved(opp.id) ? 'saved' : ''}`}
            onClick={() => toggleSave(opp.id)}
          >
            {isSaved(opp.id) ? 'Saved' : 'Save'}
          </button>
          <button className="btn-learn-more" onClick={() => openDetails(opp)}>Learn More</button>
        </div>
      </div>
    )
  }

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [filterType, setFilterType] = useState<'all' | OpportunityType>('all')
  const [filterLocation, setFilterLocation] = useState<string>('any')
  const [deadlineUrgency, setDeadlineUrgency] = useState<'all' | 'due_soon' | 'due_later'>('all')
  const [workplaceFilter, setWorkplaceFilter] = useState<'all' | 'remote' | 'hybrid' | 'location'>('all')
  const [roleLevelFilter, setRoleLevelFilter] = useState<'all' | 'internship' | 'new-grad' | 'apprenticeship'>('all')
  const [postedWithin, setPostedWithin] = useState<'all' | '7' | '30'>('all')
  const [salaryOnly, setSalaryOnly] = useState(false)
  const [onlySavedDeadlines, setOnlySavedDeadlines] = useState<boolean>(false)
  const [includePastDeadlines, setIncludePastDeadlines] = useState<boolean>(false)

  // profile state - load from localStorage if available
  const [profile, setProfile] = useState<StudentProfile>(() => {
    try {
      const raw = localStorage.getItem('soe-profile')
      if (raw) return JSON.parse(raw) as StudentProfile
    } catch (e) {
      // ignore parse errors
    }
    return emptyStudentProfile as StudentProfile
  })

  const [profileSavedMessage, setProfileSavedMessage] = useState<string>('')

  const [resumeFileName, setResumeFileName] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('soe-resume-file-name')
      return raw || ''
    } catch {
      return ''
    }
  })

  const [resumeHighlights, setResumeHighlights] = useState<string>(() => {
    try {
      const raw = localStorage.getItem('soe-resume-highlights')
      return raw || ''
    } catch {
      return ''
    }
  })
  const [resumeInputKey, setResumeInputKey] = useState<number>(0)

  const parsedResumeHighlights = resumeHighlights
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)

  const currentMatch = selectedOpportunity
    ? calculateMatch(selectedOpportunity, profile, parsedResumeHighlights)
    : null

  const { guidance: currentGuidance, loading: guidanceLoading, error: guidanceError } = useAIGuidance(
    selectedOpportunity,
    profile,
    currentMatch,
    parsedResumeHighlights
  )

  const saveProfileToStorage = (p: StudentProfile) => {
    try {
      localStorage.setItem('soe-profile', JSON.stringify(p))
      setProfileSavedMessage('Profile saved')
      setTimeout(() => setProfileSavedMessage(''), 3000)
    } catch (e) {
      setProfileSavedMessage('Failed to save profile')
      setTimeout(() => setProfileSavedMessage(''), 3000)
    }
  }

  const resetProfileToSample = () => {
    setProfile(emptyStudentProfile as StudentProfile)
    setResumeFileName('')
    setResumeHighlights('')
    setResumeInputKey((prev) => prev + 1)
    try {
      localStorage.removeItem('soe-profile')
      localStorage.removeItem('soe-resume-file-name')
      localStorage.removeItem('soe-resume-highlights')
    } catch {}
    setProfileSavedMessage('Profile reset')
    setTimeout(() => setProfileSavedMessage(''), 3000)
  }

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setResumeFileName(file.name)
      try {
        localStorage.setItem('soe-resume-file-name', file.name)
      } catch {}
    }
  }

  const saveResumeHighlights = () => {
    try {
      localStorage.setItem('soe-resume-highlights', resumeHighlights)
      setProfileSavedMessage('Resume highlights saved')
      setTimeout(() => setProfileSavedMessage(''), 3000)
    } catch {
      setProfileSavedMessage('Failed to save resume highlights')
      setTimeout(() => setProfileSavedMessage(''), 3000)
    }
  }

  const allOpportunityTypes: OpportunityType[] = [
    'job',
    'internship',
    'scholarship',
    'research',
    'campus_job',
    'hackathon',
    'competition',
    'fellowship',
    'career_event'
  ]

  const resetFilters = () => {
    setSearchQuery('')
    setFilterType('all')
    setFilterLocation('any')
    setCountryFilter('all')
    setCareerFieldFilter('all')
    setDeadlineUrgency('all')
    setWorkplaceFilter('all')
    setRoleLevelFilter('all')
    setPostedWithin('all')
    setSalaryOnly(false)
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'opportunities':
        // prepare location options
        const locations = Array.from(
          new Set(opportunities.map((o) => o.location))
        )

        const filtered = opportunities.filter((opp) => {
          const q = searchQuery.trim().toLowerCase()

          // search across multiple fields
          if (q) {
            const inTitle = opp.title.toLowerCase().includes(q)
            const inSource = opp.source.toLowerCase().includes(q)
            const inDesc = opp.description.toLowerCase().includes(q)
            const inSkills = opp.requiredSkills.some((s) => s.toLowerCase().includes(q))
            const inTags = opp.tags.some((t) => t.toLowerCase().includes(q))
            const inType = opp.type.toLowerCase().includes(q)
            const inLocation = opp.location.toLowerCase().includes(q)

            if (!(inTitle || inSource || inDesc || inSkills || inTags || inType || inLocation)) {
              return false
            }
          }

          // type filter
          if (filterType !== 'all' && opp.type !== filterType) return false

          // location filter
          if (filterLocation !== 'any') {
            if (!opp.location.toLowerCase().includes(filterLocation.toLowerCase())) return false
          }
          const workplaceText = `${opp.location} ${opp.title} ${opp.tags.join(' ')}`.toLowerCase()
          if (workplaceFilter === 'remote' && !workplaceText.includes('remote')) return false
          if (workplaceFilter === 'hybrid' && !workplaceText.includes('hybrid')) return false
          if (
            workplaceFilter === 'location' &&
            (workplaceText.includes('remote') || workplaceText.includes('hybrid'))
          ) {
            return false
          }

          if (roleLevelFilter === 'internship' && opp.type !== 'internship') return false
          if (roleLevelFilter === 'new-grad' && !opp.tags.includes('new-grad')) return false
          if (
            roleLevelFilter === 'apprenticeship' &&
            !opp.tags.includes('apprenticeship')
          ) {
            return false
          }

          if (salaryOnly && !opp.compensation) return false

          if (postedWithin !== 'all') {
            const postedDate = new Date(opp.postedDate)
            if (isNaN(postedDate.getTime())) return false
            const ageInDays = Math.floor(
              (Date.now() - postedDate.getTime()) / (1000 * 60 * 60 * 24)
            )
            if (ageInDays < 0 || ageInDays > Number(postedWithin)) return false
          }

          // deadline urgency
          if (deadlineUrgency !== 'all') {
            const now = new Date()
            const d = new Date(opp.deadline)
            if (isNaN(d.getTime())) return false
            const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            if (deadlineUrgency === 'due_soon') {
              // consider due soon as within the next 14 days
              if (!(days >= 0 && days <= 14)) return false
            } else if (deadlineUrgency === 'due_later') {
              if (!(days > 14)) return false
            }
          }

          return true
        })

        const sortedOpportunities = diversifyOpportunities(
          filtered,
          (opportunity) =>
            calculateMatch(opportunity, profile, parsedResumeHighlights).matchScore
        )

        return (
          <div className="tab-content">
            <h2>Opportunities</h2>
            <p>Your personalized feed of campus and external opportunities</p>

            {/* Dashboard summary */}
            <div className="dashboard-summary">
              <div className="dash-item">
                <div className="dash-value">{opportunities.length}</div>
                <div className="dash-label">Total opportunities</div>
              </div>
              <div className="dash-item">
                <div className="dash-value">{savedIds.size}</div>
                <div className="dash-label">Saved</div>
              </div>
              <div className="dash-item">
                <div className="dash-value">{opportunities.filter((o) => {
                  const d = new Date(o.deadline)
                  if (isNaN(d.getTime())) return false
                  const days = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  return days >= 0 && days <= 14
                }).length}</div>
                <div className="dash-label">Due soon (≤14d)</div>
              </div>
              <div className="dash-item">
                <div className="dash-value">{Math.max(0, ...opportunities.map((o) => calculateMatch(o, profile, parsedResumeHighlights).matchScore))}%</div>
                <div className="dash-label">Highest match</div>
              </div>
              <div className="dash-helper">Tip: Edit your profile to improve matches. Use Save to bookmark opportunities.</div>
            </div>

            <div className="filters-bar">
              <input
                className="search-input"
                placeholder="Search by title, source, skills, tags, location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              <select className="filter-select" value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
                <option value="all">All types</option>
                <option value="job">Job</option>
                <option value="internship">Internship</option>
                <option value="scholarship">Scholarship</option>
                <option value="research">Research</option>
                <option value="campus_job">Campus job</option>
                <option value="hackathon">Hackathon</option>
                <option value="competition">Competition</option>
                <option value="fellowship">Fellowship</option>
                <option value="career_event">Career event</option>
              </select>

              <select className="filter-select" value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)}>
                <option value="any">Any location</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              <select
                className="filter-select"
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
              >
                <option value="all">All countries</option>
                {availableCountries.map((country) => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>

              <select
                className="filter-select"
                value={careerFieldFilter}
                onChange={(e) => setCareerFieldFilter(e.target.value as typeof careerFieldFilter)}
              >
                <option value="all">All career fields</option>
                <option value="BUSINESS">Business &amp; sales</option>
                <option value="FINANCE_ACCOUNTING">Finance &amp; accounting</option>
                <option value="HEALTHCARE">Healthcare</option>
                <option value="MARKETING_COMMUNICATIONS">Marketing &amp; communications</option>
                <option value="DESIGN_CREATIVE">Design &amp; creative</option>
                <option value="EDUCATION">Education</option>
                <option value="SCIENCE_RESEARCH">Science &amp; research</option>
                <option value="LAW_GOVERNMENT_POLICY">Law, government &amp; policy</option>
                <option value="OPERATIONS_LOGISTICS">Operations &amp; logistics</option>
                <option value="HOSPITALITY">Hospitality</option>
                <option value="SKILLED_TRADES">Skilled trades</option>
                <option value="ENGINEERING">Engineering</option>
                <option value="TECHNOLOGY">Technology</option>
                <option value="OTHER">Other</option>
              </select>

              <select className="filter-select" value={deadlineUrgency} onChange={(e) => setDeadlineUrgency(e.target.value as any)}>
                <option value="all">All deadlines</option>
                <option value="due_soon">Due soon (≤ 14 days)</option>
                <option value="due_later">Due later</option>
              </select>

              <select
                className="filter-select"
                value={workplaceFilter}
                onChange={(e) => setWorkplaceFilter(e.target.value as typeof workplaceFilter)}
              >
                <option value="all">Any workplace</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="location">Location-based</option>
              </select>

              <select
                className="filter-select"
                value={roleLevelFilter}
                onChange={(e) => setRoleLevelFilter(e.target.value as typeof roleLevelFilter)}
              >
                <option value="all">Any career level</option>
                <option value="internship">Internship</option>
                <option value="new-grad">New graduate</option>
                <option value="apprenticeship">Apprenticeship</option>
              </select>

              <select
                className="filter-select"
                value={postedWithin}
                onChange={(e) => setPostedWithin(e.target.value as typeof postedWithin)}
              >
                <option value="all">Any posting date</option>
                <option value="7">Posted within 7 days</option>
                <option value="30">Posted within 30 days</option>
              </select>

              <label className="salary-filter">
                <input
                  type="checkbox"
                  checked={salaryOnly}
                  onChange={(e) => setSalaryOnly(e.target.checked)}
                />
                Salary listed
              </label>

              <button className="btn-clear" onClick={resetFilters}>Clear</button>
            </div>

            {sortedOpportunities.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">🔍</p>
                <p className="empty-title">No opportunities match your filters</p>
                <p className="empty-text">Try adjusting your search or clearing filters to see more opportunities.</p>
              </div>
            ) : (
              <div className="opportunities-grid">
                {sortedOpportunities.map((opp) => renderOpportunityCard(opp))}
              </div>
            )}
          </div>
        )
      case 'saved':
        return (
          <div className="tab-content">
            <h2>Saved</h2>
            <p>Opportunities you've bookmarked for later</p>
            {savedOpportunities.length === 0 ? (
              <div className="empty-state">
                <p className="empty-icon">📋</p>
                <p className="empty-title">No saved opportunities yet</p>
                <p className="empty-text">
                  Save opportunities from the Opportunities tab to track them here.
                </p>
              </div>
            ) : (
              <div className="opportunities-grid">
                {savedOpportunities.map((opp) => (
                  <div key={opp.id} className="saved-item">
                    {renderOpportunityCard(opp)}
                    <div className="saved-controls">
                      <label>
                        Status
                        <select
                          className="status-select"
                          value={appStatuses[opp.id] ?? 'Saved'}
                          onChange={(e) => setStatus(opp.id, e.target.value as any)}
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applying">Applying</option>
                          <option value="Applied">Applied</option>
                          <option value="Interview">Interview</option>
                          <option value="Done">Done</option>
                        </select>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      case 'deadlines': {
        const now = new Date()
        const msPerDay = 1000 * 60 * 60 * 24

        // map opportunities to deadline items with computed daysRemaining and urgency
        let withDeadlines = opportunities
          .map((opp) => {
            const d = new Date(opp.deadline)
            const daysRemaining = Math.ceil((d.getTime() - now.getTime()) / msPerDay)
            const urgency = daysRemaining < 0 ? 'past' : daysRemaining <= 14 ? 'due_soon' : 'upcoming'
            return { opp, d, daysRemaining, urgency }
          })
          .filter((item) => !isNaN(item.d.getTime()))

        // optionally filter out past deadlines
        if (!includePastDeadlines) {
          withDeadlines = withDeadlines.filter((item) => item.daysRemaining >= 0)
        }

        // saved deadlines
        const savedDeadlineItems = withDeadlines
          .filter((item) => isSaved(item.opp.id))
          .sort((a, b) => a.d.getTime() - b.d.getTime())

        // all other deadlines
        const otherDeadlineItems = withDeadlines
          .filter((item) => !isSaved(item.opp.id))
          .sort((a, b) => a.d.getTime() - b.d.getTime())

        const renderDeadlineItem = (item: typeof withDeadlines[0]) => (
          <div key={item.opp.id} className={`deadline-item ${item.urgency}`}>
            <div className="deadline-left">
              <h3 className="deadline-title">{item.opp.title}</h3>
              <p className="deadline-source">{item.opp.source} · {item.opp.type.replace('_', ' ')}</p>
            </div>
            <div className="deadline-right">
              <div className="deadline-date">{item.d.toLocaleDateString()}</div>
              <div className="days-remaining">{item.daysRemaining >= 0 ? `${item.daysRemaining} days` : `${Math.abs(item.daysRemaining)} days ago`}</div>
              <div className="urgency-badges">
                <span className={`badge urgency-badge ${item.urgency}`}>
                  {item.urgency === 'past' ? 'Past deadline' : item.urgency === 'due_soon' ? 'Due soon' : 'Upcoming'}
                </span>
                {isSaved(item.opp.id) && <span className="saved-deadline-badge">Saved</span>}
              </div>
            </div>
          </div>
        )

        return (
          <div className="tab-content">
            <h2>Deadlines</h2>
            <p>Track upcoming deadlines for opportunities you're interested in.</p>

            <div className="deadlines-controls">
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={onlySavedDeadlines} onChange={(e) => setOnlySavedDeadlines(e.target.checked)} />
                <span>Show only saved</span>
              </label>

              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={includePastDeadlines} onChange={(e) => setIncludePastDeadlines(e.target.checked)} />
                <span>Include past deadlines</span>
              </label>

              <button className="btn-clear" onClick={() => { setOnlySavedDeadlines(false); setIncludePastDeadlines(false); }}>
                Reset
              </button>
            </div>

            {onlySavedDeadlines ? (
              <section className="deadlines-section">
                <h3 className="section-title">Saved deadlines</h3>
                <div className="deadline-list">
                  {savedDeadlineItems.length > 0 ? (
                    savedDeadlineItems.map((item) => renderDeadlineItem(item))
                  ) : (
                    <div className="placeholder-card empty">
                      <p>No saved deadlines found.</p>
                      <p style={{ marginTop: 8 }}>Save opportunities from the Opportunities tab to track their deadlines here.</p>
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <>
                {savedDeadlineItems.length > 0 && (
                  <section className="deadlines-section">
                    <h3 className="section-title">Saved deadlines</h3>
                    <div className="deadline-list">
                      {savedDeadlineItems.map((item) => renderDeadlineItem(item))}
                    </div>
                  </section>
                )}

                <section className="deadlines-section">
                  <h3 className="section-title">All deadlines</h3>
                  <div className="deadline-list">
                    {otherDeadlineItems.length > 0 ? (
                      otherDeadlineItems.map((item) => renderDeadlineItem(item))
                    ) : (
                      <div className="placeholder-card empty">
                        <p>No upcoming deadlines found.</p>
                        <p style={{ marginTop: 8 }}>Try expanding filters or check back later.</p>
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}
          </div>
        )
      }
      case 'profile':
        return (
          <div className="tab-content">
            <h2>Profile</h2>
            <p>Manage your profile and preferences.</p>

            <div className="profile-grid">
              <form
                className="profile-form"
                onSubmit={(e) => {
                  e.preventDefault()
                }}
              >
                <label>
                  Name
                  <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                </label>

                <label>
                  School
                  <input value={profile.school} onChange={(e) => setProfile({ ...profile, school: e.target.value })} />
                </label>

                <label>
                  Major
                  <input value={profile.major} onChange={(e) => setProfile({ ...profile, major: e.target.value })} />
                </label>

                <label>
                  Year
                  <select value={profile.year} onChange={(e) => setProfile({ ...profile, year: e.target.value as any })}>
                    <option value="freshman">Freshman</option>
                    <option value="sophomore">Sophomore</option>
                    <option value="junior">Junior</option>
                    <option value="senior">Senior</option>
                    <option value="graduate">Graduate</option>
                  </select>
                </label>

                <label>
                  Interests (comma-separated)
                  <input
                    value={profile.interests.join(', ')}
                    onChange={(e) => setProfile({ ...profile, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </label>

                <label>
                  Skills (comma-separated)
                  <input
                    value={profile.skills.join(', ')}
                    onChange={(e) => setProfile({ ...profile, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                  />
                </label>

                <fieldset className="pref-types">
                  <legend>Preferred opportunity types</legend>
                  {allOpportunityTypes.map((t) => (
                    <label key={t} className="checkbox-inline">
                      <input
                        type="checkbox"
                        checked={profile.preferredOpportunityTypes.includes(t)}
                        onChange={(e) => {
                          const next = new Set(profile.preferredOpportunityTypes)
                          if (e.target.checked) next.add(t)
                          else next.delete(t)
                          setProfile({ ...profile, preferredOpportunityTypes: Array.from(next) })
                        }}
                      />
                      {t.replace('_', ' ')}
                    </label>
                  ))}
                </fieldset>

                <label>
                  Location preference
                  <input value={profile.locationPreference} onChange={(e) => setProfile({ ...profile, locationPreference: e.target.value })} />
                </label>

                <label>
                  Availability
                  <input value={profile.availability} onChange={(e) => setProfile({ ...profile, availability: e.target.value })} />
                </label>

                <label>
                  Short-term goal
                  <input value={profile.shortTermGoal} onChange={(e) => setProfile({ ...profile, shortTermGoal: e.target.value })} />
                </label>

                <label>
                  Long-term goal
                  <input value={profile.longTermGoal} onChange={(e) => setProfile({ ...profile, longTermGoal: e.target.value })} />
                </label>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                  <label>
                    Resume Upload
                    <input key={resumeInputKey} type="file" accept=".pdf,.doc,.docx,.txt" onChange={handleResumeUpload} />
                  </label>
                  {resumeFileName && <p style={{ fontSize: 13, color: 'var(--text)', marginTop: 6 }}>✓ Resume uploaded: {resumeFileName}</p>}
                </div>

                <label>
                  Resume Highlights / Key Skills
                  <textarea
                    value={resumeHighlights}
                    onChange={(e) => setResumeHighlights(e.target.value)}
                    placeholder="Paste or type key skills from your resume (e.g., Python, Project Management, Leadership)..."
                    style={{ minHeight: 80 }}
                  />
                </label>

                <button
                  type="button"
                  className="btn-clear"
                  onClick={saveResumeHighlights}
                >
                  Save Resume Highlights
                </button>

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="btn-learn-more"
                    onClick={() => saveProfileToStorage(profile)}
                  >
                    Save profile
                  </button>
                  <button
                    type="button"
                    className="btn-clear"
                    onClick={() => resetProfileToSample()}
                  >
                    Reset
                  </button>
                </div>

              </form>

              <div className="profile-summary">
                <h3>Profile summary</h3>
                <p><strong>{profile.name}</strong></p>
                <p>{profile.school} — {profile.major} ({profile.year})</p>
                <p><strong>Interests:</strong> {profile.interests.join(', ') || '—'}</p>
                <p><strong>Skills:</strong> {profile.skills.join(', ') || '—'}</p>
                <p><strong>Preferred types:</strong> {profile.preferredOpportunityTypes.join(', ') || '—'}</p>
                <p><strong>Location:</strong> {profile.locationPreference}</p>
                <p><strong>Availability:</strong> {profile.availability}</p>
                <p><strong>Short-term:</strong> {profile.shortTermGoal}</p>
                <p><strong>Long-term:</strong> {profile.longTermGoal}</p>
                {resumeFileName && <p><strong>Resume:</strong> {resumeFileName}</p>}
                {resumeHighlights && <p><strong>Resume highlights:</strong> {resumeHighlights.split(',').slice(0, 3).join(', ') || '—'}</p>}
                {profileSavedMessage && <p style={{ marginTop: 12, color: 'var(--accent)' }}>{profileSavedMessage}</p>}
              </div>
            </div>
          </div>
        )
      case 'resume':
        return <ResumeBuilder profile={profile} resumeHighlights={resumeHighlights} />
      default:
        return null
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">Student Opportunity Engine</h1>
          <p className="app-subtitle">Find campus and external opportunities in one personalized feed.</p>
        </div>
      </header>

      <nav className="app-nav">
        <button
          className={`nav-tab ${activeTab === 'opportunities' ? 'active' : ''}`}
          onClick={() => setActiveTab('opportunities')}
        >
          Opportunities
        </button>
        <button
          className={`nav-tab ${activeTab === 'saved' ? 'active' : ''}`}
          onClick={() => setActiveTab('saved')}
        >
          Saved
        </button>
        <button
          className={`nav-tab ${activeTab === 'deadlines' ? 'active' : ''}`}
          onClick={() => setActiveTab('deadlines')}
        >
          Deadlines
        </button>
        <button
          className={`nav-tab ${activeTab === 'resume' ? 'active' : ''}`}
          onClick={() => setActiveTab('resume')}
        >
          Resume Builder
        </button>
        <button
          className={`nav-tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
      </nav>

      <main className="app-main">
        {renderContent()}
      </main>

      {selectedOpportunity && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={(e) => { if (e.target === e.currentTarget) closeDetails() }}>
          <div className="modal-panel">
            <div className="modal-header">
              <h2 id="modal-title">{selectedOpportunity.title}</h2>
              <div className="modal-header-right">
                <span className="opp-type-badge" style={{ backgroundColor: opportunityTypeColors[selectedOpportunity.type] }}>{opportunityTypeEmojis[selectedOpportunity.type]} {selectedOpportunity.type.replace('_', ' ')}</span>
                <span className="badge match-badge" style={{ backgroundColor: getMatchColor(currentMatch?.matchScore ?? 0), marginLeft: 8 }}>
                  {currentMatch?.matchScore ?? 0}%
                </span>
                {isSaved(selectedOpportunity.id) && (
                  <span className={`badge status-badge ${(appStatuses[selectedOpportunity.id] ?? 'Saved').toLowerCase()}`} style={{ marginLeft: 8 }}>{appStatuses[selectedOpportunity.id] ?? 'Saved'}</span>
                )}
                <button className="modal-close" onClick={closeDetails} aria-label="Close details">×</button>
              </div>
            </div>

            <div className="modal-body">
              <p className="opp-source">{selectedOpportunity.source} · {selectedOpportunity.location}</p>
              {selectedOpportunity.attribution && (
                <p>
                  <a
                    className="opp-attribution"
                    href={selectedOpportunity.attribution.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {selectedOpportunity.attribution.label}
                  </a>
                </p>
              )}
              <p>
                <strong>Deadline:</strong>{' '}
                {selectedOpportunity.deadline
                  ? new Date(selectedOpportunity.deadline).toLocaleDateString()
                  : 'Not listed'}
              </p>
              <p><strong>Posted:</strong> {new Date(selectedOpportunity.postedDate).toLocaleDateString()}</p>
              {selectedOpportunity.compensation && (
                <p><strong>Compensation:</strong> {selectedOpportunity.compensation}</p>
              )}
              <section className="full-description">
                <h3>Full description</h3>
                <p>{selectedOpportunity.fullDescription ?? selectedOpportunity.description}</p>
              </section>

              <div style={{ marginTop: 12 }}>
                <strong>Required skills:</strong>
                <div className="skill-tags" style={{ marginTop: 8 }}>
                  {selectedOpportunity.requiredSkills.map((s) => <span key={s} className="skill-tag">{s}</span>)}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Related majors:</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedOpportunity.relatedMajors.join(', ')}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Tags:</strong>
                <div className="skill-tags" style={{ marginTop: 8 }}>
                  {selectedOpportunity.tags.map((t) => <span key={t} className="skill-tag">{t}</span>)}
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <strong>Application step:</strong>
                <p>{selectedOpportunity.applicationStep}</p>
                {selectedOpportunity.applicationUrl ? (
                  <p style={{ marginTop: 8 }}>
                    <a className="btn-apply" href={selectedOpportunity.applicationUrl} target="_blank" rel="noopener noreferrer" onClick={() => handleApplyClick(selectedOpportunity.id)}>Apply Now</a>
                    {applyClickedIds.has(selectedOpportunity.id) && <span className="apply-tracked" style={{ marginLeft: 8 }}>Apply link opened</span>}
                  </p>
                ) : (
                  <p style={{ marginTop: 8 }} className="apply-coming">Application link coming soon</p>
                )}
              </div>

              {currentMatch && currentMatch.matchReasons.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <strong>Why it matches:</strong>
                  <ul>
                    {currentMatch.matchReasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}

              {guidanceLoading && (
                <div className="ai-guidance" style={{ marginTop: 16 }}>
                  <h4 style={{ margin: '0 0 8px 0' }}>AI Application Guidance</h4>
                 <p style={{ margin: '6px 0', fontStyle: 'italic', color: '#666' }}>⏳ Generating personalized guidance...</p>
               </div>
              )}

              {guidanceError && (
               <div className="ai-guidance" style={{ marginTop: 16 }}>
                 <h4 style={{ margin: '0 0 8px 0' }}>Application Guidance</h4>
                 <p style={{ margin: '6px 0', color: '#d32f2f' }}>⚠️ {guidanceError}</p>
               </div>
              )}

              {currentGuidance && !guidanceLoading && (
               <div className="ai-guidance" style={{ marginTop: 16 }}>
                 <h4 style={{ margin: '0 0 8px 0' }}>
                   {currentGuidance.isAI ? '✨ AI Application Guidance' : 'Application Guidance'}
                 </h4>

                 <p style={{ margin: '6px 0' }}><strong>Why apply:</strong> {currentGuidance.why}</p>

                 <p style={{ margin: '6px 0' }}><strong>Suggested next step:</strong> {currentGuidance.nextStep}</p>

                 <div style={{ margin: '8px 0' }}>
                   <strong>What to highlight:</strong>
                   <ul style={{ marginTop: 6 }}>
                     {currentGuidance.highlights.map((h, idx) => <li key={idx}>{h}</li>)}
                   </ul>
                 </div>

                 <p style={{ margin: '6px 0' }}><strong>Resume/Cover tip:</strong> {currentGuidance.tip}</p>
               </div>
              )}

            </div>

            <div className="modal-footer">
            <select className="status-select" value={appStatuses[selectedOpportunity.id] ?? 'Saved'} onChange={(e) => setStatus(selectedOpportunity.id, e.target.value as any)}>
              <option value="Saved">Saved</option>
              <option value="Applying">Applying</option>
              <option value="Applied">Applied</option>
              <option value="Interview">Interview</option>
              <option value="Done">Done</option>
            </select>
            <button className={`btn-save ${isSaved(selectedOpportunity.id) ? 'saved' : ''}`} onClick={() => toggleSave(selectedOpportunity.id)}>
              {isSaved(selectedOpportunity.id) ? 'Saved' : 'Save'}
            </button>
            <button className="btn-clear" onClick={closeDetails}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default App
