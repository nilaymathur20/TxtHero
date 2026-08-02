"use client";

export default function UserPresence({ users, identity, onRename, session, credential, onApprove, onRole, onRemove, onEnd }) {
  const isHost = credential?.role === "host";
  const participants = session?.participants || [];
  const pending = participants.filter((item) => item.status === "pending");
  const approved = participants.filter((item) => item.status !== "pending" && item.status !== "removed");
  const awarenessById = new Map(users.map((user) => [user.id, user]));
  return (
    <div className="collab-presence">
      <div className="collab-presence-title">Collaboration · {users.length} online</div>
      {isHost && pending.length > 0 && <div className="live-pending"><strong>Waiting for approval</strong>{pending.map((person) => <div key={person.participant_id}><span>{person.display_name}</span><button onClick={() => onApprove(person.request_id, true)}>Allow</button><button onClick={() => onApprove(person.request_id, false)}>Reject</button></div>)}</div>}
      <div className="collab-user-list">
        {approved.map((person) => {
          const liveUser = [...awarenessById.values()].find((user) => user.name === person.display_name);
          const online = Boolean(liveUser);
          return <div className="collab-user-card" key={person.participant_id}>
            <div><span className={`collab-user-dot ${online ? "" : "offline"}`} style={{ background: person.color }} /><span>{person.display_name}{person.display_name === identity?.name ? " (you)" : ""}</span></div>
            <small>{person.role} · {online ? liveUser.status : person.status}</small>
            {isHost && person.role !== "host" && <div className="live-person-actions"><select value={person.role} onChange={(e) => onRole(person.participant_id, e.target.value)}><option value="editor">Editor</option><option value="viewer">Viewer</option></select><button onClick={() => onRemove(person.participant_id)}>Remove</button></div>}
          </div>;
        })}
        {!approved.length && <div className="collab-only-you">Only you</div>}
      </div>
      {identity && <button className="collab-rename" onClick={() => { const name = window.prompt("Display name", identity.name); if (name) onRename(name); }}>Change my name</button>}
      {isHost && <button className="live-end" onClick={onEnd}>End session</button>}
    </div>
  );
}
