import { ChangeEvent, useEffect, useRef, useState } from "react";
import { getSearch, removeNoteDB, addNoteDB } from "./lib/db";
import { invoke } from "@tauri-apps/api";
import { listen } from "@tauri-apps/api/event";
import { Note } from "./lib/models";
import { supabase } from "./lib/supabaseClient";

// interface Note {
//    note_id: string; note_text: string
// }

function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [listOfOpenWindows, setListOfOpenWindows] = useState<string[]>([]);

  const notesRef = useRef(notes);

  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(async () => {
    loadNotes();

    const RTNotes = supabase
      .channel("custom-update-channel")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notes",
        },
        (payload) => {
          const tempArray = notesRef.current.map((obj) => {
            if (obj.note_id === payload.old.note_id) {
              return { ...obj, note_text: payload.new.note_text };
            }
            return obj;
          });
          setNotes(tempArray);
        }
      )
      .subscribe();

    return () => RTNotes.unsubscribe();
  }, []);

  useEffect(() => {
    let unlistenPromises = [];

    unlistenPromises.push(
      listen("db", () => {
        loadNotes();
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
  }, [listOfOpenWindows]);

  async function handleSearch(event: ChangeEvent<HTMLInputElement>) {
    const result = await getSearch(event.target.value);
    if (result) {
      setNotes(result);
    }
  }

  async function loadNotes() {
    const { data, error } = await supabase.from("notes").select("*");
    console.log(data);
    if (data && !error) {
      setNotes(data || []);
    }
  }

  async function handleRemoveNote(uuid: string) {
    await removeNoteDB(uuid);
    await loadNotes();
  }

  async function handleAddNote() {
    await addNoteDB();
    await loadNotes();
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
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
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
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
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
