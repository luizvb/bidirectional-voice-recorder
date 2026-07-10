import type { CSSProperties } from 'react';
import {
  ArrowRight,
  AudioLines,
  Brain,
  CheckCircle2,
  Clock3,
  Command,
  Download,
  FileSearch,
  Mic2,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

const appTargets = ['Interviews', 'Meetings', 'Sales', '1:1s', 'Feedback', 'CS calls'];

const insights = [
  'Decisions extracted',
  'Speaker balance mapped',
  'Follow-ups assigned',
  'Sentiment shifts flagged',
];

const useCases = [
  {
    title: 'Hiring interviews',
    description: 'Compare candidates with searchable transcripts, technical signals, and structured notes.',
    icon: Users,
  },
  {
    title: 'Revenue calls',
    description: 'Find objections, buying signals, missed opportunities, and concrete next steps.',
    icon: Sparkles,
  },
  {
    title: 'Leadership feedback',
    description: 'Turn 1:1s and feedback sessions into coaching patterns instead of forgotten context.',
    icon: Brain,
  },
  {
    title: 'Customer conversations',
    description: 'Spot churn risk, product pain, and recurring requests across every conversation.',
    icon: FileSearch,
  },
];

const workflow = [
  {
    step: '01',
    title: 'Capture both sides',
    description: 'Native macOS recording captures microphone and system audio locally.',
  },
  {
    step: '02',
    title: 'Understand the room',
    description: 'Voxa transcribes, identifies speakers, and keeps the conversation searchable.',
  },
  {
    step: '03',
    title: 'Turn talk into action',
    description: 'AI analysis extracts summaries, decisions, tasks, risks, and communication patterns.',
  },
];

function ProductMock() {
  return (
    <div className="product-mock" aria-label="Voxa product preview">
      <div className="mock-window">
        <div className="mock-titlebar">
          <div className="traffic-lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span>Voxa intelligence session</span>
          <div className="mock-status">
            <span className="live-dot" />
            Recording
          </div>
        </div>

        <div className="mock-body">
          <aside className="mock-sidebar">
            <img src="/voxalogo.png" alt="Voxa" className="mock-logo" />
            <div className="sidebar-row active">
              <AudioLines size={16} />
              Current call
            </div>
            <div className="sidebar-row">
              <Search size={16} />
              Search memory
            </div>
            <div className="sidebar-row">
              <Brain size={16} />
              AI analysis
            </div>
          </aside>

          <main className="mock-content">
            <section className="recording-panel">
              <div>
                <p className="eyebrow">Native macOS recorder</p>
                <h2>Board interview - Product Lead</h2>
              </div>
              <div className="timer">
                <Clock3 size={16} />
                24:18
              </div>
            </section>

            <section className="wave-panel" aria-label="Live audio waveform">
              {Array.from({ length: 38 }).map((_, index) => (
                <span
                  key={index}
                  style={{ '--bar-height': `${22 + ((index * 17) % 58)}%` } as CSSProperties}
                />
              ))}
            </section>

            <section className="analysis-grid">
              <div className="speaker-card">
                <p className="eyebrow">Speakers</p>
                <div className="speaker-row">
                  <span>Interviewer</span>
                  <strong>52%</strong>
                </div>
                <div className="speaker-meter">
                  <span style={{ width: '52%' }} />
                </div>
                <div className="speaker-row">
                  <span>Candidate</span>
                  <strong>48%</strong>
                </div>
                <div className="speaker-meter secondary">
                  <span style={{ width: '48%' }} />
                </div>
              </div>

              <div className="insight-card">
                <p className="eyebrow">Extracted intelligence</p>
                {insights.map((item) => (
                  <div className="insight-row" key={item}>
                    <CheckCircle2 size={16} />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function MarketingSite() {
  return (
    <main className="marketing-site">
      <header className="site-nav">
        <a className="brand-lockup" href="#top" aria-label="Voxa home">
          <img src="/voxalogo.png" alt="" />
          <span>Voxa</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#workflow">Workflow</a>
          <a href="#use-cases">Use cases</a>
          <a href="#platform">Platform</a>
        </nav>
        <a className="nav-cta" href="mailto:hello@voxa.ai?subject=Voxa early access">
          Early access
          <ArrowRight size={16} />
        </a>
      </header>

      <section className="hero-section" id="top">
        <div className="hero-copy">
          <div className="hero-kicker">
            <Mic2 size={16} />
            AI conversation intelligence for macOS
          </div>
          <h1>Turn every important conversation into searchable intelligence.</h1>
          <p>
            Voxa records conversations locally, identifies speakers, transcribes with context,
            and extracts the decisions, tasks, risks, and patterns that usually disappear after a call.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="mailto:hello@voxa.ai?subject=Voxa early access">
              <Download size={18} />
              Get early access
            </a>
            <a className="secondary-action" href="#workflow">
              See workflow
              <ArrowRight size={18} />
            </a>
          </div>
          <div className="key-command" aria-label="Keyboard shortcut">
            <span>Select any conversation</span>
            <kbd>
              <Command size={15} />
              Space
            </kbd>
            <span>capture the knowledge</span>
          </div>
        </div>

        <ProductMock />
      </section>

      <section className="target-strip" aria-label="Conversation types">
        {appTargets.map((target) => (
          <span key={target}>{target}</span>
        ))}
      </section>

      <section className="workflow-section" id="workflow">
        <div className="section-heading">
          <p className="eyebrow">From voice to memory</p>
          <h2>Recording is just the beginning.</h2>
        </div>
        <div className="workflow-grid">
          {workflow.map((item) => (
            <article key={item.step}>
              <span>{item.step}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="split-section" id="platform">
        <div>
          <p className="eyebrow">Built for operators</p>
          <h2>One platform for conversations that drive decisions.</h2>
          <p>
            Voxa is designed for people whose work depends on what was said: founders, leaders,
            recruiters, sales teams, customer success, consultants, and product teams.
          </p>
        </div>
        <div className="capability-list">
          <div>
            <ShieldCheck size={20} />
            <span>Local-first macOS capture</span>
          </div>
          <div>
            <Users size={20} />
            <span>Automatic speaker identification</span>
          </div>
          <div>
            <Search size={20} />
            <span>Semantic search across sessions</span>
          </div>
          <div>
            <Brain size={20} />
            <span>Summaries, tasks, coaching signals</span>
          </div>
        </div>
      </section>

      <section className="use-case-section" id="use-cases">
        <div className="section-heading">
          <p className="eyebrow">Use cases</p>
          <h2>Designed for conversations with consequences.</h2>
        </div>
        <div className="use-case-grid">
          {useCases.map(({ title, description, icon: Icon }) => (
            <article key={title}>
              <Icon size={22} />
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="final-cta">
        <div>
          <p className="eyebrow">Voxa</p>
          <h2>Make every conversation impossible to forget.</h2>
        </div>
        <a className="primary-action" href="mailto:hello@voxa.ai?subject=Voxa early access">
          Request access
          <ArrowRight size={18} />
        </a>
      </section>
    </main>
  );
}
