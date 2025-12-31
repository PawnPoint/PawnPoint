import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/Button";
import { useAuth } from "../hooks/useAuth";
import {
  addSquareBaseBook,
  listenSquareBaseBooks,
  removeSquareBaseBook,
  type SquareBaseBook,
} from "../lib/mockApi";
import { Plus, Upload } from "lucide-react";

export default function SquareBase() {
  const { user } = useAuth();
  const isAdmin = !!user?.isAdmin;
  const [books, setBooks] = useState<SquareBaseBook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const prev = document.body.style.backgroundColor;
    document.body.style.backgroundColor = "black";
    return () => {
      document.body.style.backgroundColor = prev;
    };
  }, []);

  useEffect(() => {
    const off = listenSquareBaseBooks((list) => {
      setBooks(list);
      if (!selectedId && list.length) {
        setSelectedId(list[0].id);
      } else if (selectedId && !list.some((b) => b.id === selectedId)) {
        setSelectedId(list[0]?.id || null);
      }
    }, user);
    return () => off();
  }, [user, selectedId]);

  const selected = useMemo(() => books.find((b) => b.id === selectedId) || null, [books, selectedId]);
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return books;
    return books.filter((b) => b.title.toLowerCase().includes(term) || b.url.toLowerCase().includes(term));
  }, [books, query]);

  const handleAdd = async () => {
    if (!isAdmin) {
      setError("Only admins can add books.");
      return;
    }
    if (!title.trim() || (!url.trim() && !fileDataUrl)) {
      setError("Title and a PDF link or file are required.");
      return;
    }
    setError(null);
    setAdding(true);
    try {
      await addSquareBaseBook(user, { title: title.trim(), url: (fileDataUrl || url).trim() });
      setTitle("");
      setUrl("");
      setFileDataUrl(null);
      setShowAddModal(false);
    } catch (err: any) {
      setError(err?.message || "Could not add book right now.");
    } finally {
      setAdding(false);
    }
  };

  const handleFileSelect = (file?: File | null) => {
    if (!file) return;
    if (file.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setError("Please use PDFs under 15MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setFileDataUrl(result);
        setUrl("");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = async (id: string) => {
    if (!isAdmin) return;
    try {
      await removeSquareBaseBook(user, id);
    } catch (err) {
      console.warn("Failed to remove book", err);
    }
  };

  return (
    <AppShell>
      <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 bg-black text-white h-screen overflow-hidden">
        <div className="w-full h-full px-3 sm:px-6 py-2 sm:py-3 flex flex-col space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight">Square Base</h1>
              {isAdmin && (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="h-10 w-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/15 transition"
                  aria-label="Add book"
                >
                  <Plus className="h-5 w-5" />
                </button>
              )}
            </div>
            <div className="w-full sm:max-w-md">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search books by title or URL"
                className="w-full rounded-full bg-white/5 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              />
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[320px,1fr] flex-1 min-h-0">
            <div className="rounded-2xl border border-white/10 bg-[#0b0b0f] p-3 space-y-3 overflow-hidden">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Library</h2>
                <span className="text-xs text-white/50">
                  {books.length} item{books.length === 1 ? "" : "s"}
                </span>
              </div>
              <div className="space-y-2 h-full max-h-full overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <div className="text-sm text-white/60 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                    No books found.
                  </div>
                )}
                {filtered.map((book) => (
                  <div
                    key={book.id}
                    className={`w-full text-left rounded-xl px-3 py-3 border transition ${
                      selectedId === book.id ? "border-white/50 bg-white/10" : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{book.title}</div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs px-2 py-1"
                          onClick={() => setSelectedId(book.id)}
                        >
                          Select
                        </Button>
                        {isAdmin && (
                          <button
                            className="text-xs text-white/60 hover:text-red-400"
                            onClick={() => handleRemove(book.id)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-white/50 truncate">{book.url}</div>
                    {book.addedByName && (
                      <div className="text-[11px] text-white/40 mt-1">Added by {book.addedByName}</div>
                    )}
                  </div>
                ))}
              </div>

            </div>

            <div className="rounded-2xl border border-white/10 bg-[#0b0b0f] p-3 min-h-0 flex flex-col">
              {selected ? (
                <div className="flex flex-col h-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{selected.title}</div>
                      <div className="text-xs text-white/50 truncate">{selected.url}</div>
                    </div>
                  </div>
                  <div className="flex-1 rounded-xl overflow-hidden border border-white/10 bg-black min-h-0">
                    <iframe
                      title={selected.title}
                      src={`${selected.url}#toolbar=1&view=FitH`}
                      className="w-full h-full"
                      allow="fullscreen"
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-white/60 text-sm">
                  Select a book to start reading.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-2xl bg-[#0b0b0f] border border-white/10 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">Add PDF</div>
                <div className="text-xs text-white/60">Provide a direct link or import a PDF file.</div>
              </div>
              <button
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
                onClick={() => {
                  setShowAddModal(false);
                  setError(null);
                  setFileDataUrl(null);
                  setUrl("");
                  setTitle("");
                }}
              >
                X
              </button>
            </div>
            <div className="space-y-3">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Book title"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setFileDataUrl(null);
                }}
                placeholder="Direct PDF URL (https://...)"
                className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/40"
              />
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                />
                <Button
                  variant="outline"
                  className="flex items-center gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  Import PDF
                </Button>
                {fileDataUrl && <span className="text-xs text-white/60 truncate">File loaded</span>}
              </div>
              {error && <div className="text-xs text-red-400">{error}</div>}
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAddModal(false);
                  setError(null);
                  setFileDataUrl(null);
                  setUrl("");
                  setTitle("");
                }}
              >
                Cancel
              </Button>
              <Button variant="outline" onClick={handleAdd} disabled={adding}>
                {adding ? "Adding..." : "Save"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}






