'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addCard, moveCard, deleteCard, addColumn } from '../board-actions';

type Card = { id: string; column_id: string; title: string; description: string | null; position: number };
type Column = { id: string; title: string; position: number };

export default function Board({
  engagementId, boardId, columns, cards,
}: {
  engagementId: string; boardId: string; columns: Column[]; cards: Card[];
}) {
  const router = useRouter();
  const [adding, setAdding] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [addingCol, setAddingCol] = useState(false);
  const [colDraft, setColDraft] = useState('');

  const cardsIn = (colId: string) => cards.filter((c) => c.column_id === colId).sort((a, b) => a.position - b.position);

  async function submitCard(colId: string) {
    if (!draft.trim()) { setAdding(null); return; }
    const t = draft; setDraft(''); setAdding(null);
    await addCard(engagementId, colId, t);
    router.refresh();
  }

  async function onDrop(colId: string, index: number) {
    if (!dragId) return;
    const id = dragId; setDragId(null);
    await moveCard(engagementId, id, colId, index);
    router.refresh();
  }

  async function removeCard(id: string) {
    await deleteCard(engagementId, id);
    router.refresh();
  }

  async function submitColumn() {
    if (!colDraft.trim()) { setAddingCol(false); return; }
    const t = colDraft; setColDraft(''); setAddingCol(false);
    await addColumn(engagementId, boardId, t);
    router.refresh();
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif text-lg">Project board</h3>
        <span className="text-xs text-muted">Drag cards between columns</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {columns.sort((a, b) => a.position - b.position).map((col) => (
          <div key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id, cardsIn(col.id).length)}
            className="flex-none w-64 bg-paper-2 rounded-xl p-3">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="font-semibold text-sm">{col.title}</span>
              <span className="text-xs text-muted bg-surface rounded-full px-2 py-0.5">{cardsIn(col.id).length}</span>
            </div>

            <div className="space-y-2 min-h-[8px]">
              {cardsIn(col.id).map((card, i) => (
                <div key={card.id} draggable
                  onDragStart={() => setDragId(card.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.stopPropagation(); onDrop(col.id, i); }}
                  className="group bg-surface border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-soft transition"
                  style={{ borderColor: 'var(--line)' }}>
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-sm leading-snug">{card.title}</p>
                    <button onClick={() => removeCard(card.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted hover:text-[#a14b3d] text-xs flex-none transition">✕</button>
                  </div>
                  {card.description && <p className="text-xs text-muted mt-1">{card.description}</p>}
                </div>
              ))}
            </div>

            {adding === col.id ? (
              <div className="mt-2">
                <textarea autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitCard(col.id); } }}
                  rows={2} placeholder="Card title…"
                  className="w-full text-sm rounded-lg border bg-surface px-2.5 py-2 resize-none outline-none"
                  style={{ borderColor: 'var(--line)' }} />
                <div className="flex gap-2 mt-1.5">
                  <button onClick={() => submitCard(col.id)} className="btn btn-primary text-xs py-1.5 px-3">Add</button>
                  <button onClick={() => { setAdding(null); setDraft(''); }} className="text-xs text-muted">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setAdding(col.id)}
                className="w-full text-left text-sm text-muted hover:text-ink mt-2 px-1 py-1.5 rounded-lg hover:bg-surface transition">
                + Add card
              </button>
            )}
          </div>
        ))}

        {/* add column */}
        <div className="flex-none w-64">
          {addingCol ? (
            <div className="bg-paper-2 rounded-xl p-3">
              <input autoFocus value={colDraft} onChange={(e) => setColDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') submitColumn(); }}
                placeholder="Column title…"
                className="w-full text-sm rounded-lg border bg-surface px-2.5 py-2 outline-none"
                style={{ borderColor: 'var(--line)' }} />
              <div className="flex gap-2 mt-1.5">
                <button onClick={submitColumn} className="btn btn-primary text-xs py-1.5 px-3">Add</button>
                <button onClick={() => { setAddingCol(false); setColDraft(''); }} className="text-xs text-muted">Cancel</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAddingCol(true)}
              className="w-full text-sm text-muted hover:text-ink border border-dashed rounded-xl py-3 transition hover:bg-paper-2"
              style={{ borderColor: 'var(--line)' }}>
              + Add column
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
