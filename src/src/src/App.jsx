import React, { useEffect, useMemo, useState } from "react";

/**
 * Fryser-Tracker (MVP)
 *
 * ✨ Features i denne prototype:
 * - Opret flere frysere, angiv antal hylder.
 * - Tilføj varer (navn, mængde, enhed, hylde, udløbsdato, noter, billede).
 * - Se indhold pr. fryser sorteret efter hylde.
 * - Søg og filtrér.
 * - Lokal lagring via localStorage (alt kører i browseren).
 *
 * 📌 Næste skridt (kan tilføjes senere):
 * - Redigér/omplacer varer med drag & drop.
 * - Batch-tilføjelse, kategorier/tags.
 * - Cloud-synk (f.eks. Supabase/Firebase) og login.
 */

// ---------- Typer ----------
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------- Hjælpere ----------
const STORAGE_KEY = "fryser-tracker-v1";

function saveToStorage(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed;
  } catch (e) {
    console.error("Kunne ikke indlæse localStorage:", e);
    return null;
  }
}

function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ---------- UI Komponenter ----------
function EmptyState({ title, desc, action }) {
  return (
    <div className="w-full rounded-2xl border border-dashed p-8 text-center text-slate-600">
      <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
      {desc && <p className="mt-2 text-sm text-slate-500">{desc}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary:
      "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-500 disabled:bg-slate-300",
    ghost:
      "bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-400",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500",
    outline:
      "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  };
  return (
    <button
      className={classNames(
        "rounded-xl px-4 py-2 text-sm font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Input({ label, hint, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <input
        className={classNames(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
          className
        )}
        {...props}
      />
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </label>
  );
}

function TextArea({ label, rows = 3, className = "", ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <textarea
        rows={rows}
        className={classNames(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
          className
        )}
        {...props}
      />
    </label>
  );
}

function Select({ label, className = "", children, ...props }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <select
        className={classNames(
          "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

function Card({ className = "", children }) {
  return (
    <div className={classNames("rounded-2xl border border-slate-200 bg-white p-4 shadow-sm", className)}>
      {children}
    </div>
  );
}

function SectionTitle({ children, right }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-slate-800">{children}</h2>
      {right}
    </div>
  );
}

function ShelfBadge({ n }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      Hylde {n}
    </span>
  );
}

// ---------- Formularer ----------
function AddFreezerForm({ onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [shelves, setShelves] = useState(4);

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ id: uid(), name: name.trim(), shelves: Math.max(1, Number(shelves)), items: [] });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Navn på fryser" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx. Kælderfryser" />
      <Input
        label="Antal hylder"
        type="number"
        min={1}
        value={shelves}
        onChange={(e) => setShelves(e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit">Opret fryser</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Annullér</Button>
      </div>
    </form>
  );
}

function AddItemForm({ freezer, onCreate, onCancel }) {
  const [name, setName] = useState("");
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("stk");
  const [shelf, setShelf] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSaving(true);
    let photoDataUrl = null;
    try {
      if (photo) {
        photoDataUrl = await fileToDataURL(photo);
      }
      onCreate({
        id: uid(),
        name: name.trim(),
        quantity: Number(qty) || 1,
        unit: unit || "",
        shelf: Math.min(Math.max(1, Number(shelf)), freezer.shelves),
        addedAt: new Date().toISOString(),
        expiresAt: expiresAt || null,
        notes: notes || "",
        photoDataUrl,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Varenavn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Fx. Kyllingebryst" />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Mængde" type="number" min={0} step="0.1" value={qty} onChange={(e) => setQty(e.target.value)} />
        <Input label="Enhed" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="stk, kg, poser" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Hylde" value={shelf} onChange={(e) => setShelf(e.target.value)}>
          {Array.from({ length: freezer.shelves }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              Hylde {i + 1}
            </option>
          ))}
        </Select>
        <Input label="Udløbsdato (valgfri)" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Billede (valgfrit)</span>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setPhoto(e.target.files?.[0] || null)}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-slate-200"
        />
      </div>

      <TextArea label="Noter" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Fx. marineret, indfrosset i april" />

      <div className="flex gap-2">
        <Button type="submit" disabled={isSaving}>{isSaving ? "Gemmer…" : "Tilføj vare"}</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Annullér</Button>
      </div>
    </form>
  );
}

// ---------- Hovedapp ----------
export default function App() {
  const [data, setData] = useState(() =>
    loadFromStorage() || {
      freezers: [],
      selectedFreezerId: null,
    }
  );

  // Persistér
  useEffect(() => {
    saveToStorage(data);
  }, [data]);

  const { freezers, selectedFreezerId } = data;
  const selectedFreezer = useMemo(
    () => freezers.find((f) => f.id === selectedFreezerId) || null,
    [freezers, selectedFreezerId]
  );

  const [search, setSearch] = useState("");
  const [showAddFreezer, setShowAddFreezer] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  function createFreezer(freezer) {
    setData((prev) => ({
      ...prev,
      freezers: [...prev.freezers, freezer],
      selectedFreezerId: freezer.id,
    }));
    setShowAddFreezer(false);
  }

  function deleteFreezer(id) {
    setData((prev) => {
      const next = prev.freezers.filter((f) => f.id !== id);
      return {
        freezers: next,
        selectedFreezerId: next[0]?.id || null,
      };
    });
  }

  function createItem(item) {
    setData((prev) => ({
      ...prev,
      freezers: prev.freezers.map((f) =>
        f.id === selectedFreezerId ? { ...f, items: [...f.items, item] } : f
      ),
    }));
    setShowAddItem(false);
  }

  function deleteItem(itemId) {
    setData((prev) => ({
      ...prev,
      freezers: prev.freezers.map((f) =>
        f.id === selectedFreezerId
          ? { ...f, items: f.items.filter((it) => it.id !== itemId) }
          : f
      ),
    }));
  }

  function changeShelves(count) {
    if (!selectedFreezer) return;
    const n = Math.max(1, Number(count) || 1);
    setData((prev) => ({
      ...prev,
      freezers: prev.freezers.map((f) => (f.id === selectedFreezer.id ? { ...f, shelves: n } : f)),
    }));
  }

  const filteredItems = useMemo(() => {
    if (!selectedFreezer) return [];
    const s = search.trim().toLowerCase();
    const arr = selectedFreezer.items;
    if (!s) return arr;
    return arr.filter(
      (it) =>
        it.name.toLowerCase().includes(s) ||
        (it.notes && it.notes.toLowerCase().includes(s))
    );
  }, [selectedFreezer, search]);

  // Sortér efter hylde, så navn
  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      if (a.shelf !== b.shelf) return a.shelf - b.shelf;
      return a.name.localeCompare(b.name);
    });
  }, [filteredItems]);

  // Gruppér pr. hylde
  const itemsByShelf = useMemo(() => {
    if (!selectedFreezer) return {};
    const groups = {};
    for (let i = 1; i <= selectedFreezer.shelves; i++) groups[i] = [];
    for (const it of sortedItems) {
      const key = Math.min(Math.max(1, it.shelf || 1), selectedFreezer.shelves);
      groups[key].push(it);
    }
    return groups;
  }, [sortedItems, selectedFreezer]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        {/* Topbar */}
        <header className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fryser-Tracker</h1>
            <p className="text-sm text-slate-600">Få overblik over dine frysere og hvad der ligger på hylderne.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Søg i varer…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <Button onClick={() => setShowAddFreezer(true)}>+ Ny fryser</Button>
            <Button
              onClick={() => setShowAddItem(true)}
              disabled={!selectedFreezer}
              variant={selectedFreezer ? "primary" : "outline"}
            >
              + Ny vare
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Venstre: liste over frysere */}
          <div className="md:col-span-1">
            <Card>
              <SectionTitle>Frysere</SectionTitle>
              {freezers.length === 0 ? (
                <EmptyState
                  title="Ingen frysere endnu"
                  desc="Opret din første fryser for at komme i gang."
                  action={<Button onClick={() => setShowAddFreezer(true)}>+ Opret fryser</Button>}
                />
              ) : (
                <ul className="space-y-2">
                  {freezers.map((f) => (
                    <li key={f.id}>
                      <button
                        onClick={() => setData((prev) => ({ ...prev, selectedFreezerId: f.id }))}
                        className={classNames(
                          "w-full rounded-xl border px-3 py-2 text-left transition",
                          f.id === selectedFreezerId
                            ? "border-sky-400 bg-sky-50"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">{f.name}</div>
                            <div className="text-xs text-slate-500">{f.shelves} hylde(r) · {f.items.length} vare(r)</div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="text-rose-600 hover:text-rose-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Slet fryser \"${f.name}\"?`)) deleteFreezer(f.id);
                            }}
                          >
                            Slet
                          </Button>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Højre: detaljer for valgt fryser */}
          <div className="md:col-span-2">
            {!selectedFreezer ? (
              <EmptyState
                title="Vælg eller opret en fryser"
                desc="Vælg en fryser i venstre side for at se indholdet – eller opret en ny."
              />
            ) : (
              <div className="space-y-4">
                <Card>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">{selectedFreezer.name}</h3>
                      <p className="text-sm text-slate-500">Overblik og indstillinger</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min={1}
                        value={selectedFreezer.shelves}
                        onChange={(e) => changeShelves(e.target.value)}
                        className="w-28"
                        label="Hylder"
                      />
                      <Button onClick={() => setShowAddItem(true)}>+ Tilføj vare</Button>
                    </div>
                  </div>
                </Card>

                {/* Hyldevisning */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {Array.from({ length: selectedFreezer.shelves }, (_, i) => i + 1).map((n) => {
                    const list = itemsByShelf[n] || [];
                    return (
                      <Card key={n} className="">
                        <div className="mb-3 flex items-center justify-between">
                          <ShelfBadge n={n} />
                          <span className="text-xs text-slate-500">{list.length} vare(r)</span>
                        </div>
                        {list.length === 0 ? (
                          <div className="text-sm text-slate-500">Ingen varer på denne hylde.</div>
                        ) : (
                          <ul className="grid grid-cols-1 gap-3">
                            {list.map((it) => (
                              <li key={it.id} className="">
                                <div className="flex gap-3">
                                  {it.photoDataUrl ? (
                                    <img
                                      src={it.photoDataUrl}
                                      alt={it.name}
                                      className="h-16 w-16 flex-none rounded-lg object-cover ring-1 ring-slate-200"
                                    />
                                  ) : (
                                    <div className="h-16 w-16 flex-none rounded-lg bg-slate-100 ring-1 ring-slate-200" />
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between">
                                      <div className="truncate text-sm font-semibold text-slate-800">{it.name}</div>
                                      <Button variant="ghost" className="text-rose-600 hover:text-rose-700"
                                        onClick={() => deleteItem(it.id)}
                                      >Slet</Button>
                                    </div>
                                    <div className="mt-0.5 text-xs text-slate-600">
                                      {it.quantity} {it.unit} · Lagt i: {new Date(it.addedAt).toLocaleDateString()}
                                      {it.expiresAt && (
                                        <span className="ml-2 text-amber-700">Udløber: {new Date(it.expiresAt).toLocaleDateString()}</span>
                                      )}
                                    </div>
                                    {it.notes && (
                                      <div className="mt-1 truncate text-xs text-slate-500">{it.notes}</div>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modaler (enkle inline-modal kort) */}
        {showAddFreezer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
              <SectionTitle right={<Button variant="ghost" onClick={() => setShowAddFreezer(false)}>Luk</Button>}>
                Ny fryser
              </SectionTitle>
              <AddFreezerForm onCreate={createFreezer} onCancel={() => setShowAddFreezer(false)} />
            </div>
          </div>
        )}

        {showAddItem && selectedFreezer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl">
              <SectionTitle right={<Button variant="ghost" onClick={() => setShowAddItem(false)}>Luk</Button>}>
                Ny vare i {selectedFreezer.name}
              </SectionTitle>
              <AddItemForm freezer={selectedFreezer} onCreate={createItem} onCancel={() => setShowAddItem(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
