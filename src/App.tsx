import { ChangeEvent, useEffect, useState } from "react";
import Database from "tauri-plugin-sql-api";
import { getSearch, removeNoteDB, addNoteDB } from "./db";
import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { Note } from "./lib/models";
import { dbName } from "./lib/constants";

// interface Note {
//    note_id: string; note_text: string
// }

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [db, setDb] = useState<Database | null>(null);
  const [listOfOpenWindows, setListOfOpenWindows] = useState<string[]>([]);

  useEffect(() => {
    createDB();
  }, []);

  useEffect(() => {
    if (db === null) return;

    let unlistenPromises = [];

    unlistenPromises.push(
      listen("db", () => {
        loadNotes(db);
      })
    );

    unlistenPromises.push(
      listen("tauri://close-requested", (e) => {
        setListOfOpenWindows(
          listOfOpenWindows.filter((items) => items != e.windowLabel)
        );
      })
    );

    return () => {
      unlistenPromises.forEach((unlistenPromise) => {
        unlistenPromise.then(
          (resolvedUnlisten) =>
            typeof resolvedUnlisten === "function" && resolvedUnlisten()
        );
      });
    };
  }, [db, listOfOpenWindows]);

  async function createDB() {
    const loadedDb = await Database.load(dbName);
    if (!loadedDb) {
      console.log("Failed to load database");
      return;
    }

    const _first_load = await loadedDb.execute(
      "CREATE TABLE IF NOT EXISTS notes (note_id CHAR NOT NULL PRIMARY KEY, note_text TEXT DEFAULT NULL);"
    );
    console.log(_first_load);

    setDb(loadedDb);
    loadNotes(loadedDb);
  }

  async function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    if (!db) {
      console.log("Database not loaded");
      return;
    }
    const result = await getSearch(db, event.target.value);
    if (result) {
      setNotes(result);
    }
  }

  async function loadNotes(db: Database) {
    const result = (await db.select("SELECT * FROM notes")) as Note[];
    setNotes(result);
  }

  async function handleRemoveNote(uuid: string) {
    if (!db) {
      console.error("Database not loaded");
      return;
    }

    await removeNoteDB(db, uuid);
    await loadNotes(db);
  }

  async function handleAddNote() {
    if (!db) {
      console.error("Database not loaded");
      return;
    }
    const newID = crypto.randomUUID();
    await addNoteDB(db, newID, "");
    await loadNotes(db);
  }

  async function handleOpenWindow(uuid: string) {
    if (listOfOpenWindows.includes(uuid)) {
      return;
    }

    setListOfOpenWindows([...listOfOpenWindows, uuid]);
    await invoke("open_editor", { editorId: String(uuid) });
  }

  return (
    <div className="bg-gray-700 h-screen p-2">
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-white font-bold">All notes</h1>
        <button
          className="btn btn-sm btn-square btn-ghost"
          onClick={async () => {
            await handleAddNote();
          }}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
        </button>
      </div>
      <input
        className="my-2 w-full input input-sm"
        onChange={async (e) => handleSearch(e)}
      />
      {notes.map((item, idx) => (
        <div
          key={idx}
          className="px-2 flex flex-row justify-between items-center bg-green-200 border-4 border-green-500 my-2"
        >
          <div
            onClick={async () => {
              await handleOpenWindow(item.note_id);
            }}
            className="cursor-pointer w-full h-full min-h-6"
          >
            <h2>{item?.note_text}</h2>
          </div>
          <button
            className="btn btn-sm btn-square btn-ghost"
            onClick={async () => {
              handleRemoveNote(item.note_id);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M3 6h18" />
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              <line x1="10" x2="10" y1="11" y2="17" />
              <line x1="14" x2="14" y1="11" y2="17" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

export default App;
