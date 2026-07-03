import { useState } from 'react'
import { useStore } from '../state/store'
import { CreatePlayerModal } from './CreatePlayerModal'

export function CustomPlayersSection({
  variant = 'panel',
}: {
  variant?: 'panel' | 'landing'
}) {
  const userPlayers = useStore((s) => s.userPlayers)
  const addUserPlayer = useStore((s) => s.addUserPlayer)
  const removeUserPlayer = useStore((s) => s.removeUserPlayer)
  const toggleUserPlayerInclusion = useStore(
    (s) => s.toggleUserPlayerInclusion,
  )
  const game = useStore((s) => s.game)
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState(variant === 'panel')

  const excludedIds = new Set(game?.excludedUserPlayerIds ?? [])
  // Checkboxes can only edit inclusion if there's a game AND the draft
  // hasn't started yet. On landing / mid-draft they read as included.
  const canToggle = !!game && game.draft.status === 'pending'

  const list = (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs uppercase tracking-widest text-slate-400">
          Custom Players{userPlayers.length > 0 && ` (${userPlayers.length})`}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-500 text-black"
        >
          + Add Player
        </button>
      </div>
      {userPlayers.length === 0 ? (
        <div className="text-sm text-slate-500 italic bg-slate-900 rounded-xl p-3 text-left">
          Create yourself, your kids, anyone — they'll show up in the draft pool.
        </div>
      ) : (
        <>
          {canToggle && (
            <div className="text-[11px] text-slate-500 mb-2 text-left">
              Check the players you want in this draft.
            </div>
          )}
        <div className="space-y-2">
          {userPlayers.map((u) => {
            const included = !excludedIds.has(u.core.id)
            return (
              <div
                key={u.core.id}
                className={`flex items-center gap-3 bg-slate-900 rounded-xl p-2 text-left transition-opacity ${
                  included ? '' : 'opacity-50'
                }`}
              >
                <label
                  className={`flex items-center justify-center w-6 h-6 rounded border-2 flex-shrink-0 ${
                    included
                      ? 'bg-sky-500 border-sky-500'
                      : 'bg-transparent border-slate-600'
                  } ${canToggle ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                  title={
                    canToggle
                      ? included
                        ? 'Included — click to exclude from this draft'
                        : 'Excluded — click to include in this draft'
                      : game
                        ? 'Draft already started'
                        : 'Start a draft to include or exclude'
                  }
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={included}
                    disabled={!canToggle}
                    onChange={() => toggleUserPlayerInclusion(u.core.id)}
                  />
                  {included && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      className="w-4 h-4 text-black"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 011.4-1.4L8.6 12l6.7-6.7a1 1 0 011.4 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </label>
                <div className="w-12 h-12 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {u.core.photoUrl ? (
                    <img
                      src={u.core.photoUrl}
                      alt={u.core.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-black text-slate-600">
                      {u.core.name
                        .split(' ')
                        .map((n) => n[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join('')}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{u.core.name}</div>
                  <div className="text-xs text-slate-400">
                    {u.core.position} · OVR {u.rating.value} · {u.core.nflTeam}
                  </div>
                </div>
                <button
                  onClick={() => removeUserPlayer(u.core.id)}
                  className="text-xs text-slate-500 hover:text-red-400 px-2 py-1"
                  aria-label={`Remove ${u.core.name}`}
                >
                  Remove
                </button>
              </div>
            )
          })}
        </div>
        </>
      )}
    </>
  )

  const modal = showCreate ? (
    <CreatePlayerModal
      onClose={() => setShowCreate(false)}
      onSave={(input) => {
        addUserPlayer(input)
        setShowCreate(false)
      }}
    />
  ) : null

  if (variant === 'landing') {
    return (
      <div className="w-full max-w-md">
        {!expanded ? (
          <button
            onClick={() => setExpanded(true)}
            className="text-sm text-slate-400 hover:text-slate-200 underline"
          >
            Custom Players
            {userPlayers.length > 0 && ` (${userPlayers.length})`}
          </button>
        ) : (
          <div className="rounded-2xl bg-slate-950/60 border border-slate-800 p-4">
            {list}
            <button
              onClick={() => setExpanded(false)}
              className="mt-3 text-xs text-slate-500 underline"
            >
              Hide
            </button>
          </div>
        )}
        {modal}
      </div>
    )
  }

  return (
    <section className="mb-6">
      {list}
      {modal}
    </section>
  )
}
