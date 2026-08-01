"use client";

export default function UserPresence({ users, identity, onRename }) {
  const visible = users.slice(0, 5);
  const overflow = users.length - visible.length;
  return (
    <div className="collab-presence">
      <div className="collab-presence-title">Online · {users.length}</div>
      <div className="collab-user-list">
        {visible.map((user) => (
          <div className="collab-user" key={user.clientId} title={user.name}>
            <span className="collab-user-dot" style={{ background: user.color }} />
            <span>{user.name}{user.id === identity?.id ? " (you)" : ""}</span>
          </div>
        ))}
        {users.length <= 1 && <div className="collab-only-you">Only you</div>}
        {overflow > 0 && <div className="collab-overflow">+{overflow} more</div>}
      </div>
      {identity && (
        <button
          className="collab-rename"
          onClick={() => {
            const name = window.prompt("Display name", identity.name);
            if (name) onRename(name);
          }}
        >
          Change my name
        </button>
      )}
    </div>
  );
}
