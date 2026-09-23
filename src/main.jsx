import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const initialNotes = [
  { id: 1, title: "Welcome", body: "Welcome to JEO Note Station.", updated: "Just now" },
  { id: 2, title: "LEG GO", body: "A place for ideas, plans, and unfinished thoughts.", updated: "Today" },
  { id: 3, title: "Damn Boy", body: "Keep this one for later.", updated: "Yesterday" }
];

function Icon({ children, label }) {
  return <span className="icon" aria-label={label}>{children}</span>;
}

function App() {
  const [notes, setNotes] = useState(initialNotes);
  const [activeId, setActiveId] = useState(null);
  const [query, setQuery] = useState("");
  const [ask, setAsk] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const activeNote = notes.find((note) => note.id === activeId);

  const filteredNotes = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return notes;
    return notes.filter((note) =>
      note.title.toLowerCase().includes(value) ||
      note.body.toLowerCase().includes(value)
    );
  }, [notes, query]);

  function createNote() {
    const note = {
      id: Date.now(),
      title: "Untitled note",
      body: "",
      updated: "Just now"
    };
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
  }

  function updateActive(field, value) {
    setNotes((current) =>
      current.map((note) =>
        note.id === activeId ? { ...note, [field]: value, updated: "Just now" } : note
      )
    );
  }

  function deleteNote(id) {
    setNotes((current) => current.filter((note) => note.id !== id));
    if (activeId === id) setActiveId(null);
  }

  function handleAsk(event) {
    event.preventDefault();
    if (!ask.trim()) return;
    const note = {
      id: Date.now(),
      title: ask.trim(),
      body: "Created from Ask. Start writing here...",
      updated: "Just now"
    };
    setNotes((current) => [note, ...current]);
    setActiveId(note.id);
    setAsk("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">N</div>
          <div>
            <div className="brand-title">Note Station</div>
            <div className="brand-subtitle">JEO</div>
          </div>
        </div>

        <div className="sidebar-spacer" />

        <div className="sidebar-footer">
          <button className="profile-button" title="Profile">
            <span className="avatar">J</span>
            <span className="profile-copy">
              <strong>Workspace</strong>
              <small>Personal</small>
            </span>
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar-title">Notes</div>
          <button
            className="settings-button"
            onClick={() => setSettingsOpen((open) => !open)}
            aria-label="Settings"
            title="Settings"
          >
            <Icon label="Settings">⚙</Icon>
          </button>
          {settingsOpen && (
            <div className="settings-popover">
              <strong>Note Station</strong>
              <span>Desktop workspace</span>
              <button onClick={() => setSettingsOpen(false)}>Close</button>
            </div>
          )}
        </header>

        <section className="content">
          <form className="ask-box" onSubmit={handleAsk}>
            <Icon label="Ask">✦</Icon>
            <input
              value={ask}
              onChange={(event) => setAsk(event.target.value)}
              placeholder="Ask"
              aria-label="Ask"
            />
            <button type="submit" aria-label="Submit ask">↵</button>
          </form>

          <div className="quick-actions">
            <button className="action-card" onClick={createNote}>
              <span className="action-icon">+</span>
              <span><strong>New note</strong><small>Start writing</small></span>
            </button>
            <label className="action-card search-card">
              <span className="action-icon">⌕</span>
              <span><strong>Search</strong><small>Find anything</small></span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search notes..."
                aria-label="Search notes"
              />
            </label>
          </div>

          <div className="section-heading">
            <h2>Recent</h2>
            <span>{filteredNotes.length} notes</span>
          </div>

          <div className="notes-grid">
            {filteredNotes.map((note) => (
              <article
                className={`note-card ${activeId === note.id ? "selected" : ""}`}
                key={note.id}
                onClick={() => setActiveId(note.id)}
              >
                <div className="note-card-top">
                  <h3>{note.title || "Untitled note"}</h3>
                  <button
                    className="more-button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteNote(note.id);
                    }}
                    title="Delete note"
                  >•••</button>
                </div>
                <p>{note.body || "Empty note"}</p>
                <small>{note.updated}</small>
              </article>
            ))}
          </div>
        </section>
      </main>

      {activeNote && (
        <section className="editor-panel">
          <div className="editor-header">
            <button onClick={() => setActiveId(null)} className="back-button">←</button>
            <span>Editing</span>
            <span className="save-state">Saved</span>
          </div>
          <div className="editor">
            <input
              className="title-input"
              value={activeNote.title}
              onChange={(event) => updateActive("title", event.target.value)}
              placeholder="Untitled note"
            />
            <textarea
              className="body-input"
              value={activeNote.body}
              onChange={(event) => updateActive("body", event.target.value)}
              placeholder="Start writing..."
              autoFocus
            />
          </div>
        </section>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
