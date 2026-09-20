import { useState } from 'react'
import './App.css'

function App() {
  const [showReport, setShowReport] = useState(false)

  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [analysis, setAnalysis] = useState<{
  category: string
  severity: string
  department: string
  action: string
} | null>(null)

  if (showReport) {
    return (
      <div className="app">
        <nav className="navbar">
          <h2>⚡ CivicFlow</h2>

          <button
            className="profile-btn"
            onClick={() => setShowReport(false)}
          >
            ← Back
          </button>
        </nav>

        <main className="report-page">
          <div className="report-header">
            <p className="tagline">CIVICFLOW INTELLIGENCE</p>

            <h1>Report a Civic Issue</h1>

            <p>
              Tell us what is happening. CivicFlow will analyze the
              issue, location and urgency.
            </p>
          </div>

          <div className="report-card">

            <label>Where is the problem?</label>

            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="">Select your area</option>
              <option>Kolhapur</option>
              <option>Pune</option>
              <option>Mumbai</option>
              <option>Other</option>
            </select>

            <label>What type of issue is this?</label>

            <div className="category-grid">

              {['⚡ Electricity', '💧 Water', '🛣️ Roads', '🗑️ Sanitation'].map(
                (item) => (
                  <button
                    key={item}
                    className={`category-btn ${
                      category === item ? 'selected' : ''
                    }`}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                )
              )}

            </div>

            <label>Describe the problem</label>

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: There has been no electricity in our area for the last 3 hours..."
              rows={6}
            />

            <div className="evidence-box">
              <strong>📷 Add evidence</strong>

              <p>
                Upload a photo or other evidence to help CivicFlow
                understand the problem.
              </p>

              <button className="upload-btn">
                + Upload Image
              </button>
            </div>

          <button
  className="analyze-btn"
  onClick={() => {
    let severity = 'Medium'
    let department = 'Civic Services Department'
    let action = 'Forward to the responsible department'

    if (category.includes('Electricity')) {
      department = 'Electricity Maintenance Department'
    } else if (category.includes('Water')) {
      department = 'Water Supply Department'
    } else if (category.includes('Roads')) {
      department = 'Roads & Public Works Department'
    } else if (category.includes('Sanitation')) {
      department = 'Sanitation Department'
    }

    const text = description.toLowerCase()

    if (
      text.includes('hours') ||
      text.includes('danger') ||
      text.includes('accident') ||
      text.includes('emergency')
    ) {
      severity = 'High'
      action = 'Prioritize for urgent review'
    }

    setAnalysis({
      category: category || 'Needs clarification',
      severity,
      department,
      action,
    })
  }}
>
  ✨ Analyze with CivicFlow AI
</button>
{analysis && (
  <div className="analysis-result">
    <p className="tagline">CIVICFLOW AI ANALYSIS</p>

    <h2>Issue Intelligence</h2>

    <div className="analysis-grid">
      <div>
        <span>Category</span>
        <strong>{analysis.category}</strong>
      </div>

      <div>
        <span>Severity</span>
        <strong>{analysis.severity}</strong>
      </div>

      <div>
        <span>Responsible Department</span>
        <strong>{analysis.department}</strong>
      </div>

      <div>
        <span>Recommended Action</span>
        <strong>{analysis.action}</strong>
      </div>
    </div>

    <div className="ai-explanation">
      🤖 CivicFlow analyzed your selected category, location and
      description to determine the likely severity and responsible
      department.
    </div>
  </div>
)}  

          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app">

      <nav className="navbar">
        <h2>⚡ CivicFlow</h2>

        <div className="nav-links">
          <span>Home</span>
          <span>My Reports</span>
          <span>Dashboard</span>
        </div>

        <button className="profile-btn">
          Citizen
        </button>
      </nav>

      <main className="hero">

        <div className="hero-text">

          <p className="tagline">
            SMARTER CITIES • BETTER LIVING
          </p>

          <h1>
            Report problems.
            <br />
            Improve your community.
          </h1>

          <p className="description">
            CivicFlow uses AI to understand civic issues, connect
            reports from your area, and help communities get action.
          </p>

          <div className="hero-buttons">

            <button
              className="primary-btn"
              onClick={() => setShowReport(true)}
            >
              Report an Issue →
            </button>

            <button className="secondary-btn">
              Explore Dashboard
            </button>

          </div>

        </div>

        <div className="hero-card">

          <div className="card-icon">🏙️</div>

          <h3>Your Community Matters</h3>

          <p>
            One report can help identify a bigger problem in your area.
          </p>

          <div className="status">
            <span className="dot"></span>
            AI-powered civic intelligence
          </div>

        </div>

      </main>

      <section className="features">

        <div>
          <h3>🤖 AI Triage</h3>
          <p>
            Automatically understand and categorize civic complaints.
          </p>
        </div>

        <div>
          <h3>📍 Area Insights</h3>
          <p>
            Identify possible issues affecting multiple citizens.
          </p>
        </div>

        <div>
          <h3>🔎 Explainable Action</h3>
          <p>
            Understand severity, department mapping, and escalation.
          </p>
        </div>

      </section>

    </div>
  )
}

export default App